// ======================================================
// REMI+ AI AGENT
// Version 4.0
// Author: Isaac Lam
// ======================================================

"use strict";

// ======================================================
// SECTION 1: CONFIGURATION
// ======================================================

const APP_CONFIG = {
    name: "Remi+",
    version: "4.0",
    author: "Isaac Lam",
    environment: "production"
};

const WEBHOOK_URL = "https://n8ngc.codeblazar.org/webhook/isaagen";

const STORAGE_KEYS = {
    SESSION_ID: "isaagen-session",
    CHAT_HISTORY: "remiplus-chat-history",
    THEME: "remiplus-theme"
};

const FEATURES = {
    typingAnimation: true,
    thinkingAnimation: true,
    speechRecognition: true,
    textToSpeech: true,
    markdown: true,
    syntaxHighlight: true,
    autoSaveHistory: true,
    restoreHistory: true,
    smoothScroll: true,
    toastNotifications: true
};

const TYPING = {
    enabled: true,
    minDelay: 18,
    maxDelay: 35,
    punctuationDelay: 120
};

const THINKING = {
    enabled: true,
    delay: 1000
};

const CHAT = {
    maxTextareaHeight: 220,
    defaultTextareaHeight: 56,
    animationDuration: 250,
    autoFocus: true
};

const SPEECH = {
    language: "en-US",
    rate: 1,
    pitch: 1,
    volume: 1,
    continuous: false,
    interimResults: true
};

const UI = {
    copySuccessDuration: 1200,
    toastDuration: 1800,
    scrollBehavior: "smooth"
};

const state = {
    sessionId: null,
    isGenerating: false,
    isListening: false,
    currentSpeech: null,
    recognition: null,
    theme: "light"
};

console.log(`%c${APP_CONFIG.name} v${APP_CONFIG.version}`, "color:#6D5EF9;font-size:18px;font-weight:bold;");
console.log("Configuration Loaded.");


// ======================================================
// SECTION 2: MARKDOWN & CODE HIGHLIGHT
// ======================================================

if (typeof marked === "undefined") throw new Error("Marked.js is not loaded.");
if (typeof DOMPurify === "undefined") throw new Error("DOMPurify is not loaded.");
if (typeof hljs === "undefined") throw new Error("Highlight.js is not loaded.");

marked.setOptions({ gfm: true, breaks: true, headerIds: false, mangle: false });
hljs.configure({ ignoreUnescapedHTML: true, throwUnescapedHTML: false });

function renderMarkdown(markdown = "") {
    if (!FEATURES.markdown) return escapeHTML(markdown);
    try {
        return DOMPurify.sanitize(marked.parse(markdown));
    } catch (error) {
        console.error("Markdown Render Error:", error);
        return escapeHTML(markdown);
    }
}

function highlightCode(container) {
    if (!FEATURES.syntaxHighlight || !container) return;
    container.querySelectorAll("pre code").forEach(block => {
        try { hljs.highlightElement(block); } catch (error) { console.warn("Highlight Error:", error); }
    });
}

function escapeHTML(text = "") {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function markdownToPlainText(markdown = "") {
    return markdown
        .replace(/```[\s\S]*?```/g, " Code omitted. ")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/!\[[^\]]*]\([^)]+\)/g, "")
        .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
        .replace(/^#+\s?/gm, "")
        .replace(/^>\s?/gm, "")
        .replace(/[*_~]/g, "")
        .replace(/\|/g, " ")
        .replace(/-{3,}/g, "")
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


// ======================================================
// SECTION 3: DOM ELEMENTS & INITIALIZATION
// ======================================================

const elements = {
    messages: document.getElementById("messages"),
    userInput: document.getElementById("userInput"),
    sendButton: document.getElementById("sendButton"),
    clearButton: document.getElementById("clearChat"),
    themeToggle: document.getElementById("themeToggle"),
    micButton: document.getElementById("micButton"),
    voiceStatus: document.getElementById("voiceStatus")
};

// BUG FIX: Removed "themeToggle" from this list
const REQUIRED_ELEMENTS = [
    "messages",
    "userInput",
    "sendButton",
    "clearButton",
    "micButton",
    "voiceStatus"
];

function validateDOM() {
    const missing = [];
    REQUIRED_ELEMENTS.forEach(name => {
        if (!elements[name]) missing.push(name);
    });
    if (missing.length > 0) {
        console.error("Missing DOM Elements:", missing);
        throw new Error("Chat UI could not initialize.");
    }
}

const messages = elements.messages;
const userInput = elements.userInput;
const sendButton = elements.sendButton;
const clearButton = elements.clearButton;
const themeToggle = elements.themeToggle;
const micButton = elements.micButton;
const voiceStatus = elements.voiceStatus;

function initializeUI() {
    userInput.disabled = false;
    sendButton.disabled = false;
    micButton.disabled = false;
    userInput.placeholder = "Message Remi+...";
    voiceStatus.textContent = "✅ Ready";
}

function lockInput() {
    userInput.disabled = true;
    sendButton.disabled = true;
    micButton.disabled = true;
    userInput.placeholder = "Remi+ is generating a response...";
}

function unlockInput() {
    userInput.disabled = false;
    sendButton.disabled = false;
    micButton.disabled = false;
    userInput.placeholder = "Message Remi+...";
    if (CHAT.autoFocus) userInput.focus();
}

function setStatus(text) { voiceStatus.textContent = text; }
function aiReady() { setStatus("✅ Ready"); }
function aiThinking() { setStatus("🧠 Thinking..."); }
function aiTyping() { setStatus("⌨️ Typing..."); }
function aiListening() { setStatus("🎤 Listening..."); }
function aiSpeaking() { setStatus("🔊 Reading response..."); }
function aiOffline() { setStatus("🔴 Offline"); }
function aiError() { setStatus("❌ Error"); }

validateDOM();
initializeUI();


// ======================================================
// SECTION 4: SESSION MANAGEMENT
// ======================================================

let sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
}
function getSessionId() { return sessionId; }


// ======================================================
// SECTION 5: UTILITIES
// ======================================================

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function randomDelay(min = TYPING.minDelay, max = TYPING.maxDelay) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function scrollBottom() { messages.scrollTop = messages.scrollHeight; }
function smoothScrollBottom() { messages.scrollTo({ top: messages.scrollHeight, behavior: "smooth" }); }
function getCurrentTime() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

function appendTimestamp(messageElement) {
    const time = document.createElement("div");
    time.className = "message-time";
    time.textContent = getCurrentTime();
    messageElement.appendChild(time);
}

function autoGrowTextarea() {
    userInput.style.height = "56px";
    userInput.style.height = userInput.scrollHeight + "px";
}

function animateMessage(element) {
    element.classList.add("message-enter");
    requestAnimationFrame(() => { element.classList.add("message-enter-active"); });
}

function addTypingCursor(container) {
    const cursor = document.createElement("span");
    cursor.className = "typing-cursor";
    cursor.textContent = "▋";
    container.appendChild(cursor);
    return cursor;
}

function removeTypingCursor(cursor) {
    if (cursor) cursor.remove();
}

function showToast(text = "Copied!") {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = text;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => toast.classList.remove("show"), 1800);
    setTimeout(() => toast.remove(), 2200);
}


// ======================================================
// SECTION 6: SPEECH RECOGNITION & TTS
// ======================================================

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onstart = () => {
        isListening = true;
        micButton.classList.add("listening");
        setStatus("🎤 Listening...");
    };
    recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        userInput.value = transcript;
        autoGrowTextarea();
    };
    recognition.onend = () => {
        isListening = false;
        micButton.classList.remove("listening");
        if (userInput.value.trim() !== "") sendMessage();
        else aiReady();
    };
    recognition.onerror = () => {
        isListening = false;
        micButton.classList.remove("listening");
        aiError();
    };
}

function toggleListening() {
    if (!recognition) return showToast("Speech Recognition not supported.");
    if (isListening) recognition.stop();
    else recognition.start();
}
if (micButton) micButton.addEventListener("click", toggleListening);

function stopSpeaking() {
    window.speechSynthesis.cancel();
    state.currentSpeech = null;
    aiReady();
}

function speak(text = "") {
    if (!FEATURES.textToSpeech || !window.speechSynthesis) return;
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => { state.currentSpeech = utterance; aiSpeaking(); };
    utterance.onend = () => { state.currentSpeech = null; aiReady(); };
    utterance.onerror = () => { state.currentSpeech = null; aiError(); };
    speechSynthesis.speak(utterance);
}


// ======================================================
// SECTION 7: MESSAGE RENDERING
// ======================================================

function createMessage(type) {
    const message = document.createElement("div");
    message.className = `${type}-message markdown-body`;
    animateMessage(message);
    messages.appendChild(message);
    smoothScrollBottom();
    return message;
}

function attachFooter(messageElement) {
    const footer = document.createElement("div");
    footer.className = "message-footer";
    const timestamp = document.createElement("div");
    timestamp.className = "message-time";
    timestamp.textContent = getCurrentTime();
    footer.appendChild(timestamp);
    messageElement.appendChild(footer);
}

function addUserMessage(text) {
    const div = createMessage("user");
    div.dataset.raw = text;
    div.textContent = text;
    appendTimestamp(div);
    animateMessage(div);
}

function addBotMessage(markdown) {
    const div = createMessage("bot");
    div.dataset.raw = markdown;
    div.innerHTML = renderMarkdown(markdown);
    highlightCode(div);
    appendTimestamp(div);
    attachMessageActions(div, markdown);
    animateMessage(div);
}

function addSystemMessage(text) {
    const message = createMessage("bot");
    message.innerHTML = `<p>${escapeHTML(text)}</p>`;
    attachFooter(message);
    smoothScrollBottom();
}

function showThinking() {
    removeThinking();
    const thinking = document.createElement("div");
    thinking.className = "thinking";
    thinking.id = "thinking";
    thinking.innerHTML = `<span>Remi+ is thinking</span><div class="dot"></div><div class="dot"></div><div class="dot"></div>`;
    messages.appendChild(thinking);
    smoothScrollBottom();
}

function removeThinking() {
    const thinking = document.getElementById("thinking");
    if (thinking) thinking.remove();
}


// ======================================================
// SECTION 8: AI COMMUNICATION
// ======================================================

let isGenerating = false;
let abortController = null;

function extractReply(data) {
    if (!data) return "⚠️ Empty response received.";
    if (Array.isArray(data)) data = data[0];
    if (typeof data === "string") return data.trim();
    if (data.json) data = data.json;
    
    const fields = ["reply", "output", "text", "message", "response", "content", "answer", "result"];
    for (const field of fields) {
        if (typeof data[field] === "string" && data[field].trim() !== "") return data[field].trim();
    }
    
    if (data.data) return extractReply(data.data);
    if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
    if (data.message?.content) return data.message.content;
    
    return "⚠️ Unexpected response format.";
}

async function askAI(prompt) {
    if (isGenerating) return;
    isGenerating = true;
    lockInput();
    aiThinking();
    showThinking();
    abortController = new AbortController();

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            signal: abortController.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: prompt, sessionId: getSessionId() })
        });

        if (!response.ok) throw new Error(`Server returned HTTP ${response.status}`);
        
        const data = await response.json();
        removeThinking();
        if (THINKING.enabled) await sleep(THINKING.delay);
        
        const reply = extractReply(data);
        if (!reply) throw new Error("AI returned an empty response.");
        
        if (FEATURES.typingAnimation) await typeBotMessage(reply);
        else addBotMessage(reply);
        
        aiReady();
    } catch (error) {
        removeThinking();
        addSystemMessage(`❌ ${error.message}`);
        aiError();
    } finally {
        unlockInput();
        isGenerating = false;
    }
}

async function typeBotMessage(markdown) {
    aiTyping();
    const message = createMessage("bot");
    const cursor = addTypingCursor(message);
    const words = markdown.trim().split(/\s+/);
    let currentText = "";

    for (let i = 0; i < words.length; i++) {
        currentText += words[i] + " ";
        if (i % 3 === 0 || i === words.length - 1) {
            message.innerHTML = renderMarkdown(currentText);
            message.appendChild(cursor);
            smoothScrollBottom();
        }
        if (document.hidden) continue;
        let delay = randomDelay();
        if (/[.,!?;:]$/.test(words[i])) delay += TYPING.punctuationDelay;
        await sleep(delay);
    }
    
    removeTypingCursor(cursor);
    message.innerHTML = renderMarkdown(markdown);
    highlightCode(message);
    attachFooter(message);
    attachMessageActions(message, markdown);
    smoothScrollBottom();
    aiReady();
}


// ======================================================
// SECTION 9: MESSAGE ACTIONS & SENDING
// ======================================================

function createActionButton(icon, title, onClick) {
    const button = document.createElement("button");
    button.className = "action-btn";
    button.title = title;
    button.innerHTML = icon;
    button.addEventListener("click", onClick);
    return button;
}

function attachMessageActions(message, markdown) {
    const footer = message.querySelector(".message-footer");
    if (!footer) return;
    const actions = document.createElement("div");
    actions.className = "message-actions";
    
    actions.appendChild(createActionButton("📋", "Copy", () => {
        navigator.clipboard.writeText(markdown);
        showToast("Copied to clipboard");
    }));
    actions.appendChild(createActionButton("🔊", "Read Aloud", () => speak(markdownToPlainText(markdown))));
    actions.appendChild(createActionButton("⏹", "Stop", stopSpeaking));
    
    footer.appendChild(actions);
}

let lastUserPrompt = "";

function sendMessage() {
    if (isGenerating) return;
    const text = userInput.value.trim();
    if (!text) return;
    
    addUserMessage(text);
    userInput.value = "";
    autoGrowTextarea();
    lastUserPrompt = text;
    askAI(text);
}

sendButton.addEventListener("click", sendMessage);

userInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

userInput.addEventListener("input", autoGrowTextarea);


// ======================================================
// SECTION 10: CHAT HISTORY
// ======================================================

function saveChatHistory() {
    const history = [];
    document.querySelectorAll(".user-message, .bot-message").forEach(msg => {
        history.push({
            role: msg.classList.contains("user-message") ? "user" : "bot",
            content: msg.dataset.raw || msg.innerText
        });
    });
    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(history));
}

function loadChatHistory() {
    try {
        const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY));
        if (!history) return;
        messages.innerHTML = "";
        history.forEach(item => {
            if (item.role === "user") addUserMessage(item.content);
            else addBotMessage(item.content);
        });
    } catch {}
}

const historyObserver = new MutationObserver(saveChatHistory);
historyObserver.observe(messages, { childList: true, subtree: true });

clearButton.addEventListener("click", () => {
    if (!confirm("Start a new conversation?")) return;
    localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
    messages.innerHTML = "";
    addBotMessage(`# 👋 New Conversation\n\nHello! I'm **Remi+**.\n\nHow can I help you today?`);
});

window.addEventListener("load", () => {
    loadChatHistory();
    if (messages.children.length === 0) {
        addBotMessage(`# 👋 Welcome to Remi+\n\nI'm your intelligent AI assistant.\n\nHow can I help you today?`);
    }
});