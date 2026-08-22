/* Deb8er Assistant widget — injected on index/about/conferences/team */
(function () {
  "use strict";

  var WORKER_URL = "https://deb8er-chat.henryaungmyintmyat09.workers.dev/chat";
  var MAX_MSG_LEN = 800;
  var MAX_HISTORY = 6;

  var QUICK = {
    landing: [
      "Is Deb8er free?",
      "I'm new — where do I start?",
      "Who made Deb8er?",
      "What can I learn?",
    ],
    about: [
      "What is Deb8er?",
      "Who made Deb8er?",
      "Is it really free?",
      "What makes it different?",
    ],
    conferences: [
      "What are the committee topics?",
      "When is MUN in my region?",
      "How do I register?",
      "Are registrations open?",
    ],
    team: [
      "Who made Deb8er?",
      "How do I contact the team?",
      "I want to partner my club",
      "How do I join a conference?",
    ],
  };

  /* ---------- Conversation memory ---------- */
  var SESSION_KEY = "db8-chat-history";
  var history = [];

  function loadHistory() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          history = parsed.filter(function (m) {
            return m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant");
          }).slice(-MAX_HISTORY);
        }
      }
    } catch (e) { history = []; }
  }
  function saveHistory() {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
    } catch (e) { /* storage unavailable — ignore */ }
  }

  function pushHistory(role, content) {
    history.push({ role: role, content: content });
    history = history.slice(-MAX_HISTORY);
    saveHistory();
  }

  function currentPage() {
    var p = window.location.pathname;
    if (p.indexOf("about") !== -1) return "about";
    if (p.indexOf("conferences") !== -1) return "conferences";
    if (p.indexOf("team") !== -1) return "team";
    return "landing";
  }

  /* Escape everything dynamic before it ever touches innerHTML. */
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* Safe mini-markdown for BOT text only: applied to already-escaped string. */
  function formatBot(text) {
    var lines = esc(text).split("\n");
    var out = [];
    var listOpen = false;
    var listTag = null;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var t = line.trim();
      var bullet = /^[-•]\s+/.test(t);
      var numbered = /^\d+\.\s+/.test(t);
      var isLi = bullet || numbered;
      if (isLi) {
        var tag = bullet ? "ul" : "ol";
        if (!listOpen || listTag !== tag) {
          if (listOpen) out.push("</" + listTag + ">");
          out.push("<" + tag + ">");
          listOpen = true;
          listTag = tag;
        }
        var body = t.replace(/^(?:[-•]|\d+\.)\s+/, "");
        out.push("<li>" + body + "</li>");
      } else {
        if (listOpen) { out.push("</" + listTag + ">"); listOpen = false; listTag = null; }
        var bolded = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        if (bolded === "") {
          out.push("<br>");
        } else {
          out.push("<p>" + bolded + "</p>");
        }
      }
    }
    if (listOpen) out.push("</" + listTag + ">");
    return out.join("");
  }

  /* ---------- DOM build (static markup, no user data) ---------- */
  var root = document.createElement("div");
  root.id = "db8-chat-root";

  var LOGO_SRC = "assets/favicon1.png";

  var panel = document.createElement("div");
  panel.id = "db8-chat-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Deb8er Assistant chat");
  panel.innerHTML = [
    '<div id="db8-chat-head">',
    '  <div class="db8-avatar"><img src="' + LOGO_SRC + '" alt="Deb8er"></div>',
    '  <div>',
    '    <div class="db8-title">Deb8er Assistant</div>',
    '    <div class="db8-subtitle">Online • replies instantly</div>',
    '  </div>',
    '  <div class="db8-head-actions">',
    '    <button type="button" id="db8-reset" title="New chat" aria-label="New chat">' +
      '<svg viewBox="0 0 24 24"><path d="M12 5V2L7 6l5 4V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg></button>',
    '    <button type="button" id="db8-close" title="Close" aria-label="Close chat">' +
      '<svg viewBox="0 0 24 24"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>',
    '  </div>',
    "</div>",
    '<div id="db8-chat-msgs"></div>',
    '<div id="db8-chat-quick"></div>',
    '<div id="db8-chat-foot">',
    '  <form id="db8-chat-form" autocomplete="off">',
    '    <textarea id="db8-chat-input" rows="1" placeholder="Ask me anything about Deb8er…" aria-label="Type your message"></textarea>',
    '    <button type="submit" id="db8-chat-send" aria-label="Send message">' +
      '<svg viewBox="0 0 24 24"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>',
    '  </form>',
    '  <div id="db8-chat-note">AI assistant — <a href="https://deb8erglobal.com/" target="_blank" rel="noopener noreferrer">hello.deb8er@gmail.com</a> for humans</div>',
    "</div>",
  ].join("");

  var fab = document.createElement("button");
  fab.id = "db8-chat-fab";
  fab.type = "button";
  fab.setAttribute("aria-label", "Open Deb8er Assistant");
  fab.innerHTML =
    '<svg class="db8-fab-chat" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.02 2 11c0 2.6 1.21 4.94 3.16 6.58-.06 1.06-.4 2.57-1.66 3.9 0 0 2.19-.35 3.74-1.26.83.25 1.73.39 2.66.39H11c.04 1.1.92 2 2.02 2h3.48l.23 2 1.27-1.73c.98-1.34 2-3.19 2-5.1V11c0-4.98-4.48-9-10-9z"/></svg>' +
    '<svg class="db8-fab-close" viewBox="0 0 24 24"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

  root.appendChild(fab);
  root.appendChild(panel);
  document.body.appendChild(root);

  var msgsEl = document.getElementById("db8-chat-msgs");
  var quickEl = document.getElementById("db8-chat-quick");
  var inputEl = document.getElementById("db8-chat-input");
  var formEl = document.getElementById("db8-chat-form");
  var sendEl = document.getElementById("db8-chat-send");
  var busy = false;

  /* ---------- Message rendering ---------- */
  function addBubble(role, node) {
    var msg = document.createElement("div");
    msg.className = "db8-msg db8-" + role;
    var avatar = document.createElement("div");
    avatar.className = "db8-avatar";
    avatar.innerHTML = '<img src="' + LOGO_SRC + '" alt="">';
    var bubble = document.createElement("div");
    bubble.className = "db8-bubble";
    bubble.appendChild(node);
    msg.appendChild(avatar);
    msg.appendChild(bubble);
    msgsEl.appendChild(msg);
    scrollDown();
    return bubble;
  }

  function addUserMsg(text) {
    var node = document.createElement("p");
    node.textContent = text; // textContent = XSS-safe
    addBubble("user", node);
  }

  function addBotMsg(text, formatted) {
    var node = document.createElement("div");
    if (formatted) {
      node.innerHTML = formatBot(text); // escaped inside formatBot
    } else {
      node.textContent = text;
    }
    return addBubble("bot", node);
  }

  function showTyping() {
    var msg = document.createElement("div");
    msg.className = "db8-msg db8-bot db8-typing";
    msg.innerHTML =
      '<div class="db8-avatar"><img src="' + LOGO_SRC + '" alt=""></div>' +
      '<div class="db8-bubble"><span class="db8-dot"></span><span class="db8-dot"></span><span class="db8-dot"></span></div>';
    msgsEl.appendChild(msg);
    scrollDown();
    return msg;
  }

  function scrollDown() {
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function autoResize() {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(inputEl.scrollHeight, 96) + "px";
  }

  /* ---------- Quick replies ---------- */
  function renderChips() {
    quickEl.innerHTML = "";
    (QUICK[currentPage()] || QUICK.landing).forEach(function (q) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "db8-chip";
      chip.textContent = q;
      chip.addEventListener("click", function () {
        inputEl.value = q;
        autoResize();
        send();
      });
      quickEl.appendChild(chip);
    });
  }

  /* ---------- Ground-truth facts ---------- */
  function buildFactsPayload() {
    try {
      if (window.DB8_FACTS && typeof window.DB8_FACTS.build === "function") {
        return window.DB8_FACTS.build();
      }
    } catch (e) { /* facts are optional — never block chat on them */ }
    return null;
  }

  /* ---------- Reset / greeting ---------- */
  function greeting() {
    msgsEl.innerHTML = "";
    renderChips();
    addBotMsg(
      "Hi! I'm the Deb8er Assistant 🤖 — here to help you get started, join a conference, " +
      "or answer anything about Deb8er. What would you like to know?"
    );
  }

  function resetChat() {
    busy = false;
    inputEl.value = "";
    autoResize();
    history = [];
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    greeting();
  }

  /* ---------- SSE streaming ---------- */
  var RETRY_MAX = 2;
  var RETRY_DELAYS = [800, 1600]; // ms — backoff per attempt

  function send() {
    var text = inputEl.value.trim();
    if (!text || busy) return;
    if (text.length > MAX_MSG_LEN) {
      addBotMsg("That's a bit long for me — could you keep it under " + MAX_MSG_LEN + " characters? Thanks!");
      return;
    }

    addUserMsg(text);
    pushHistory("user", text);
    inputEl.value = "";
    autoResize();
    busy = true;
    sendEl.disabled = true;

    var typing = showTyping();
    var attempt = 0;

    function doFetch() {
      var abortCtrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var fetchTimeout = setTimeout(function () { if (abortCtrl) abortCtrl.abort(); }, 25000);

      fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          page: currentPage(),
          history: history.slice(0, -1),
          facts: buildFactsPayload(),
        }),
        signal: abortCtrl ? abortCtrl.signal : undefined,
      })
        .then(function (res) {
          clearTimeout(fetchTimeout);
          if (!res.ok) {
            return res.text().then(function (t) {
              try { var data = JSON.parse(t); throw { status: res.status, data: data }; }
              catch (e) { if (e && e.status) throw e; throw { status: res.status, data: { message: t } }; }
            });
          }
          return res.body;
        })
        .then(function (body) {
          if (typing && typing.parentNode) typing.remove();
          var raw = "";
          var streamed = addBotMsg("", false);
          var textNode = document.createElement("span");
          streamed.appendChild(textNode);

          var reader = body.getReader();
          var decoder = new TextDecoder();
          var buffer = "";

          function pump() {
            return reader.read().then(function (r) {
              if (r.done) {
                if (raw === "") {
                  textNode.textContent = "Hmm, I didn't catch that. Try again?";
                  pushHistory("assistant", "Hmm, I didn't catch that. Try again?");
                } else {
                  streamed.innerHTML = formatBot(raw);
                  pushHistory("assistant", raw);
                }
                busy = false;
                sendEl.disabled = false;
                renderChips();
                scrollDown();
                return;
              }
              buffer += decoder.decode(r.value, { stream: true });
              var parts = buffer.split("\n\n");
              buffer = parts.pop();
              for (var i = 0; i < parts.length; i++) {
                var lines = parts[i].split("\n");
                for (var j = 0; j < lines.length; j++) {
                  var line = lines[j];
                  if (line.indexOf("data:") !== 0) continue;
                  var payload = line.slice(5).trim();
                  if (payload === "[DONE]") continue;
                  try {
                    var json = JSON.parse(payload);
                    var delta = json.choices && json.choices[0] && json.choices[0].delta;
                    if (delta && typeof delta.content === "string") {
                      raw += delta.content;
                      textNode.textContent = raw;
                      scrollDown();
                    }
                  } catch (e) {
                    /* ignore partial/malformed SSE chunks */
                  }
                }
              }
              return pump();
            });
          }
          return pump();
        })
        .catch(function (err) {
          clearTimeout(fetchTimeout);
          var status = err && err.status ? err.status : 0;
          var isAbort = err && err.name === "AbortError";
          var isTransient = isAbort || status === 0 || status === 502 || status === 503 || status === 504;

          if (isTransient && attempt < RETRY_MAX) {
            attempt++;
            var delay = RETRY_DELAYS[attempt - 1] || 1600;
            setTimeout(doFetch, delay);
            return;
          }

          if (typing && typing.parentNode) typing.remove();
          busy = false;
          sendEl.disabled = false;
          if (status === 429) {
            addBotMsg(err.data && err.data.message
              ? err.data.message
              : "You've reached today's chat limit. Email us at hello.deb8er@gmail.com!");
          } else if (isAbort) {
            addBotMsg("The assistant took too long to respond. Try a shorter message or try again in a moment.");
          } else {
            addBotMsg("Sorry, I couldn't reach the server. Check your connection and try again — or email hello.deb8er@gmail.com.");
          }
        });
    }

    doFetch();
  }

  /* ---------- Wire up ---------- */
  var fabChat = fab.querySelector(".db8-fab-chat");
  var fabClose = fab.querySelector(".db8-fab-close");

  function setFabState(open) {
    fabChat.style.display = open ? "none" : "block";
    fabClose.style.display = open ? "block" : "none";
  }
  setFabState(false);

  fab.addEventListener("click", function () {
    var isOpen = root.classList.toggle("db8-open");
    setFabState(isOpen);
    fab.setAttribute("aria-label", isOpen ? "Close Deb8er Assistant" : "Open Deb8er Assistant");
    if (isOpen) {
      if (msgsEl.children.length === 0) greeting();
      inputEl.focus();
    }
  });

  document.getElementById("db8-close").addEventListener("click", function () {
    root.classList.remove("db8-open");
    setFabState(false);
  });
  document.getElementById("db8-reset").addEventListener("click", resetChat);

  /* Kick off facts prefetch (async, non-blocking) */
  if (window.DB8_FACTS && typeof window.DB8_FACTS.fetchLessons === "function") {
    window.DB8_FACTS.fetchLessons();
  }
  loadHistory();

  formEl.addEventListener("submit", function (e) {
    e.preventDefault();
    send();
  });
  inputEl.addEventListener("input", autoResize);
  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
})();
