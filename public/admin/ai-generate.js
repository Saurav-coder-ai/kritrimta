// ──────────────────────────────────────────────────────────
// Kritrimta — AI Generate Widget for Decap CMS
// Injects a "Generate with AI" button into the blog post
// editor that calls the Netlify serverless function and
// auto-fills CMS fields with the generated content.
// ──────────────────────────────────────────────────────────

(function () {
  "use strict";

  const API_ENDPOINT = "/.netlify/functions/generate-post";

  // ── State ──
  let modalElement = null;
  let isGenerating = false;
  let buttonInjected = false;

  // ────────────────────────────
  // CSS Injection
  // ────────────────────────────
  function injectStyles() {
    if (document.getElementById("ai-gen-styles")) return;
    const style = document.createElement("style");
    style.id = "ai-gen-styles";
    style.textContent = `
      /* ── Floating Action Button ── */
      #ai-gen-fab {
        position: fixed;
        bottom: 28px;
        right: 28px;
        z-index: 9990;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 22px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: #fff;
        border: none;
        border-radius: 50px;
        font-size: 14px;
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(99, 102, 241, 0.45);
        transition: all 0.2s ease;
        letter-spacing: 0.01em;
      }
      #ai-gen-fab:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 28px rgba(99, 102, 241, 0.55);
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
      }
      #ai-gen-fab:active { transform: translateY(0); }

      /* ── Modal Overlay ── */
      #ai-gen-overlay {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        animation: aiFadeIn 0.2s ease;
      }
      @keyframes aiFadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }

      /* ── Modal Card ── */
      #ai-gen-modal {
        background: #fff;
        border-radius: 16px;
        width: 90%;
        max-width: 520px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
        overflow: hidden;
        animation: aiSlideUp 0.25s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      @keyframes aiSlideUp {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .ai-gen-header {
        padding: 20px 24px 16px;
        border-bottom: 1px solid #e5e7eb;
      }
      .ai-gen-header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: #111827;
      }
      .ai-gen-header p {
        margin: 6px 0 0;
        font-size: 13px;
        color: #6b7280;
      }

      .ai-gen-body { padding: 20px 24px; }

      .ai-gen-field { margin-bottom: 16px; }
      .ai-gen-field:last-child { margin-bottom: 0; }

      .ai-gen-field label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 6px;
      }
      .ai-gen-field input {
        width: 100%;
        padding: 10px 14px;
        border: 1.5px solid #d1d5db;
        border-radius: 8px;
        font-size: 14px;
        color: #111827;
        background: #f9fafb;
        transition: border-color 0.15s, box-shadow 0.15s;
        box-sizing: border-box;
      }
      .ai-gen-field input:focus {
        outline: none;
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        background: #fff;
      }
      .ai-gen-field input::placeholder { color: #9ca3af; }

      .ai-gen-footer {
        padding: 16px 24px 20px;
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }

      .ai-gen-btn {
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: all 0.15s;
        font-family: inherit;
      }
      .ai-gen-btn-primary {
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: #fff;
      }
      .ai-gen-btn-primary:hover:not(:disabled) {
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
      }
      .ai-gen-btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .ai-gen-btn-secondary {
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
      }
      .ai-gen-btn-secondary:hover { background: #e5e7eb; }

      /* ── Loading State ── */
      .ai-gen-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 32px 24px;
        gap: 16px;
      }
      .ai-gen-spinner {
        width: 40px;
        height: 40px;
        border: 3.5px solid #e5e7eb;
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: aiSpin 0.8s linear infinite;
      }
      @keyframes aiSpin {
        to { transform: rotate(360deg); }
      }
      .ai-gen-loading p {
        margin: 0;
        font-size: 14px;
        color: #6b7280;
        text-align: center;
      }
      .ai-gen-loading p strong {
        color: #111827;
      }

      /* ── Error State ── */
      .ai-gen-error {
        padding: 16px 20px;
        margin: 0 24px 16px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        color: #991b1b;
        font-size: 13px;
        line-height: 1.5;
      }

      /* ── Success Banner ── */
      #ai-gen-success-banner {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 10001;
        background: #ecfdf5;
        border: 1px solid #a7f3d0;
        border-radius: 10px;
        padding: 14px 20px;
        max-width: 420px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        animation: aiFadeIn 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      #ai-gen-success-banner .ai-success-title {
        font-size: 14px;
        font-weight: 700;
        color: #065f46;
        margin: 0 0 4px;
      }
      #ai-gen-success-banner .ai-success-msg {
        font-size: 13px;
        color: #047857;
        margin: 0;
        line-height: 1.4;
      }
      #ai-gen-success-banner .ai-success-close {
        position: absolute;
        top: 8px;
        right: 10px;
        background: none;
        border: none;
        font-size: 18px;
        color: #065f46;
        cursor: pointer;
        padding: 2px 6px;
        line-height: 1;
      }

      /* ── Fallback Values Box ── */
      .ai-gen-fallback {
        margin-top: 12px;
        padding: 12px 16px;
        background: #fffbeb;
        border: 1px solid #fde68a;
        border-radius: 8px;
        font-size: 12px;
        color: #92400e;
        max-height: 200px;
        overflow-y: auto;
      }
      .ai-gen-fallback strong { color: #78350f; }
      .ai-gen-fallback .fb-field { margin-bottom: 8px; }
      .ai-gen-fallback .fb-field:last-child { margin-bottom: 0; }
      .ai-gen-fallback .fb-label {
        font-weight: 600;
        display: block;
        margin-bottom: 2px;
      }
      .ai-gen-fallback .fb-value {
        background: #fef3c7;
        padding: 4px 8px;
        border-radius: 4px;
        display: block;
        word-break: break-word;
        cursor: pointer;
        position: relative;
      }
      .ai-gen-fallback .fb-value:hover::after {
        content: 'Click to copy';
        position: absolute;
        right: 4px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 10px;
        color: #b45309;
        font-style: italic;
      }
    `;
    document.head.appendChild(style);
  }

  // ────────────────────────────
  // Field Finding Utilities
  // ────────────────────────────

  /**
   * Finds a CMS field container by its label text.
   * Returns { container, label } or null.
   */
  function findFieldByLabel(labelText) {
    const labels = document.querySelectorAll("label");
    for (const label of labels) {
      const text = label.textContent.trim().replace(/\s*\*$/, "").trim();
      if (text === labelText) {
        // Walk up to find a meaningful container
        let container = label.parentElement;
        return { container, label };
      }
    }
    return null;
  }

  /**
   * Sets the value of a React-controlled <input>.
   */
  function setNativeInputValue(input, value) {
    if (!input) return false;
    try {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      ).set;
      setter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } catch (e) {
      console.warn("[AI Gen] Failed to set input value:", e);
      return false;
    }
  }

  /**
   * Sets the value of a React-controlled <textarea>.
   */
  function setNativeTextareaValue(textarea, value) {
    if (!textarea) return false;
    try {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      ).set;
      setter.call(textarea, value);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } catch (e) {
      console.warn("[AI Gen] Failed to set textarea value:", e);
      return false;
    }
  }

  // ────────────────────────────
  // Field Setters
  // ────────────────────────────

  /** Set a string-type field (Title, Author) */
  function fillStringField(labelText, value) {
    const field = findFieldByLabel(labelText);
    if (!field) return false;

    const input =
      field.container.querySelector('input[type="text"]') ||
      field.container.querySelector("input:not([type])") ||
      field.container.querySelector("input");
    return setNativeInputValue(input, value);
  }

  /** Set a text-type field (Description) */
  function fillTextField(labelText, value) {
    const field = findFieldByLabel(labelText);
    if (!field) return false;

    // Text widget uses a <textarea>
    const textarea = field.container.querySelector("textarea");
    if (textarea) return setNativeTextareaValue(textarea, value);

    // Fallback: might use an input in some configs
    const input = field.container.querySelector("input");
    return setNativeInputValue(input, value);
  }

  /** Set the markdown body field */
  async function fillMarkdownField(labelText, value) {
    const field = findFieldByLabel(labelText);
    if (!field) return false;

    // Strategy 1: Look for a raw-mode textarea directly
    let textarea = field.container.querySelector("textarea");
    if (textarea) {
      return setNativeTextareaValue(textarea, value);
    }

    // Strategy 2: Look for toggle to raw/markdown mode, click it, then set textarea
    const buttons = field.container.querySelectorAll("button");
    for (const btn of buttons) {
      const text = (btn.textContent || "").toLowerCase();
      const ariaLabel = (btn.getAttribute("aria-label") || "").toLowerCase();
      const title = (btn.title || "").toLowerCase();
      if (
        text.includes("raw") ||
        text.includes("markdown") ||
        ariaLabel.includes("raw") ||
        title.includes("raw") ||
        title.includes("markdown")
      ) {
        btn.click();
        await sleep(400);
        textarea = field.container.querySelector("textarea");
        if (textarea) {
          return setNativeTextareaValue(textarea, value);
        }
      }
    }

    // Strategy 3: Look for a contenteditable element (rich text mode)
    const editable = field.container.querySelector(
      '[contenteditable="true"]'
    );
    if (editable) {
      editable.focus();
      // Use execCommand for compatibility with rich editors
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, value);
      editable.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }

    return false;
  }

  /** Set a react-select field (Category) */
  async function fillSelectField(labelText, value) {
    const field = findFieldByLabel(labelText);
    if (!field) return false;

    // Find the react-select control area
    const container = field.container;

    // Strategy: click on the select control, wait for dropdown, click the option
    const control =
      container.querySelector('[class*="control"]') ||
      container.querySelector('[class*="ValueContainer"]')?.parentElement ||
      container.querySelector('[class*="indicatorContainer"]')?.parentElement
        ?.parentElement;

    if (!control) return false;

    // Click to open dropdown
    control.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true })
    );
    await sleep(300);

    // Find the matching option in the dropdown menu
    const allOptions = document.querySelectorAll('[class*="option"]');
    for (const opt of allOptions) {
      if (opt.textContent.trim() === value) {
        opt.click();
        return true;
      }
    }

    // Fallback: try native select if present
    const nativeSelect = container.querySelector("select");
    if (nativeSelect) {
      nativeSelect.value = value;
      nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    return false;
  }

  /** Set the tags list field */
  async function fillTagsField(labelText, tags) {
    const field = findFieldByLabel(labelText);
    if (!field) return false;

    const container = field.container;
    let filled = 0;

    for (const tag of tags) {
      // Find the text input within the list widget
      const input =
        container.querySelector('input[type="text"]') ||
        container.querySelector("input");
      if (!input) break;

      setNativeInputValue(input, tag);
      await sleep(100);

      // Simulate Enter to add the tag
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
        })
      );

      await sleep(150);
      filled++;
    }

    return filled > 0;
  }

  // ────────────────────────────
  // Auto-fill Orchestrator
  // ────────────────────────────

  async function autoFillFields(data) {
    const results = { filled: [], manual: [] };

    // Title
    if (fillStringField("Title", data.title)) {
      results.filled.push("Title");
    } else {
      results.manual.push({ field: "Title", value: data.title });
    }

    // Description
    if (fillTextField("Description", data.description)) {
      results.filled.push("Description");
    } else {
      results.manual.push({ field: "Description", value: data.description });
    }

    // Category
    if (await fillSelectField("Category", data.category)) {
      results.filled.push("Category");
    } else {
      results.manual.push({ field: "Category", value: data.category });
    }

    // Tags
    if (await fillTagsField("Tags", data.tags)) {
      results.filled.push("Tags");
    } else {
      results.manual.push({
        field: "Tags",
        value: data.tags.join(", "),
      });
    }

    // Body (do this last — it can be slow)
    if (await fillMarkdownField("Body", data.body)) {
      results.filled.push("Body");
    } else {
      results.manual.push({ field: "Body", value: data.body });
    }

    // Slug is shown in the success banner (user sets filename in CMS)
    results.suggestedSlug = data.slug;

    return results;
  }

  // ────────────────────────────
  // Modal UI
  // ────────────────────────────

  function openModal() {
    if (modalElement) return; // Already open

    const overlay = document.createElement("div");
    overlay.id = "ai-gen-overlay";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay && !isGenerating) closeModal();
    });

    overlay.innerHTML = `
      <div id="ai-gen-modal">
        <div class="ai-gen-header">
          <h2>✨ Generate with AI</h2>
          <p>Enter a topic and let AI draft a complete blog post for Kritrimta.</p>
        </div>
        <div class="ai-gen-body" id="ai-gen-modal-body">
          <div class="ai-gen-field">
            <label for="ai-gen-topic">Topic / Title Idea *</label>
            <input type="text" id="ai-gen-topic"
                   placeholder="e.g. Why RAG is replacing fine-tuning for enterprise AI"
                   autocomplete="off" />
          </div>
          <div class="ai-gen-field">
            <label for="ai-gen-keywords">Target Keywords (optional)</label>
            <input type="text" id="ai-gen-keywords"
                   placeholder="e.g. RAG, retrieval augmented generation, enterprise LLM"
                   autocomplete="off" />
          </div>
        </div>
        <div class="ai-gen-footer" id="ai-gen-modal-footer">
          <button class="ai-gen-btn ai-gen-btn-secondary" id="ai-gen-cancel">Cancel</button>
          <button class="ai-gen-btn ai-gen-btn-primary" id="ai-gen-submit">🚀 Generate</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    modalElement = overlay;

    // Focus the topic input
    setTimeout(() => {
      const topicInput = document.getElementById("ai-gen-topic");
      if (topicInput) topicInput.focus();
    }, 100);

    // Button handlers
    document.getElementById("ai-gen-cancel").addEventListener("click", () => {
      if (!isGenerating) closeModal();
    });

    document.getElementById("ai-gen-submit").addEventListener("click", handleGenerate);

    // Submit on Enter from topic input
    document.getElementById("ai-gen-topic").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !isGenerating) {
        e.preventDefault();
        handleGenerate();
      }
    });
  }

  function closeModal() {
    if (modalElement) {
      modalElement.remove();
      modalElement = null;
    }
    isGenerating = false;
  }

  function showLoadingState(topic) {
    const body = document.getElementById("ai-gen-modal-body");
    const footer = document.getElementById("ai-gen-modal-footer");
    if (!body || !footer) return;

    body.innerHTML = `
      <div class="ai-gen-loading">
        <div class="ai-gen-spinner"></div>
        <p><strong>Generating your post...</strong></p>
        <p>Writing about "${escapeHTML(topic)}" in Kritrimta's voice.<br/>This usually takes 10–20 seconds.</p>
      </div>
    `;

    footer.innerHTML = `
      <button class="ai-gen-btn ai-gen-btn-secondary" disabled>Please wait...</button>
    `;
  }

  function showErrorState(message) {
    const body = document.getElementById("ai-gen-modal-body");
    const footer = document.getElementById("ai-gen-modal-footer");
    if (!body) return;

    // Prepend error, keep or restore form
    const existingError = body.querySelector(".ai-gen-error");
    if (existingError) existingError.remove();

    const errorDiv = document.createElement("div");
    errorDiv.className = "ai-gen-error";
    errorDiv.textContent = message;
    body.prepend(errorDiv);

    if (footer) {
      footer.innerHTML = `
        <button class="ai-gen-btn ai-gen-btn-secondary" id="ai-gen-cancel">Close</button>
        <button class="ai-gen-btn ai-gen-btn-primary" id="ai-gen-submit">🔄 Try Again</button>
      `;
      document.getElementById("ai-gen-cancel").addEventListener("click", closeModal);
      document.getElementById("ai-gen-submit").addEventListener("click", handleGenerate);
    }
  }

  function showSuccessBanner(results) {
    // Remove any existing banner
    const old = document.getElementById("ai-gen-success-banner");
    if (old) old.remove();

    const banner = document.createElement("div");
    banner.id = "ai-gen-success-banner";

    let html = `
      <button class="ai-success-close" onclick="this.parentElement.remove()">×</button>
      <p class="ai-success-title">✅ AI Content Generated</p>
      <p class="ai-success-msg">
        Fields filled: ${results.filled.join(", ") || "none"}<br/>
        Suggested slug: <strong>${escapeHTML(results.suggestedSlug)}</strong><br/>
        <em>Review and edit all fields before publishing.</em>
      </p>
    `;

    // If any fields couldn't be auto-filled, show their values
    if (results.manual.length > 0) {
      html += `
        <div class="ai-gen-fallback">
          <strong>⚠ Could not auto-fill these fields — copy manually:</strong>
      `;
      for (const item of results.manual) {
        html += `
          <div class="fb-field">
            <span class="fb-label">${escapeHTML(item.field)}:</span>
            <span class="fb-value" onclick="navigator.clipboard.writeText(this.textContent).then(()=>this.style.background='#d1fae5')" title="Click to copy">${escapeHTML(item.value)}</span>
          </div>
        `;
      }
      html += `</div>`;
    }

    banner.innerHTML = html;
    document.body.appendChild(banner);

    // Auto-dismiss after 30 seconds (or keep if there are manual fields)
    if (results.manual.length === 0) {
      setTimeout(() => banner.remove(), 15000);
    }
  }

  // ────────────────────────────
  // Generation Handler
  // ────────────────────────────

  async function handleGenerate() {
    if (isGenerating) return;

    const topicInput = document.getElementById("ai-gen-topic");
    const keywordsInput = document.getElementById("ai-gen-keywords");

    const topic = topicInput?.value?.trim() || "";
    const keywords = keywordsInput?.value?.trim() || "";

    if (!topic) {
      topicInput?.focus();
      const body = document.getElementById("ai-gen-modal-body");
      if (body) {
        const existing = body.querySelector(".ai-gen-error");
        if (existing) existing.remove();
        const err = document.createElement("div");
        err.className = "ai-gen-error";
        err.textContent = "Please enter a topic.";
        body.prepend(err);
      }
      return;
    }

    isGenerating = true;
    showLoadingState(topic);

    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, keywords }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error (${response.status})`);
      }

      // Close modal before filling fields
      closeModal();

      // Auto-fill CMS fields
      // Brief pause to let the modal close and DOM stabilize
      await sleep(300);
      const results = await autoFillFields(data);

      // Show success banner
      showSuccessBanner(results);
    } catch (error) {
      isGenerating = false;
      console.error("[AI Gen] Generation failed:", error);

      // Restore the form so user can try again
      const body = document.getElementById("ai-gen-modal-body");
      if (body && body.querySelector(".ai-gen-loading")) {
        body.innerHTML = `
          <div class="ai-gen-field">
            <label for="ai-gen-topic">Topic / Title Idea *</label>
            <input type="text" id="ai-gen-topic" value="${escapeHTML(topic)}" autocomplete="off" />
          </div>
          <div class="ai-gen-field">
            <label for="ai-gen-keywords">Target Keywords (optional)</label>
            <input type="text" id="ai-gen-keywords" value="${escapeHTML(keywords)}" autocomplete="off" />
          </div>
        `;
        // Reattach enter handler
        document.getElementById("ai-gen-topic")?.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !isGenerating) {
            e.preventDefault();
            handleGenerate();
          }
        });
      }
      showErrorState(error.message);
    }
  }

  // ────────────────────────────
  // Button Injection & Routing
  // ────────────────────────────

  function injectButton() {
    if (document.getElementById("ai-gen-fab")) return;

    const btn = document.createElement("button");
    btn.id = "ai-gen-fab";
    btn.type = "button";
    btn.innerHTML = "✨ Generate with AI";
    btn.addEventListener("click", openModal);
    document.body.appendChild(btn);
    buttonInjected = true;
  }

  function removeButton() {
    const btn = document.getElementById("ai-gen-fab");
    if (btn) btn.remove();
    buttonInjected = false;
  }

  /**
   * Determines if the current route is a blog post editor.
   * Decap CMS uses hash routing:
   *   New:  #/collections/blog/new
   *   Edit: #/collections/blog/entries/<slug>
   */
  function isEditorRoute() {
    const hash = window.location.hash || "";
    return (
      hash.includes("/collections/blog/new") ||
      hash.includes("/collections/blog/entries/")
    );
  }

  function checkRoute() {
    if (isEditorRoute()) {
      // Delay to let the CMS render the editor
      setTimeout(() => {
        // Verify the editor is actually rendered
        const hasFields = findFieldByLabel("Title");
        if (hasFields) {
          injectButton();
        }
      }, 800);
    } else {
      removeButton();
      closeModal();
    }
  }

  // ────────────────────────────
  // Helpers
  // ────────────────────────────

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  // ────────────────────────────
  // Initialization
  // ────────────────────────────

  function init() {
    injectStyles();

    // Poll for route changes (hash-based routing)
    let lastHash = "";
    setInterval(() => {
      const currentHash = window.location.hash;
      if (currentHash !== lastHash) {
        lastHash = currentHash;
        checkRoute();
      }
    }, 500);

    // Also observe DOM changes as a backup
    const observer = new MutationObserver(
      debounce(() => {
        if (isEditorRoute() && !buttonInjected) {
          const hasFields = findFieldByLabel("Title");
          if (hasFields) {
            injectButton();
          }
        }
      }, 500)
    );

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial check
    checkRoute();
  }

  // ── Start ──
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 1500));
  } else {
    setTimeout(init, 1500);
  }
})();
