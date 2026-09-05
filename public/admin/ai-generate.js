// ──────────────────────────────────────────────────────────
// Kritrimta — AI Generate Widget for Decap CMS
// Injects a "Generate with AI" button into the blog post
// editor that calls the Netlify serverless function and
// auto-fills CMS fields (Title, Description, Publish Date,
// Hero Image, Category, Tags, Author, Body) so you can
// immediately click Publish.
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
        bottom: 84px;
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
        max-width: 440px;
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
   * Decap CMS renders each field within a ControlContainer.
   * Inputs/textareas have id="${fieldName}-field-${id}"
   * Labels have htmlFor="${fieldName}-field-${id}"
   */
  function findFieldContainer(fieldName, labelText) {
    // 1. Direct match by id prefix
    const controlById = document.querySelector(`[id^="${fieldName}-field-"]`);
    if (controlById) {
      const container =
        controlById.closest('[class*="ControlContainer"]') ||
        controlById.closest('[class*="EditorControl"]') ||
        controlById.parentElement?.parentElement?.parentElement ||
        controlById.parentElement?.parentElement ||
        controlById.parentElement;
      return { container, control: controlById };
    }

    // 2. Direct match by label for attribute
    const labelByFor = document.querySelector(`label[for^="${fieldName}-field-"]`);
    if (labelByFor) {
      const forId = labelByFor.getAttribute("for");
      const ctrl = forId ? document.getElementById(forId) : null;
      const container =
        labelByFor.closest('[class*="ControlContainer"]') ||
        labelByFor.closest('[class*="EditorControl"]') ||
        labelByFor.parentElement?.parentElement ||
        labelByFor.parentElement;
      return { container, control: ctrl, label: labelByFor };
    }

    // 3. Fallback: match by label text (case-insensitive)
    const labels = document.querySelectorAll("label");
    const target = (labelText || fieldName).toLowerCase();
    for (const label of labels) {
      const text = label.textContent.trim().replace(/\s*\*$/, "").trim().toLowerCase();
      if (text === target || text.startsWith(target) || text.includes(target)) {
        const forId = label.getAttribute("for");
        const ctrl = forId ? document.getElementById(forId) : null;
        const container =
          label.closest('[class*="ControlContainer"]') ||
          label.closest('[class*="EditorControl"]') ||
          label.parentElement?.parentElement ||
          label.parentElement;
        return { container, control: ctrl, label };
      }
    }

    return null;
  }

  /**
   * Sets value for a React-controlled input or textarea.
   */
  function setNativeValue(element, value) {
    if (!element) return false;
    try {
      element.focus();
      const proto =
        element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (setter) {
        setter.call(element, value);
      } else {
        element.value = value;
      }
      element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
      element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
      element.blur();
      return true;
    } catch (e) {
      console.warn("[AI Gen] Failed to set native value:", e);
      return false;
    }
  }

  // ────────────────────────────
  // Field Setters
  // ────────────────────────────

  /** Set string field (Title, Author) */
  function fillStringField(fieldName, labelText, value) {
    const field = findFieldContainer(fieldName, labelText);
    if (!field) return false;

    const input =
      field.control ||
      field.container.querySelector('input[type="text"]') ||
      field.container.querySelector("input:not([type])") ||
      field.container.querySelector("input");
    return setNativeValue(input, value);
  }

  /** Set text field (Description) */
  function fillTextField(fieldName, labelText, value) {
    const field = findFieldContainer(fieldName, labelText);
    if (!field) return false;

    const textarea =
      field.control instanceof HTMLTextAreaElement
        ? field.control
        : field.container.querySelector("textarea") ||
          field.container.querySelector("input");
    return setNativeValue(textarea, value);
  }

  /** Set datetime field (Publish Date) */
  async function fillDateField(fieldName, labelText, dateStr) {
    const field = findFieldContainer(fieldName, labelText);
    if (!field) return false;

    // Strategy 1: Click the "Now" button if available in the widget
    const buttons = field.container.querySelectorAll("button");
    for (const btn of buttons) {
      const text = (btn.textContent || "").trim().toLowerCase();
      if (text === "now") {
        btn.click();
        await sleep(200);
        return true;
      }
    }

    // Strategy 2: Set input directly
    const input = field.control || field.container.querySelector("input");
    if (input) {
      const val = dateStr || new Date().toISOString().split("T")[0];
      return setNativeValue(input, val);
    }

    return false;
  }

  /** Set image field (Hero Image) */
  async function fillImageField(fieldName, labelText, imageUrl) {
    if (!imageUrl) return false;
    const field = findFieldContainer(fieldName, labelText);
    if (!field) return false;

    // Strategy 1: Intercept window.prompt when clicking "Insert from URL" or "Replace with URL"
    const buttons = field.container.querySelectorAll("button");
    let urlButton = null;
    for (const btn of buttons) {
      const text = (btn.textContent || "").toLowerCase();
      if (text.includes("url") || text.includes("insert") || text.includes("replace")) {
        urlButton = btn;
        break;
      }
    }

    if (urlButton) {
      const originalPrompt = window.prompt;
      try {
        window.prompt = () => imageUrl;
        urlButton.click();
        await sleep(350);
        return true;
      } catch (err) {
        console.warn("[AI Gen] Image prompt click error:", err);
      } finally {
        window.prompt = originalPrompt;
      }
    }

    // Strategy 2: Input element fallback
    const input = field.control || field.container.querySelector('input[type="text"]');
    if (input) {
      return setNativeValue(input, imageUrl);
    }

    return false;
  }

  /** Set react-select field (Category) */
  async function fillSelectField(fieldName, labelText, value) {
    const field = findFieldContainer(fieldName, labelText);
    if (!field) return false;

    const container = field.container;

    // Open dropdown
    const control =
      container.querySelector('[class*="control"]') ||
      container.querySelector('[class*="ValueContainer"]')?.parentElement ||
      container.querySelector('[class*="indicatorContainer"]')?.parentElement?.parentElement;

    if (control) {
      control.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
      await sleep(300);

      // Match option in document
      const allOptions = document.querySelectorAll('[class*="option"]');
      for (const opt of allOptions) {
        if (opt.textContent.trim().toLowerCase() === value.toLowerCase()) {
          opt.click();
          await sleep(200);
          return true;
        }
      }
    }

    // Native select fallback
    const nativeSelect = container.querySelector("select");
    if (nativeSelect) {
      nativeSelect.value = value;
      nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    return false;
  }

  /** Set tags list field */
  async function fillTagsField(fieldName, labelText, tags) {
    const field = findFieldContainer(fieldName, labelText);
    if (!field) return false;

    const container = field.container;
    let filled = 0;

    for (const tag of tags) {
      const input =
        container.querySelector('input[type="text"]') ||
        container.querySelector("input");
      if (!input) break;

      setNativeValue(input, tag);
      await sleep(100);

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

  /** Set markdown body field */
  async function fillMarkdownField(fieldName, labelText, value) {
    const field = findFieldContainer(fieldName, labelText);
    if (!field) return false;

    const container = field.container;

    // Strategy 1: Check if CodeMirror is used
    const cmElement = container.querySelector(".CodeMirror");
    if (cmElement && cmElement.CodeMirror) {
      cmElement.CodeMirror.setValue(value);
      cmElement.CodeMirror.save();
      return true;
    }

    // Strategy 2: Look for raw-mode textarea directly
    let textarea = container.querySelector("textarea");
    if (textarea) {
      return setNativeValue(textarea, value);
    }

    // Strategy 3: Click markdown/raw toggle button, then set textarea
    const buttons = container.querySelectorAll("button");
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
        textarea = container.querySelector("textarea");
        if (textarea) {
          return setNativeValue(textarea, value);
        }
      }
    }

    // Strategy 4: Rich text editor contenteditable
    const editable = container.querySelector('[contenteditable="true"]');
    if (editable) {
      editable.focus();
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, value);
      editable.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }

    return false;
  }

  // ────────────────────────────
  // Auto-fill Orchestrator
  // ────────────────────────────

  async function autoFillFields(data) {
    const results = { filled: [], manual: [] };

    // 1. Title
    if (fillStringField("title", "Title", data.title)) {
      results.filled.push("Title");
    } else {
      results.manual.push({ field: "Title", value: data.title });
    }

    // 2. Description
    if (fillTextField("description", "Description", data.description)) {
      results.filled.push("Description");
    } else {
      results.manual.push({ field: "Description", value: data.description });
    }

    // 3. Publish Date (REQUIRED in Decap CMS)
    const pubDateVal = data.pubDate || new Date().toISOString().split("T")[0];
    if (await fillDateField("pubDate", "Publish Date", pubDateVal)) {
      results.filled.push("Publish Date");
    } else {
      results.manual.push({ field: "Publish Date", value: pubDateVal });
    }

    // 4. Hero Image (Feature Image)
    if (data.heroImage) {
      if (await fillImageField("heroImage", "Hero Image", data.heroImage)) {
        results.filled.push("Hero Image");
      } else {
        results.manual.push({ field: "Hero Image", value: data.heroImage });
      }
    }

    // 5. Author
    if (data.author) {
      if (fillStringField("author", "Author", data.author)) {
        results.filled.push("Author");
      }
    }

    // 6. Category
    if (await fillSelectField("category", "Category", data.category)) {
      results.filled.push("Category");
    } else {
      results.manual.push({ field: "Category", value: data.category });
    }

    // 7. Tags
    if (data.tags && data.tags.length > 0) {
      if (await fillTagsField("tags", "Tags", data.tags)) {
        results.filled.push("Tags");
      } else {
        results.manual.push({
          field: "Tags",
          value: Array.isArray(data.tags) ? data.tags.join(", ") : data.tags,
        });
      }
    }

    // 8. Body (Markdown content)
    if (await fillMarkdownField("body", "Body", data.body)) {
      results.filled.push("Body");
    } else {
      results.manual.push({ field: "Body", value: data.body });
    }

    results.suggestedSlug = data.slug;
    return results;
  }

  // ────────────────────────────
  // Modal UI
  // ────────────────────────────

  function openModal() {
    if (modalElement) return;

    const overlay = document.createElement("div");
    overlay.id = "ai-gen-overlay";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay && !isGenerating) closeModal();
    });

    overlay.innerHTML = `
      <div id="ai-gen-modal">
        <div class="ai-gen-header">
          <h2>✨ Generate with AI</h2>
          <p>Enter a topic and let AI draft a complete blog post with feature image for Kritrimta.</p>
        </div>
        <div class="ai-gen-body" id="ai-gen-modal-body">
          <div class="ai-gen-field">
            <label for="ai-gen-topic">Topic / Title Idea *</label>
            <input type="text" id="ai-gen-topic"
                   placeholder="e.g. IPv4 vs IPv6: The Exhaustion Reality and Transition Cost"
                   autocomplete="off" />
          </div>
          <div class="ai-gen-field">
            <label for="ai-gen-keywords">Target Keywords (optional)</label>
            <input type="text" id="ai-gen-keywords"
                   placeholder="e.g. IPv4 exhaustion, IPv6 migration, dual-stack architecture"
                   autocomplete="off" />
          </div>
        </div>
        <div class="ai-gen-footer" id="ai-gen-modal-footer">
          <button class="ai-gen-btn ai-gen-btn-secondary" id="ai-gen-cancel">Cancel</button>
          <button class="ai-gen-btn ai-gen-btn-primary" id="ai-gen-submit">🚀 Generate & Auto-Fill</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    modalElement = overlay;

    setTimeout(() => {
      const topicInput = document.getElementById("ai-gen-topic");
      if (topicInput) topicInput.focus();
    }, 100);

    document.getElementById("ai-gen-cancel").addEventListener("click", () => {
      if (!isGenerating) closeModal();
    });

    document.getElementById("ai-gen-submit").addEventListener("click", handleGenerate);

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
        <p><strong>Writing post & generating feature image...</strong></p>
        <p>Drafting "${escapeHTML(topic)}" in Kritrimta's voice.<br/>All fields and hero image will be auto-filled ready for Publish.</p>
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
    const old = document.getElementById("ai-gen-success-banner");
    if (old) old.remove();

    const banner = document.createElement("div");
    banner.id = "ai-gen-success-banner";

    let html = `
      <button class="ai-success-close" onclick="this.parentElement.remove()">×</button>
      <p class="ai-success-title">✅ All Fields Auto-Filled!</p>
      <p class="ai-success-msg">
        Auto-filled: <strong>${results.filled.join(", ") || "all fields"}</strong>.<br/>
        Ready! Just review and click <strong>Publish</strong>.
      </p>
    `;

    if (results.manual.length > 0) {
      html += `
        <div class="ai-gen-fallback">
          <strong>⚠ Notice — review these fields:</strong>
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

    if (results.manual.length === 0) {
      setTimeout(() => banner.remove(), 12000);
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
      const endpoints = ["/.netlify/functions/generate-post", "/api/generate-post"];
      let response = null;
      let lastError = null;

      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic, keywords }),
          });
          if (res.status !== 404) {
            response = res;
            break;
          }
          response = res;
        } catch (e) {
          lastError = e;
        }
      }

      if (!response) {
        throw new Error(lastError ? lastError.message : "Network error — could not reach server.");
      }

      let data = {};
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch {
        if (response.status === 404) {
          throw new Error("Function endpoint not found (404).");
        }
        throw new Error(`Server returned status ${response.status}: ${responseText.slice(0, 120)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Server error (${response.status})`);
      }

      // Close modal before auto-filling
      closeModal();

      // Pause to allow DOM stabilization
      await sleep(350);

      // Auto-fill all CMS fields
      const results = await autoFillFields(data);

      // Show banner confirming auto-fill
      showSuccessBanner(results);
    } catch (error) {
      isGenerating = false;
      console.error("[AI Gen] Generation failed:", error);

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

  function isEditorRoute() {
    const hash = window.location.hash || "";
    return (
      hash.includes("/collections/blog/new") ||
      hash.includes("/collections/blog/entries/")
    );
  }

  function checkRoute() {
    if (isEditorRoute()) {
      setTimeout(() => {
        const hasFields = findFieldContainer("title", "Title");
        if (hasFields) {
          injectButton();
        }
      }, 700);
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

    let lastHash = "";
    setInterval(() => {
      const currentHash = window.location.hash;
      if (currentHash !== lastHash) {
        lastHash = currentHash;
        checkRoute();
      }
    }, 400);

    const observer = new MutationObserver(
      debounce(() => {
        if (isEditorRoute() && !buttonInjected) {
          const hasFields = findFieldContainer("title", "Title");
          if (hasFields) {
            injectButton();
          }
        }
      }, 400)
    );

    observer.observe(document.body, { childList: true, subtree: true });
    checkRoute();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 1200));
  } else {
    setTimeout(init, 1200);
  }
})();
