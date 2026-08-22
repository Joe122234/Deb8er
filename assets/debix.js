/* ═══════════════════════════════════════════════════
   DEBIX — Mascot Engine
   Duolingo-style reactive mascot with layered emotions,
   contextual tips, crossfade transitions, and personality
   ═══════════════════════════════════════════════════ */

const EMOTIONS = {
  idle:    'assets/mascotImages/wink.png',
  correct: 'assets/mascotImages/clap.png',
  wrong:   'assets/mascotImages/suprised.png',
  streak3: 'assets/mascotImages/love-eyes.png',
  done:    'assets/mascotImages/happy-done.png',
  worried: 'assets/mascotImages/suprised.png',
  love:    'assets/mascotImages/love-eyes.png',
};

const ACCESSORIES = {
  none:    null,
  point:   'assets/mascotImages/hand-pointing.png',
};

const CELEBRATIONS = {
  correct: { icon: 'fa-check-circle', label: 'Correct!',      msgs: ['Nice one!', 'You got it!', 'Sharp as ever!', 'Boom!', 'Nailed it!'],           color: '#34D399', emotion: 'correct' },
  streak3: { icon: 'fa-bolt',         label: '3 in a row!',   msgs: ['On fire!', 'Unstoppable!', '3-streak!', 'Locked in!', 'Hat trick!'],          color: '#FBBF24', emotion: 'streak3' },
  module:  { icon: 'fa-book-open',    label: 'Section done!', msgs: ['Debate knowledge +1', 'Another section mastered', 'Level up!'],              color: '#3ABEFF', emotion: 'done' },
  lesson:  { icon: 'fa-star',         label: 'Lesson done!',  msgs: ['Crushed it!', 'Leveling up!', 'Lesson complete!', 'You earned this!'],       color: '#a68af9', emotion: 'done' },
  levelup: { icon: 'fa-arrow-up',     label: 'Level Up!',     msgs: ['New level unlocked!', 'You\'re leveling up!', 'Rising through the ranks!'], color: '#FBBF24', emotion: 'love' },
  streak7:  { icon: 'fa-fire',        label: '7-Day Streak!', msgs: ['One whole week!', '7 days strong!', 'You\'re on fire!'],                     color: '#F97316', emotion: 'streak3' },
  streak30: { icon: 'fa-crown',       label: '30-Day Streak!',msgs: ['A whole month!', '30 days!', 'Dedication level: expert!'],                  color: '#a68af9', emotion: 'love' },
  streak100:{ icon: 'fa-gem',         label: '100-Day Streak!',msgs: ['100 days!', 'Absolute legend!', 'Unstoppable!'],                             color: '#FBBF24', emotion: 'streak3' },
};

/* ── Contextual Messages ── */
const MSGS = {
  welcome: {
    firstVisit: [
      "Hey {name}! I'm Debix — your debate coach. Ready to sharpen those arguments?",
      "Welcome to Deb8er, {name}! Let's make you the next debate legend."
    ],
    morning: [
      "Good morning, {name}! Early bird gets the rebuttal. Ready to learn?",
      "Morning, {name}! A fresh day, a fresh argument. Let's go."
    ],
    afternoon: [
      "Hey {name}! Afternoon — perfect time to sharpen your skills.",
      "Good afternoon, {name}! Ready to debate?"
    ],
    evening: [
      "Evening, {name}! Winding down? A quick lesson keeps the streak alive.",
      "Hey {name}! Night owl debate mode activated."
    ],
    streakActive: [
      "Day {streak} streak, {name}! Your consistency is your superpower.",
      "{name}, {streak} days strong! Even the best debaters need discipline."
    ],
    levelUp: [
      "Level {level} Debater — your opponents should be worried, {name}.",
      "Level {level}! You're climbing fast, {name}."
    ],
    returning: [
      "Welcome back, {name}! It's been a while. Your streak is waiting.",
      "{name}! Missed you. Let's pick up where we left off."
    ],
    newUser: [
      "First time here, {name}? Start with 'Speaking Confidently' — it's a game changer.",
      "Hey {name}! New to debate? Don't worry — I've got you. Let's start simple."
    ]
  },
  streak: [
    "Day {s} streak! Your arguments are hotter than a heated cross-examination. Keep it going!",
    "{s}-day streak! You're not just consistent, you're unstoppable.",
    "{s} days strong. Even the best debaters need that kind of discipline."
  ],
  badge: [
    "Look at that shiny new badge! You earned every bit of it.",
    "NEW BADGE UNLOCKED! Your collection is growing.",
    "That badge looks good on you. Almost as good as your debating skills."
  ],
  atrisk: [
    "Hey! Where'd you go? My speeches are getting rusty without you. Let's get back in the ring!",
    "Your streak is fading! One lesson — that's all it takes to keep the flame alive.",
    "I miss you! Come back and debate!"
  ],
  first: [
    "First lesson! This is where legends begin.",
    "The first step into a larger world. Let's make it count!",
    "Every master was once a beginner. This is your origin story."
  ],
  click: [
    "Click me anytime for a debate tip!",
    "Need advice? I've got plenty.",
    "Sharpening your skills? Good choice.",
    "I love a good argument. Want a tip?"
  ],
  lesson: [
    "Crushed it!",
    "Leveling up!",
    "Lesson complete!",
    "Another one down!"
  ]
};

/* ── Contextual Tips by Topic ── */
const TIPS = {
  general: [
    "Silence is a power move. Pause 2 seconds before your big point.",
    "Define your key terms in the first speech. Control definitions, control the debate.",
    "Start rebuttals with \"Even if…\" — win on their terms too.",
    "Vary your pace — slow for impact, fast for urgency.",
    "A well-placed statistic beats a vague assertion. Come armed with numbers.",
    "Signpost your arguments. 'First… Second… Finally…' makes you impossible to ignore.",
    "The best speakers sound conversational, not rehearsed. Know your points, not your script.",
    "A strong opening frame wins half the round. Set the lens early."
  ],
  speaking: [
    "Eye contact is a weapon. Hold it for 3 seconds per person, then move on.",
    "Plant your feet. Movement without purpose is distraction.",
    "Breathe from your diaphragm, not your chest. It calms nerves and adds power.",
    "Vocal variety: whisper for intensity, project for authority.",
    "The first 10 seconds set the tone. Nail your opening.",
    "Pause after key points. Let them land."
  ],
  mun: [
    "In MUN, alliances are temporary. Build coalitions, not dependencies.",
    "A good GSL speech is 60 seconds. Say less, mean more.",
    "Always have a motion ready. Being proactive wins procedural battles.",
    "When writing clauses, think: who does what by when?",
    "Points of Information are power moves. Use them strategically.",
    "Never personalise attacks — target the policy, not the delegate."
  ],
  rebuttals: [
    "Listen first, respond second. A rebuttal without listening is just noise.",
    "The best rebuttal turns their argument into yours.",
    "Attack the link, not the impact. Break the chain.",
    "\"Even if your point is true, it doesn't matter because…\" — devastating.",
    "Summarise their argument before dismantling it. Shows you listened."
  ],
  thinking: [
    "Ask 'who benefits?' before accepting any claim.",
    "Correlation is not causation. Always look for the mechanism.",
    "Consider the opposite. What would change your mind?",
    "Check the source. Then check the source's source.",
    "The best argument against your position is the one you should understand first."
  ],
  engagement: [
    "Tip: Complete a lesson every day to build your streak!",
    "Did you know? You earn gems for every lesson and quiz you complete.",
    "Check the leaderboard — see where you stand among Deb8ers!",
    "Your badges tell your story. Keep collecting them!",
    "Spin the Daily Spin for bonus rewards!"
  ]
};

/* ── Unit-to-tip-category mapping ── */
const UNIT_TIP_MAP = {
  'speaking-confidently': 'speaking',
  'voice-modulation': 'speaking',
  'body-language': 'speaking',
  'building-arguments': 'general',
  'rebuttals': 'rebuttals',
  'fallacies': 'general',
  'evidence-research': 'general',
  'what-is-mun': 'mun',
  'rop-pois': 'mun',
  'speeches-papers': 'mun',
  'draft-resolutions': 'mun',
  'fake-news': 'thinking',
  'biases': 'thinking',
  'reasoning': 'thinking',
};

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

let container, bubble, avatarFront, avatarBack, accessory, hideTimer, tipTimer, emotionResetTimer;
let currentEmotion = 'idle';
let tipContext = null;

/* ── CSS Injection ── */
function css() {
  const id = 'debix-styles';
  if (document.getElementById(id)) return;
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
    @keyframes debix-idle {
      0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
      25% { transform: translateY(-4px) scale(1.015) rotate(0.5deg); }
      50% { transform: translateY(-6px) scale(1.02) rotate(0deg); }
      75% { transform: translateY(-4px) scale(1.015) rotate(-0.5deg); }
    }
    @keyframes debix-emotion-pop {
      0% { transform: scale(0.6); opacity: 0; }
      50% { transform: scale(1.15); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes debix-sparkle {
      0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
      50% { opacity: 1; transform: scale(1) rotate(180deg); }
    }

    #debix-container {
      position: fixed; bottom: 28px; right: 28px; z-index: 10000;
      display: flex; flex-direction: column; align-items: flex-end; gap: 12px;
      pointer-events: none;
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    #debix-container.debix-hidden {
      opacity: 0; transform: translateY(20px); pointer-events: none !important;
    }
    #debix-container * { pointer-events: auto; }

    .debix-avatar-wrap {
      position: relative;
      width: 120px; height: auto;
      cursor: pointer;
    }
    .debix-avatar {
      width: 120px; height: auto;
      display: block;
      animation: debix-idle 4s ease-in-out infinite;
      transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease, opacity 0.3s ease;
      filter: drop-shadow(0 6px 20px rgba(0,0,0,0.4));
      will-change: transform;
    }
    .debix-avatar--front {
      position: relative; z-index: 2;
    }
    .debix-avatar--back {
      position: absolute; top: 0; left: 0; z-index: 1;
      opacity: 0;
      animation: none;
    }
    .debix-avatar-wrap:hover .debix-avatar--front {
      animation-play-state: paused;
      transform: scale(1.1) rotate(-3deg);
    }
    .debix-avatar-wrap:active .debix-avatar--front {
      transform: scale(0.95);
      transition-duration: 0.1s;
    }
    .debix-avatar.emotion-bounce {
      animation: debix-emotion-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    .debix-accessory {
      position: absolute;
      bottom: -5px; right: -10px;
      width: 45px; height: auto;
      z-index: 3;
      opacity: 0;
      transform: scale(0) rotate(-20deg);
      transition: opacity 0.3s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
      pointer-events: none;
    }
    .debix-accessory.visible {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
    .debix-accessory--sparkle {
      position: absolute;
      top: -8px; right: -5px;
      width: 24px; height: 24px;
      z-index: 4;
      font-size: 20px;
      line-height: 1;
      opacity: 0;
      pointer-events: none;
    }
    .debix-accessory--sparkle.visible {
      animation: debix-sparkle 0.8s ease-in-out 2;
    }

    .debix-bubble {
      background: rgba(31, 41, 55, 0.95);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 18px; padding: 16px 20px 14px;
      max-width: 320px; position: relative;
      opacity: 0; transform: translateY(12px) scale(0.92);
      transition: opacity 0.3s ease, transform 0.3s ease;
      box-shadow: 0 12px 40px rgba(0,0,0,0.5);
    }
    .debix-bubble.show { opacity: 1; transform: translateY(0) scale(1); }
    .debix-bubble::after {
      content: ''; position: absolute; bottom: -8px; right: 40px;
      width: 16px; height: 16px;
      background: rgba(31, 41, 55, 0.95);
      border-right: 1px solid rgba(255,255,255,0.1);
      border-bottom: 1px solid rgba(255,255,255,0.1);
      transform: rotate(45deg);
      border-radius: 0 0 4px 0;
    }
    .debix-close {
      position: absolute; top: 8px; right: 12px;
      background: none; border: none; color: rgba(255,255,255,0.25);
      font-size: 20px; cursor: pointer; padding: 0; line-height: 1;
      transition: color 0.2s ease, transform 0.2s ease;
    }
    .debix-close:hover { color: #F4F6FB; transform: scale(1.15); }
    .debix-label {
      font-size: 11px; font-weight: 600; letter-spacing: 1px;
      text-transform: uppercase; color: rgba(255,255,255,0.35);
      margin-bottom: 4px;
    }
    .debix-text {
      color: #E5E7EB; font-size: 14px; line-height: 1.6;
      padding-right: 18px; font-weight: 400;
    }

    @media (max-width: 480px) {
      #debix-container { bottom: 16px; left: 16px; right: auto; gap: 10px; align-items: flex-start; }
      .debix-avatar-wrap, .debix-avatar { width: 90px; }
      .debix-accessory { width: 34px; bottom: -4px; right: -8px; }
      .debix-bubble { max-width: 260px; padding: 12px 16px 10px; border-radius: 14px; }
      .debix-bubble::after { left: 28px; right: auto; border-right: none; border-bottom: none; border-left: 1px solid rgba(255,255,255,0.1); border-top: 1px solid rgba(255,255,255,0.1); transform: rotate(-135deg); }
      .debix-text { font-size: 13px; }
    }
  `;
  document.head.appendChild(s);
}

/* ── Init ── */
export function initDebix() {
  if (container) return;
  css();
  container = document.createElement('div');
  container.id = 'debix-container';
  container.innerHTML = `
    <div class="debix-bubble" id="debix-bubble">
      <button class="debix-close" id="debix-close">&times;</button>
      <div class="debix-label">Debix</div>
      <div class="debix-text" id="debix-text">Hey! Ready to turn disagreement into an art form?</div>
    </div>
    <div class="debix-avatar-wrap" id="debix-avatar-wrap">
      <img class="debix-avatar debix-avatar--back" id="debix-avatar-back" src="${EMOTIONS.idle}" alt="" />
      <img class="debix-avatar debix-avatar--front" id="debix-avatar-front" src="${EMOTIONS.idle}" alt="Debix mascot" role="button" tabindex="0" />
      <img class="debix-accessory" id="debix-accessory" src="" alt="" />
      <span class="debix-accessory--sparkle" id="debix-sparkle">&#10024;</span>
    </div>
  `;
  document.body.appendChild(container);

  bubble = document.getElementById('debix-bubble');
  avatarFront = document.getElementById('debix-avatar-front');
  avatarBack = document.getElementById('debix-avatar-back');
  accessory = document.getElementById('debix-accessory');

  document.getElementById('debix-close').addEventListener('click', e => {
    e.stopPropagation();
    hide();
  });

  document.getElementById('debix-avatar-wrap').addEventListener('click', () => {
    if (bubble.classList.contains('show')) { hide(); return; }
    say(pick(MSGS.click), 4000, 'idle');
  });
}

/* ── Emotion System ── */
export function setEmotion(type, holdMs = 0, accessoryType) {
  const src = EMOTIONS[type] || EMOTIONS.idle;
  currentEmotion = type;

  if (avatarFront && avatarBack) {
    // Crossfade: set back to new source, fade in, then swap
    avatarBack.src = src;
    avatarBack.style.opacity = '1';
    avatarFront.style.opacity = '0';

    avatarFront.classList.remove('emotion-bounce');

    setTimeout(() => {
      avatarFront.src = src;
      avatarFront.style.opacity = '1';
      avatarBack.style.opacity = '0';
      void avatarFront.offsetWidth;
      avatarFront.classList.add('emotion-bounce');
    }, 300);
  }

  // Handle accessory layer
  setAccessory(accessoryType);

  clearTimeout(emotionResetTimer);
  if (holdMs > 0) {
    emotionResetTimer = setTimeout(() => {
      if (currentEmotion === type) setEmotion('idle');
    }, holdMs);
  } else if (type !== 'idle') {
    emotionResetTimer = setTimeout(() => {
      if (currentEmotion === type) setEmotion('idle');
    }, 4000);
  }
}

function setAccessory(type) {
  if (!accessory) return;
  const sparkle = document.getElementById('debix-sparkle');
  if (!type || type === 'none') {
    accessory.classList.remove('visible');
    accessory.src = '';
    if (sparkle) sparkle.classList.remove('visible');
    return;
  }
  if (type === 'sparkle') {
    accessory.classList.remove('visible');
    accessory.src = '';
    if (sparkle) {
      sparkle.classList.add('visible');
      setTimeout(() => sparkle.classList.remove('visible'), 1600);
    }
    return;
  }
  const src = ACCESSORIES[type];
  if (src) {
    accessory.src = src;
    accessory.classList.add('visible');
  }
}

export function resetEmotion() {
  clearTimeout(emotionResetTimer);
  currentEmotion = 'idle';
  if (avatarFront) {
    avatarFront.src = EMOTIONS.idle;
    avatarFront.classList.remove('emotion-bounce');
  }
  setAccessory('none');
}

/* ── Show / Hide Mascot (for quiz flow) ── */
export function showMascot() {
  if (!container) initDebix();
  container.classList.remove('debix-hidden');
}

export function hideMascot() {
  if (!container) initDebix();
  container.classList.add('debix-hidden');
}

/* ── Bubble Messages ── */
export function say(text, duration = 6000, emotion, accessoryType) {
  if (!container) initDebix();
  const el = document.getElementById('debix-text');
  if (!el) return;
  el.textContent = text;
  bubble.classList.add('show');
  if (emotion) setEmotion(emotion, 0, accessoryType);
  clearTimeout(hideTimer);
  if (duration > 0) hideTimer = setTimeout(hide, duration);
}

export function hide() {
  if (!bubble) return;
  bubble.classList.remove('show');
  clearTimeout(hideTimer);
}

/* ── Quick Reaction (no bubble, just emotion) ── */
export function react(type, holdMs = 2500) {
  setEmotion(type, holdMs);
}

/* ── Contextual Welcome ── */
export function welcome(name, ctx = {}) {
  let pool;
  if (ctx.isNewUser) {
    pool = MSGS.welcome.firstVisit;
  } else if (ctx.streak > 0 && ctx.lastActivity === ctx.today) {
    pool = MSGS.welcome.streakActive;
  } else if (ctx.level >= 5) {
    pool = MSGS.welcome.levelUp;
  } else if (ctx.lastActivity && ctx.lastActivity !== ctx.today) {
    pool = MSGS.welcome.returning;
  } else if (ctx.completedLessons === 0) {
    pool = MSGS.welcome.newUser;
  } else {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) pool = MSGS.welcome.morning;
    else if (hour >= 12 && hour < 18) pool = MSGS.welcome.afternoon;
    else pool = MSGS.welcome.evening;
  }
  let m = pick(pool);
  m = m.replace('{name}', name || '');
  if (ctx.streak) m = m.replace('{streak}', ctx.streak);
  if (ctx.level) m = m.replace('{level}', ctx.level);
  say(m, 7000, 'idle');
}

export function streak(s) {
  say(pick(MSGS.streak).replace('{s}', s), 6000, 'streak3');
}

export function badge(name) {
  const m = pick(MSGS.badge) + (name ? ` — ${name}!` : '');
  say(m, 7000, 'love');
}

export function lessonDone() {
  say(pick(MSGS.lesson), 5000, 'done');
}

export function atRisk() {
  say(pick(MSGS.atrisk), 7000, 'worried');
}

/* ── Contextual Tips ── */
export function tip(ctx) {
  let category = 'general';
  if (ctx && ctx.unitId && UNIT_TIP_MAP[ctx.unitId]) {
    category = UNIT_TIP_MAP[ctx.unitId];
  } else if (ctx && ctx.page === 'dashboard') {
    category = 'engagement';
  }
  say(pick(TIPS[category]), 10000, 'idle', 'point');
}

export function firstLesson() {
  say(pick(MSGS.first), 6000, 'correct');
}

export function startTips(ctx, ms) {
  if (typeof ctx === 'number') { ms = ctx; ctx = null; }
  if (!ms) ms = 120000;
  stopTips();
  tipContext = ctx || null;
  tipTimer = setInterval(() => tip(tipContext), ms);
}

export function stopTips() {
  if (tipTimer) { clearInterval(tipTimer); tipTimer = null; }
}

/* ── Celebrations (routed through main mascot) ── */

export function celebrateCorrect() {
  say(pick(CELEBRATIONS.correct.msgs), 4000, 'correct', 'sparkle');
}

export function celebrateStreak3() {
  say(pick(CELEBRATIONS.streak3.msgs), 5000, 'streak3', 'sparkle');
}

export function celebrateModule() {
  say(pick(CELEBRATIONS.module.msgs), 4000, 'done');
}

export function celebrateLesson() {
  say(pick(CELEBRATIONS.lesson.msgs), 5000, 'done', 'sparkle');
}

export function celebrateLevelUp(level, title) {
  say(`Level ${level} — ${title}!`, 5000, 'love', 'sparkle');
}

export function celebrateStreakMilestone(days) {
  const key = days >= 100 ? 'streak100' : days >= 30 ? 'streak30' : 'streak7';
  say(`${days}-day streak milestone!`, 6000, 'streak3', 'sparkle');
}

export function reactWrong() {
  setEmotion('wrong', 3000);
}
