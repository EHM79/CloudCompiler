/**
 * CloudCode / CloudCompiler AI - Client-side Application
 * Handles CodeMirror 6 with graceful built-in editor fallback,
 * code execution via Judge0, Gemini AI debugging, and snippet management.
 */

// ==============================================================================
// Starter Templates matching the PDF design
// ==============================================================================
const TEMPLATES = {
  cpp: `#include <iostream>
using namespace std;

int main() {
    int n, sum = 0;
    cin >> n;
    for (int i = 1; i <= n; i++) {
        sum += i;
    }
    cout << sum << endl;
    return 0;
}`,
  python: `def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

numbers = [1, 3, 5, 7, 9, 11, 13, 17, 19]
target = 7
idx = binary_search(numbers, target)
print(f"Found {target} at index: {idx}")`,
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello CloudCode from Java!");
        for (int i = 1; i <= 3; i++) {
            System.out.println("Step " + i + ": Running smoothly.");
        }
    }
}`,
  javascript: `console.log("Hello from CloudCode!");
const sum = (n) => (n * (n + 1)) / 2;
console.log("Sum 1..10 =", sum(10));`
};

// ==============================================================================
// State Management
// ==============================================================================
const state = {
  currentLanguage: "cpp",
  activeSnippetId: null,
  editorInstance: null,
  isCodeMirror: false,
  recentRuns: [],
  snippets: []
};

 

// ==============================================================================
// User & Authentication State
// ==============================================================================
const userState = {
  id: null,
  username: "",
  email: "",
  isLoggedIn: false,
};

let authMode = "login"; // "login" | "register"

// ==============================================================================
// DOM Elements
// ==============================================================================
const dom = {
  // Navigation & User
  navCompiler: document.getElementById("nav-compiler"),
  navSnippets: document.getElementById("nav-snippets"),
  navHelp: document.getElementById("nav-help"),
  brandLogo: document.getElementById("brand-logo"),
  userBadge: document.getElementById("user-badge"),
  userDisplayName: document.getElementById("user-display-name"),
  btnLogout: document.getElementById("btn-logout"),
  btnLoginNav: document.getElementById("btn-login-nav"),

  // Auth Modal
  authModal: document.getElementById("auth-modal"),
  authModalTitle: document.getElementById("auth-modal-title"),
  btnCloseAuth: document.getElementById("btn-close-auth"),
  btnCancelAuth: document.getElementById("btn-cancel-auth"),
  authForm: document.getElementById("auth-form"),
  authInputName: document.getElementById("auth-input-name"),
  authInputEmail: document.getElementById("auth-input-email"),
  authInputPassword: document.getElementById("auth-input-password"),
  authErrorMsg: document.getElementById("auth-error-msg"),
  tabAuthLogin: document.getElementById("tab-auth-login"),
  tabAuthRegister: document.getElementById("tab-auth-register"),
  groupAuthName: document.getElementById("group-auth-name"),
  authHintText: document.getElementById("auth-hint-text"),
  btnSaveAuth: document.getElementById("btn-save-auth"),

  // Views
  viewCompiler: document.getElementById("view-compiler"),
  viewSnippets: document.getElementById("view-snippets"),
  helpModal: document.getElementById("help-modal"),
  btnCloseHelp: document.getElementById("btn-close-help"),
  btnHelpGotIt: document.getElementById("btn-help-got-it"),

  // Toolbar
  snippetTitle: document.getElementById("snippet-title"),
  languageSelect: document.getElementById("language-select"),
  statusPill: document.getElementById("status-pill"),
  statusDot: document.getElementById("status-dot"),
  statusText: document.getElementById("status-text"),
  btnRun: document.getElementById("btn-run"),
  btnSave: document.getElementById("btn-save"),
  btnAiExplain: document.getElementById("btn-ai-explain"),

  // Workspace
  editorContainer: document.getElementById("editor-container"),
  editorTarget: document.getElementById("editor"),
  editorStats: document.getElementById("editor-stats"),
  stdin: document.getElementById("stdin"),
  btnClearStdin: document.getElementById("btn-clear-stdin"),

  // Tabs & Output
  tabButtons: document.querySelectorAll(".tab-btn"),
  tabContents: document.querySelectorAll(".tab-content"),
  outputStdout: document.getElementById("output-stdout"),
  outputStderr: document.getElementById("output-stderr"),
  outputCompile: document.getElementById("output-compile"),
  aiLoading: document.getElementById("ai-loading"),
  aiContent: document.getElementById("ai-content"),
  btnCopyOutput: document.getElementById("btn-copy-output"),
  metricTime: document.getElementById("metric-time"),
  metricMem: document.getElementById("metric-mem"),
  metricExit: document.getElementById("metric-exit"),

  // Recent Runs
  recentRunsList: document.getElementById("recent-runs-list"),
  btnClearRuns: document.getElementById("btn-clear-runs"),

  // Snippets
  snippetsGrid: document.getElementById("snippets-grid"),
  snippetSearch: document.getElementById("snippet-search"),
  btnNewSnippet: document.getElementById("btn-new-snippet"),

  // Toast
  toast: document.getElementById("toast")
};

// ==============================================================================
// Toast Notification
// ==============================================================================
function showToast(message, isError = false) {
  if (!dom.toast) return;
  dom.toast.textContent = message;
  dom.toast.className = `toast ${isError ? "error" : ""}`;
  setTimeout(() => {
    dom.toast.className = "toast hidden";
  }, 3200);
}

// ==============================================================================
// Authentication & User UI Helpers
// ==============================================================================
function updateUserUI() {
  if (userState.isLoggedIn) {
    if (dom.userBadge) dom.userBadge.classList.remove("hidden");
    if (dom.btnLoginNav) dom.btnLoginNav.classList.add("hidden");
    if (dom.userDisplayName) dom.userDisplayName.textContent = userState.username || "Developer";
  } else {
    if (dom.userBadge) dom.userBadge.classList.add("hidden");
    if (dom.btnLoginNav) dom.btnLoginNav.classList.remove("hidden");
  }
}

async function initAuth() {
  try {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      if (data?.user?.isLoggedIn) {
        userState.id = data.user.id;
        userState.username = data.user.username;
        userState.email = data.user.email;
        userState.isLoggedIn = true;
      } else {
        userState.isLoggedIn = false;
      }
    }
  } catch {
    userState.isLoggedIn = false;
  }
  updateUserUI();
}

function setAuthMode(mode) {
  authMode = mode;
  if (dom.authErrorMsg) dom.authErrorMsg.style.display = "none";

  if (mode === "register") {
    if (dom.tabAuthRegister) dom.tabAuthRegister.classList.add("active-auth-tab");
    if (dom.tabAuthLogin) dom.tabAuthLogin.classList.remove("active-auth-tab");
    if (dom.groupAuthName) dom.groupAuthName.classList.remove("hidden");
    if (dom.authInputName) dom.authInputName.setAttribute("required", "required");
    if (dom.authModalTitle) dom.authModalTitle.textContent = "Create an Account";
    if (dom.authHintText) dom.authHintText.textContent = "Register to sync your personal code snippets securely.";
    if (dom.btnSaveAuth) dom.btnSaveAuth.textContent = "Create Account";
    if (dom.authInputName) dom.authInputName.focus();
  } else {
    if (dom.tabAuthLogin) dom.tabAuthLogin.classList.add("active-auth-tab");
    if (dom.tabAuthRegister) dom.tabAuthRegister.classList.remove("active-auth-tab");
    if (dom.groupAuthName) dom.groupAuthName.classList.add("hidden");
    if (dom.authInputName) dom.authInputName.removeAttribute("required");
    if (dom.authModalTitle) dom.authModalTitle.textContent = "Sign In to CloudCode";
    if (dom.authHintText) dom.authHintText.textContent = "Sign in to access your personal code snippets.";
    if (dom.btnSaveAuth) dom.btnSaveAuth.textContent = "Sign In";
    if (dom.authInputEmail) dom.authInputEmail.focus();
  }
}

function openAuthModal(isRegister = false) {
  if (!dom.authModal) return;
  setAuthMode(isRegister ? "register" : "login");
  if (dom.authErrorMsg) dom.authErrorMsg.style.display = "none";
  if (dom.authInputPassword) dom.authInputPassword.value = "";
  dom.authModal.classList.remove("hidden");
}

function closeAuthModal() {
  if (dom.authModal) dom.authModal.classList.add("hidden");
  if (dom.authErrorMsg) dom.authErrorMsg.style.display = "none";
}

async function loginUser(email, password) {
  if (dom.authErrorMsg) dom.authErrorMsg.style.display = "none";

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }

    userState.id = data.user.id;
    userState.username = data.user.username;
    userState.email = data.user.email;
    userState.isLoggedIn = true;

    updateUserUI();
    closeAuthModal();
    showToast(`Welcome back, ${data.user.username}!`);
    fetchSnippets();
  } catch (err) {
    if (dom.authErrorMsg) {
      dom.authErrorMsg.textContent = err.message;
      dom.authErrorMsg.style.display = "block";
    }
  }
}

async function registerUser(username, email, password) {
  if (dom.authErrorMsg) dom.authErrorMsg.style.display = "none";

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Registration failed");
    }

    userState.id = data.user.id;
    userState.username = data.user.username;
    userState.email = data.user.email;
    userState.isLoggedIn = true;

    updateUserUI();
    closeAuthModal();
    showToast(`Welcome to CloudCode, ${data.user.username}!`);
    fetchSnippets();
  } catch (err) {
    if (dom.authErrorMsg) {
      dom.authErrorMsg.textContent = err.message;
      dom.authErrorMsg.style.display = "block";
    }
  }
}

async function logoutUser() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {}

  userState.id = null;
  userState.username = "";
  userState.email = "";
  userState.isLoggedIn = false;

  updateUserUI();
  state.snippets = [];
  renderSnippets();
  showToast("Logged out successfully.");
}

// ==============================================================================
// Fallback Code Editor (Built-in standalone with line numbers & tab support)
// ==============================================================================
class StandaloneEditor {
  constructor(container, initialCode, onUpdate) {
    this.container = container;
    this.container.innerHTML = "";
    this.onUpdate = onUpdate;

    this.wrapper = document.createElement("div");
    this.wrapper.className = "fallback-editor-container";

    this.gutters = document.createElement("div");
    this.gutters.className = "fallback-gutters";

    this.textareaWrap = document.createElement("div");
    this.textareaWrap.className = "fallback-textarea-wrap";

    this.textarea = document.createElement("textarea");
    this.textarea.className = "fallback-textarea";
    this.textarea.value = initialCode || "";
    this.textarea.setAttribute("spellcheck", "false");
    this.textarea.setAttribute("autocomplete", "off");
    this.textarea.setAttribute("autocorrect", "off");
    this.textarea.setAttribute("autocapitalize", "off");

    this.textareaWrap.appendChild(this.textarea);
    this.wrapper.appendChild(this.gutters);
    this.wrapper.appendChild(this.textareaWrap);
    this.container.appendChild(this.wrapper);

    this.bindEvents();
    this.updateLineNumbers();
  }

  bindEvents() {
    this.textarea.addEventListener("input", () => {
      this.updateLineNumbers();
      this.updateCursorStats();
      if (this.onUpdate) this.onUpdate(this.getValue());
    });

    this.textarea.addEventListener("scroll", () => {
      this.gutters.scrollTop = this.textarea.scrollTop;
    });

    this.textarea.addEventListener("keydown", (e) => {
      // Tab key indent (4 spaces)
      if (e.key === "Tab") {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const val = this.textarea.value;
        this.textarea.value = val.substring(0, start) + "    " + val.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 4;
        this.updateLineNumbers();
        this.updateCursorStats();
        if (this.onUpdate) this.onUpdate(this.getValue());
      }
    });

    this.textarea.addEventListener("keyup", () => this.updateCursorStats());
    this.textarea.addEventListener("click", () => this.updateCursorStats());
  }

  updateLineNumbers() {
    const lines = this.textarea.value.split("\n").length;
    let gutterHTML = "";
    for (let i = 1; i <= lines; i++) {
      gutterHTML += `<div>${i}</div>`;
    }
    this.gutters.innerHTML = gutterHTML;
  }

  updateCursorStats() {
    const pos = this.textarea.selectionStart;
    const textBefore = this.textarea.value.substring(0, pos);
    const lines = textBefore.split("\n");
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    if (dom.editorStats) {
      dom.editorStats.textContent = `Line ${line}, Col ${col}`;
    }
  }

  getValue() {
    return this.textarea.value;
  }

  setValue(val) {
    this.textarea.value = val;
    this.updateLineNumbers();
    this.updateCursorStats();
  }

  focus() {
    this.textarea.focus();
  }
}

// ==============================================================================
// Initialize Editor (CodeMirror 6 with Fallback)
// ==============================================================================
async function initEditor() {
  const initialDoc = TEMPLATES.cpp;

  try {
    // Attempt dynamic import of CodeMirror 6 from esm.sh
    const { EditorView, basicSetup } = await import("https://esm.sh/codemirror@6.0.1?bundle");
    const { Compartment } = await import("https://esm.sh/@codemirror/state@6.4.1?bundle");
    const { cpp } = await import("https://esm.sh/@codemirror/lang-cpp@6.0.2?bundle");
    const { python } = await import("https://esm.sh/@codemirror/lang-python@6.1.6?bundle");
    const { java } = await import("https://esm.sh/@codemirror/lang-java@6.0.1?bundle");
    const { javascript } = await import("https://esm.sh/@codemirror/lang-javascript@6.2.2?bundle");
    const { oneDark } = await import("https://esm.sh/@codemirror/theme-one-dark@6.1.2?bundle");

    const languageConf = new Compartment();
    const langMap = { cpp, python, java, javascript };

    const cmView = new EditorView({
      doc: initialDoc,
      extensions: [
        basicSetup,
        oneDark,
        languageConf.of(cpp()),
        EditorView.updateListener.of((update) => {
          if (update.selectionSet || update.docChanged) {
            const cursor = update.state.selection.main.head;
            const line = update.state.doc.lineAt(cursor);
            const col = cursor - line.from + 1;
            if (dom.editorStats) {
              dom.editorStats.textContent = `Line ${line.number}, Col ${col}`;
            }
          }
        })
      ],
      parent: dom.editorTarget
    });

    state.isCodeMirror = true;
    state.editorInstance = {
      getValue: () => cmView.state.doc.toString(),
      setValue: (val) => {
        cmView.dispatch({
          changes: { from: 0, to: cmView.state.doc.length, insert: val }
        });
      },
      setLanguage: (lang) => {
        if (langMap[lang]) {
          cmView.dispatch({
            effects: languageConf.reconfigure(langMap[lang]())
          });
        }
      },
      focus: () => cmView.focus()
    };
    console.log("✅ CodeMirror 6 initialized successfully.");
  } catch (err) {
    console.warn("⚠️ CodeMirror 6 CDN unavailable, launching built-in standalone editor:", err);
    const fallback = new StandaloneEditor(dom.editorTarget, initialDoc);
    state.isCodeMirror = false;
    state.editorInstance = {
      getValue: () => fallback.getValue(),
      setValue: (val) => fallback.setValue(val),
      setLanguage: () => {},
      focus: () => fallback.focus()
    };
  }
}

// ==============================================================================
// Language Switching
// ==============================================================================
function handleLanguageChange(newLang) {
  state.currentLanguage = newLang;
  const template = TEMPLATES[newLang] || "";

  // Ask confirmation if code was modified or switch smoothly
  if (state.editorInstance) {
    state.editorInstance.setValue(template);
    if (state.editorInstance.setLanguage) {
      state.editorInstance.setLanguage(newLang);
    }
  }

  // Adjust default stdin for C++ Sum of 1..N
  if (newLang === "cpp") {
    dom.stdin.value = "5";
  } else {
    dom.stdin.value = "";
  }
}

// ==============================================================================
// Tab Switching
// ==============================================================================
function switchTab(tabId) {
  dom.tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  dom.tabContents.forEach((content) => {
    content.classList.toggle("active", content.id === tabId);
  });
}

// ==============================================================================
// Status Indicator Helper
// ==============================================================================
function setStatus(statusType, text) {
  dom.statusDot.className = `status-dot ${statusType}`;
  dom.statusText.textContent = text;
}

// ==============================================================================
// Code Execution: POST /api/run
// ==============================================================================
async function runCode() {
  const code = state.editorInstance ? state.editorInstance.getValue() : "";
  const language = dom.languageSelect.value;
  const stdin = dom.stdin.value;

  if (!code.trim()) {
    showToast("Please enter some code to execute.", true);
    return;
  }

  // Set running state
  dom.btnRun.disabled = true;
  dom.btnAiExplain.disabled = true;
  setStatus("running", "Running...");

  dom.outputStdout.textContent = "Executing code...";
  dom.outputStdout.classList.remove("empty-notice");

  try {
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language, stdin })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    // Populate Output tabs
    const stdout = data.stdout || "";
    const stderr = data.stderr || "";
    const compile = data.compile_output || "";

    dom.outputStdout.textContent = stdout || "(No standard output)";
    dom.outputStdout.classList.toggle("empty-notice", !stdout);

    dom.outputStderr.textContent = stderr || "No runtime errors.";
    dom.outputStderr.classList.toggle("empty-notice", !stderr);

    dom.outputCompile.textContent = compile || "No compilation warnings or errors.";
    dom.outputCompile.classList.toggle("empty-notice", !compile);

    const errorBanner = document.getElementById("error-ai-banner");
    const compileBanner = document.getElementById("compile-ai-banner");
    if (errorBanner) errorBanner.classList.toggle("hidden", !stderr);
    if (compileBanner) compileBanner.classList.toggle("hidden", !compile);

    // Update Metrics
    dom.metricTime.textContent = `Time: ${data.time || "0.00s"}`;
    dom.metricMem.textContent = `Memory: ${data.memory || "0 MB"}`;
    dom.metricExit.textContent = `Exit: ${data.exit_code !== undefined ? data.exit_code : 0}`;

    // Determine status from server response
    const statusLabel = data.status || "Completed";
    const isTLE = statusLabel === "Time Limit Exceeded";
    const isCompileErr = statusLabel === "Compilation Error";
    const isRuntimeErr = statusLabel === "Runtime Error";
    const isError = Boolean(isTLE || isCompileErr || isRuntimeErr || stderr || compile || (data.exit_code && data.exit_code !== 0));

    if (isTLE) {
      setStatus("error", "Time Limit Exceeded");
      dom.outputStderr.textContent = "⏱ تجاوز الوقت المسموح — تأكد من عدم وجود حلقة لا نهائية.";
      dom.outputStderr.classList.remove("empty-notice");
      switchTab("tab-errors");
    } else if (isError) {
      setStatus("error", statusLabel);
      if (!stdout && stderr) {
        switchTab("tab-errors");
      } else if (!stdout && compile) {
        switchTab("tab-compile");
      }
    } else {
      setStatus("completed", "Completed");
      switchTab("tab-output");
    }

    // Record run into Recent Runs
    const langDisplay = language === "cpp" ? "C++" : language.charAt(0).toUpperCase() + language.slice(1);
    addRecentRun({
      status: isError ? "error" : "completed",
      lang: langDisplay,
      label: `${statusLabel} · ${langDisplay}`,
      time: "Just now",
      stdout,
      stderr,
      compile,
      metrics: {
        time: data.time || "0.01s",
        mem: data.memory || "1.0 MB",
        exit: data.exit_code || 0
      }
    });

  } catch (err) {
    setStatus("error", "Error");
    dom.outputStderr.textContent = `Network / Server Error: ${err.message}`;
    dom.outputStderr.classList.remove("empty-notice");
    switchTab("tab-errors");
    showToast(`Execution failed: ${err.message}`, true);
  } finally {
    dom.btnRun.disabled = false;
    dom.btnAiExplain.disabled = false;
  }
}

// ==============================================================================
// AI Debugging / Error Explanation: POST /api/debug
// ==============================================================================
async function explainWithAI() {
  if (!userState.isLoggedIn) {
    switchTab("tab-ai");
    dom.aiLoading.classList.add("hidden");
    dom.aiContent.innerHTML = `<p class="console-box" style="color: var(--accent-cyan);">Please sign in to use the AI Debugging Assistant.</p>`;
    openAuthModal(false);
    showToast("Please sign in to use AI Debugging.", true);
    return;
  }

  const code = state.editorInstance ? state.editorInstance.getValue() : "";
  const language = dom.languageSelect.value;
  const stdin = dom.stdin.value;
  const error = dom.outputStderr.textContent !== "No runtime errors." ? dom.outputStderr.textContent : "";
  const compile = dom.outputCompile.textContent !== "No compilation warnings or errors." ? dom.outputCompile.textContent : "";
  const output = dom.outputStdout.textContent !== "(No standard output)" ? dom.outputStdout.textContent : "";

  switchTab("tab-ai");
  dom.aiLoading.classList.remove("hidden");
  dom.aiContent.innerHTML = "";
  dom.btnAiExplain.disabled = true;

  try {
    const res = await fetch("/api/debug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        language,
        error: error || compile,
        output,
        stdin
      })
    });

    const data = await res.json();
    dom.aiLoading.classList.add("hidden");

    if (!res.ok) {
      throw new Error(data.error || "AI Debugging failed");
    }

    if (data.explanation) {
      dom.aiContent.innerHTML = renderMarkdown(data.explanation);
    } else {
      dom.aiContent.innerHTML = `<p class="empty-notice">No explanation returned from AI.</p>`;
    }
  } catch (err) {
    dom.aiLoading.classList.add("hidden");
    dom.aiContent.innerHTML = `<p class="console-box" style="color: var(--accent-red);">Failed to connect to AI debugger: ${err.message}</p>`;
  } finally {
    dom.btnAiExplain.disabled = false;
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Lightweight Markdown Renderer for AI responses
function renderMarkdown(md) {
  const codeBlocks = [];
  let processed = md.replace(/```(?:([a-zA-Z0-9_+-]+)?\n)?([\s\S]*?)```/gim, (match, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push({ lang: lang || "code", code: code.trim() });
    return `__CODE_BLOCK_${idx}__`;
  });

  processed = processed
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/^\> (.*$)/gim, "<blockquote>$1</blockquote>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/gim, "<em>$1</em>")
    .replace(/`([^`]+)`/gim, (m, inlineCode) => `<code>${escapeHtml(inlineCode)}</code>`)
    .replace(/^\- (.*$)/gim, "<li>$1</li>")
    .replace(/\n\n/gim, "<br><br>");

  processed = processed.replace(/__CODE_BLOCK_(\d+)__/g, (match, idx) => {
    const block = codeBlocks[Number(idx)];
    const escaped = escapeHtml(block.code);
    const encoded = encodeURIComponent(block.code);
    return `
      <div class="ai-code-wrapper">
        <div class="ai-code-header">
          <span class="ai-code-lang">${block.lang.toUpperCase()}</span>
          <div class="ai-code-actions">
            <button type="button" class="btn-copy-code" data-code="${encoded}">Copy</button>
            <button type="button" class="btn-apply-code" data-code="${encoded}">Apply to Editor</button>
          </div>
        </div>
        <pre><code>${escaped}</code></pre>
      </div>
    `;
  });

  return processed;
}

// ==============================================================================
// Recent Runs
// ==============================================================================
function addRecentRun(runData) {
  runData.id = Date.now();
  state.recentRuns.unshift(runData);
  if (state.recentRuns.length > 8) {
    state.recentRuns.pop();
  }
  renderRecentRuns();
}

function renderRecentRuns() {
  if (!dom.recentRunsList) return;
  dom.recentRunsList.innerHTML = "";

  state.recentRuns.forEach((run) => {
    const li = document.createElement("li");
    li.className = "run-item";
    li.dataset.runId = run.id;

    li.innerHTML = `
      <div class="run-info">
        <span class="run-status-dot ${run.status}"></span>
        <span class="run-name">${run.label}</span>
      </div>
      <span class="run-time">${run.time}</span>
    `;

    li.addEventListener("click", () => {
      dom.outputStdout.textContent = run.stdout || "(No standard output)";
      dom.outputStderr.textContent = run.stderr || "No runtime errors.";
      dom.outputCompile.textContent = run.compile || "No compilation warnings or errors.";
      dom.metricTime.textContent = `Time: ${run.metrics.time}`;
      dom.metricMem.textContent = `Memory: ${run.metrics.mem}`;
      dom.metricExit.textContent = `Exit: ${run.metrics.exit}`;

      if (run.status === "error") {
        setStatus("error", "Error");
        switchTab(run.stderr ? "tab-errors" : "tab-compile");
      } else {
        setStatus("completed", "Completed");
        switchTab("tab-output");
      }
    });

    dom.recentRunsList.appendChild(li);
  });
}

// ==============================================================================
// Snippets Management
// ==============================================================================
async function fetchSnippets() {
  if (!userState.isLoggedIn) {
    state.snippets = [];
    renderSnippets();
    return;
  }

  try {
    const res = await fetch("/api/snippets");
    if (res.ok) {
      state.snippets = await res.json();
    } else if (res.status === 401) {
      state.snippets = [];
    }
  } catch (err) {
    console.warn("Could not fetch snippets from server:", err);
  }
  renderSnippets();
}

function renderSnippets(filterQuery = "") {
  if (!dom.snippetsGrid) return;
  dom.snippetsGrid.innerHTML = "";

  if (!userState.isLoggedIn) {
    dom.snippetsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--text-dim); padding: 3rem 0;">
        <p style="margin-bottom: 1rem;">Please sign in to view and manage your code snippets.</p>
        <button type="button" class="btn btn-primary" id="btn-snippets-login">Sign In</button>
      </div>
    `;
    const btn = document.getElementById("btn-snippets-login");
    if (btn) btn.addEventListener("click", () => openAuthModal(false));
    return;
  }

  const query = filterQuery.toLowerCase().trim();
  const filtered = state.snippets.filter((s) => s.title.toLowerCase().includes(query));

  if (filtered.length === 0) {
    dom.snippetsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--text-dim); padding: 3rem 0;">
        No snippets found matching "${filterQuery}".
      </div>
    `;
    return;
  }

  filtered.forEach((snippet) => {
    const card = document.createElement("div");
    card.className = "snippet-card";

    const langName = snippet.language === "cpp" ? "C++" : snippet.language.charAt(0).toUpperCase() + snippet.language.slice(1);

    card.innerHTML = `
      <div class="snippet-top">
        <div>
          <div class="snippet-name" title="${snippet.title}">${snippet.title}</div>
          <div class="snippet-date">${snippet.updated || "Recently"}</div>
        </div>
        <span class="lang-badge">${langName}</span>
      </div>
      <div class="snippet-bottom">
        <button class="btn-open-snippet" data-id="${snippet.id}">Open</button>
        <button class="btn-delete-snippet" data-id="${snippet.id}">Delete</button>
      </div>
    `;

    // Open Handler
    card.querySelector(".btn-open-snippet").addEventListener("click", () => {
      openSnippet(snippet);
    });

    // Delete Handler
    card.querySelector(".btn-delete-snippet").addEventListener("click", async () => {
      if (confirm(`Delete snippet "${snippet.title}"?`)) {
        await deleteSnippet(snippet.id);
      }
    });

    dom.snippetsGrid.appendChild(card);
  });
}

function openSnippet(snippet) {
  state.activeSnippetId = snippet.id;
  dom.snippetTitle.value = snippet.title;
  dom.languageSelect.value = snippet.language;
  state.currentLanguage = snippet.language;

  if (state.editorInstance) {
    state.editorInstance.setValue(snippet.code);
    if (state.editorInstance.setLanguage) {
      state.editorInstance.setLanguage(snippet.language);
    }
  }

  dom.stdin.value = snippet.stdin || "";

  switchView("compiler");
  showToast(`Loaded "${snippet.title}"`);
}

async function saveCurrentSnippet() {
  if (!userState.isLoggedIn) {
    showToast("Please sign in to save your snippet.", true);
    openAuthModal(false);
    return;
  }

  const code = state.editorInstance ? state.editorInstance.getValue() : "";
  const title = dom.snippetTitle.value.trim() || "Untitled Snippet";
  const language = dom.languageSelect.value;
  const stdin = dom.stdin.value;

  try {
    const res = await fetch("/api/snippets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: state.activeSnippetId,
        title,
        language,
        code,
        stdin
      })
    });

    if (res.ok) {
      const saved = await res.json();
      state.activeSnippetId = saved.id;
      showToast(`Snippet "${title}" saved!`);
      fetchSnippets();
    } else {
      const errData = await res.json().catch(() => ({}));
      showToast(errData.error || "Error saving snippet.", true);
    }
  } catch (err) {
    showToast("Network error while saving.", true);
  }
}

async function deleteSnippet(snippetId) {
  if (!userState.isLoggedIn) {
    showToast("Please sign in to manage snippets.", true);
    openAuthModal(false);
    return;
  }

  try {
    const res = await fetch(`/api/snippets/${snippetId}`, { method: "DELETE" });
    if (res.ok) {
      if (state.activeSnippetId === snippetId) {
        state.activeSnippetId = null;
      }
      state.snippets = state.snippets.filter((s) => s.id !== snippetId);
      renderSnippets(dom.snippetSearch.value);
      showToast("Snippet deleted.");
    } else {
      const errData = await res.json().catch(() => ({}));
      showToast(errData.error || "Failed to delete snippet.", true);
    }
  } catch (err) {
    showToast("Failed to delete snippet.", true);
  }
}

function createNewSnippet() {
  state.activeSnippetId = null;
  dom.snippetTitle.value = "Untitled Snippet";
  const curLang = dom.languageSelect.value;
  if (state.editorInstance) {
    state.editorInstance.setValue(TEMPLATES[curLang] || "");
  }
  dom.stdin.value = "";
  switchView("compiler");
  dom.snippetTitle.focus();
  dom.snippetTitle.select();
}

// ==============================================================================
// Views & Navigation
// ==============================================================================
function switchView(viewName) {
  if (viewName === "compiler") {
    dom.viewCompiler.classList.add("active");
    dom.viewSnippets.classList.remove("active");
    dom.navCompiler.classList.add("active");
    dom.navSnippets.classList.remove("active");
  } else if (viewName === "snippets") {
    dom.viewCompiler.classList.remove("active");
    dom.viewSnippets.classList.add("active");
    dom.navCompiler.classList.remove("active");
    dom.navSnippets.classList.add("active");
    fetchSnippets();
  } else if (viewName === "help") {
    dom.helpModal.classList.remove("hidden");
  }
}

// ==============================================================================
// Event Listeners
// ==============================================================================
function setupEventListeners() {
  // Navigation
  dom.navCompiler.addEventListener("click", () => switchView("compiler"));
  dom.navSnippets.addEventListener("click", () => switchView("snippets"));
  dom.navHelp.addEventListener("click", () => switchView("help"));
  dom.brandLogo.addEventListener("click", () => switchView("compiler"));

  // Help Modal Close
  dom.btnCloseHelp.addEventListener("click", () => dom.helpModal.classList.add("hidden"));
  dom.btnHelpGotIt.addEventListener("click", () => dom.helpModal.classList.add("hidden"));
  dom.helpModal.addEventListener("click", (e) => {
    if (e.target === dom.helpModal) dom.helpModal.classList.add("hidden");
  });

  // User Authentication & Profile
  if (dom.btnLogout) {
    dom.btnLogout.addEventListener("click", (e) => {
      e.stopPropagation();
      logoutUser();
    });
  }

  if (dom.userBadge) {
    dom.userBadge.addEventListener("click", () => {
      openAuthModal(false);
    });
  }

  if (dom.btnLoginNav) {
    dom.btnLoginNav.addEventListener("click", () => {
      openAuthModal(false);
    });
  }

  if (dom.tabAuthLogin) {
    dom.tabAuthLogin.addEventListener("click", () => setAuthMode("login"));
  }

  if (dom.tabAuthRegister) {
    dom.tabAuthRegister.addEventListener("click", () => setAuthMode("register"));
  }

  if (dom.btnCloseAuth) dom.btnCloseAuth.addEventListener("click", closeAuthModal);
  if (dom.btnCancelAuth) dom.btnCancelAuth.addEventListener("click", closeAuthModal);
  if (dom.authModal) {
    dom.authModal.addEventListener("click", (e) => {
      if (e.target === dom.authModal) closeAuthModal();
    });
  }

  if (dom.authForm) {
    dom.authForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = dom.authInputEmail.value.trim();
      const password = dom.authInputPassword.value;

      if (authMode === "register") {
        const username = dom.authInputName.value.trim();
        registerUser(username, email, password);
      } else {
        loginUser(email, password);
      }
    });
  }

  // Language Change
  dom.languageSelect.addEventListener("change", (e) => {
    handleLanguageChange(e.target.value);
  });

  // Run Code
  dom.btnRun.addEventListener("click", runCode);

  // Save Code
  dom.btnSave.addEventListener("click", saveCurrentSnippet);

  // AI Explain
  dom.btnAiExplain.addEventListener("click", explainWithAI);
  const btnAskAiError = document.getElementById("btn-ask-ai-error");
  const btnAskAiCompile = document.getElementById("btn-ask-ai-compile");
  if (btnAskAiError) btnAskAiError.addEventListener("click", explainWithAI);
  if (btnAskAiCompile) btnAskAiCompile.addEventListener("click", explainWithAI);

  // AI Content Actions (Copy Code / Apply to Editor)
  dom.aiContent.addEventListener("click", (e) => {
    const copyBtn = e.target.closest(".btn-copy-code");
    if (copyBtn) {
      const code = decodeURIComponent(copyBtn.dataset.code || "");
      navigator.clipboard.writeText(code).then(() => {
        showToast("Code copied to clipboard!");
      });
      return;
    }

    const applyBtn = e.target.closest(".btn-apply-code");
    if (applyBtn) {
      const code = decodeURIComponent(applyBtn.dataset.code || "");
      if (state.editorInstance && code) {
        state.editorInstance.setValue(code);
        switchTab("tab-output");
        showToast("Applied AI fix to editor!");
      }
      return;
    }
  });

  // Clear Stdin
  dom.btnClearStdin.addEventListener("click", () => {
    dom.stdin.value = "";
    dom.stdin.focus();
  });

  // Clear Recent Runs
  dom.btnClearRuns.addEventListener("click", () => {
    state.recentRuns = [];
    renderRecentRuns();
  });

  // Copy Output
  dom.btnCopyOutput.addEventListener("click", () => {
    const activeTab = document.querySelector(".tab-content.active");
    const text = activeTab ? activeTab.textContent : dom.outputStdout.textContent;
    navigator.clipboard.writeText(text).then(() => {
      showToast("Output copied to clipboard!");
    }).catch(() => {
      showToast("Could not copy output.", true);
    });
  });

  // Tabs
  dom.tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Snippets Search
  dom.snippetSearch.addEventListener("input", (e) => {
    renderSnippets(e.target.value);
  });

  // New Snippet
  dom.btnNewSnippet.addEventListener("click", createNewSnippet);

  // Keyboard Shortcuts
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runCode();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveCurrentSnippet();
    }
    if (e.key === "Escape") {
      if (dom.helpModal && !dom.helpModal.classList.contains("hidden")) dom.helpModal.classList.add("hidden");
      if (dom.authModal && !dom.authModal.classList.contains("hidden")) closeAuthModal();
    }
  });
}

// ==============================================================================
// App Initialization
// ==============================================================================
window.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await initAuth();
  await initEditor();
  renderRecentRuns();
  fetchSnippets();
});

