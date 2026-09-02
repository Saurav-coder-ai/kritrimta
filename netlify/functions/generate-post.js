// ──────────────────────────────────────────────────────────
// Netlify Function: Generate Blog Post via Google Gemini
// Endpoint: /.netlify/functions/generate-post
// ──────────────────────────────────────────────────────────

// ── Rate Limiting (in-memory, per cold-start instance) ──
const rateLimitStore = new Map();
const WINDOW_MS = 10 * 60 * 1000; // 10-minute sliding window
const MAX_REQUESTS = 5;

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

Kritrimta's readers are tech-literate professionals. Do not explain basics. Go deep. Challenge assumptions. Deliver insight they cannot get from a press-release summary.`;
}

// ── Main Handler ──
export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // ── CORS Preflight ──
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

  // ── Rate Limiting ──
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
          "Rate limit exceeded — max 5 requests per 10 minutes. Please wait and try again.",
      }),
    };
  }

  // ── Parse Request Body ──
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

  // ── Validate API Key ──
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.Kritrimta_API ||
    process.env.KRITRIMTA_API;
  if (!apiKey) {
    console.error(
      "API key missing: neither GEMINI_API_KEY nor Kritrimta_API is set in environment variables"
    );
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Server configuration error — API key missing in environment variables",
      }),
    };
  }

  // ── Call Gemini API with Fallback Models ──
  const prompt = buildPrompt(topic, keywords);
  const modelsToTry = [
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash-exp",
  ];

  let geminiRes = null;
  let lastErrorDetails = "";

  try {
    for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                body: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                category: { type: "string" },
                slug: { type: "string" },
              },
              required: [
                "title",
                "description",
                "body",
                "tags",
                "category",
                "slug",
              ],
            },
          },
        }),
      });

      if (res.ok) {
        geminiRes = res;
        break;
      }

      const errText = await res.text();
      lastErrorDetails = `Model ${model} returned ${res.status}: ${errText}`;
      console.warn(`[Gemini] ${lastErrorDetails}`);

      if (res.status === 429) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({
            error: "Gemini API quota exceeded. Please wait a minute and try again.",
          }),
        };
      }
    } catch (fetchErr) {
      lastErrorDetails = `Fetch error with ${model}: ${fetchErr.message}`;
      console.error(`[Gemini] ${lastErrorDetails}`);
    }
  }

  if (!geminiRes) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: `AI generation failed. ${lastErrorDetails.slice(0, 200)}`,
      }),
    };
  }

    const data = await geminiRes.json();

    // ── Extract Generated Text ──
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      const finishReason = data.candidates?.[0]?.finishReason;
      console.error(
        "Empty Gemini response. Finish reason:",
        finishReason,
        JSON.stringify(data).slice(0, 500)
      );
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "AI returned an empty response. Please try a different topic.",
        }),
      };
    }

    // ── Parse JSON ──
    let result;
    try {
      result = JSON.parse(generatedText);
    } catch {
      // Attempt extraction from possible markdown wrapping
      const jsonMatch = generatedText.match(
        /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/
      );
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1]);
      } else {
        const objectMatch = generatedText.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          result = JSON.parse(objectMatch[0]);
        } else {
          throw new Error("Response is not valid JSON");
        }
      }
    }

    // ── Validate & Sanitize ──
    const validCategories = [
      "AI Tools",
      "Gadget Reviews",
      "Tech News",
      "Tutorials",
    ];

    const sanitized = {
      title: String(result.title || "").slice(0, 60),
      description: String(result.description || "").slice(0, 155),
      body: String(result.body || ""),
      tags: Array.isArray(result.tags)
        ? result.tags.map(String).slice(0, 8)
        : [],
      category: validCategories.includes(result.category)
        ? result.category
        : "Tech News",
      slug: String(result.slug || result.title || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80),
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(sanitized),
    };
  } catch (error) {
    console.error("Generation error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: `Generation failed: ${error.message}. Please try again.`,
      }),
    };
  }
};
