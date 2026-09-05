// ──────────────────────────────────────────────────────────
// Netlify Function: Generate Blog Post via OpenRouter or Google Gemini
// Endpoint: /.netlify/functions/generate-post
// ──────────────────────────────────────────────────────────

// ── Rate Limiting (in-memory, per cold-start instance) ──
const rateLimitStore = new Map();
const WINDOW_MS = 10 * 60 * 1000; // 10-minute sliding window
const MAX_REQUESTS = 10;

function isRateLimited(ip) {
  const now = Date.now();
  let record = rateLimitStore.get(ip);

  if (!record) {
    rateLimitStore.set(ip, { timestamps: [now] });
    return false;
  }

  // Purge timestamps outside the window
  record.timestamps = record.timestamps.filter((t) => now - t < WINDOW_MS);

  if (record.timestamps.length >= MAX_REQUESTS) {
    return true;
  }

  record.timestamps.push(now);
  return false;
}

// ── Prompt Builder ──
function buildPrompt(topic, keywords) {
  return `You are the Chief Writer & Editor for Kritrimta (kritrimta.com), a technology blog written by Saurav Karki.

Your editorial voice:
- Analytical and first-principles oriented — you go beneath the surface
- Direct and authoritative, never fluffy or clickbait-driven
- You challenge conventional narratives with evidence-based reasoning
- You address the reader as "you" and occasionally use "we" for shared reasoning
- You make bold claims and immediately substantiate them with evidence
- Technical depth without unnecessary jargon
- Sharp, engaging opening paragraphs that reframe the topic
- You never start with a generic "In today's world..." or "Technology is evolving..." opener

Write a complete blog post about: "${topic}"
${keywords ? `\nTarget keywords to naturally weave in: ${keywords}` : ""}

Follow these exact requirements:

1. **Title**: SEO-optimized, under 60 characters, compelling but NOT clickbait
2. **Meta description**: Under 155 characters, naturally includes the primary keyword
3. **Body**: 1500–2000 words in clean Markdown format:
   - Open with a sharp, thought-provoking paragraph that reframes the topic (no generic intros)
   - Use a horizontal rule (---) after the opening section
   - 3–5 H2 (##) sections with descriptive, keyword-aware headings
   - H3 (###) sub-sections where the topic demands depth
   - **Bold** key terms and critical statements
   - Integrate keywords naturally — zero keyword stuffing
   - Include a final ## Frequently Asked Questions section with 3–4 Q&As, each question as an H3
   - End with a concluding paragraph that delivers an actionable takeaway
   - Do NOT include the title as an H1 at the start of the body — the CMS handles that
4. **Tags**: 4–6 specific, relevant tags (not generic like "technology")
5. **Category**: Choose the SINGLE best fit from exactly these options: "AI Tools", "Gadget Reviews", "Tech News", "Tutorials"
6. **Slug**: URL-safe, lowercase, hyphenated, concise — derived from the title (max 60 chars)

Output must strictly be valid JSON matching this schema:
{
  "title": "...",
  "description": "...",
  "body": "...",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "AI Tools | Gadget Reviews | Tech News | Tutorials",
  "slug": "..."
}

Kritrimta's readers are tech-literate professionals. Do not explain basics. Go deep. Challenge assumptions. Deliver insight they cannot get from a press-release summary.`;
}

// ── OpenRouter API Caller ──
async function callOpenRouter(apiKey, prompt) {
  const models = [
    "google/gemini-2.0-flash-001",
    "meta-llama/llama-3.3-70b-instruct",
    "mistralai/mistral-small-3",
    "openai/gpt-4o-mini",
  ];

  let lastError = null;

  for (const model of models) {
    try {
      console.log(`[OpenRouter] Trying model: ${model}`);
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://kritrimta.com",
          "X-Title": "Kritrimta AI Writer",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are an expert technical blog writer and editor. Always reply in valid JSON only, without any markdown code fence wrappers.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return content;
        }
      }

      const errText = await res.text();
      lastError = `OpenRouter (${model}) returned ${res.status}: ${errText}`;
      console.warn(`[OpenRouter] ${lastError}`);
    } catch (err) {
      lastError = `OpenRouter error with ${model}: ${err.message}`;
      console.warn(`[OpenRouter] ${lastError}`);
    }
  }

  throw new Error(lastError || "All OpenRouter models failed.");
}

// ── Gemini API Caller ──
async function callGemini(apiKey, prompt) {
  let candidateModels = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-1.5-pro",
  ];

  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`
    );
    if (listRes.ok) {
      const listData = await listRes.json();
      if (Array.isArray(listData.models)) {
        const available = listData.models
          .filter((m) =>
            m.supportedGenerationMethods?.includes("generateContent")
          )
          .map((m) => m.name.replace(/^models\//, ""));

        if (available.length > 0) {
          available.sort((a, b) => {
            const score = (name) => {
              if (name.includes("1.5-flash")) return 1;
              if (name.includes("2.0-flash")) return 2;
              if (name.includes("flash")) return 3;
              return 10;
            };
            return score(a) - score(b);
          });
          candidateModels = available;
        }
      }
    }
  } catch (e) {
    console.warn("[Gemini] ListModels error:", e.message);
  }

  let lastError = null;

  for (const model of candidateModels) {
    try {
      const modelPath = model.startsWith("models/") ? model : `models/${model}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${apiKey.trim()}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 6000,
            responseMimeType: "application/json",
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }

      const errText = await res.text();
      lastError = `Gemini (${model}) returned ${res.status}: ${errText}`;
      console.warn(`[Gemini] ${lastError}`);
    } catch (e) {
      lastError = `Gemini error with ${model}: ${e.message}`;
      console.warn(`[Gemini] ${lastError}`);
    }
  }

  throw new Error(lastError || "All Gemini models failed.");
}

// ── Main Handler ──
export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Rate Limiting
  const clientIp =
    event.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    event.headers["client-ip"] ||
    "unknown";

  if (isRateLimited(clientIp)) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({
        error:
          "Rate limit reached — max 10 requests per 10 minutes. Please wait and try again.",
      }),
    };
  }

  let topic, keywords;
  try {
    const body = JSON.parse(event.body || "{}");
    topic = body.topic?.trim();
    keywords = body.keywords?.trim() || "";
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid request body" }),
    };
  }

  if (!topic || topic.length < 3) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: "Please provide a topic (at least 3 characters)",
      }),
    };
  }

  // API Key Resolution: check OpenRouter first, then Gemini
  const openRouterKey =
    process.env.OPENROUTER_API_KEY ||
    process.env.OpenRouter_API ||
    process.env.OPENROUTER_KEY ||
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.startsWith("sk-or-")
      ? process.env.GEMINI_API_KEY
      : null) ||
    (process.env.Kritrimta_API && process.env.Kritrimta_API.startsWith("sk-or-")
      ? process.env.Kritrimta_API
      : null) ||
    (process.env.KRITRIMTA_API && process.env.KRITRIMTA_API.startsWith("sk-or-")
      ? process.env.KRITRIMTA_API
      : null);

  const geminiKey =
    (!process.env.GEMINI_API_KEY?.startsWith("sk-or-") && process.env.GEMINI_API_KEY) ||
    (!process.env.Kritrimta_API?.startsWith("sk-or-") && process.env.Kritrimta_API) ||
    (!process.env.KRITRIMTA_API?.startsWith("sk-or-") && process.env.KRITRIMTA_API);

  if (!openRouterKey && !geminiKey) {
    console.error("API key missing: no OpenRouter or Gemini API key configured.");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Server configuration error — API key missing in environment variables.",
      }),
    };
  }

  const prompt = buildPrompt(topic, keywords);
  let rawResponseText = null;

  // Try OpenRouter first if key is available
  if (openRouterKey) {
    try {
      rawResponseText = await callOpenRouter(openRouterKey, prompt);
    } catch (orErr) {
      console.warn("OpenRouter attempt failed:", orErr.message);
      if (geminiKey) {
        console.log("Falling back to Gemini...");
        try {
          rawResponseText = await callGemini(geminiKey, prompt);
        } catch (gemErr) {
          throw new Error(`OpenRouter (${orErr.message}) and Gemini (${gemErr.message}) both failed.`);
        }
      } else {
        throw orErr;
      }
    }
  } else if (geminiKey) {
    rawResponseText = await callGemini(geminiKey, prompt);
  }

  // Parse JSON
  let result;
  try {
    result = JSON.parse(rawResponseText);
  } catch {
    const jsonMatch = rawResponseText.match(/\`\`\`(?:json)?\s*\n?([\s\S]*?)\n?\s*\`\`\`/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[1]);
    } else {
      const objectMatch = rawResponseText.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        result = JSON.parse(objectMatch[0]);
      } else {
        throw new Error("AI response was not valid JSON format.");
      }
    }
  }

  const validCategories = ["AI Tools", "Gadget Reviews", "Tech News", "Tutorials"];
  const chosenCategory = validCategories.includes(result.category)
    ? result.category
    : "Tech News";

  const title = String(result.title || "").slice(0, 70);
  const slug = String(result.slug || result.title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  // Generate a curated, high-res tech editorial feature image URL
  const imagePrompt = encodeURIComponent(
    `high tech editorial digital illustration of ${topic}, futuristic minimalist dark aesthetic, cybernetic neon accents, elegant composition, high resolution, award winning tech blog cover`
  );
  const seed = Math.floor(Math.random() * 1000000);
  const heroImage = `https://image.pollinations.ai/prompt/${imagePrompt}?width=1200&height=630&nologo=true&seed=${seed}`;

  const sanitized = {
    title,
    description: String(result.description || "").slice(0, 160),
    body: String(result.body || ""),
    tags: Array.isArray(result.tags)
      ? result.tags.map(String).slice(0, 8)
      : ["Technology", "AI"],
    category: chosenCategory,
    slug,
    heroImage,
    pubDate: new Date().toISOString().split("T")[0],
    author: "Saurav Karki",
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(sanitized),
  };
};
