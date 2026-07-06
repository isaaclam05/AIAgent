// ======================================================
// REMI+ AI AGENT
// Version 4.0
// Author: Isaac Lam
// ======================================================
//
// This file is organised into independent sections.
//
// Every section has one responsibility only.
// No duplicate functions.
// No overwritten functions.
// Production-ready architecture.
//
// ======================================================



// ======================================================
// SECTION 1
// CONFIGURATION
// ======================================================

"use strict";



// ------------------------------------------------------
// APPLICATION INFORMATION
// ------------------------------------------------------

const APP_CONFIG = {

    name: "Remi+",

    version: "4.0",

    author: "Isaac Lam",

    environment: "production"

};



// ------------------------------------------------------
// N8N WEBHOOK
// ------------------------------------------------------

const WEBHOOK_URL =
    "https://n8ngc.codeblazar.org/webhook/isaagen";



// ------------------------------------------------------
// LOCAL STORAGE KEYS
// ------------------------------------------------------

const STORAGE_KEYS = {

    SESSION_ID: "isaagen-session",

    CHAT_HISTORY: "remiplus-chat-history",

    THEME: "remiplus-theme"

};



// ------------------------------------------------------
// FEATURE FLAGS
// Enable / Disable Features Easily
// ------------------------------------------------------

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



// ------------------------------------------------------
// TYPING SETTINGS
// ------------------------------------------------------

const TYPING = {

    enabled: true,

    minDelay: 18,

    maxDelay: 35,

    punctuationDelay: 120

};



// ------------------------------------------------------
// THINKING SETTINGS
// ------------------------------------------------------

const THINKING = {

    enabled: true,

    delay: 1000

};



// ------------------------------------------------------
// CHAT SETTINGS
// ------------------------------------------------------

const CHAT = {

    maxTextareaHeight: 220,

    defaultTextareaHeight: 56,

    animationDuration: 250,

    autoFocus: true

};



// ------------------------------------------------------
// SPEECH SETTINGS
// ------------------------------------------------------

const SPEECH = {

    language: "en-US",

    rate: 1,

    pitch: 1,

    volume: 1,

    continuous: false,

    interimResults: true

};



// ------------------------------------------------------
// UI SETTINGS
// ------------------------------------------------------

const UI = {

    copySuccessDuration: 1200,

    toastDuration: 1800,

    scrollBehavior: "smooth"

};



// ------------------------------------------------------
// APPLICATION STATE
// Never access DOM directly to check state.
// Everything should be stored here.
// ------------------------------------------------------

const state = {

    sessionId: null,

    isGenerating: false,

    isListening: false,

    currentSpeech: null,

    recognition: null,

    theme: "dark"

};



// ------------------------------------------------------
// STARTUP LOG
// ------------------------------------------------------

console.log(
    `%c${APP_CONFIG.name} v${APP_CONFIG.version}`,
    "color:#6D5EF9;font-size:18px;font-weight:bold;"
);

console.log(
    "Configuration Loaded."
);

console.log(
    "Features:",
    FEATURES
);


// ======================================================
// SECTION 2
// MARKDOWN & CODE HIGHLIGHT CONFIGURATION
// ======================================================

// ------------------------------------------------------
// Library Validation
// ------------------------------------------------------

if (typeof marked === "undefined") {

    throw new Error(
        "Marked.js is not loaded."
    );

}

if (typeof DOMPurify === "undefined") {

    throw new Error(
        "DOMPurify is not loaded."
    );

}

if (typeof hljs === "undefined") {

    throw new Error(
        "Highlight.js is not loaded."
    );

}



// ------------------------------------------------------
// Configure Marked
// ------------------------------------------------------

marked.setOptions({

    gfm: true,

    breaks: true,

    headerIds: false,

    mangle: false

});



// ------------------------------------------------------
// Configure Highlight.js
// ------------------------------------------------------

hljs.configure({

    ignoreUnescapedHTML: true,

    throwUnescapedHTML: false

});



// ======================================================
// MARKDOWN RENDERER
// ======================================================

function renderMarkdown(markdown = "") {

    if (!FEATURES.markdown) {

        return escapeHTML(markdown);

    }

    try {

        const html = marked.parse(markdown);

        return DOMPurify.sanitize(html);

    }

    catch (error) {

        console.error(

            "Markdown Render Error:",

            error

        );

        return escapeHTML(markdown);

    }

}



// ======================================================
// CODE HIGHLIGHTER
// ======================================================

function highlightCode(container) {

    if (!FEATURES.syntaxHighlight) {

        return;

    }

    if (!container) {

        return;

    }

    const blocks =

        container.querySelectorAll(

            "pre code"

        );

    blocks.forEach(block => {

        try {

            hljs.highlightElement(block);

        }

        catch (error) {

            console.warn(

                "Highlight Error:",

                error

            );

        }

    });

}



// ======================================================
// SAFE HTML ESCAPE
// Used only when Markdown rendering fails.
// ======================================================

function escapeHTML(text = "") {

    const div =

        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;

}



// ======================================================
// REMOVE MARKDOWN FOR TTS / COPY
// ======================================================

function markdownToPlainText(markdown = "") {

    return markdown

        // Remove fenced code blocks
        .replace(/```[\s\S]*?```/g, " Code omitted. ")

        // Inline code
        .replace(/`([^`]+)`/g, "$1")

        // Images
        .replace(/!\[[^\]]*]\([^)]+\)/g, "")

        // Links
        .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")

        // Headers
        .replace(/^#+\s?/gm, "")

        // Blockquotes
        .replace(/^>\s?/gm, "")

        // Bold / Italic
        .replace(/[*_~]/g, "")

        // Tables
        .replace(/\|/g, " ")

        // Horizontal rules
        .replace(/-{3,}/g, "")

        // Collapse whitespace
        .replace(/\n+/g, " ")

        .replace(/\s+/g, " ")

        .trim();

}



// ======================================================
// MARKDOWN VALIDATOR
// ======================================================

function isMarkdown(text = "") {

    return /[#>*`\-_\[\]\(\)|]/.test(text);

}



// ======================================================
// DEBUG
// ======================================================

console.log(

    "Markdown Engine Ready."

);

console.log(

    "Syntax Highlight Ready."

);

// ======================================================
// SECTION 3
// DOM ELEMENTS & APPLICATION INITIALIZATION
// ======================================================

// ------------------------------------------------------
// DOM ELEMENTS
// ------------------------------------------------------

const elements = {

    messages:
        document.getElementById("messages"),

    userInput:
        document.getElementById("userInput"),

    sendButton:
        document.getElementById("sendButton"),

    clearButton:
        document.getElementById("clearChat"),

    themeToggle:
        document.getElementById("themeToggle"),

    micButton:
        document.getElementById("micButton"),

    voiceStatus:
        document.getElementById("voiceStatus")

};



// ------------------------------------------------------
// VERIFY REQUIRED ELEMENTS
// ------------------------------------------------------

const REQUIRED_ELEMENTS = [

    "messages",

    "userInput",

    "sendButton",

    "clearButton",

    "themeToggle",

    "micButton",

    "voiceStatus"

];



function validateDOM() {

    const missing = [];

    REQUIRED_ELEMENTS.forEach(name => {

        if (!elements[name]) {

            missing.push(name);

        }

    });

    if (missing.length > 0) {

        console.error(

            "Missing DOM Elements:",

            missing

        );

        throw new Error(

            "Chat UI could not initialize."

        );

    }

    console.log(

        "DOM Validation Passed."

    );

}



// ------------------------------------------------------
// SHORTCUT VARIABLES
// (Cleaner than writing elements.xxx everywhere)
// ------------------------------------------------------

const messages =
    elements.messages;

const userInput =
    elements.userInput;

const sendButton =
    elements.sendButton;

const clearButton =
    elements.clearButton;

const themeToggle =
    elements.themeToggle;

const micButton =
    elements.micButton;

const voiceStatus =
    elements.voiceStatus;



// ------------------------------------------------------
// INITIAL UI STATE
// ------------------------------------------------------

function initializeUI() {

    userInput.disabled = false;

    sendButton.disabled = false;

    micButton.disabled = false;

    userInput.placeholder =
        "Message Remi+...";

    voiceStatus.textContent =
        "✅ Ready";

}



// ------------------------------------------------------
// ENABLE / DISABLE INPUT
// ------------------------------------------------------

function lockInput() {

    userInput.disabled = true;

    sendButton.disabled = true;

    micButton.disabled = true;

    userInput.placeholder =
        "Remi+ is generating a response...";

}



function unlockInput() {

    userInput.disabled = false;

    sendButton.disabled = false;

    micButton.disabled = false;

    userInput.placeholder =
        "Message Remi+...";

    if (CHAT.autoFocus) {

        userInput.focus();

    }

}



// ------------------------------------------------------
// STATUS BAR
// ------------------------------------------------------

function setStatus(text) {

    voiceStatus.textContent = text;

}



// ------------------------------------------------------
// READY STATUS
// ------------------------------------------------------

function aiReady() {

    setStatus("✅ Ready");

}



function aiThinking() {

    setStatus("🧠 Thinking...");

}



function aiTyping() {

    setStatus("⌨️ Typing...");

}



function aiListening() {

    setStatus("🎤 Listening...");

}



function aiSpeaking() {

    setStatus("🔊 Reading response...");

}



function aiOffline() {

    setStatus("🔴 Offline");

}



function aiError() {

    setStatus("❌ Error");

}



// ------------------------------------------------------
// INITIALIZATION
// ------------------------------------------------------

validateDOM();

initializeUI();

console.log(

    "UI Initialization Complete."

);

// ======================================================
// SECTION 4
// SESSION MANAGEMENT
// ======================================================

const SESSION_KEY = "remiplus-session-id";

let sessionId = localStorage.getItem(SESSION_KEY);

// Create a brand-new session if one doesn't exist
if (!sessionId) {

    sessionId = crypto.randomUUID();

    localStorage.setItem(
        SESSION_KEY,
        sessionId
    );

}

// ------------------------------------------------------
// Create New Session
// ------------------------------------------------------

function createNewSession() {

    sessionId = crypto.randomUUID();

    localStorage.setItem(
        SESSION_KEY,
        sessionId
    );

    console.log("New Session:", sessionId);

}

// ------------------------------------------------------
// Get Current Session
// ------------------------------------------------------

function getSessionId() {

    return sessionId;

}

// ======================================================
// SECTION 5
// UTILITIES
// ======================================================

// ------------------------------------------------------
// Sleep
// Used for typing animation & delays
// ------------------------------------------------------

function sleep(ms) {

    return new Promise(resolve => {

        setTimeout(resolve, ms);

    });

}

// ------------------------------------------------------
// Random Typing Delay
// Creates natural typing speed
// ------------------------------------------------------

function randomDelay(
    min = TYPING.minDelay,
    max = TYPING.maxDelay
) {

    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;

}

// ------------------------------------------------------
// Scroll Chat To Bottom
// ------------------------------------------------------

function scrollBottom() {

    messages.scrollTop = messages.scrollHeight;

}

// ------------------------------------------------------
// Smooth Scroll
// Used after messages are added
// ------------------------------------------------------

function smoothScrollBottom() {

    messages.scrollTo({

        top: messages.scrollHeight,

        behavior: "smooth"

    });

}

// ------------------------------------------------------
// Escape HTML
// Prevent HTML injection in user messages
// ------------------------------------------------------

function escapeHTML(text) {

    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;

}

// ------------------------------------------------------
// Render Markdown
// Converts Markdown -> Safe HTML
// ------------------------------------------------------

function renderMarkdown(markdown) {

    return DOMPurify.sanitize(

        marked.parse(markdown)

    );

}

// ------------------------------------------------------
// Highlight Code Blocks
// ------------------------------------------------------

function highlightCode(container) {

    container

        .querySelectorAll("pre code")

        .forEach(block => {

            hljs.highlightElement(block);

        });

}

// ------------------------------------------------------
// Current Time
// Used for message timestamps
// ------------------------------------------------------

function getCurrentTime() {

    return new Date().toLocaleTimeString(

        [],

        {

            hour: "2-digit",

            minute: "2-digit"

        }

    );

}

// ------------------------------------------------------
// Append Timestamp
// ------------------------------------------------------

function appendTimestamp(messageElement) {

    const time = document.createElement("div");

    time.className = "message-time";

    time.textContent = getCurrentTime();

    messageElement.appendChild(time);

}

// ------------------------------------------------------
// Auto Grow Textarea
// ------------------------------------------------------

function autoGrowTextarea() {

    userInput.style.height = "56px";

    userInput.style.height =

        userInput.scrollHeight + "px";

}

// ------------------------------------------------------
// Lock Input
// Prevent sending multiple requests
// ------------------------------------------------------

function lockInput() {

    userInput.disabled = true;

    sendButton.disabled = true;

    micButton.disabled = true;

    userInput.placeholder =

        "Remi+ is generating a response...";

}

// ------------------------------------------------------
// Unlock Input
// ------------------------------------------------------

function unlockInput() {

    userInput.disabled = false;

    sendButton.disabled = false;

    micButton.disabled = false;

    userInput.placeholder =

        "Message Remi+...";

    userInput.focus();

}

// ------------------------------------------------------
// Update Status
// ------------------------------------------------------

function setStatus(text) {

    voiceStatus.textContent = text;

}

// ------------------------------------------------------
// Convenience Helpers
// ------------------------------------------------------

function aiReady() {

    setStatus("✅ Ready");

}

function aiThinking() {

    setStatus("🧠 Remi+ is thinking...");

}

function aiTyping() {

    setStatus("⌨️ Remi+ is typing...");

}

function aiError() {

    setStatus("❌ Error");

}

// ------------------------------------------------------
// Fade-in Animation
// ------------------------------------------------------

function animateMessage(element) {

    element.classList.add("message-enter");

    requestAnimationFrame(() => {

        element.classList.add("message-enter-active");

    });

}

// ------------------------------------------------------
// Typing Cursor
// ------------------------------------------------------

function addTypingCursor(container) {

    const cursor = document.createElement("span");

    cursor.className = "typing-cursor";

    cursor.textContent = "▋";

    container.appendChild(cursor);

    return cursor;

}

function removeTypingCursor(cursor) {

    if (cursor) {

        cursor.remove();

    }

}

// ------------------------------------------------------
// Toast Notification
// ------------------------------------------------------

function showToast(text = "Copied!") {

    const toast = document.createElement("div");

    toast.className = "toast";

    toast.textContent = text;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {

        toast.classList.add("show");

    });

    setTimeout(() => {

        toast.classList.remove("show");

    }, 1800);

    setTimeout(() => {

        toast.remove();

    }, 2200);

}

// ======================================================
// SECTION 6
// SPEECH RECOGNITION
// ======================================================

// ------------------------------------------------------
// Browser Support
// ------------------------------------------------------

const SpeechRecognition =

    window.SpeechRecognition ||

    window.webkitSpeechRecognition;

// ------------------------------------------------------
// Variables
// ------------------------------------------------------

let recognition = null;

let isListening = false;

// ------------------------------------------------------
// Initialize Speech Recognition
// ------------------------------------------------------

if (SpeechRecognition) {

    recognition = new SpeechRecognition();

    recognition.lang = "en-US";

    recognition.continuous = false;

    recognition.interimResults = true;

    recognition.maxAlternatives = 1;

}

// ------------------------------------------------------
// Start Listening
// ------------------------------------------------------

function startListening() {

    if (!recognition) {

        showToast(

            "Speech Recognition is not supported."

        );

        return;

    }

    if (isListening) {

        return;

    }

    recognition.start();

}

// ------------------------------------------------------
// Stop Listening
// ------------------------------------------------------

function stopListening() {

    if (!recognition) {

        return;

    }

    recognition.stop();

}

// ------------------------------------------------------
// Toggle Listening
// ------------------------------------------------------

function toggleListening() {

    if (isListening) {

        stopListening();

    }

    else {

        startListening();

    }

}

// ------------------------------------------------------
// Recognition Started
// ------------------------------------------------------

if (recognition) {

    recognition.onstart = () => {

        isListening = true;

        micButton.classList.add("listening");

        setStatus("🎤 Listening...");

    };

    // --------------------------------------------------
    // Live Speech
    // --------------------------------------------------

    recognition.onresult = (event) => {

        let transcript = "";

        for (

            let i = event.resultIndex;

            i < event.results.length;

            i++

        ) {

            transcript +=

                event.results[i][0].transcript;

        }

        userInput.value = transcript;

        autoGrowTextarea();

    };

    // --------------------------------------------------
    // Finished Listening
    // --------------------------------------------------

    recognition.onend = () => {

        isListening = false;

        micButton.classList.remove("listening");

        if (

            userInput.value.trim() !== ""

        ) {

            sendMessage();

        }

        else {

            aiReady();

        }

    };

    // --------------------------------------------------
    // Errors
    // --------------------------------------------------

    recognition.onerror = (event) => {

        isListening = false;

        micButton.classList.remove("listening");

        switch (event.error) {

            case "no-speech":

                showToast(

                    "No speech detected."

                );

                break;

            case "audio-capture":

                showToast(

                    "No microphone detected."

                );

                break;

            case "not-allowed":

                showToast(

                    "Microphone permission denied."

                );

                break;

            case "network":

                showToast(

                    "Speech recognition network error."

                );

                break;

            default:

                showToast(

                    "Speech recognition failed."

                );

        }

        aiError();

    };

}

// ------------------------------------------------------
// Microphone Button
// ------------------------------------------------------

if (micButton) {

    micButton.addEventListener(

        "click",

        toggleListening

    );

}

// ======================================================
// SECTION 6.5
// TEXT TO SPEECH
// ======================================================

function markdownToSpeech(markdown = "") {

    return markdownToPlainText(markdown);

}

function stopSpeaking() {

    window.speechSynthesis.cancel();

    state.currentSpeech = null;

    aiReady();

}

function speak(text = "") {

    if (!FEATURES.textToSpeech) {
        return;
    }

    if (!("speechSynthesis" in window)) {

        showToast("Text-to-Speech is not supported.");

        return;

    }

    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = SPEECH.language;

    utterance.rate = SPEECH.rate;

    utterance.pitch = SPEECH.pitch;

    utterance.volume = SPEECH.volume;

    utterance.onstart = () => {

        state.currentSpeech = utterance;

        aiSpeaking();

    };

    utterance.onend = () => {

        state.currentSpeech = null;

        aiReady();

    };

    utterance.onerror = () => {

        state.currentSpeech = null;

        aiError();

    };

    speechSynthesis.speak(utterance);

}

// ======================================================
// SECTION 7
// THEME MANAGER
// ======================================================

// ------------------------------------------------------
// Constants
// ------------------------------------------------------

const THEME_KEY = "remiplus-theme";

// ------------------------------------------------------
// Apply Theme
// ------------------------------------------------------

function applyTheme(theme) {

    if (theme === "dark") {

        document.body.classList.add("dark");

    }

    else {

        document.body.classList.remove("dark");

    }

    updateThemeIcon();

}

// ------------------------------------------------------
// Get Saved Theme
// ------------------------------------------------------

function getSavedTheme() {

    return localStorage.getItem(THEME_KEY);

}

// ------------------------------------------------------
// Save Theme
// ------------------------------------------------------

function saveTheme(theme) {

    localStorage.setItem(

        THEME_KEY,

        theme

    );

}

// ------------------------------------------------------
// Current Theme
// ------------------------------------------------------

function getCurrentTheme() {

    return document.body.classList.contains("dark")

        ? "dark"

        : "light";

}

// ------------------------------------------------------
// Toggle Theme
// ------------------------------------------------------

function toggleTheme() {

    const nextTheme =

        getCurrentTheme() === "dark"

            ? "light"

            : "dark";

    applyTheme(nextTheme);

    saveTheme(nextTheme);

}

// ------------------------------------------------------
// Theme Icon
// ------------------------------------------------------

function updateThemeIcon() {

    if (!themeToggle) {

        return;

    }

    themeToggle.textContent =

        getCurrentTheme() === "dark"

            ? "☀️"

            : "🌙";

}

// ------------------------------------------------------
// Initialize Theme
// ------------------------------------------------------

function initializeTheme() {

    const savedTheme = getSavedTheme();

    if (savedTheme) {

        applyTheme(savedTheme);

    }

    else {

        applyTheme("light");

    }

}

// ------------------------------------------------------
// Theme Button
// ------------------------------------------------------

if (themeToggle) {

    themeToggle.addEventListener(

        "click",

        toggleTheme

    );

}

// ------------------------------------------------------
// Initialize
// ------------------------------------------------------

initializeTheme();

// ======================================================
// SECTION 8
// MESSAGE RENDERING
// ======================================================

// ------------------------------------------------------
// Create Message Container
// ------------------------------------------------------

function createMessage(type) {

    const message = document.createElement("div");

    message.className = `${type}-message markdown-body`;

    animateMessage(message);

    messages.appendChild(message);

    smoothScrollBottom();

    return message;

}

// ------------------------------------------------------
// Create Footer
// ------------------------------------------------------

function createMessageFooter() {

    const footer = document.createElement("div");

    footer.className = "message-footer";

    return footer;

}

// ------------------------------------------------------
// Create Timestamp
// ------------------------------------------------------

function createTimestamp() {

    const timestamp = document.createElement("div");

    timestamp.className = "message-time";

    timestamp.textContent = getCurrentTime();

    return timestamp;

}

// ------------------------------------------------------
// Attach Footer
// ------------------------------------------------------

function attachFooter(messageElement) {

    const footer = createMessageFooter();

    footer.appendChild(

        createTimestamp()

    );

    messageElement.appendChild(

        footer

    );

}

// ------------------------------------------------------
// User Message
// ------------------------------------------------------

function addUserMessage(text) {

    const div = createMessage("user");

    div.dataset.raw = text;

    div.textContent = text;

    appendTimestamp(div);

    animateMessage(div);

}

// ------------------------------------------------------
// Bot Message
// ------------------------------------------------------

function addBotMessage(markdown) {

    const div = createMessage("bot");

    div.dataset.raw = markdown;

    div.innerHTML = renderMarkdown(markdown);

    highlightCode(div);

    appendTimestamp(div);

    attachMessageActions(div, markdown);

    animateMessage(div);

}

// ------------------------------------------------------
// Empty Message
// ------------------------------------------------------

function addSystemMessage(text) {

    const message = createMessage("bot");

    message.innerHTML = `

        <p>${escapeHTML(text)}</p>

    `;

    attachFooter(message);

    smoothScrollBottom();

}

// ------------------------------------------------------
// Thinking Indicator
// ------------------------------------------------------

function showThinking() {

    removeThinking();

    const thinking = document.createElement("div");

    thinking.className = "thinking";

    thinking.id = "thinking";

    thinking.innerHTML = `

        <span>Remi+ is thinking</span>

        <div class="dot"></div>

        <div class="dot"></div>

        <div class="dot"></div>

    `;

    messages.appendChild(

        thinking

    );

    smoothScrollBottom();

}

// ------------------------------------------------------
// Remove Thinking Indicator
// ------------------------------------------------------

function removeThinking() {

    const thinking =

        document.getElementById(

            "thinking"

        );

    if (thinking) {

        thinking.remove();

    }

}

// ======================================================
// SECTION 9
// AI COMMUNICATION
// ======================================================

// ------------------------------------------------------
// State
// ------------------------------------------------------

let isGenerating = false;

// ------------------------------------------------------
// Extract AI Reply
// Supports multiple n8n response formats
// ------------------------------------------------------

/* =====================================================
   EXTRACT AI REPLY
===================================================== */

function extractReply(data) {

    if (!data) {

        return "⚠️ Empty response received.";

    }

    // n8n array response
    if (Array.isArray(data)) {

        data = data[0];

    }

    // plain string
    if (typeof data === "string") {

        return data.trim();

    }

    // nested json property
    if (data.json) {

        data = data.json;

    }

    // Common reply fields
    const fields = [

        "reply",

        "output",

        "text",

        "message",

        "response",

        "content",

        "answer",

        "result"

    ];

    for (const field of fields) {

        if (

            typeof data[field] === "string" &&

            data[field].trim() !== ""

        ) {

            return data[field].trim();

        }

    }

    // Nested data object
    if (data.data) {

        return extractReply(data.data);

    }

    // OpenAI format
    if (

        data.choices &&

        data.choices[0] &&

        data.choices[0].message &&

        data.choices[0].message.content

    ) {

        return data.choices[0].message.content;

    }

    // AI Agent format
    if (

        data.message &&

        typeof data.message === "object" &&

        data.message.content

    ) {

        return data.message.content;

    }

    console.warn("Unknown response format:");

    console.log(data);

    return "⚠️ Unexpected response format.";

}

// ------------------------------------------------------
// Thinking Delay
// ------------------------------------------------------

async function waitThinking() {

    if (!THINKING.enabled) {
        return;
    }

    await sleep(THINKING.delay);

}

/* =====================================================
   ASK AI
===================================================== */

async function askAI(prompt) {

    if (isGenerating) return;

    isGenerating = true;

    lockInput();

    aiThinking();

    showThinking();

    try {

        const response = await fetch(WEBHOOK_URL, {

            method: "POST",

            signal: abortController.signal,

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                message: prompt,

                sessionId: getSessionId()

            })

        });

        // Network error
        if (!response.ok) {

            throw new Error(
                `Server returned HTTP ${response.status}`
            );

        }

        // Read response as text first
        const raw = await response.text();

        let data;

        try {

            data = JSON.parse(raw);

        }

        catch {

            console.error("Invalid JSON returned:");

            console.log(raw);

            throw new Error("Webhook did not return valid JSON.");

        }

        removeThinking();

        await waitThinking();

        const reply = extractReply(data);

        if (!reply || reply.trim() === "") {

            throw new Error("AI returned an empty response.");

        }

        if (FEATURES.typingAnimation) {
            
            await typeBotMessage(reply);
        
        } else {
            
            addBotMessage(reply);
        
        }

        aiReady();

    }

    catch (error) {

        console.error("===================================");

        console.error("Remi+ Request Failed");

        console.error(error);

        console.error("Webhook URL:", WEBHOOK_URL);

        console.error("===================================");

        removeThinking();

        addSystemMessage(

            `❌ ${error.message}`

        );

        aiError();

    }

    finally {

        unlockInput();

        isGenerating = false;

    }

}

// ------------------------------------------------------
// Send Message
// ------------------------------------------------------

function sendMessage() {

    if (isGenerating) {

        return;

    }

    const prompt =

        userInput.value.trim();

    if (!prompt) {

        return;

    }

    addUserMessage(prompt);

    userInput.value = "";

    autoGrowTextarea();

    askAI(prompt);

}

// ======================================================
// SECTION 10
// TYPING ANIMATION
// ======================================================

// ------------------------------------------------------
// Type AI Response
// ------------------------------------------------------

/* =====================================================
   TYPE BOT MESSAGE
===================================================== */

async function typeBotMessage(markdown) {

    aiTyping();

    // Safety check
    if (!markdown || typeof markdown !== "string") {

        markdown = "Sorry, I couldn't generate a response.";

    }

    // Create message container
    const message = createMessage("bot");

    // Create blinking cursor
    const cursor = addTypingCursor(message);

    // Split into words
    const words = markdown.trim().split(/\s+/);

    let currentText = "";

    // Render every few words for smoother performance
    const RENDER_INTERVAL = 3;

    for (let i = 0; i < words.length; i++) {

        currentText += words[i] + " ";

        if (
            i % RENDER_INTERVAL === 0 ||
            i === words.length - 1
        ) {

            message.innerHTML = renderMarkdown(currentText);

            // Keep cursor at bottom
            message.appendChild(cursor);

            smoothScrollBottom();

        }

        // Skip animation when tab isn't visible
        if (document.hidden) {

            continue;

        }

        let delay = randomDelay();

        if (/[.,!?;:]$/.test(words[i])) {

            delay += TYPING.punctuationDelay;

        }

        await sleep(delay);

    }

    // Remove cursor
    removeTypingCursor(cursor);

    // Final render
    message.innerHTML = renderMarkdown(markdown);

    // Highlight code ONCE
    highlightCode(message);

    // Footer
    attachFooter(message);

    // Copy / regenerate / speak buttons
    attachMessageActions(
        message,
        markdown
    );

    smoothScrollBottom();

    aiReady();

}

// ======================================================
// SECTION 11
// MESSAGE ACTIONS
// ======================================================

// ------------------------------------------------------
// Create Action Button
// ------------------------------------------------------

function createActionButton(icon, title, onClick) {

    const button = document.createElement("button");

    button.className = "action-btn";

    button.type = "button";

    button.title = title;

    button.innerHTML = icon;

    button.addEventListener(

        "click",

        onClick

    );

    return button;

}

// ------------------------------------------------------
// Create Action Bar
// ------------------------------------------------------

function createMessageActions(markdown) {

    const actions = document.createElement("div");

    actions.className = "message-actions";

    // ==========================================
    // Copy
    // ==========================================

    const copyButton = createActionButton(

        "📋",

        "Copy",

        async () => {

            try {

                await navigator.clipboard.writeText(

                    markdown

                );

                copyButton.innerHTML = "✅";

                showToast(

                    "Copied to clipboard"

                );

                setTimeout(() => {

                    copyButton.innerHTML = "📋";

                }, 1500);

            }

            catch {

                showToast(

                    "Unable to copy"

                );

            }

        }

    );

    // ==========================================
    // Read Aloud
    // ==========================================

    const speakButton = createActionButton(

        "🔊",

        "Read Aloud",

        () => {

            speak(

                markdownToSpeech(markdown)

            );

        }

    );

    // ==========================================
    // Stop Reading
    // ==========================================

    const stopButton = createActionButton(

        "⏹",

        "Stop",

        () => {

            stopSpeaking();

        }

    );

    // ==========================================
    // Regenerate
    // ==========================================

    const regenerateButton = createActionButton(

        "🔄",

        "Regenerate",

        () => {

            if (isGenerating) {

                return;

            }

            const userMessages =

                document.querySelectorAll(

                    ".user-message"

                );

            if (!userMessages.length) {

                return;

            }

            const lastPrompt =

                userMessages[

                    userMessages.length - 1

                ].innerText;

            askAI(lastPrompt);

        }

    );

    // ==========================================
    // Append Buttons
    // ==========================================

    actions.appendChild(copyButton);

    actions.appendChild(speakButton);

    actions.appendChild(stopButton);

    actions.appendChild(regenerateButton);

    return actions;

}

// ------------------------------------------------------
// Attach Action Bar
// ------------------------------------------------------

function attachMessageActions(

    message,

    markdown

) {

    const footer =

        message.querySelector(

            ".message-footer"

        );

    if (!footer) {

        return;

    }

    footer.appendChild(

        createMessageActions(

            markdown

        )

    );

}

// ======================================================
// SECTION 13
// SEND MESSAGE & EVENT LISTENERS
// ======================================================

// ------------------------------------------------------
// Send Message
// ------------------------------------------------------

function sendMessage() {

    if (isGenerating) return;

    const text = userInput.value.trim();

    if (!text) return;

    addUserMessage(text);

    userInput.value = "";

    autoGrowTextarea();

    rememberPrompt(text);

    askAI(text);

}

// ------------------------------------------------------
// Send Button
// ------------------------------------------------------

sendButton.addEventListener("click", () => {

    sendMessage();

});

// ------------------------------------------------------
// Press Enter to Send
// Shift + Enter = New Line
// ------------------------------------------------------

userInput.addEventListener("keydown", (event) => {

    if (

        event.key === "Enter" &&
        !event.shiftKey

    ) {

        event.preventDefault();

        sendMessage();

    }

});

// ------------------------------------------------------
// Auto Grow Textarea
// ------------------------------------------------------

userInput.addEventListener("input", () => {

    autoGrowTextarea();

});

// ------------------------------------------------------
// Auto Focus
// ------------------------------------------------------

window.addEventListener("load", () => {

    userInput.focus();

});

// ------------------------------------------------------
// Prevent Drag & Drop
// ------------------------------------------------------

document.addEventListener("dragover", (event) => {

    event.preventDefault();

});

document.addEventListener("drop", (event) => {

    event.preventDefault();

});

// ------------------------------------------------------
// Stop Speaking When Tab Hidden
// ------------------------------------------------------

document.addEventListener("visibilitychange", () => {

    if (document.hidden) {

        stopSpeaking();

    }

});

// ------------------------------------------------------
// Focus Input When Returning
// ------------------------------------------------------

window.addEventListener("focus", () => {

    if (!isGenerating) {

        userInput.focus();

    }

});

// ------------------------------------------------------
// Initial Status
// ------------------------------------------------------

setStatus("✅ Ready");

// ======================================================
// SECTION 14
// CHAT HISTORY & SESSION MANAGEMENT
// ======================================================

// ------------------------------------------------------
// Configuration
// ------------------------------------------------------

const CHAT_HISTORY_KEY = "remiplus-chat-history";

// ------------------------------------------------------
// Save Conversation
// ------------------------------------------------------

function saveChatHistory() {

    const history = [];

    document.querySelectorAll(
        ".user-message, .bot-message"
    ).forEach(message => {

        history.push({

            role: message.classList.contains("user-message")
                ? "user"
                : "bot",

            content: message.dataset.raw || message.innerText

        });

    });

    localStorage.setItem(

        CHAT_HISTORY_KEY,

        JSON.stringify(history)

    );

}

// ------------------------------------------------------
// Restore Conversation
// ------------------------------------------------------

function loadChatHistory() {

    const history = localStorage.getItem(

        CHAT_HISTORY_KEY

    );

    if (!history) {

        return;

    }

    try {

        const messagesData = JSON.parse(history);

        messages.innerHTML = "";

        messagesData.forEach(item => {

            if (item.role === "user") {

                addUserMessage(item.content);

            }

            else {

                addBotMessage(item.content);

            }

        });

    }

    catch (error) {

        console.error(

            "Unable to restore chat history.",

            error

        );

    }

}

// ------------------------------------------------------
// Clear Saved History
// ------------------------------------------------------

function clearChatHistory() {

    localStorage.removeItem(

        CHAT_HISTORY_KEY

    );

}

// ------------------------------------------------------
// Automatically Save After Every Message
// ------------------------------------------------------

const historyObserver = new MutationObserver(() => {

    saveChatHistory();

});

historyObserver.observe(

    messages,

    {

        childList: true,

        subtree: true

    }

);

// ------------------------------------------------------
// New Conversation
// ------------------------------------------------------

function newConversation() {

    sessionId = crypto.randomUUID();

    localStorage.setItem(

        "isaagen-session",

        sessionId

    );

    clearChatHistory();

    messages.innerHTML = "";

    addBotMessage(

`# 👋 New Conversation

Hello!

I'm **Remi+**.

How can I help you today?`

    );

}

// ------------------------------------------------------
// Clear Chat Button
// ------------------------------------------------------

clearButton.addEventListener(

    "click",

    () => {

        if (

            !confirm(

                "Start a new conversation?"

            )

        ) {

            return;

        }

        newConversation();

    }

);

// ------------------------------------------------------
// Restore Conversation When Page Loads
// ------------------------------------------------------

window.addEventListener(

    "load",

    () => {

        loadChatHistory();

    }

);

// ------------------------------------------------------
// Save Before Leaving
// ------------------------------------------------------

window.addEventListener(

    "beforeunload",

    () => {

        saveChatHistory();

        stopSpeaking();

    }

);

// ======================================================
// SECTION 15
// EXPORT, SHORTCUTS & APP UTILITIES
// ======================================================

// ------------------------------------------------------
// Export Conversation (.txt)
// ------------------------------------------------------

function exportConversationTXT() {

    const history = [];

    document.querySelectorAll(
        ".user-message, .bot-message"
    ).forEach(message => {

        const role = message.classList.contains("user-message")
            ? "You"
            : "Remi+";

        history.push(

            `${role}:\n${message.dataset.raw || message.innerText}\n`

        );

    });

    const blob = new Blob(

        [history.join("\n----------------------------------------\n\n")],

        {

            type: "text/plain"

        }

    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download =

        `RemiPlus-Conversation-${Date.now()}.txt`;

    a.click();

    URL.revokeObjectURL(url);

}

// ------------------------------------------------------
// Export Conversation (.md)
// ------------------------------------------------------

function exportConversationMarkdown() {

    const history = [];

    document.querySelectorAll(
        ".user-message, .bot-message"
    ).forEach(message => {

        const role = message.classList.contains("user-message")
            ? "## 👤 You"
            : "## 🤖 Remi+";

        history.push(

`${role}

${message.dataset.raw || message.innerText}

`

        );

    });

    const blob = new Blob(

        [history.join("\n---\n\n")],

        {

            type: "text/markdown"

        }

    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download =

        `RemiPlus-Conversation-${Date.now()}.md`;

    a.click();

    URL.revokeObjectURL(url);

}

// ------------------------------------------------------
// Keyboard Shortcuts
// ------------------------------------------------------

document.addEventListener(

    "keydown",

    (event) => {

        // Ctrl + L
        if (

            event.ctrlKey &&
            event.key.toLowerCase() === "l"

        ) {

            event.preventDefault();

            clearButton.click();

        }

        // Ctrl + E
        if (

            event.ctrlKey &&
            event.key.toLowerCase() === "e"

        ) {

            event.preventDefault();

            exportConversationTXT();

        }

        // Ctrl + Shift + E
        if (

            event.ctrlKey &&
            event.shiftKey &&
            event.key.toLowerCase() === "e"

        ) {

            event.preventDefault();

            exportConversationMarkdown();

        }

        // ESC
        if (

            event.key === "Escape"

        ) {

            stopSpeaking();

        }

    }

);

// ------------------------------------------------------
// Connection Status
// ------------------------------------------------------

window.addEventListener(

    "online",

    () => {

        setStatus("🟢 Connected");

    }

);

window.addEventListener(

    "offline",

    () => {

        setStatus("🔴 Offline");

    }

);

// ------------------------------------------------------
// Console Branding
// ------------------------------------------------------

console.log(

    "%cRemi+ AI Agent",

    "color:#6D5EF9;font-size:20px;font-weight:bold;"

);

console.log(

    "%cPowered by GPT-5.5 • n8n • OpenRouter",

    "color:#999;font-size:13px;"

);

console.log(

    "Session ID:",

    sessionId

);

// ------------------------------------------------------
// Initialize Empty Chat
// ------------------------------------------------------

window.addEventListener(

    "load",

    () => {

        if (

            messages.children.length === 0

        ) {

            addBotMessage(

`# 👋 Welcome to Remi+

I'm your intelligent AI assistant.

How can I help you today?`

            );

        }

    }

);

// ------------------------------------------------------
// Initial Ready State
// ------------------------------------------------------

aiReady();

// ======================================================
// SECTION 16
// ADVANCED CHAT UX
// ======================================================

// ------------------------------------------------------
// Variables
// ------------------------------------------------------

let autoScroll = true;

let lastUserPrompt = "";

let abortController = null;

// ------------------------------------------------------
// Save Last Prompt
// ------------------------------------------------------

function rememberPrompt(prompt) {

    lastUserPrompt = prompt;

}

// ------------------------------------------------------
// Stop Generating
// ------------------------------------------------------

function stopGenerating() {

    if (!isGenerating) return;

    if (abortController) {

        abortController.abort();

    }

    removeThinking();

    unlockInput();

    aiReady();

    isGenerating = false;

}

// ------------------------------------------------------
// Retry Last Prompt
// ------------------------------------------------------

function regenerateLastResponse() {

    if (isGenerating) return;

    if (!lastUserPrompt) return;

    askAI(lastUserPrompt);

}

// ------------------------------------------------------
// Copy Code Blocks
// ------------------------------------------------------

function installCodeCopyButtons() {

    document.querySelectorAll("pre").forEach(pre => {

        if (pre.querySelector(".copy-code-btn")) {

            return;

        }

        const button = document.createElement("button");

        button.className = "copy-code-btn";

        button.textContent = "Copy";

        button.onclick = async () => {

            const code = pre.querySelector("code");

            if (!code) return;

            try {

                await navigator.clipboard.writeText(

                    code.innerText

                );

                button.textContent = "Copied";

                setTimeout(() => {

                    button.textContent = "Copy";

                }, 1500);

            }

            catch {

                button.textContent = "Error";

            }

        };

        pre.appendChild(button);

    });

}

// ------------------------------------------------------
// Auto Install After New AI Message
// ------------------------------------------------------

const originalHighlightCode = highlightCode;

highlightCode = function(container) {

    originalHighlightCode(container);

    installCodeCopyButtons();

};

// ------------------------------------------------------
// Smart Auto Scroll
// ------------------------------------------------------

messages.addEventListener("scroll", () => {

    const distance =

        messages.scrollHeight -

        messages.scrollTop -

        messages.clientHeight;

    autoScroll = distance < 120;

});

// ------------------------------------------------------
// Better Scroll
// ------------------------------------------------------

function smoothScrollBottom() {

    if (!autoScroll) return;

    messages.scrollTo({

        top: messages.scrollHeight,

        behavior: "smooth"

    });

}

// ------------------------------------------------------
// Floating Scroll Button
// ------------------------------------------------------

const scrollButton = document.createElement("button");

scrollButton.className = "scroll-bottom-btn";

scrollButton.innerHTML = "⬇";

scrollButton.title = "Scroll to Bottom";

document.body.appendChild(scrollButton);

scrollButton.onclick = () => {

    autoScroll = true;

    smoothScrollBottom();

};

messages.addEventListener("scroll", () => {

    const distance =

        messages.scrollHeight -

        messages.scrollTop -

        messages.clientHeight;

    if (distance > 250) {

        scrollButton.classList.add("show");

    }

    else {

        scrollButton.classList.remove("show");

    }

});

// ------------------------------------------------------
// Better askAI Preparation
// ------------------------------------------------------

const originalAskAI = askAI;

askAI = async function(message) {

    rememberPrompt(message);

    abortController = new AbortController();

    await originalAskAI(message);

};

// ------------------------------------------------------
// Mobile Optimisation
// ------------------------------------------------------

userInput.addEventListener("focus", () => {

    setTimeout(() => {

        smoothScrollBottom();

    }, 250);

});

// ------------------------------------------------------
// Clipboard Helper
// ------------------------------------------------------

async function copyText(text) {

    try {

        await navigator.clipboard.writeText(text);

        showToast("Copied");

    }

    catch {

        showToast("Unable to copy");

    }

}

// ------------------------------------------------------
// Double Click Copy Message
// ------------------------------------------------------

messages.addEventListener("dblclick", event => {

    const bubble = event.target.closest(

        ".bot-message, .user-message"

    );

    if (!bubble) return;

    copyText(

        bubble.dataset.raw ||

        bubble.innerText

    );

});

// ------------------------------------------------------
// Future Streaming Hook
// ------------------------------------------------------

function appendStreamingChunk(

    container,

    chunk

) {

    container.innerHTML += chunk;

    highlightCode(container);

    smoothScrollBottom();

}

/* =====================================================
   WAIT THINKING
===================================================== */

async function waitThinking() {

    if (!THINKING.enabled) {
        return;
    }

    await sleep(THINKING.delay);

}

// ======================================================
// SECTION 6.6
// AUTO LANGUAGE DETECTION
// ======================================================

function detectSpeechLanguage(text = "") {

    // Chinese
    if (/[\u4E00-\u9FFF]/.test(text)) {
        return "zh-CN";
    }

    // Japanese
    if (/[\u3040-\u30FF]/.test(text)) {
        return "ja-JP";
    }

    // Korean
    if (/[\uAC00-\uD7AF]/.test(text)) {
        return "ko-KR";
    }

    // Thai
    if (/[\u0E00-\u0E7F]/.test(text)) {
        return "th-TH";
    }

    // Arabic
    if (/[\u0600-\u06FF]/.test(text)) {
        return "ar-SA";
    }

    // Hindi
    if (/[\u0900-\u097F]/.test(text)) {
        return "hi-IN";
    }

    // Russian
    if (/[\u0400-\u04FF]/.test(text)) {
        return "ru-RU";
    }

    // Default
    return "en-US";

}