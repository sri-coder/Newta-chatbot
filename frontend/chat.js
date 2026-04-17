// ── Newta Chat Engine (Frontend) ─────────────────────────────────
// All AI logic lives in the Flask backend.
// This file handles UI state, conversation flow, and API calls only.

const API_BASE = "/api";   // same origin — Flask serves both frontend and API

// ── Config ────────────────────────────────────────────────────────
const Config = {
  MAX_HISTORY: 12,   // keep last N turns to send with each request
};

// ── State ─────────────────────────────────────────────────────────
const State = {
  isOpen: false,
  isThinking: false,
  history: [],          // [{role, content}]
  phase: "chat",        // "chat" | "lead_collection" | "closed"
  leadStep: 0,
  leadData: {},
  questionCount: 0,
  confirmCallback: null,
  _leadPrompted: false,
  _awaitingClose: false,
};

// Lead collection questions
const LEAD_QUESTIONS = [
  { key: 'name',          ask: "What's your name?",                                              hint: "Your full name" },
  { key: 'email',         ask: "What's your email address so our team can reach you?",            hint: "your@email.com" },
  { key: 'phone',         ask: "What's the best phone number to reach you?",                      hint: "Optional — press Enter to skip" },
  { key: 'company',       ask: "Which company or organization are you with?",                     hint: "Company name" },
  { key: 'jobTitle',      ask: "What's your role or job title?",                                  hint: "e.g. CTO, Data Engineer, IT Manager" },
  { key: 'serviceNeeded', ask: "What type of service are you looking for? (e.g. cloud migration, database migration, ETL pipelines, data warehouse)", hint: "Type of migration or service" },
  { key: 'dataVolume',    ask: "Approximately how much data do you need to migrate? (e.g. 50 GB, 5 TB, 100 TB+)",  hint: "Data size estimate" },
  { key: 'sourceSystem',  ask: "What is your current/source system or database? (e.g. Oracle, SQL Server, on-premise MySQL)", hint: "Current system" },
  { key: 'targetSystem',  ask: "What is your target platform? (e.g. AWS, Snowflake, Azure, BigQuery)",             hint: "Target platform" },
  { key: 'timeline',      ask: "When are you looking to complete this migration? (e.g. ASAP, 3 months, Q3 2025)",   hint: "Desired timeline" },
  { key: 'budgetRange',   ask: "Do you have a rough budget in mind? (e.g. under $10K, $10K-$50K, $50K+, unsure)", hint: "Budget range — optional" },
  { key: 'notes',         ask: "Any additional details or specific requirements we should know about?",              hint: "Optional — press Enter to skip" }
];

// ── DOM helpers ───────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const messagesEl = () => $("messages");

function toggleChat() {
  State.isOpen = !State.isOpen;
  $("chat-window").classList.toggle("hidden", !State.isOpen);
  $("launcher-badge").classList.add("hidden");
  if (State.isOpen && messagesEl().children.length === 0) initGreeting();
}

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
}

function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function scrollBottom() {
  const el = messagesEl();
  el.scrollTop = el.scrollHeight;
}

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Rendering ─────────────────────────────────────────────────────
function addMessage(role, html, isHTML = false) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;

  const avatarEl = document.createElement("div");
  avatarEl.className = "msg-avatar";
  avatarEl.innerHTML =
    role === "bot"
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a2 2 0 012 2v2a2 2 0 01-2 2 2 2 0 01-2-2V4a2 2 0 012-2z"/><path d="M12 8v4M9 21H7a2 2 0 01-2-2V9a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2h-2M9 21h6M9 21v-4h6v4"/></svg>`
      : "U";

  const bubbleEl = document.createElement("div");
  bubbleEl.className = "bubble";
  bubbleEl.innerHTML = isHTML ? html : formatText(html);

  const timeEl = document.createElement("div");
  timeEl.className = "msg-time";
  timeEl.textContent = now();

  const inner = document.createElement("div");
  inner.style.cssText = "display:flex;flex-direction:column;";
  inner.appendChild(bubbleEl);
  inner.appendChild(timeEl);

  div.appendChild(avatarEl);
  div.appendChild(inner);
  messagesEl().appendChild(div);
  scrollBottom();
  return div;
}

function formatText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

function addQuickReplies(options, callback) {
  const div = document.createElement("div");
  div.className = "quick-replies";
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "qr-btn";
    btn.textContent = opt;
    btn.onclick = () => { div.remove(); callback(opt); };
    div.appendChild(btn);
  });
  messagesEl().appendChild(div);
  scrollBottom();
}

function setThinking(on) {
  State.isThinking = on;
  $("typing-indicator").classList.toggle("hidden", !on);
  $("send-btn").disabled = on;
  if (on) scrollBottom();
}

// ── Greeting ──────────────────────────────────────────────────────
function initGreeting() {
  addMessage("bot", `Hi there! 👋 Welcome to **Newta**.\n\nI'm here to help you learn about our data migration and modernisation services. What can I help you with today?`);
  setTimeout(() => {
    addQuickReplies(
      ["What services do you offer?", "How does migration work?", "Why choose Newta?", "Get a quote"],
      text => handleUserInput(text)
    );
  }, 300);
}

// ── Send message ──────────────────────────────────────────────────
async function sendMessage() {
  const input = $("user-input");
  const text = input.value.trim();
  if (!text || State.isThinking) return;
  input.value = "";
  input.style.height = "auto";
  await handleUserInput(text);
}

async function handleUserInput(text) {
  if (State.phase === "lead_collection") { await handleLeadInput(text); return; }
  if (State.phase === "closed") return;

  addMessage("user", text);
  State.history.push({ role: "user", content: text });
  State.questionCount++;

  if (/\b(yes|yeah|sure|close|end|bye|goodbye|finish)\b/i.test(text) && State._awaitingClose) {
    State._awaitingClose = false;
    await endChat();
    return;
  }
  State._awaitingClose = false;

  setThinking(true);

  try {
    const reply = await callChatAPI(text);
    addMessage("bot", reply);
    State.history.push({ role: "assistant", content: reply });

    if (State.questionCount >= 2 && State.phase === "chat" && !State._leadPrompted) {
      State._leadPrompted = true;
      setTimeout(promptLeadCollection, 1200);
    }
  } catch (err) {
    addMessage("bot", `⚠️ I'm having trouble connecting to the assistant service. Please make sure the Flask backend and Ollama are running.\n\nRun: \`python app.py\` and \`ollama serve\``);
    console.error(err);
  }

  setThinking(false);
}

// ── Flask API call ────────────────────────────────────────────────
async function callChatAPI(message) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      history: State.history.slice(-(Config.MAX_HISTORY)),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.reply;
}

// ── Lead collection ───────────────────────────────────────────────
function promptLeadCollection() {
  addMessage("bot", `It looks like you're exploring Newta's services. I'd love to understand your needs better so our team can reach out with a **personalised solution**.\n\nMind if I ask you a few quick questions? It'll only take a minute! 🙂`);
  setTimeout(() => {
    addQuickReplies(["Yes, sure!", "Maybe later", "Skip for now"], choice => {
      if (/yes|sure/i.test(choice)) {
        State.phase = "lead_collection";
        State.leadStep = 0;
        State.leadData = {};
        setTimeout(askLeadQuestion, 400);
      } else {
        addMessage("bot", `No problem! Feel free to ask me anything else about Newta. 😊`);
        setTimeout(() => {
          addQuickReplies(["What services do you offer?", "Contact the team", "Migration timeline"], t => handleUserInput(t));
        }, 300);
      }
    });
  }, 400);
}

function askLeadQuestion() {
  const q = LEAD_QUESTIONS[State.leadStep];
  if (!q) { finalizeLead(); return; }
  addMessage("bot", q.ask);
}

async function handleLeadInput(text) {
  addMessage("user", text);
  const q = LEAD_QUESTIONS[State.leadStep];
  State.leadData[q.key] = text.toLowerCase() === "skip" || text === "" ? "" : text;
  State.leadStep++;
  if (State.leadStep < LEAD_QUESTIONS.length) {
    setTimeout(askLeadQuestion, 400);
  } else {
    await finalizeLead();
  }
}

async function finalizeLead() {
  State.phase = "chat";

  // Send lead to Flask backend
  try {
    await fetch(`${API_BASE}/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(State.leadData),
    });
  } catch (err) {
    console.error("Failed to save lead:", err);
  }

  const savedMsg = `
    <div class="saved-notice">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
      Your information has been saved! Our team will reach out to you soon.
    </div>`;

  addMessage("bot", `Thank you, **${State.leadData.name || "there"}**! 🎉\n\nI've recorded your details and our team will be in touch shortly to discuss your data migration needs.`);
  addMessage("bot", savedMsg, true);

  setTimeout(() => {
    addMessage("bot", `Is there anything else I can help you with? Or shall we **close this chat**?`);
    State._awaitingClose = true;
    setTimeout(() => {
      addQuickReplies(["Ask another question", "Close the chat"], choice => {
        if (/close/i.test(choice)) endChat();
        else {
          State._awaitingClose = false;
          addMessage("bot", `Of course! What else would you like to know about Newta?`);
        }
      });
    }, 400);
  }, 800);
}

// ── End Chat ──────────────────────────────────────────────────────
async function endChat() {
  addMessage("bot", `Thanks for chatting with us! 👋\n\nA new session will start in a moment. Have a great day!`);
  State.phase = "closed";
  setTimeout(startNewSession, 2000);
}

function startNewSession() {
  Object.assign(State, {
    history: [], questionCount: 0, leadStep: 0, leadData: {},
    _leadPrompted: false, _awaitingClose: false, phase: "chat",
  });
  messagesEl().innerHTML = "";
  initGreeting();
}

// ── New Chat / Refresh ────────────────────────────────────────────
function confirmNewChat() {
  State.confirmCallback = startNewSession;
  $("confirm-msg").textContent = "Start a new chat? Current conversation will be cleared.";
  $("confirm-overlay").classList.remove("hidden");
}

function refreshChat() {
  State.confirmCallback = startNewSession;
  $("confirm-msg").textContent = "Refresh and start a fresh conversation?";
  $("confirm-overlay").classList.remove("hidden");
}

function closeConfirm() {
  $("confirm-overlay").classList.add("hidden");
  State.confirmCallback = null;
}

function executeConfirm() {
  $("confirm-overlay").classList.add("hidden");
  if (State.confirmCallback) State.confirmCallback();
  State.confirmCallback = null;
}

// ── Init ──────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (!State.isOpen) $("launcher-badge").classList.remove("hidden");
  }, 3000);
});