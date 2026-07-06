// ======================================================
// SECTION 1
// CONFIGURATION
// ======================================================

"use strict";

/* -----------------------------------------------------
   APPLICATION
----------------------------------------------------- */

const APP_NAME = "Remi+";
const APP_VERSION = "4.0";

/* -----------------------------------------------------
   WEBHOOK
----------------------------------------------------- */

const WEBHOOK_URL =
"https://n8ngc.codeblazar.org/webhook/isaagen";

/* -----------------------------------------------------
   STORAGE
----------------------------------------------------- */

const STORAGE_KEYS = {

    SESSION: "isaagen-session",

    CHAT: "remiplus-chat-history",

    THEME: "remiplus-theme"

};

/* -----------------------------------------------------
   FEATURE FLAGS
----------------------------------------------------- */

const ENABLE_TYPING_ANIMATION = true;

const ENABLE_THINKING_DELAY = true;

const ENABLE_MARKDOWN = true;

const ENABLE_CODE_HIGHLIGHT = true;

const ENABLE_AUTO_SAVE = true;

const ENABLE_RESTORE_HISTORY = true;

const ENABLE_TEXT_TO_SPEECH = true;

const ENABLE_SPEECH_RECOGNITION = true;

/* -----------------------------------------------------
   TYPING
----------------------------------------------------- */

const MIN_TYPING_DELAY = 18;

const MAX_TYPING_DELAY = 35;

const PUNCTUATION_DELAY = 120;

/* -----------------------------------------------------
   THINKING
----------------------------------------------------- */

const THINKING_DELAY = 1000;

/* -----------------------------------------------------
   UI
----------------------------------------------------- */

const MAX_TEXTAREA_HEIGHT = 220;

const DEFAULT_TEXTAREA_HEIGHT = 56;

const TOAST_DURATION = 1800;

/* -----------------------------------------------------
   STATE
----------------------------------------------------- */

let isGenerating = false;

let isListening = false;

let recognition = null;

let currentSpeech = null;

let sessionId = null;

/* -----------------------------------------------------
   STARTUP
----------------------------------------------------- */

console.log(`${APP_NAME} v${APP_VERSION} Loaded`);

// ======================================================
// SECTION 2
// GLOBAL STATE
// ======================================================



// ------------------------------------------------------
// APPLICATION STATE
// ------------------------------------------------------

const state = {

    initialized: false,

    isGenerating: false,

    isListening: false,

    isTyping: false,

    currentSpeech: null,

    recognition: null,

    theme: "dark",

    sessionId: null

};



// ------------------------------------------------------
// CHAT CACHE
// ------------------------------------------------------

const chat = {

    history: [],

    messages: []

};



// ------------------------------------------------------
// DOM CACHE
// Filled during initialization
// ------------------------------------------------------

const dom = {};



// ------------------------------------------------------
// TIMER REFERENCES
// ------------------------------------------------------

const timers = {

    typing: null,

    thinking: null,

    toast: null,

    scroll: null

};



// ------------------------------------------------------
// MESSAGE COUNTERS
// ------------------------------------------------------

let messageCounter = 0;



// ------------------------------------------------------
// SESSION
// ------------------------------------------------------

function createSessionId() {

    return (

        "session-" +

        Date.now().toString(36) +

        "-" +

        Math.random()

            .toString(36)

            .substring(2, 10)

    );

}



function getSessionId() {

    if (state.sessionId) {

        return state.sessionId;

    }

    const saved = localStorage.getItem(

        STORAGE_KEYS.SESSION_ID

    );

    if (saved) {

        state.sessionId = saved;

        return saved;

    }

    const id = createSessionId();

    state.sessionId = id;

    localStorage.setItem(

        STORAGE_KEYS.SESSION_ID,

        id

    );

    return id;

}



// ------------------------------------------------------
// MESSAGE ID
// ------------------------------------------------------

function nextMessageId() {

    messageCounter++;

    return `msg-${messageCounter}`;

}



// ------------------------------------------------------
// APPLICATION READY
// ------------------------------------------------------

function setReady() {

    state.initialized = true;

}



// ------------------------------------------------------
// APPLICATION BUSY
// ------------------------------------------------------

function setGenerating(value) {

    state.isGenerating = value;

}



// ------------------------------------------------------
// CHECK BUSY
// ------------------------------------------------------

function isBusy() {

    return state.isGenerating;

}



// ------------------------------------------------------
// RESET SESSION
// ------------------------------------------------------

function resetSession() {

    const id = createSessionId();

    state.sessionId = id;

    localStorage.setItem(

        STORAGE_KEYS.SESSION_ID,

        id

    );

}

// ======================================================
// SECTION 3
// DOM REFERENCES
// ======================================================

// ------------------------------------------------------
// CACHE DOM ELEMENTS
// ------------------------------------------------------

function cacheDOM() {

    // Chat Container
    dom.chatContainer =
        document.querySelector(".chat-container");

    dom.messages =
        document.getElementById("messages");



    // Input Area
    dom.userInput =
        document.getElementById("userInput");

    dom.sendButton =
        document.getElementById("sendButton");

    dom.micButton =
        document.getElementById("micButton");

    dom.clearChat =
        document.getElementById("clearChat");



    // Theme
    dom.themeToggle =
        document.getElementById("themeToggle");



    // Voice Status
    dom.voiceStatus =
        document.getElementById("voiceStatus");



    // Chat Header
    dom.chatHeader =
        document.querySelector(".chat-header");

    dom.chatAvatar =
        document.querySelector(".chat-avatar");



    // Optional Elements
    dom.chatForm =
        document.getElementById("chatForm");

    dom.fileInput =
        document.getElementById("fileInput");

    dom.imagePreview =
        document.getElementById("imagePreview");

    dom.exportButton =
        document.getElementById("exportChat");

    dom.importButton =
        document.getElementById("importChat");

}



// ------------------------------------------------------
// VERIFY REQUIRED ELEMENTS
// ------------------------------------------------------

function verifyDOM() {

    const required = [

        "messages",

        "userInput",

        "sendButton"

    ];

    for (const key of required) {

        if (!dom[key]) {

            console.error(

                `Missing HTML element: ${key}`

            );

        }

    }

}



// ------------------------------------------------------
// SAFE DOM GETTER
// ------------------------------------------------------

function getElement(name) {

    return dom[name] || null;

}



// ------------------------------------------------------
// ENABLE ELEMENT
// ------------------------------------------------------

function enableElement(name) {

    const element = getElement(name);

    if (!element) return;

    element.disabled = false;

}



// ------------------------------------------------------
// DISABLE ELEMENT
// ------------------------------------------------------

function disableElement(name) {

    const element = getElement(name);

    if (!element) return;

    element.disabled = true;

}



// ------------------------------------------------------
// SHOW ELEMENT
// ------------------------------------------------------

function showElement(name) {

    const element = getElement(name);

    if (!element) return;

    element.classList.remove("hidden");

}



// ------------------------------------------------------
// HIDE ELEMENT
// ------------------------------------------------------

function hideElement(name) {

    const element = getElement(name);

    if (!element) return;

    element.classList.add("hidden");

}



// ------------------------------------------------------
// SET TEXT
// ------------------------------------------------------

function setText(name, text) {

    const element = getElement(name);

    if (!element) return;

    element.textContent = text;

}



// ------------------------------------------------------
// SET HTML
// ------------------------------------------------------

function setHTML(name, html) {

    const element = getElement(name);

    if (!element) return;

    element.innerHTML = html;

}



// ------------------------------------------------------
// CLEAR ELEMENT
// ------------------------------------------------------

function clearElement(name) {

    const element = getElement(name);

    if (!element) return;

    element.innerHTML = "";

}

// ======================================================
// SECTION 4
// UTILITY FUNCTIONS
// ======================================================



// ------------------------------------------------------
// SLEEP
// ------------------------------------------------------

function sleep(ms) {

    return new Promise(resolve => setTimeout(resolve, ms));

}



// ------------------------------------------------------
// RANDOM INTEGER
// ------------------------------------------------------

function random(min, max) {

    return Math.floor(

        Math.random() * (max - min + 1)

    ) + min;

}



// ------------------------------------------------------
// RANDOM TYPING DELAY
// ------------------------------------------------------

function randomDelay() {

    return random(

        TYPING.minDelay,

        TYPING.maxDelay

    );

}



// ------------------------------------------------------
// CURRENT TIME
// ------------------------------------------------------

function currentTime() {

    return new Date().toLocaleTimeString([], {

        hour: "2-digit",

        minute: "2-digit"

    });

}



// ------------------------------------------------------
// CURRENT DATE
// ------------------------------------------------------

function currentDate() {

    return new Date().toLocaleDateString();

}



// ------------------------------------------------------
// UNIQUE ID
// ------------------------------------------------------

function uuid() {

    return (

        Date.now().toString(36) +

        Math.random()

            .toString(36)

            .substring(2, 10)

    );

}



// ------------------------------------------------------
// DEBOUNCE
// ------------------------------------------------------

function debounce(callback, delay = 300) {

    let timeout;

    return (...args) => {

        clearTimeout(timeout);

        timeout = setTimeout(() => {

            callback(...args);

        }, delay);

    };

}



// ------------------------------------------------------
// THROTTLE
// ------------------------------------------------------

function throttle(callback, limit = 200) {

    let waiting = false;

    return (...args) => {

        if (waiting) return;

        callback(...args);

        waiting = true;

        setTimeout(() => {

            waiting = false;

        }, limit);

    };

}



// ------------------------------------------------------
// SMOOTH SCROLL TO BOTTOM
// ------------------------------------------------------

function scrollToBottom() {

    if (!dom.messages) return;

    dom.messages.scrollTo({

        top: dom.messages.scrollHeight,

        behavior: UI.scrollBehavior

    });

}



// ------------------------------------------------------
// INSTANT SCROLL
// ------------------------------------------------------

function scrollBottomInstant() {

    if (!dom.messages) return;

    dom.messages.scrollTop =

        dom.messages.scrollHeight;

}



// ------------------------------------------------------
// SAFE SCROLL
// ------------------------------------------------------

function safeScrollBottom() {

    requestAnimationFrame(() => {

        scrollToBottom();

    });

}



// ------------------------------------------------------
// COPY TEXT
// ------------------------------------------------------

async function copyText(text) {

    try {

        await navigator.clipboard.writeText(text);

        showToast("Copied");

        return true;

    }

    catch {

        showToast("Copy Failed");

        return false;

    }

}



// ------------------------------------------------------
// DOWNLOAD FILE
// ------------------------------------------------------

function download(filename, content) {

    const blob = new Blob(

        [content],

        {

            type: "text/plain"

        }

    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = filename;

    a.click();

    URL.revokeObjectURL(url);

}



// ------------------------------------------------------
// SHOW TOAST
// ------------------------------------------------------

function showToast(message) {

    if (!FEATURES.toastNotifications) {

        return;

    }

    let toast =

        document.querySelector(".toast");

    if (!toast) {

        toast = document.createElement("div");

        toast.className = "toast";

        document.body.appendChild(toast);

    }

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(timers.toast);

    timers.toast = setTimeout(() => {

        toast.classList.remove("show");

    }, UI.toastDuration);

}



// ------------------------------------------------------
// AUTO RESIZE TEXTAREA
// ------------------------------------------------------

function autoResizeTextarea() {

    if (!dom.userInput) return;

    dom.userInput.style.height = "auto";

    dom.userInput.style.height =

        Math.min(

            dom.userInput.scrollHeight,

            CHAT.maxTextareaHeight

        ) + "px";

}



// ------------------------------------------------------
// RESET TEXTAREA
// ------------------------------------------------------

function resetTextarea() {

    if (!dom.userInput) return;

    dom.userInput.value = "";

    dom.userInput.style.height =

        CHAT.defaultTextareaHeight + "px";

}



// ------------------------------------------------------
// LOCK INPUT
// ------------------------------------------------------

function lockInput() {

    dom.userInput.disabled = true;

    dom.sendButton.disabled = true;

    if (dom.micButton) {

        dom.micButton.disabled = true;

    }

}



// ------------------------------------------------------
// UNLOCK INPUT
// ------------------------------------------------------

function unlockInput() {

    dom.userInput.disabled = false;

    dom.sendButton.disabled = false;

    if (dom.micButton) {

        dom.micButton.disabled = false;

    }

    dom.userInput.focus();

}



// ------------------------------------------------------
// TRIM INPUT
// ------------------------------------------------------

function cleanInput(text) {

    return text.trim();

}



// ------------------------------------------------------
// EMPTY CHECK
// ------------------------------------------------------

function isEmpty(text) {

    return cleanInput(text).length === 0;

}



// ------------------------------------------------------
// SAFE JSON PARSE
// ------------------------------------------------------

function safeJSON(text) {

    try {

        return JSON.parse(text);

    }

    catch {

        return null;

    }

}



// ------------------------------------------------------
// ESCAPE HTML
// ------------------------------------------------------

function escapeHTML(text) {

    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;

}

// ======================================================
// SECTION 5
// APPLICATION INITIALIZATION
// ======================================================



// ------------------------------------------------------
// INITIALIZE APPLICATION
// ------------------------------------------------------

async function initializeApp() {

    if (state.initialized) {

        return;

    }

    console.log("Initializing Remi+...");



    // Cache DOM

    cacheDOM();

    verifyDOM();



    // Session

    getSessionId();



    // Theme

    initializeTheme();



    // Restore History

    if (FEATURES.restoreHistory) {

        restoreChatHistory();

    }



    // Register Events

    registerEventListeners();



    // Prepare Input

    resetTextarea();



    if (CHAT.autoFocus && dom.userInput) {

        dom.userInput.focus();

    }



    // Welcome Message

    if (dom.messages && dom.messages.children.length === 0) {

        addBotMessage(

`# 👋 Welcome to Remi+

I'm your AI assistant.

You can ask me anything.

- 💡 General Questions
- 💻 Programming
- 📊 Data Analysis
- ✍️ Writing
- 🌐 Research

How can I help you today?`

        );

    }



    setReady();

    console.log("Remi+ Ready.");

}



// ------------------------------------------------------
// START APPLICATION
// ------------------------------------------------------

function startApplication() {

    initializeApp()

        .catch(error => {

            console.error(

                "Initialization Error:",

                error

            );

        });

}



// ------------------------------------------------------
// PAGE READY
// ------------------------------------------------------

if (

    document.readyState === "loading"

) {

    document.addEventListener(

        "DOMContentLoaded",

        startApplication

    );

}

else {

    startApplication();

}



// ------------------------------------------------------
// WINDOW FOCUS
// ------------------------------------------------------

window.addEventListener(

    "focus",

    () => {

        if (

            dom.userInput &&

            !state.isGenerating

        ) {

            dom.userInput.focus();

        }

    }

);



// ------------------------------------------------------
// BEFORE UNLOAD
// ------------------------------------------------------

window.addEventListener(

    "beforeunload",

    () => {

        if (

            FEATURES.autoSaveHistory

        ) {

            saveChatHistory();

        }

    }

);



// ------------------------------------------------------
// WINDOW ERROR
// ------------------------------------------------------

window.addEventListener(

    "error",

    event => {

        console.error(

            "Runtime Error:",

            event.error

        );

    }

);



// ------------------------------------------------------
// UNHANDLED PROMISES
// ------------------------------------------------------

window.addEventListener(

    "unhandledrejection",

    event => {

        console.error(

            "Unhandled Promise:",

            event.reason

        );

    }

);



// ------------------------------------------------------
// CONNECTION STATUS
// ------------------------------------------------------

window.addEventListener(

    "online",

    () => {

        showToast(

            "Internet Connected"

        );

    }

);



window.addEventListener(

    "offline",

    () => {

        showToast(

            "Internet Disconnected"

        );

    }

);



// ------------------------------------------------------
// VISIBILITY CHANGE
// ------------------------------------------------------

document.addEventListener(

    "visibilitychange",

    () => {

        if (

            document.hidden

        ) {

            console.log(

                "Application Hidden"

            );

        }

        else {

            console.log(

                "Application Visible"

            );

        }

    }

);

// ======================================================
// SECTION 6
// STORAGE MANAGER
// ======================================================



// ------------------------------------------------------
// SAVE CHAT HISTORY
// ------------------------------------------------------

function saveChatHistory() {

    if (!FEATURES.autoSaveHistory) {

        return;

    }

    try {

        localStorage.setItem(

            STORAGE_KEYS.CHAT_HISTORY,

            JSON.stringify(chat.history)

        );

    }

    catch (error) {

        console.error(

            "Unable to save chat history:",

            error

        );

    }

}



// ------------------------------------------------------
// RESTORE CHAT HISTORY
// ------------------------------------------------------

function restoreChatHistory() {

    if (!FEATURES.restoreHistory) {

        return;

    }

    try {

        const saved = localStorage.getItem(

            STORAGE_KEYS.CHAT_HISTORY

        );

        if (!saved) {

            return;

        }

        const history = JSON.parse(saved);

        if (!Array.isArray(history)) {

            return;

        }

        chat.history = history;

        history.forEach(message => {

            if (message.role === "user") {

                addUserMessage(

                    message.content,

                    false

                );

            }

            else if (message.role === "bot") {

                addBotMessage(

                    message.content,

                    false

                );

            }

            else {

                addSystemMessage(

                    message.content,

                    false

                );

            }

        });

        scrollBottomInstant();

    }

    catch (error) {

        console.error(

            "Unable to restore chat history:",

            error

        );

    }

}



// ------------------------------------------------------
// ADD MESSAGE TO HISTORY
// ------------------------------------------------------

function saveMessage(role, content) {

    chat.history.push({

        id: nextMessageId(),

        role,

        content,

        timestamp: Date.now()

    });

    saveChatHistory();

}



// ------------------------------------------------------
// CLEAR CHAT HISTORY
// ------------------------------------------------------

function clearChatHistory() {

    chat.history = [];

    localStorage.removeItem(

        STORAGE_KEYS.CHAT_HISTORY

    );

}



// ------------------------------------------------------
// CLEAR CHAT
// ------------------------------------------------------

function clearChat() {

    if (

        !confirm(

            "Clear the entire conversation?"

        )

    ) {

        return;

    }

    clearChatHistory();

    clearElement("messages");

    showToast("Chat Cleared");

}



// ------------------------------------------------------
// EXPORT CHAT
// ------------------------------------------------------

function exportChat() {

    if (chat.history.length === 0) {

        showToast(

            "No chat to export."

        );

        return;

    }

    const data = {

        app: APP_CONFIG.name,

        version: APP_CONFIG.version,

        exported: new Date().toISOString(),

        session: getSessionId(),

        history: chat.history

    };

    download(

        `RemiPlus-${Date.now()}.json`,

        JSON.stringify(

            data,

            null,

            2

        )

    );

    showToast(

        "Chat Exported"

    );

}



// ------------------------------------------------------
// IMPORT CHAT
// ------------------------------------------------------

function importChat(file) {

    if (!file) {

        return;

    }

    const reader = new FileReader();

    reader.onload = event => {

        try {

            const json = JSON.parse(

                event.target.result

            );

            if (

                !json.history ||

                !Array.isArray(

                    json.history

                )

            ) {

                throw new Error();

            }

            clearElement(

                "messages"

            );

            chat.history = [];

            json.history.forEach(item => {

                if (

                    item.role === "user"

                ) {

                    addUserMessage(

                        item.content,

                        false

                    );

                }

                else if (

                    item.role === "bot"

                ) {

                    addBotMessage(

                        item.content,

                        false

                    );

                }

                else {

                    addSystemMessage(

                        item.content,

                        false

                    );

                }

            });

            chat.history =

                json.history;

            saveChatHistory();

            showToast(

                "Chat Imported"

            );

        }

        catch {

            showToast(

                "Invalid Chat File"

            );

        }

    };

    reader.readAsText(file);

}



// ------------------------------------------------------
// DELETE SESSION
// ------------------------------------------------------

function resetConversation() {

    clearChatHistory();

    resetSession();

    clearElement("messages");

    addBotMessage(

`# 👋 New Conversation

A new conversation has started.

How can I help you today?`

    );

}



// ------------------------------------------------------
// GET HISTORY
// ------------------------------------------------------

function getHistory() {

    return [...chat.history];

}



// ------------------------------------------------------
// HISTORY COUNT
// ------------------------------------------------------

function historyCount() {

    return chat.history.length;

}



// ------------------------------------------------------
// LAST MESSAGE
// ------------------------------------------------------

function lastMessage() {

    if (

        chat.history.length === 0

    ) {

        return null;

    }

    return chat.history[

        chat.history.length - 1

    ];

}

// ======================================================
// SECTION 7
// THEME MANAGER
// ======================================================



// ------------------------------------------------------
// INITIALIZE THEME
// ------------------------------------------------------

function initializeTheme() {

    let savedTheme = localStorage.getItem(

        STORAGE_KEYS.THEME

    );

    if (!savedTheme) {

        savedTheme =

            window.matchMedia(

                "(prefers-color-scheme: dark)"

            ).matches

                ? "dark"

                : "light";

    }

    applyTheme(savedTheme);

}



// ------------------------------------------------------
// APPLY THEME
// ------------------------------------------------------

function applyTheme(theme) {

    state.theme = theme;

    document.body.classList.toggle(

        "dark",

        theme === "dark"

    );

    document.body.classList.toggle(

        "light",

        theme === "light"

    );

    localStorage.setItem(

        STORAGE_KEYS.THEME,

        theme

    );

    updateThemeButton();

}



// ------------------------------------------------------
// TOGGLE THEME
// ------------------------------------------------------

function toggleTheme() {

    if (state.theme === "dark") {

        applyTheme("light");

    }

    else {

        applyTheme("dark");

    }

}



// ------------------------------------------------------
// UPDATE THEME BUTTON
// ------------------------------------------------------

function updateThemeButton() {

    if (!dom.themeToggle) {

        return;

    }

    const icon =

        dom.themeToggle.querySelector("i");

    if (!icon) {

        return;

    }

    if (state.theme === "dark") {

        icon.className =

            "fas fa-sun";

        dom.themeToggle.title =

            "Switch to Light Mode";

    }

    else {

        icon.className =

            "fas fa-moon";

        dom.themeToggle.title =

            "Switch to Dark Mode";

    }

}



// ------------------------------------------------------
// GET CURRENT THEME
// ------------------------------------------------------

function getCurrentTheme() {

    return state.theme;

}



// ------------------------------------------------------
// IS DARK MODE
// ------------------------------------------------------

function isDarkMode() {

    return state.theme === "dark";

}



// ------------------------------------------------------
// IS LIGHT MODE
// ------------------------------------------------------

function isLightMode() {

    return state.theme === "light";

}



// ------------------------------------------------------
// SET DARK MODE
// ------------------------------------------------------

function enableDarkMode() {

    applyTheme("dark");

}



// ------------------------------------------------------
// SET LIGHT MODE
// ------------------------------------------------------

function enableLightMode() {

    applyTheme("light");

}



// ------------------------------------------------------
// FOLLOW SYSTEM THEME
// ------------------------------------------------------

const systemTheme = window.matchMedia(

    "(prefers-color-scheme: dark)"

);

systemTheme.addEventListener(

    "change",

    event => {

        const savedTheme =

            localStorage.getItem(

                STORAGE_KEYS.THEME

            );

        if (savedTheme) {

            return;

        }

        applyTheme(

            event.matches

                ? "dark"

                : "light"

        );

    }

);



// ------------------------------------------------------
// REMOVE SAVED THEME
// ------------------------------------------------------

function resetTheme() {

    localStorage.removeItem(

        STORAGE_KEYS.THEME

    );

    initializeTheme();

}



// ------------------------------------------------------
// ANIMATE THEME SWITCH
// ------------------------------------------------------

function animateThemeTransition() {

    document.body.classList.add(

        "theme-transition"

    );

    setTimeout(() => {

        document.body.classList.remove(

            "theme-transition"

        );

    }, 300);

}



// ------------------------------------------------------
// TOGGLE WITH ANIMATION
// ------------------------------------------------------

function switchTheme() {

    animateThemeTransition();

    toggleTheme();

}

// ======================================================
// SECTION 8A
// MESSAGE FACTORY
// ======================================================



// ------------------------------------------------------
// CREATE MESSAGE
// ------------------------------------------------------

function createMessage(role) {

    const message = document.createElement("div");

    switch (role) {

        case "user":

            message.className = "user-message";

            break;

        case "system":

            message.className = "system-message";

            break;

        default:

            message.className = "bot-message";

    }

    return message;

}



// ------------------------------------------------------
// APPEND MESSAGE
// ------------------------------------------------------

function appendMessage(message) {

    dom.messages.appendChild(message);

    safeScrollBottom();

}



// ------------------------------------------------------
// CREATE MARKDOWN BODY
// ------------------------------------------------------

function createMarkdownBody(markdown) {

    const body = document.createElement("div");

    body.className = "markdown-body";

    if (

        FEATURES.markdown &&

        typeof marked !== "undefined"

    ) {

        body.innerHTML = marked.parse(markdown);

    }

    else {

        body.textContent = markdown;

    }

    return body;

}



// ------------------------------------------------------
// CREATE TEXT BODY
// ------------------------------------------------------

function createTextBody(text) {

    const body = document.createElement("div");

    body.className = "message-body";

    body.textContent = text;

    return body;

}



// ------------------------------------------------------
// CREATE TIMESTAMP
// ------------------------------------------------------

function createTimestamp() {

    const time = document.createElement("span");

    time.className = "message-time";

    time.textContent = currentTime();

    return time;

}



// ------------------------------------------------------
// CREATE FOOTER
// ------------------------------------------------------

function createFooter() {

    const footer = document.createElement("div");

    footer.className = "message-footer";

    return footer;

}



// ------------------------------------------------------
// CREATE ACTION BAR
// ------------------------------------------------------

function createActionBar() {

    const actions = document.createElement("div");

    actions.className = "message-actions";

    return actions;

}



// ------------------------------------------------------
// CREATE ICON BUTTON
// ------------------------------------------------------

function createActionButton(

    icon,

    title,

    callback

) {

    const button = document.createElement("button");

    button.type = "button";

    button.className = "action-btn";

    button.title = title;

    button.innerHTML = `<i class="${icon}"></i>`;

    button.addEventListener(

        "click",

        callback

    );

    return button;

}



// ------------------------------------------------------
// BUILD MESSAGE
// ------------------------------------------------------

function buildMessage(

    role,

    content

) {

    const message = createMessage(role);

    let body;

    if (

        role === "bot" &&

        FEATURES.markdown

    ) {

        body = createMarkdownBody(content);

    }

    else {

        body = createTextBody(content);

    }

    message.appendChild(body);

    appendMessage(message);

    return message;

}



// ------------------------------------------------------
// ADD USER MESSAGE
// ------------------------------------------------------

function addUserMessage(

    text,

    save = true

) {

    buildMessage(

        "user",

        text

    );

    if (save) {

        saveMessage(

            "user",

            text

        );

    }

}



// ------------------------------------------------------
// ADD BOT MESSAGE
// ------------------------------------------------------

function addBotMessage(

    markdown,

    save = true

) {

    const message = buildMessage(

        "bot",

        markdown

    );

    highlightCode(message);

    attachFooter(

        message,

        markdown

    );

    if (save) {

        saveMessage(

            "bot",

            markdown

        );

    }

}



// ------------------------------------------------------
// ADD SYSTEM MESSAGE
// ------------------------------------------------------

function addSystemMessage(

    text,

    save = true

) {

    buildMessage(

        "system",

        text

    );

    if (save) {

        saveMessage(

            "system",

            text

        );

    }

}

// ======================================================
// SECTION 8B
// MARKDOWN RENDERER
// ======================================================



// ------------------------------------------------------
// CONFIGURE MARKED
// ------------------------------------------------------

if (typeof marked !== "undefined") {

    marked.setOptions({

        breaks: true,

        gfm: true,

        headerIds: false,

        mangle: false

    });

}



// ------------------------------------------------------
// RENDER MARKDOWN
// ------------------------------------------------------

function renderMarkdown(markdown) {

    if (!FEATURES.markdown) {

        return escapeHTML(markdown);

    }

    if (typeof marked === "undefined") {

        return escapeHTML(markdown);

    }

    try {

        return marked.parse(markdown);

    }

    catch (error) {

        console.error(

            "Markdown Error:",

            error

        );

        return escapeHTML(markdown);

    }

}



// ------------------------------------------------------
// HIGHLIGHT CODE
// ------------------------------------------------------

function highlightCode(container) {

    if (

        !FEATURES.syntaxHighlight ||

        typeof hljs === "undefined"

    ) {

        return;

    }

    container

        .querySelectorAll("pre code")

        .forEach(block => {

            hljs.highlightElement(block);

        });

    addCopyButtons(container);

}



// ------------------------------------------------------
// COPY BUTTONS
// ------------------------------------------------------

function addCopyButtons(container) {

    container

        .querySelectorAll("pre")

        .forEach(pre => {

            if (

                pre.querySelector(

                    ".copy-code"

                )

            ) {

                return;

            }

            const button =

                document.createElement(

                    "button"

                );

            button.className =

                "copy-code";

            button.textContent =

                "Copy";

            button.onclick = () => {

                copyCode(pre);

            };

            pre.prepend(button);

        });

}



// ------------------------------------------------------
// COPY CODE
// ------------------------------------------------------

async function copyCode(pre) {

    try {

        const code =

            pre.querySelector("code")

                .innerText;

        await navigator.clipboard.writeText(

            code

        );

        const button =

            pre.querySelector(

                ".copy-code"

            );

        button.textContent =

            "Copied!";

        setTimeout(() => {

            button.textContent =

                "Copy";

        }, 1500);

    }

    catch {

        showToast(

            "Unable to copy."

        );

    }

}



// ------------------------------------------------------
// ESCAPE HTML
// ------------------------------------------------------

function escapeHTML(text) {

    const div =

        document.createElement(

            "div"

        );

    div.textContent = text;

    return div.innerHTML;

}



// ------------------------------------------------------
// AUTO LINKS
// ------------------------------------------------------

function linkify(container) {

    container

        .querySelectorAll("a")

        .forEach(link => {

            link.target = "_blank";

            link.rel =

                "noopener noreferrer";

        });

}



// ------------------------------------------------------
// RESPONSIVE TABLES
// ------------------------------------------------------

function wrapTables(container) {

    container

        .querySelectorAll("table")

        .forEach(table => {

            if (

                table.parentElement

                    .classList.contains(

                        "table-wrapper"

                    )

            ) {

                return;

            }

            const wrapper =

                document.createElement(

                    "div"

                );

            wrapper.className =

                "table-wrapper";

            table.parentNode.insertBefore(

                wrapper,

                table

            );

            wrapper.appendChild(table);

        });

}



// ------------------------------------------------------
// RESPONSIVE IMAGES
// ------------------------------------------------------

function prepareImages(container) {

    container

        .querySelectorAll("img")

        .forEach(img => {

            img.loading = "lazy";

            img.decoding = "async";

            img.referrerPolicy =

                "no-referrer";

        });

}



// ------------------------------------------------------
// POST PROCESS MARKDOWN
// ------------------------------------------------------

function postProcessMarkdown(

    container

) {

    linkify(container);

    wrapTables(container);

    prepareImages(container);

    highlightCode(container);

}

// ======================================================
// SECTION 8C
// MESSAGE FOOTER & ACTIONS
// ======================================================



// ------------------------------------------------------
// ATTACH FOOTER
// ------------------------------------------------------

function attachFooter(message, markdown = "") {

    const footer = document.createElement("div");

    footer.className = "message-footer";

    const time = document.createElement("span");

    time.className = "message-time";

    time.textContent = currentTime();

    footer.appendChild(time);

    const actions = createActionButtons(

        markdown,

        message

    );

    footer.appendChild(actions);

    message.appendChild(footer);

}



// ------------------------------------------------------
// CREATE ACTION BUTTONS
// ------------------------------------------------------

function createActionButtons(

    markdown,

    message

) {

    const container = document.createElement("div");

    container.className = "message-actions";



    container.appendChild(

        createActionButton(

            "fa-regular fa-copy",

            "Copy",

            () => copyMessage(markdown)

        )

    );



    if (FEATURES.textToSpeech) {

        container.appendChild(

            createActionButton(

                "fa-solid fa-volume-high",

                "Read Aloud",

                () => speakText(markdown)

            )

        );

    }



    container.appendChild(

        createActionButton(

            "fa-solid fa-rotate-right",

            "Regenerate",

            regenerateLastReply

        )

    );



    container.appendChild(

        createActionButton(

            "fa-regular fa-thumbs-up",

            "Helpful",

            event =>

                rateMessage(

                    event.currentTarget,

                    true

                )

        )

    );



    container.appendChild(

        createActionButton(

            "fa-regular fa-thumbs-down",

            "Not Helpful",

            event =>

                rateMessage(

                    event.currentTarget,

                    false

                )

        )

    );



    return container;

}



// ------------------------------------------------------
// COPY MESSAGE
// ------------------------------------------------------

async function copyMessage(text) {

    await copyText(text);

}



// ------------------------------------------------------
// SPEAK MESSAGE
// ------------------------------------------------------

function speakText(text) {

    if (

        !FEATURES.textToSpeech ||

        !("speechSynthesis" in window)

    ) {

        showToast(

            "Speech unavailable."

        );

        return;

    }



    speechSynthesis.cancel();



    const utterance =

        new SpeechSynthesisUtterance(

            text.replace(/[#>*`]/g, "")

        );



    utterance.lang = SPEECH.language;

    utterance.rate = SPEECH.rate;

    utterance.pitch = SPEECH.pitch;

    utterance.volume = SPEECH.volume;



    state.currentSpeech = utterance;



    speechSynthesis.speak(

        utterance

    );

}



// ------------------------------------------------------
// STOP SPEAKING
// ------------------------------------------------------

function stopSpeaking() {

    speechSynthesis.cancel();

}



// ------------------------------------------------------
// REGENERATE
// ------------------------------------------------------

async function regenerateLastReply() {

    if (

        state.isGenerating ||

        chat.history.length === 0

    ) {

        return;

    }



    const lastUser =

        [...chat.history]

        .reverse()

        .find(

            message =>

                message.role === "user"

        );



    if (!lastUser) {

        return;

    }



    await askAI(

        lastUser.content

    );

}



// ------------------------------------------------------
// RATE MESSAGE
// ------------------------------------------------------

function rateMessage(

    button,

    liked

) {

    const actions =

        button.parentElement;



    actions

        .querySelectorAll(

            ".action-btn"

        )

        .forEach(btn => {

            btn.classList.remove(

                "active"

            );

        });



    button.classList.add(

        "active"

    );



    showToast(

        liked

            ? "Thanks for your feedback!"

            : "Feedback received."

    );

}



// ------------------------------------------------------
// ADD TYPING CURSOR
// ------------------------------------------------------

function addTypingCursor(message) {

    const cursor =

        document.createElement(

            "span"

        );



    cursor.className =

        "typing-cursor";



    cursor.textContent = "▋";



    message.appendChild(cursor);



    return cursor;

}



// ------------------------------------------------------
// REMOVE TYPING CURSOR
// ------------------------------------------------------

function removeTypingCursor(cursor) {

    if (

        cursor &&

        cursor.parentNode

    ) {

        cursor.remove();

    }

}



// ------------------------------------------------------
// AI THINKING
// ------------------------------------------------------

function showThinking() {

    removeThinking();



    const thinking =

        document.createElement("div");



    thinking.className =

        "thinking";



    thinking.id =

        "thinkingMessage";



    thinking.innerHTML =

        `

<div class="dot"></div>

<div class="dot"></div>

<div class="dot"></div>

<span>Remi+ is thinking...</span>

`;



    dom.messages.appendChild(

        thinking

    );



    safeScrollBottom();

}



// ------------------------------------------------------
// REMOVE THINKING
// ------------------------------------------------------

function removeThinking() {

    document

        .getElementById(

            "thinkingMessage"

        )

        ?.remove();

}

// ======================================================
// SECTION 9
// AI COMMUNICATION ENGINE
// ======================================================



// ------------------------------------------------------
// SEND MESSAGE TO AI
// ------------------------------------------------------

async function askAI(prompt) {

    if (state.isGenerating) {

        return;

    }

    state.isGenerating = true;

    lockInput();

    aiThinking();

    showThinking();

    try {

        const response = await fetch(

            WEBHOOK_URL,

            {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    message: prompt,

                    sessionId: getSessionId()

                })

            }

        );

        if (!response.ok) {

            throw new Error(

                `HTTP ${response.status}`

            );

        }

        const data = await response.json();

        removeThinking();



        if (

            THINKING.enabled

        ) {

            await sleep(

                THINKING.delay

            );

        }



        const reply = extractReply(data);



        if (

            TYPING.enabled

        ) {

            await typeBotMessage(

                reply

            );

        }

        else {

            addBotMessage(

                reply

            );

        }



        aiReady();

    }

    catch (error) {

        console.error(

            error

        );



        removeThinking();



        addSystemMessage(

            "❌ Unable to connect to Remi+. Please try again."

        );



        aiError();

    }

    finally {

        unlockInput();

        state.isGenerating = false;

    }

}



// ------------------------------------------------------
// TYPE BOT MESSAGE
// ------------------------------------------------------

async function typeBotMessage(markdown) {

    aiTyping();



    const message = createMessage("bot");



    const body = document.createElement("div");

    body.className = "markdown-body";



    message.appendChild(body);

    appendMessage(message);



    const cursor = addTypingCursor(body);



    const words = markdown.split(/\s+/);



    let current = "";



    for (const word of words) {

        current += word + " ";



        body.innerHTML =

            renderMarkdown(current);



        body.appendChild(cursor);



        postProcessMarkdown(body);



        safeScrollBottom();



        if (

            document.hidden

        ) {

            continue;

        }



        let delay = randomNumber(

            TYPING.minDelay,

            TYPING.maxDelay

        );



        if (

            /[.,!?;:]$/.test(word)

        ) {

            delay +=

                TYPING.punctuationDelay;

        }



        await sleep(delay);

    }



    removeTypingCursor(cursor);



    body.innerHTML =

        renderMarkdown(markdown);



    postProcessMarkdown(body);



    attachFooter(

        message,

        markdown

    );



    if (

        FEATURES.autoSaveHistory

    ) {

        saveMessage(

            "bot",

            markdown

        );

    }



    safeScrollBottom();



    aiReady();

}



// ------------------------------------------------------
// EXTRACT AI RESPONSE
// ------------------------------------------------------

function extractReply(data) {

    if (

        Array.isArray(data)

    ) {

        data = data[0];

    }



    if (!data) {

        return "⚠️ Empty response received.";

    }



    if (

        typeof data === "string"

    ) {

        return data;

    }



    const keys = [

        "reply",

        "response",

        "output",

        "message",

        "text",

        "content",

        "answer"

    ];



    for (const key of keys) {

        if (

            data[key]

        ) {

            return data[key];

        }

    }



    return JSON.stringify(

        data,

        null,

        2

    );

}



// ------------------------------------------------------
// RETRY LAST PROMPT
// ------------------------------------------------------

async function retryLastPrompt() {

    const last =

        [...chat.history]

        .reverse()

        .find(

            item =>

                item.role === "user"

        );



    if (!last) {

        return;

    }



    await askAI(

        last.content

    );

}



// ------------------------------------------------------
// CANCEL REQUEST
// ------------------------------------------------------

function cancelGeneration() {

    state.isGenerating = false;

    unlockInput();

    removeThinking();

    aiReady();

}



// ------------------------------------------------------
// CONNECTION TEST
// ------------------------------------------------------

async function testConnection() {

    try {

        const response = await fetch(

            WEBHOOK_URL,

            {

                method: "HEAD"

            }

        );



        return response.ok;

    }

    catch {

        return false;

    }

}



// ------------------------------------------------------
// SEND USER PROMPT
// ------------------------------------------------------

async function sendPrompt() {

    const text =

        dom.userInput.value.trim();



    if (

        !text ||

        state.isGenerating

    ) {

        return;

    }



    addUserMessage(text);



    dom.userInput.value = "";



    resetTextarea();



    await askAI(text);

}



// ------------------------------------------------------
// QUICK PROMPT
// ------------------------------------------------------

async function ask(question) {

    addUserMessage(question);

    await askAI(question);

}

// ======================================================
// SECTION 10
// EVENT MANAGER
// ======================================================



// ------------------------------------------------------
// REGISTER ALL EVENTS
// ------------------------------------------------------

function registerEventListeners() {

    registerInputEvents();

    registerButtonEvents();

    registerKeyboardEvents();

    registerWindowEvents();

}



// ------------------------------------------------------
// INPUT EVENTS
// ------------------------------------------------------

function registerInputEvents() {

    if (!dom.userInput) return;



    dom.userInput.addEventListener(

        "input",

        autoResizeTextarea

    );



    dom.userInput.addEventListener(

        "paste",

        () => {

            requestAnimationFrame(

                autoResizeTextarea

            );

        }

    );

}



// ------------------------------------------------------
// BUTTON EVENTS
// ------------------------------------------------------

function registerButtonEvents() {

    if (dom.sendButton) {

        dom.sendButton.addEventListener(

            "click",

            sendPrompt

        );

    }



    if (dom.clearChat) {

        dom.clearChat.addEventListener(

            "click",

            clearChat

        );

    }



    if (dom.themeToggle) {

        dom.themeToggle.addEventListener(

            "click",

            switchTheme

        );

    }



    if (dom.micButton) {

        dom.micButton.addEventListener(

            "click",

            toggleSpeechRecognition

        );

    }

}



// ------------------------------------------------------
// KEYBOARD EVENTS
// ------------------------------------------------------

function registerKeyboardEvents() {

    if (!dom.userInput) return;



    dom.userInput.addEventListener(

        "keydown",

        async event => {

            if (

                event.key === "Enter" &&

                !event.shiftKey

            ) {

                event.preventDefault();

                await sendPrompt();

            }

        }

    );



    document.addEventListener(

        "keydown",

        event => {

            // ESC cancels AI generation

            if (

                event.key === "Escape"

            ) {

                cancelGeneration();

            }



            // Ctrl + L

            if (

                event.ctrlKey &&

                event.key.toLowerCase() === "l"

            ) {

                event.preventDefault();

                clearChat();

            }



            // Ctrl + /

            if (

                event.ctrlKey &&

                event.key === "/"

            ) {

                event.preventDefault();

                dom.userInput.focus();

            }

        }

    );

}



// ------------------------------------------------------
// WINDOW EVENTS
// ------------------------------------------------------

function registerWindowEvents() {

    window.addEventListener(

        "resize",

        debounce(

            safeScrollBottom,

            200

        )

    );

}



// ------------------------------------------------------
// ENABLE SEND BUTTON
// ------------------------------------------------------

function updateSendButton() {

    if (!dom.sendButton) return;



    dom.sendButton.disabled =

        isEmpty(

            dom.userInput.value

        ) ||

        state.isGenerating;

}



// ------------------------------------------------------
// ENABLE INPUT EVENTS
// ------------------------------------------------------

if (dom.userInput) {

    dom.userInput.addEventListener(

        "input",

        updateSendButton

    );

}



// ------------------------------------------------------
// GLOBAL SHORTCUTS
// ------------------------------------------------------

document.addEventListener(

    "visibilitychange",

    () => {

        if (

            !document.hidden

        ) {

            updateSendButton();

        }

    }

);



// ------------------------------------------------------
// CLICK OUTSIDE
// ------------------------------------------------------

document.addEventListener(

    "click",

    event => {

        if (

            event.target.matches(

                ".toast"

            )

        ) {

            event.target.classList.remove(

                "show"

            );

        }

    }

);



// ------------------------------------------------------
// DRAG & DROP IMPORT
// ------------------------------------------------------

document.addEventListener(

    "dragover",

    event => {

        event.preventDefault();

    }

);



document.addEventListener(

    "drop",

    event => {

        event.preventDefault();



        const file =

            event.dataTransfer.files[0];



        if (

            file &&

            file.name.endsWith(

                ".json"

            )

        ) {

            importChat(file);

        }

    }

);



// ------------------------------------------------------
// AUTO FOCUS
// ------------------------------------------------------

window.addEventListener(

    "focus",

    () => {

        if (

            !state.isGenerating &&

            dom.userInput

        ) {

            dom.userInput.focus();

        }

    }

);



// ------------------------------------------------------
// INITIAL BUTTON STATE
// ------------------------------------------------------

updateSendButton();

// ======================================================
// SECTION 11
// VOICE RECOGNITION & TEXT TO SPEECH
// ======================================================



// ------------------------------------------------------
// INITIALIZE SPEECH
// ------------------------------------------------------

function initializeSpeech() {

    if (!FEATURES.speechRecognition) {

        return;

    }

    const SpeechRecognition =

        window.SpeechRecognition ||

        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        console.warn(

            "Speech Recognition is not supported."

        );

        if (dom.micButton) {

            dom.micButton.style.display = "none";

        }

        return;

    }

    state.recognition =

        new SpeechRecognition();

    state.recognition.lang =

        SPEECH.language;

    state.recognition.continuous =

        SPEECH.continuous;

    state.recognition.interimResults =

        SPEECH.interimResults;

    state.recognition.maxAlternatives = 1;

    registerSpeechEvents();

}



// ------------------------------------------------------
// REGISTER SPEECH EVENTS
// ------------------------------------------------------

function registerSpeechEvents() {

    if (!state.recognition) {

        return;

    }

    state.recognition.onstart = () => {

        state.isListening = true;

        updateMicButton();

        updateVoiceStatus(

            "🎤 Listening..."

        );

    };



    state.recognition.onresult = event => {

        let transcript = "";

        for (

            let i = event.resultIndex;

            i < event.results.length;

            i++

        ) {

            transcript +=

                event.results[i][0].transcript;

        }

        dom.userInput.value = transcript;

        autoResizeTextarea();

        updateSendButton();

    };



    state.recognition.onerror = event => {

        console.error(

            "Speech Error:",

            event.error

        );

        stopListening();

    };



    state.recognition.onend = () => {

        stopListening();

    };

}



// ------------------------------------------------------
// START LISTENING
// ------------------------------------------------------

function startListening() {

    if (

        !state.recognition ||

        state.isListening

    ) {

        return;

    }

    try {

        state.recognition.start();

    }

    catch (error) {

        console.error(error);

    }

}



// ------------------------------------------------------
// STOP LISTENING
// ------------------------------------------------------

function stopListening() {

    if (

        !state.recognition

    ) {

        return;

    }

    state.isListening = false;

    updateMicButton();

    updateVoiceStatus("");

}



// ------------------------------------------------------
// TOGGLE LISTENING
// ------------------------------------------------------

function toggleSpeechRecognition() {

    if (

        state.isListening

    ) {

        state.recognition.stop();

    }

    else {

        startListening();

    }

}



// ------------------------------------------------------
// UPDATE MICROPHONE BUTTON
// ------------------------------------------------------

function updateMicButton() {

    if (!dom.micButton) {

        return;

    }

    if (

        state.isListening

    ) {

        dom.micButton.classList.add(

            "listening"

        );

        dom.micButton.innerHTML =

            `<i class="fa-solid fa-stop"></i>`;

        dom.micButton.title =

            "Stop Listening";

    }

    else {

        dom.micButton.classList.remove(

            "listening"

        );

        dom.micButton.innerHTML =

            `<i class="fa-solid fa-microphone"></i>`;

        dom.micButton.title =

            "Voice Input";

    }

}



// ------------------------------------------------------
// UPDATE VOICE STATUS
// ------------------------------------------------------

function updateVoiceStatus(text) {

    if (!dom.voiceStatus) {

        return;

    }

    dom.voiceStatus.textContent = text;

}



// ------------------------------------------------------
// TEXT TO SPEECH
// ------------------------------------------------------

function speak(text) {

    if (

        !FEATURES.textToSpeech ||

        !window.speechSynthesis

    ) {

        return;

    }

    speechSynthesis.cancel();

    const utterance =

        new SpeechSynthesisUtterance(

            text.replace(/[#>*`]/g, "")

        );

    utterance.lang =

        SPEECH.language;

    utterance.rate =

        SPEECH.rate;

    utterance.pitch =

        SPEECH.pitch;

    utterance.volume =

        SPEECH.volume;

    state.currentSpeech =

        utterance;

    utterance.onstart = () => {

        aiSpeaking();

    };

    utterance.onend = () => {

        aiReady();

    };

    speechSynthesis.speak(

        utterance

    );

}



// ------------------------------------------------------
// STOP SPEAKING
// ------------------------------------------------------

function stopSpeaking() {

    if (

        window.speechSynthesis

    ) {

        speechSynthesis.cancel();

    }

    aiReady();

}



// ------------------------------------------------------
// TOGGLE SPEAKING
// ------------------------------------------------------

function toggleSpeaking(text) {

    if (

        speechSynthesis.speaking

    ) {

        stopSpeaking();

    }

    else {

        speak(text);

    }

}



// ------------------------------------------------------
// CHECK SPEECH SUPPORT
// ------------------------------------------------------

function speechSupported() {

    return (

        "SpeechRecognition" in window ||

        "webkitSpeechRecognition" in window

    );

}



// ------------------------------------------------------
// CHECK TTS SUPPORT
// ------------------------------------------------------

function textToSpeechSupported() {

    return (

        "speechSynthesis" in window

    );

}



// ------------------------------------------------------
// INITIALIZE AFTER DOM
// ------------------------------------------------------

initializeSpeech();

// ======================================================
// SECTION 12
// AI STATUS & UI MANAGER
// ======================================================



// ------------------------------------------------------
// UPDATE AI STATUS
// ------------------------------------------------------

function updateAIStatus(text, color = "") {

    if (!dom.aiStatus) {

        return;

    }

    dom.aiStatus.textContent = text;

    dom.aiStatus.dataset.state = text;

    dom.aiStatus.style.color = color;

}



// ------------------------------------------------------
// READY
// ------------------------------------------------------

function aiReady() {

    updateAIStatus(

        "Ready",

        "#22C55E"

    );



    unlockInput();

    updateSendButton();

}



// ------------------------------------------------------
// THINKING
// ------------------------------------------------------

function aiThinking() {

    updateAIStatus(

        "Thinking...",

        "#F59E0B"

    );



    lockInput();

}



// ------------------------------------------------------
// TYPING
// ------------------------------------------------------

function aiTyping() {

    updateAIStatus(

        "Typing...",

        "#3B82F6"

    );

}



// ------------------------------------------------------
// SPEAKING
// ------------------------------------------------------

function aiSpeaking() {

    updateAIStatus(

        "Speaking...",

        "#8B5CF6"

    );

}



// ------------------------------------------------------
// LISTENING
// ------------------------------------------------------

function aiListening() {

    updateAIStatus(

        "Listening...",

        "#EF4444"

    );

}



// ------------------------------------------------------
// ERROR
// ------------------------------------------------------

function aiError() {

    updateAIStatus(

        "Error",

        "#EF4444"

    );



    unlockInput();

}



// ------------------------------------------------------
// LOADING
// ------------------------------------------------------

function aiLoading() {

    updateAIStatus(

        "Loading...",

        "#06B6D4"

    );

}



// ------------------------------------------------------
// LOCK INPUT
// ------------------------------------------------------

function lockInput() {

    if (dom.userInput) {

        dom.userInput.disabled = true;

    }



    if (dom.sendButton) {

        dom.sendButton.disabled = true;

    }



    if (dom.micButton) {

        dom.micButton.disabled = true;

    }

}



// ------------------------------------------------------
// UNLOCK INPUT
// ------------------------------------------------------

function unlockInput() {

    if (dom.userInput) {

        dom.userInput.disabled = false;

    }



    if (dom.sendButton) {

        dom.sendButton.disabled =

            isEmpty(

                dom.userInput.value

            );

    }



    if (dom.micButton) {

        dom.micButton.disabled = false;

    }

}



// ------------------------------------------------------
// SHOW LOADING OVERLAY
// ------------------------------------------------------

function showLoadingOverlay() {

    if (

        document.getElementById(

            "loadingOverlay"

        )

    ) {

        return;

    }



    const overlay =

        document.createElement(

            "div"

        );



    overlay.id =

        "loadingOverlay";



    overlay.className =

        "loading-overlay";



    overlay.innerHTML = `

<div class="loading-spinner"></div>

<div class="loading-text">

Loading...

</div>

`;



    document.body.appendChild(

        overlay

    );

}



// ------------------------------------------------------
// HIDE LOADING OVERLAY
// ------------------------------------------------------

function hideLoadingOverlay() {

    document

        .getElementById(

            "loadingOverlay"

        )

        ?.remove();

}



// ------------------------------------------------------
// ENABLE BUTTON
// ------------------------------------------------------

function enableButton(button) {

    if (!button) {

        return;

    }



    button.disabled = false;

}



// ------------------------------------------------------
// DISABLE BUTTON
// ------------------------------------------------------

function disableButton(button) {

    if (!button) {

        return;

    }



    button.disabled = true;

}



// ------------------------------------------------------
// SHOW STATUS BADGE
// ------------------------------------------------------

function setStatusBadge(text, className = "") {

    if (!dom.aiStatus) {

        return;

    }



    dom.aiStatus.textContent = text;

    dom.aiStatus.className =

        className;

}



// ------------------------------------------------------
// RESET UI
// ------------------------------------------------------

function resetUI() {

    removeThinking();

    stopSpeaking();



    if (

        state.isListening &&

        state.recognition

    ) {

        state.recognition.stop();

    }



    unlockInput();

    aiReady();

}



// ------------------------------------------------------
// FLASH STATUS
// ------------------------------------------------------

function flashStatus(

    text,

    color,

    duration = 1500

) {

    updateAIStatus(

        text,

        color

    );



    setTimeout(

        aiReady,

        duration

    );

}

// ======================================================
// SECTION 13
// ADVANCED UTILITIES
// ======================================================



// ------------------------------------------------------
// TOAST NOTIFICATION
// ------------------------------------------------------

function showToast(message, type = "success") {

    if (!FEATURES.toastNotifications) {

        return;

    }

    const existing = document.querySelector(".toast");

    if (existing) {

        existing.remove();

    }

    const toast = document.createElement("div");

    toast.className = `toast ${type}`;

    toast.innerHTML = `

        <span>${message}</span>

    `;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {

        toast.classList.add("show");

    });

    setTimeout(() => {

        toast.classList.remove("show");

        setTimeout(() => {

            toast.remove();

        }, 300);

    }, UI.toastDuration);

}



// ------------------------------------------------------
// COPY TO CLIPBOARD
// ------------------------------------------------------

async function copyText(text) {

    try {

        await navigator.clipboard.writeText(text);

        showToast("Copied to clipboard");

        return true;

    }

    catch (error) {

        console.error(error);

        showToast(

            "Unable to copy",

            "error"

        );

        return false;

    }

}



// ------------------------------------------------------
// DOWNLOAD FILE
// ------------------------------------------------------

function downloadFile(filename, content, type = "text/plain") {

    const blob = new Blob(

        [content],

        {

            type

        }

    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

}



// ------------------------------------------------------
// EXPORT CHAT
// ------------------------------------------------------

function exportChat() {

    const history = localStorage.getItem(

        STORAGE_KEYS.CHAT_HISTORY

    ) || "[]";



    downloadFile(

        `RemiPlus_${new Date().toISOString()}.json`,

        history,

        "application/json"

    );



    showToast("Chat exported");

}



// ------------------------------------------------------
// IMPORT CHAT
// ------------------------------------------------------

function importChat(file) {

    const reader = new FileReader();

    reader.onload = event => {

        try {

            const data = JSON.parse(

                event.target.result

            );



            localStorage.setItem(

                STORAGE_KEYS.CHAT_HISTORY,

                JSON.stringify(data)

            );



            location.reload();

        }

        catch {

            showToast(

                "Invalid chat file",

                "error"

            );

        }

    };



    reader.readAsText(file);

}



// ------------------------------------------------------
// COPY MESSAGE
// ------------------------------------------------------

function copyMessage(button) {

    const message =

        button.closest(

            ".bot-message,.user-message"

        );



    if (!message) {

        return;

    }



    copyText(

        message.innerText.trim()

    );

}



// ------------------------------------------------------
// SHARE MESSAGE
// ------------------------------------------------------

async function shareMessage(button) {

    const message =

        button.closest(

            ".bot-message,.user-message"

        );



    if (!message) {

        return;

    }



    const text =

        message.innerText.trim();



    if (

        navigator.share

    ) {

        try {

            await navigator.share({

                title: APP_CONFIG.name,

                text

            });

        }

        catch {}

    }

    else {

        copyText(text);

    }

}



// ------------------------------------------------------
// SAVE CHAT
// ------------------------------------------------------

function saveChat() {

    if (

        !FEATURES.autoSaveHistory

    ) {

        return;

    }

    localStorage.setItem(

        STORAGE_KEYS.CHAT_HISTORY,

        JSON.stringify(chat.history)

    );

}



// ------------------------------------------------------
// CLEAR CHAT
// ------------------------------------------------------

function clearChat() {

    if (

        !confirm(

            "Clear entire conversation?"

        )

    ) {

        return;

    }



    chat.history = [];



    localStorage.removeItem(

        STORAGE_KEYS.CHAT_HISTORY

    );



    if (dom.messages) {

        dom.messages.innerHTML = "";

    }



    showToast(

        "Chat cleared"

    );

}



// ------------------------------------------------------
// FORMAT DATE
// ------------------------------------------------------

function formatDate(date = new Date()) {

    return date.toLocaleString(

        [],

        {

            year: "numeric",

            month: "short",

            day: "numeric",

            hour: "2-digit",

            minute: "2-digit"

        }

    );

}



// ------------------------------------------------------
// UNIQUE ID
// ------------------------------------------------------

function generateId() {

    return (

        Date.now().toString(36) +

        Math.random()

            .toString(36)

            .substring(2, 10)

    );

}



// ------------------------------------------------------
// RANDOM NUMBER
// ------------------------------------------------------

function randomNumber(min, max) {

    return Math.floor(

        Math.random() *

        (max - min + 1)

    ) + min;

}



// ------------------------------------------------------
// WAIT
// ------------------------------------------------------

function sleep(ms) {

    return new Promise(

        resolve =>

            setTimeout(

                resolve,

                ms

            )

    );

}



// ------------------------------------------------------
// DEBOUNCE
// ------------------------------------------------------

function debounce(fn, delay = 250) {

    let timeout;

    return (...args) => {

        clearTimeout(timeout);

        timeout = setTimeout(

            () => fn(...args),

            delay

        );

    };

}



// ------------------------------------------------------
// THROTTLE
// ------------------------------------------------------

function throttle(fn, delay = 250) {

    let waiting = false;

    return (...args) => {

        if (waiting) {

            return;

        }

        fn(...args);

        waiting = true;

        setTimeout(() => {

            waiting = false;

        }, delay);

    };

}



// ------------------------------------------------------
// SCROLL TO BOTTOM
// ------------------------------------------------------

function safeScrollBottom() {

    if (!dom.messages) {

        return;

    }

    dom.messages.scrollTo({

        top: dom.messages.scrollHeight,

        behavior: UI.scrollBehavior

    });

}

// ======================================================
// SECTION 14
// APPLICATION BOOTSTRAP
// ======================================================



// ------------------------------------------------------
// START APPLICATION
// ------------------------------------------------------

async function startApplication() {

    console.log(
        `${APP_CONFIG.name} starting...`
    );

    try {

        // Cache DOM Elements
        cacheDOM();

        // Initialize Theme
        initializeTheme();

        // Restore Session
        initializeSession();

        // Restore Chat
        restoreChatHistory();

        // Initialize Speech
        initializeSpeech();

        // Register Events
        registerEventListeners();

        // Prepare UI
        prepareInterface();

        // Ready
        aiReady();

        console.log(
            "Application Ready."
        );

    }

    catch (error) {

        console.error(

            "Initialization Error:",

            error

        );

        aiError();

    }

}



// ------------------------------------------------------
// PREPARE UI
// ------------------------------------------------------

function prepareInterface() {

    if (CHAT.autoFocus && dom.userInput) {

        dom.userInput.focus();

    }

    autoResizeTextarea();

    updateSendButton();

    safeScrollBottom();

}



// ------------------------------------------------------
// SESSION INITIALIZATION
// ------------------------------------------------------

function initializeSession() {

    state.sessionId = getSessionId();

}



// ------------------------------------------------------
// RESTORE CHAT HISTORY
// ------------------------------------------------------

function restoreChatHistory() {

    if (

        !FEATURES.restoreHistory

    ) {

        return;

    }

    const history = localStorage.getItem(

        STORAGE_KEYS.CHAT_HISTORY

    );

    if (!history) {

        return;

    }

    try {

        const messages = JSON.parse(

            history

        );

        if (!Array.isArray(messages)) {

            return;

        }

        chat.history = messages;

        messages.forEach(message => {

            if (

                message.role === "user"

            ) {

                addUserMessage(

                    message.content,

                    false

                );

            }

            else {

                addBotMessage(

                    message.content,

                    false

                );

            }

        });

        safeScrollBottom();

    }

    catch (error) {

        console.error(

            "History Restore Failed",

            error

        );

    }

}



// ------------------------------------------------------
// GLOBAL ERROR HANDLER
// ------------------------------------------------------

window.addEventListener(

    "error",

    event => {

        console.error(

            event.error

        );

    }

);



// ------------------------------------------------------
// PROMISE ERROR HANDLER
// ------------------------------------------------------

window.addEventListener(

    "unhandledrejection",

    event => {

        console.error(

            event.reason

        );

    }

);



// ------------------------------------------------------
// BEFORE UNLOAD
// ------------------------------------------------------

window.addEventListener(

    "beforeunload",

    () => {

        if (

            FEATURES.autoSaveHistory

        ) {

            saveChat();

        }

    }

);



// ------------------------------------------------------
// DOM READY
// ------------------------------------------------------

document.addEventListener(

    "DOMContentLoaded",

    () => {

        startApplication();

    }

);



// ------------------------------------------------------
// APP VERSION
// ------------------------------------------------------

console.log(

    `%c${APP_CONFIG.name} ${APP_CONFIG.version}`,

    "color:#6D5EF9;font-weight:bold;font-size:18px"

);



// ------------------------------------------------------
// END OF FILE
// ------------------------------------------------------
