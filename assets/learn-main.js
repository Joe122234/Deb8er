
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";

let _confettiReady;
function loadConfetti() {
  if (!_confettiReady) _confettiReady = import('https://cdn.jsdelivr.net/npm/canvas-confetti@1').then(m => {
    if (typeof m.default === 'function') return m.default;
    if (typeof m === 'function') return m;
    return m.default || m.confetti || Object.values(m).find(v => typeof v === 'function') || null;
  });
  return _confettiReady;
}
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, increment, arrayUnion
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { syncLeaderboard, awardPointsFor } from "./leaderboard-sync.js";
import {
  getLevelTitle, getLevel, getLevelProgress, xpToNextLevel,
  checkBadgesFromLearning, BADGE_MAP, BADGES,
  getOrGenerateQuests, getTodayStr, ACTIVITY_POINTS,
  getLevelFromPoints, getLevelName,
  makeHistoryEntry
} from "./gamification.js";
import { initDebix, say, welcome, badge, streak, lessonDone, firstLesson, celebrateCorrect, celebrateStreak3, celebrateModule, celebrateLesson, showMascot, hideMascot, reactWrong, celebrateLevelUp, celebrateStreakMilestone, tip, startTips, stopTips } from "./debix.js";

const firebaseConfig = {
  apiKey: "AIzaSyDGEGLVwVQfi8YgG0oZthSTr7YNbfW5wwo",
  authDomain: "deb8ersignup-4b9e1.firebaseapp.com",
  projectId: "deb8ersignup-4b9e1",
  storageBucket: "deb8ersignup-4b9e1.firebasestorage.app",
  messagingSenderId: "498995453154",
  appId: "1:498995453154:web:de1836f0b8cd764c8292bb"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const SECTION_ICONS = {
  learn: 'fas fa-book',
  example: 'fas fa-lightbulb',
  practice: 'fas fa-puzzle-piece',
  quiz: 'fas fa-bullseye',
  'fill-blank': 'fas fa-keyboard',
  match: 'fas fa-link',
  order: 'fas fa-arrow-up-wide-short',
  'spot-mistake': 'fas fa-magnifying-glass',
  highlight: 'fas fa-highlighter',
  'build-argument': 'fas fa-layer-group',
  'true-false': 'fas fa-toggle-on',
  scenario: 'fas fa-theater-masks',
  recap: 'fas fa-rotate'
};
const SECTION_LABELS = {
  learn: 'Learn',
  example: 'Example',
  practice: 'Practice',
  quiz: 'Challenge',
  'fill-blank': 'Fill in',
  match: 'Match',
  order: 'Order',
  'spot-mistake': 'Spot the Mistake',
  highlight: 'Highlight',
  'build-argument': 'Build',
  'true-false': 'True/False',
  scenario: 'Scenario',
  recap: 'Recap Challenge'
};
const SECTION_COLORS = {
  learn: '#3ABEFF',
  example: '#a68af9',
  practice: '#22d3ee',
  quiz: '#34D399',
  'fill-blank': '#FB923C',
  match: '#C084FC',
  order: '#60A5FA',
  'spot-mistake': '#F87171',
  highlight: '#FBBF24',
  'build-argument': '#34D399',
  'true-false': '#A78BFA',
  scenario: '#F472B6',
  recap: '#34D399'
};

function esc(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSectionSummary(sections) {
  if (!sections) return '';
  const counts = {};
  for (const s of sections) {
    if (SECTION_COLORS[s.type]) {
      counts[s.type] = (counts[s.type] || 0) + 1;
    }
  }
  const parts = [];
  const order = ['learn', 'example', 'practice', 'quiz', 'fill-blank', 'match', 'order', 'spot-mistake', 'highlight', 'build-argument', 'true-false', 'scenario', 'recap'];
  for (const t of order) {
    if (counts[t] > 0) {
      parts.push(`<span class="step-type"><span class="step-dot" style="background:${SECTION_COLORS[t]}"></span> ${counts[t]}</span>`);
    }
  }
  return parts.join('');
}

const DAILY_LESSON_LIMIT = 3;

function getLocalToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDailyLessonsLeft() {
  const today = getLocalToday();
  if (state.lastLessonDate !== today) return DAILY_LESSON_LIMIT;
  return Math.max(0, DAILY_LESSON_LIMIT - (state.dailyLessonsCompleted || 0));
}

// ─── Curriculum loaded from JSON files ───
let UNITS = [];
let ALL_LESSON_IDS = [];
let LESSON_INDEX = new Map();
let LESSONS = {};
let loadedUnits = new Set();
let loadingUnits = new Set();
let completedLessonSet = new Set();
let sectionAnswers = {};

async function loadCurriculum() {
  try {
    const res = await fetch('assets/lessons/index.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    UNITS = [];
    for (const track of data.tracks) {
      for (const unit of track.units) {
        UNITS.push({
          id: unit.id,
          title: unit.title,
          subtitle: unit.subtitle,
          icon: track.icon,
          color: unit.color || track.color,
          lessonIds: unit.lessons.map(l => l.id)
        });
      }
    }
    ALL_LESSON_IDS = UNITS.flatMap(u => u.lessonIds);
    LESSON_INDEX = new Map(ALL_LESSON_IDS.map((id, i) => [id, i]));
  } catch (e) {
    console.error('Failed to load curriculum:', e);
    const el = document.getElementById('learnLoading');
    if (el) el.textContent = 'Failed to load courses. Please refresh.';
    throw e;
  }
}

async function loadLessonWithRetry(id, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`assets/lessons/${id}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      LESSONS[id] = await res.json();
      return;
    } catch (e) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 500));
      } else {
        console.error(`Failed to load lesson "${id}" after ${retries + 1} attempts:`, e);
      }
    }
  }
}

async function loadUnitLessons(unitId) {
  if (loadedUnits.has(unitId) || loadingUnits.has(unitId)) return;
  const unit = UNITS.find(u => u.id === unitId);
  if (!unit) return;
  loadingUnits.add(unitId);
  const results = await Promise.allSettled(
    unit.lessonIds.map(id => loadLessonWithRetry(id))
  );
  loadingUnits.delete(unitId);
  loadedUnits.add(unitId);
  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed > 0) console.warn(`Unit "${unitId}": ${failed} lessons failed to load`);
}
/* ═══════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════ */

let currentUser = null;
let state = null;
let userConferences = [];
let userAwards = [];
let userPointHistory = [];
let activeLesson = null;
let activeSectionIndex = 0;
let quizCorrect = 0;
let quizTotal = 0;
let quizStreak = 0;
let practiceCorrect = 0;
let answerLocked = false;
let unitCompletionAchievements = {};

let TOTAL_UNITS = 0;

const ACHIEVEMENTS = BADGES;
const ACHIEVEMENT_MAP = BADGE_MAP;

/* ═══════════════════════════════════════════════
   AUTH
   ═══════════════════════════════════════════════ */

onAuthStateChanged(auth, async user => {
  if (!user) {
    const elLoading = document.getElementById('learnLoading');
    const elAuth = document.getElementById('authMessage');
    const elTop = document.getElementById('topSection');
    const elCourse = document.getElementById('coursePath');
    const elHeader = document.getElementById('learnHeader');
    const elBadges = document.getElementById('badgesSection');
    if (elLoading) elLoading.style.display = 'none';
    if (elAuth) elAuth.style.display = 'flex';
    if (elTop) elTop.style.display = 'none';
    if (elCourse) elCourse.style.display = 'none';
    if (elHeader) elHeader.style.display = 'none';
    if (elBadges) elBadges.style.display = 'none';
    return;
  }
  currentUser = user;
  const elHeader = document.getElementById('learnHeader');
  const elBadges = document.getElementById('badgesSection');
  if (elHeader) elHeader.style.display = '';
  if (elBadges) elBadges.style.display = '';

  await Promise.all([loadCurriculum(), loadState()]);
  TOTAL_UNITS = UNITS.length;

  const missedBadges = checkNewAchievements();
  if (missedBadges.length > 0) saveState().catch(e => console.warn('Background save failed:', e));

  render();
  initDebix();
  setTimeout(() => say("You're in the Learn Lab! Ready to level up your debating skills?"), 1500);
  const gemIntervalId = setInterval(() => {
    const el = document.getElementById('sgTodayGems');
    if (el) el.textContent = computeGemsToday(userPointHistory);
  }, 30000);
  window.addEventListener('beforeunload', () => clearInterval(gemIntervalId));
});

/* ═══════════════════════════════════════════════
   FIRESTORE
   ═══════════════════════════════════════════════ */

async function loadState() {
  try {
    const snap = await getDoc(doc(db, 'users', currentUser.uid));
    if (snap.exists()) {
      const d = snap.data();
      state = d.learning || {
        completedLessons: [],
        lessonScores: {},
        totalXP: 0,
        streak: 0,
        lastActivity: null,
        todayXP: 0,
        achievements: [],
        dailyLessonDone: false,
        quests: null
      };
      if (!state.completedLessons) state.completedLessons = [];
      if (!state.lessonScores) state.lessonScores = {};
      if (!state.achievements) state.achievements = [];
      if (state.totalXP == null) state.totalXP = 0;
      if (state.streak == null) state.streak = 0;
      if (state.todayXP == null) state.todayXP = 0;
      const today = new Date().toISOString().split('T')[0];
      if (state.todayDate !== today) {
        state.todayXP = 0;
        state.todayDate = today;
      }
      state.activityPoints = d.activityPoints || 0;
      // One-time migration: fold old learning XP into activityPoints
      if ((state.totalXP || 0) > state.activityPoints) {
        state.activityPoints = state.totalXP || 0;
      }
      state.nickName = d.nickName || '';
      state.fullName = d.fullName || '';
      state.referrals = d.referrals || [];
      state.timedQuizzes = state.timedQuizzes || [];
      state.quests = getOrGenerateQuests(state);
      completedLessonSet = new Set(state.completedLessons);
      if (state.lastLessonDate !== today) {
        state.dailyLessonsCompleted = 0;
        state.lastLessonDate = today;
      }
      userConferences = d.conferences || [];
      userAwards = d.awards || [];
      userPointHistory = d.pointHistory || [];
    } else {
      state = defaultState();
    }
    const elLoading = document.getElementById('learnLoading');
    const elTop = document.getElementById('topSection');
    const elCourse = document.getElementById('coursePath');
    if (elLoading) elLoading.style.display = 'none';
    if (elTop) elTop.style.display = 'block';
    if (elCourse) elCourse.style.display = 'block';
  } catch (err) {
    const elLoading = document.getElementById('learnLoading');
    if (elLoading) elLoading.innerHTML =
      '<span style="color:#f87171;">Failed to load. <a href="learn.html" style="color:#3ABEFF;">Reload</a></span>';
  }
}

function defaultState() {
  const base = {
    completedLessons: [],
    lessonScores: {},
    totalXP: 0,
    streak: 0,
    lastActivity: null,
    todayXP: 0,
    todayDate: null,
    achievements: [],
    dailyLessonDone: false,
    quests: null,
    activityPoints: 0,
    currentLesson: null,
    dailyLessonsCompleted: 0,
    lastLessonDate: null
  };
  base.quests = getOrGenerateQuests(base);
  return base;
}

async function saveState(pointHistoryEntries = [], extra = {}) {
  try {
    const data = {
      learning: { ...state, currentLesson: state.currentLesson || null },
      activityPoints: state.activityPoints,
      ...extra
    };
    if (pointHistoryEntries.length > 0) {
      data.pointHistory = arrayUnion(...pointHistoryEntries);
      userPointHistory.push(...pointHistoryEntries);
    }
    await setDoc(doc(db, 'users', currentUser.uid), data, { merge: true });
    // Re-read fresh doc for leaderboard sync (arrayUnion sentinels need resolving)
    const freshSnap = await getDoc(doc(db, 'users', currentUser.uid));
    if (freshSnap.exists()) {
      userPointHistory = freshSnap.data().pointHistory || userPointHistory;
    }
    const lbData = freshSnap.exists() ? { ...freshSnap.data(), uid: currentUser.uid } : { ...data, uid: currentUser.uid };
    await syncLeaderboard(db, currentUser.uid, lbData).catch(() => {});
  } catch (err) {
    console.warn('Save failed:', err);
  }
}

/* ═══════════════════════════════════════════════
   GAMIFICATION HELPERS
   ═══════════════════════════════════════════════ */

function computeGemsToday(pointHistory) {
  if (!pointHistory || !pointHistory.length) return 0;
  const today = new Date().toISOString().split('T')[0];
  let total = 0;
  for (const entry of pointHistory) {
    if (!entry.timestamp) continue;
    const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
    if (entryDate === today) total += entry.amount || 0;
  }
  return total;
}

function isLessonCompleted(lessonId) {
  return completedLessonSet.has(lessonId);
}

function isLessonUnlocked(lessonId) {
  const idx = LESSON_INDEX.get(lessonId);
  if (idx === 0 || idx == null) return true;
  const prev = ALL_LESSON_IDS[idx - 1];
  return completedLessonSet.has(prev);
}

function getUnitProgress(unitId) {
  const unit = UNITS.find(u => u.id === unitId);
  if (!unit) return { done: 0, total: 0, pct: 0 };
  const done = unit.lessonIds.filter(id => completedLessonSet.has(id)).length;
  const total = unit.lessonIds.length;
  return { done, total, pct: total > 0 ? Math.round(done / total * 100) : 0 };
}

function getUnitStatus(unitId) {
  const { done, total } = getUnitProgress(unitId);
  if (done === 0) return 'locked';
  if (done >= total) return 'complete';
  return 'active';
}

function checkNewAchievements() {
  return checkBadgesFromLearning(state, userConferences, userAwards, {
    referrals: state.referrals || [],
    fullName: state.fullName,
    activityPoints: state.activityPoints || 0,
    allLessonIds: ALL_LESSON_IDS,
    badgeShards: state.badgeShards || 0
  });
}

function getPerfectScoreAchievement(lessonId) {
  const score = state.lessonScores[lessonId];
  if (score && score.correct === score.total && score.total > 0) {
    if (!state.achievements.includes('perfect-score')) {
      state.achievements.push('perfect-score');
      return ACHIEVEMENT_MAP['perfect-score'];
    }
  }
  return null;
}

function updateStreak() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (state.lastActivity === today) {
    state.dailyLessonDone = true;
    return;
  }
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;
  if (state.lastActivity === yesterday) {
    state.streak = (state.streak || 0) + 1;
  } else if (state.lastActivity && state.lastActivity !== today) {
    state.streak = 1;
  } else if (!state.lastActivity) {
    state.streak = 1;
  }
  state.lastActivity = today;
  state.dailyLessonDone = true;
}

/* ═══════════════════════════════════════════════
   RENDER
   ═══════════════════════════════════════════════ */

function render() {
  renderTopSection();
  renderStreakReminder();
  preloadUnits();
}

async function preloadUnits() {
  // Preload the first incomplete unit's lessons silently
  const firstIncomplete = UNITS.find(u => getUnitStatus(u.id) !== 'complete');
  if (firstIncomplete && !loadedUnits.has(firstIncomplete.id)) {
    await loadUnitLessons(firstIncomplete.id);
  }
  // Single render: auto-expand first incomplete unit on desktop
  renderCourse(false);
  renderQuests();
  renderBadges();
  // Silently preload the next unit too
  const nextIdx = UNITS.findIndex(u => u.id === firstIncomplete?.id) + 1;
  if (nextIdx < UNITS.length && !loadedUnits.has(UNITS[nextIdx].id)) {
    loadUnitLessons(UNITS[nextIdx].id).catch(() => {});
  }
}

function renderTopSection() {
  const xp = state.totalXP || 0;
  const ap = state.activityPoints || 0;
  const confPts = (userConferences || []).length * 15;
  const awardPts = (userAwards || []).reduce((sum, a) => sum + awardPointsFor(a), 0);
  const totalPts = ap + confPts + awardPts;
  const level = getLevelFromPoints(totalPts);
  const title = getLevelName(level);
  const inLevel = totalPts % 100;
  const toNext = 100 - inLevel;
  const streak = state.streak || 0;
  const completed = (state.completedLessons || []).length;
  const total = ALL_LESSON_IDS.length;
  const dailyDone = state.dailyLessonDone;

  // Subtitle
  const subtitleEl = document.getElementById('learnSubtitle');
  if (subtitleEl) subtitleEl.textContent =
    completed > 0 ? `${completed} of ${total} lessons · ${title}` : 'Master debate, MUN, and public speaking';

  // Level card
  const lvlNumEl = document.getElementById('lvlNumber');
  const lvlTitleEl = document.getElementById('lvlTitle');
  const lvlXpCurrentEl = document.getElementById('lvlXpCurrent');
  const lvlXpNextEl = document.getElementById('lvlXpNext');
  const lvlBarFillEl = document.getElementById('lvlBarFill');
  const lvlBarPctEl = document.getElementById('lvlBarPct');
  if (lvlNumEl) lvlNumEl.textContent = level;
  if (lvlTitleEl) lvlTitleEl.textContent = title;
  if (lvlXpCurrentEl) lvlXpCurrentEl.innerHTML = `${totalPts} <span class="gem-icon gem-icon--sm"></span>`;
  if (lvlXpNextEl) lvlXpNextEl.innerHTML = `${toNext} <span class="gem-icon gem-icon--sm"></span> to Level ${level + 1}`;
  if (lvlBarFillEl) lvlBarFillEl.style.width = inLevel + '%';
  if (lvlBarPctEl) lvlBarPctEl.textContent = inLevel + '%';

  // Stats cards
  const streakEl = document.getElementById('sgStreak');
  if (streakEl) streakEl.textContent = streak;
  const dailyCompleted = state.dailyLessonsCompleted || 0;
  const dailyEl = document.getElementById('sgDaily');
  if (dailyEl) {
    dailyEl.textContent = `${Math.min(dailyCompleted, DAILY_LESSON_LIMIT)}/${DAILY_LESSON_LIMIT}`;
    if (dailyCompleted >= DAILY_LESSON_LIMIT) {
      dailyEl.style.color = '#34D399';
    }
  }

  const gemsToday = computeGemsToday(userPointHistory);
  const gemsEl = document.getElementById('sgTodayGems');
  if (gemsEl) gemsEl.textContent = gemsToday;
}

function renderCourse(firstLoad) {
  const container = document.getElementById('coursePath');
  if (!container) return;
  container.innerHTML = '';

  // Find first incomplete unit to auto-expand on desktop
  const firstIncomplete = UNITS.find(u => getUnitStatus(u.id) !== 'complete');
  const isMobile = window.innerWidth <= 768;

  for (const unit of UNITS) {
    const { done, total, pct } = getUnitProgress(unit.id);
    const unitStatus = getUnitStatus(unit.id);
    const isComplete = unitStatus === 'complete';
    const canExpand = !firstLoad && !isMobile && unit === firstIncomplete;
    const unitExpanded = isComplete || canExpand;

    const unitEl = document.createElement('div');
    unitEl.className = 'unit' + (unitExpanded ? ' expanded' : '') + (isComplete ? ' complete' : '');

    const header = document.createElement('div');
    header.className = 'unit-header' + (isComplete ? ' complete' : '');
    header.style.setProperty('--unit-color', unit.color);

    const r = 16;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - pct / 100);

    header.innerHTML = `
      <div class="unit-icon-box" style="background:${unit.color}20;color:${unit.color};">${unit.icon}</div>
      <div class="unit-body">
        <div class="unit-title">${unit.title}</div>
        <div class="unit-subtitle">${unit.subtitle}</div>
      </div>
      <div class="unit-meta">
        ${isComplete
          ? '<span class="unit-badge"><i class="fas fa-check"></i> Done</span>'
          : `<div class="unit-ring-wrap">
              <svg width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="${r}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="3"/>
                <circle cx="20" cy="20" r="${r}" fill="none" stroke="${unit.color}" stroke-width="3"
                  stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
                  transform="rotate(-90 20 20)" style="transition: stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1);"/>
              </svg>
              <span class="unit-ring-pct${pct === 0 ? ' dim' : ''}">${pct}%</span>
            </div>`
        }
        <div class="unit-chevron"><i class="fas fa-chevron-down"></i></div>
      </div>
    `;
    unitEl.appendChild(header);

    const chain = document.createElement('div');
    chain.className = 'lesson-chain' + (done > 0 ? ' has-progress' : '') + (unitExpanded ? ' expanded' : '');

    // Click handler — toggle expand + lazy load
    header.addEventListener('click', async () => {
      const wasExpanded = unitEl.classList.toggle('expanded');
      chain.classList.toggle('expanded', wasExpanded);

      if (wasExpanded && !loadedUnits.has(unit.id) && !loadingUnits.has(unit.id)) {
        // Show loading state
        chain.innerHTML = '<div class="unit-loading"><i class="fas fa-spinner fa-spin"></i> Loading lessons...</div>';
        chain.classList.add('expanded');
        await loadUnitLessons(unit.id);
        renderUnitLessons(chain, unit);
      } else if (wasExpanded && loadedUnits.has(unit.id)) {
        renderUnitLessons(chain, unit);
      }
    });

    // If auto-expanded and unit has loaded lessons, render immediately
    if (unitExpanded && loadedUnits.has(unit.id)) {
      renderUnitLessons(chain, unit);
    } else if (unitExpanded && !loadedUnits.has(unit.id)) {
      // Auto-expanded but not loaded — load silently
      chain.innerHTML = '<div class="unit-loading"><i class="fas fa-spinner fa-spin"></i> Loading lessons...</div>';
      loadUnitLessons(unit.id).then(() => renderUnitLessons(chain, unit));
    }

    unitEl.appendChild(chain);
    container.appendChild(unitEl);
  }
}

function renderUnitLessons(chain, unit) {
  let html = '';
  const dailyLeft = getDailyLessonsLeft();
  for (const lessonId of unit.lessonIds) {
    const lesson = LESSONS[lessonId];
    const completed = isLessonCompleted(lessonId);
    const unlocked = isLessonUnlocked(lessonId);
    const isCurrent = !completed && unlocked;
    const dailyLimited = isCurrent && dailyLeft <= 0;
    const score = state.lessonScores[lessonId];
    const stepHtml = lesson ? getSectionSummary(lesson.sections) : '';
    const durationText = lesson ? getLessonDuration(lesson.sections).text : '';

    const cls = 'lesson-row'
      + (completed ? ' completed' : '')
      + (isCurrent && !completed && !dailyLimited ? ' active' : '')
      + (dailyLimited ? ' daily-limited' : '')
      + (!unlocked ? ' locked' : '');

    const dotHtml = completed
      ? '<i class="fas fa-redo" style="font-size:0.4rem;"></i>'
      : dailyLimited
        ? '<i class="fas fa-clock" style="font-size:0.4rem;"></i>'
        : !unlocked
          ? '<i class="fas fa-lock" style="font-size:0.5rem;"></i>'
          : isCurrent && !completed
            ? '<i class="fas fa-play" style="font-size:0.45rem;"></i>'
            : '';

    const metaHtml = !unlocked
      ? '<span>Locked</span>'
      : dailyLimited
        ? '<span class="lesson-daily-limit">Come back tomorrow</span>'
        : (completed && score)
          ? `<span class="lesson-score">${score.correct}/${score.total}</span>`
          : (lesson ? `<span>${durationText}</span>` : '<span>Loading...</span>');

    const hasProgress = !completed && state.currentLesson && state.currentLesson.id === lessonId;
    const resumeHtml = hasProgress ? '<span class="lesson-resume-tag">Resume</span>' : '';
    const reviewHtml = completed ? '<span class="lesson-review-tag">Review</span>' : '';

    const xpHtml = lesson && unlocked && !completed && !dailyLimited ? `<span class="lesson-xp">+${lesson.xp} <span class="gem-icon gem-icon--sm"></span></span>` : '';

    html += `
      <div class="${cls}" data-lesson-id="${lessonId}">
        <div class="lesson-dot">${dotHtml}</div>
        <div class="lesson-body">
          <div class="lesson-name">${lesson ? lesson.title : lessonId}</div>
          <div class="lesson-meta">
            ${metaHtml}
            ${resumeHtml}
            ${reviewHtml}
            ${stepHtml ? `<span class="lesson-steps">${stepHtml}</span>` : ''}
            ${xpHtml}
          </div>
        </div>
      </div>
    `;
  }
  chain.innerHTML = html;

  // Attach click handlers — all unlocked lessons are clickable (including completed for replay)
  chain.querySelectorAll('.lesson-row').forEach(row => {
    const lessonId = row.dataset.lessonId;
    if (isLessonUnlocked(lessonId)) {
      row.addEventListener('click', () => {
        openLesson(lessonId);
      });
    }
  });
}

function renderQuests() {
  const compactList = document.getElementById('questsCardList');
  const compactHeader = document.getElementById('questsCard');
  const compactReset = document.getElementById('questsCardReset');

  const qData = state.quests;
  if (!qData || !qData.quests || qData.quests.length === 0) {
    if (compactHeader) compactHeader.style.display = 'none';
    return;
  }

  if (compactHeader) compactHeader.style.display = 'flex';

  const allClaimed = qData.quests.every(q => q.claimed);

  if (compactReset) compactReset.textContent = allClaimed ? 'All done!' : `Resets tomorrow`;

  if (compactList) {
    compactList.innerHTML = qData.quests.map((q, i) => {
      const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
      const done = q.progress >= q.target;
      return `
        <div class="qc-item${done ? ' done' : ''}${q.claimed ? ' claimed' : ''}" data-tip="${q.desc}">
          <div class="qc-icon"><i class="fas ${q.icon}"></i></div>
          <div class="qc-body">
            <div class="qc-label">${q.label}</div>
            <div class="qc-bar">
              <div class="qc-bar-fill" style="width:${pct}%"></div>
            </div>
          </div>
          <div class="qc-right">
            ${q.claimed
              ? '<span class="qc-claimed"><i class="fas fa-check"></i></span>'
              : done
                ? `<button class="qc-claim-btn" data-quest="${i}"><i class="fas fa-gift"></i></button>`
                : `<span class="qc-xp">+${q.xp}</span>`
            }
          </div>
        </div>
      `;
    }).join('');
    compactList.querySelectorAll('.qc-claim-btn').forEach(btn => {
      btn.addEventListener('click', () => claimQuest(parseInt(btn.dataset.quest)));
    });
  }
}

async function claimQuest(idx) {
  const qData = state.quests;
  if (!qData || !qData.quests[idx]) return;
  const q = qData.quests[idx];
  if (q.claimed || q.progress < q.target) return;

  q.claimed = true;
  state.totalXP = (state.totalXP || 0) + q.xp;
  state.todayXP = (state.todayXP || 0) + q.xp;
  state.activityPoints = (state.activityPoints || 0) + ACTIVITY_POINTS.dailyChallenge;
  const questEntry = makeHistoryEntry(ACTIVITY_POINTS.dailyChallenge, "quest", "Daily challenge completed");
  const allClaimed = qData.quests.every(qq => qq.claimed);
  const entitlements = {};
  if (allClaimed) {
    entitlements.extraSpinAvailable = true;
    showToast('<i class="fas fa-gem" style="color:#a68af9"></i> All quests done! You earned a bonus Daily Spin!', 'success');
  }
  await saveState([questEntry], entitlements);

  showToast(`+${q.xp} <span class="gem-icon gem-icon--sm"></span> from quest`, 'xp');
  showToast(`+${ACTIVITY_POINTS.dailyChallenge} <span class="gem-icon gem-icon--sm"></span> — Daily Challenge`, 'xp');
  renderQuests();
  renderTopSection();
  fireConfetti();
}

function renderBadges() {
  const earnedIds = new Set(state.achievements || []);
  const grid = document.getElementById('badgesGrid');
  const countEl = document.getElementById('badgesCount');
  if (!grid || !countEl) return;
  const earned = BADGES.filter(b => earnedIds.has(b.id)).length;

  countEl.textContent = `${earned} / ${BADGES.length} earned`;

  grid.innerHTML = BADGES.map(b => {
    const isEarned = earnedIds.has(b.id);
    let cls = 'badge-item';
    if (isEarned) cls += ' earned';
    else if (b.hidden) cls += ' hidden';

    const icon = isEarned ? b.icon : (b.hidden ? 'fas fa-question' : b.icon);
    const label = isEarned ? b.label : (b.hidden ? '???' : b.label);

    const stripHtml = s => s.replace(/<[^>]*>/g, '').trim();
    const tip = isEarned
      ? `✅ ${b.label} — ${stripHtml(b.desc)}`
      : b.hidden
        ? '🔒 ??? — keep going to reveal this secret badge!'
        : `🔒 ${stripHtml(b.unlock || b.desc)}`;
    const safeTip = tip.replace(/"/g, '&quot;');
    return `
      <div class="${cls}" data-tip="${safeTip}">
        <div class="badge-item-icon"><i class="${icon}"></i></div>
        <div class="badge-item-label">${label}</div>
      </div>
    `;
  }).join('');
}

function updateQuestProgress(type, amount) {
  const qData = state.quests;
  if (!qData || !qData.quests) return;

  for (const q of qData.quests) {
    if (q.claimed) continue;

    if (q.id === type) {
      q.progress = Math.min(q.target, q.progress + amount);
    } else if (type === 'xp-earned' && q.id.startsWith('earn-')) {
      q.progress = Math.min(q.target, q.progress + amount);
    } else if (type === 'lesson-completed' && q.id.startsWith('complete-')) {
      q.progress = Math.min(q.target, q.progress + 1);
    }
  }
}

function renderStreakReminder() {
  const el = document.getElementById('streakReminder');
  const textEl = document.getElementById('streakReminderText');
  const closeBtn = document.getElementById('streakReminderClose');
  if (!el || !textEl) return;

  const streak = state.streak || 0;
  const today = getTodayStr();
  const lastActivity = state.lastActivity;
  const dailyDone = state.dailyLessonDone;
  const dismissed = sessionStorage.getItem('streak-dismissed-today') === today;

  if (streak > 0 && lastActivity !== today && !dailyDone && !dismissed) {
    textEl.innerHTML = `Your <strong>${streak}-day streak</strong> is at risk! Complete a lesson today to keep it alive.`;
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }

  if (closeBtn) {
    closeBtn.onclick = () => {
      el.style.display = 'none';
      sessionStorage.setItem('streak-dismissed-today', today);
    };
  }
}

function getLessonDuration(sections) {
  if (!sections) return { text: '', count: 0 };
  const count = sections.filter(s => s.type === 'learn' || s.type === 'example').length;
  const mins = Math.max(1, Math.round(sections.length * 0.7));
  return { text: `${mins} min`, count };
}

/* ═══════════════════════════════════════════════
   LESSON MODAL
   ═══════════════════════════════════════════════ */

async function openLesson(lessonId) {
  if (!completedLessonSet.has(lessonId) && getDailyLessonsLeft() <= 0) {
    showToast('Daily limit reached! Come back tomorrow for more lessons.', 'xp');
    return;
  }

  let lesson = LESSONS[lessonId];

  if (!lesson) {
    document.getElementById('modalLessonTitle').textContent = 'Loading...';
    document.getElementById('modalLessonUnit').textContent = '';
    document.getElementById('lessonModal').classList.add('open');
    document.body.style.overflow = 'hidden';
    document.getElementById('modalBody').innerHTML = '<div class="sec-learn" style="text-align:center;padding:60px 20px;"><i class="fas fa-spinner fa-spin" style="font-size:32px;color:var(--gray);"></i><p style="margin-top:16px;color:var(--gray);">Loading lesson...</p></div>';

    await loadLessonWithRetry(lessonId, 3);
    lesson = LESSONS[lessonId];

    if (!lesson) {
      document.getElementById('modalBody').innerHTML = `
        <div class="sec-learn" style="text-align:center;padding:60px 20px;">
          <i class="fas fa-exclamation-triangle" style="font-size:32px;color:#F87171;"></i>
          <p style="margin-top:16px;color:var(--gray);">Could not load this lesson.</p>
          <button onclick="closeModal()" style="margin-top:12px;padding:8px 20px;border:1px solid rgba(255,255,255,0.1);border-radius:8px;background:transparent;color:var(--white);cursor:pointer;">Close</button>
        </div>`;
      document.getElementById('btnNext').style.display = 'none';
      return;
    }
  }

  activeLesson = lessonId;
  activeSectionIndex = 0;
  quizCorrect = 0;
  quizTotal = 0;
  quizStreak = 0;
  practiceCorrect = 0;
  answerLocked = false;
  sectionAnswers = {};

  if (completedLessonSet.has(lessonId) && state.currentLesson && state.currentLesson.id === lessonId) {
    clearLessonProgress();
  }

  const saved = state.currentLesson;
  if (saved && saved.id === lessonId && saved.sectionIndex > 0) {
    sectionAnswers = saved.answers || {};
    quizCorrect = saved.quizCorrect || 0;
    quizTotal = saved.quizTotal || 0;
    quizStreak = saved.quizStreak || 0;
    practiceCorrect = saved.practiceCorrect || 0;
    fastForwardToSection(saved.sectionIndex);
  }

  document.getElementById('modalLessonTitle').textContent = lesson.title;
  const unit = UNITS.find(u => u.id === lesson.unit);
  document.getElementById('modalLessonUnit').textContent = unit ? unit.title : '';
  document.getElementById('btnNext').style.display = 'none';
  document.getElementById('lessonModal').classList.add('open');
  document.body.style.overflow = 'hidden';

  state.lastLesson = { id: lessonId, title: lesson.title, unit: unit ? unit.title : '' };

  // Start contextual tips for this unit
  if (unit) startTips({ unitId: unit.id }, 90000);

  renderSection();

  saveState();
}

function renderSection() {
  const lesson = LESSONS[activeLesson];
  if (!lesson || activeSectionIndex >= lesson.sections.length) {
    showCompletion();
    return;
  }

  const section = lesson.sections[activeSectionIndex];
  answerLocked = false;

  if (isExerciseType(section.type)) hideMascot();

  if (activeSectionIndex > 0) {
    const prev = lesson.sections[activeSectionIndex - 1];
    if (isExerciseType(prev.type) && isExerciseType(section.type) && prev.type === section.type) {
      console.warn(`Adjacent same exercise type: section ${activeSectionIndex-1} and ${activeSectionIndex} are both "${section.type}"`);
    }
  }

  const body = document.getElementById('modalBody');
  const isLast = activeSectionIndex === lesson.sections.length - 1;

  document.getElementById('modalDots').innerHTML = '';
  document.getElementById('btnNext').style.display = 'none';
  renderPhaseIndicator(section.type);

  if (section.type === 'learn') {
    renderLearnSection(section, body, isLast);
  } else if (section.type === 'example') {
    renderExampleSection(section, body, isLast);
  } else if (section.type === 'practice') {
    renderPracticeSection(section, body, isLast);
  } else if (section.type === 'quiz') {
    renderQuizSection(section, body, isLast);
  } else if (section.type === 'fill-blank') {
    renderFillBlank(section, body, isLast);
  } else if (section.type === 'match') {
    renderMatchPairs(section, body, isLast);
  } else if (section.type === 'order') {
    renderOrderSteps(section, body, isLast);
  } else if (section.type === 'spot-mistake') {
    renderSpotMistake(section, body, isLast);
  } else if (section.type === 'highlight') {
    renderHighlight(section, body, isLast);
  } else if (section.type === 'build-argument') {
    renderBuildArgument(section, body, isLast);
  } else if (section.type === 'true-false') {
    renderTrueFalse(section, body, isLast);
  } else if (section.type === 'scenario') {
    renderScenario(section, body, isLast);
  } else if (section.type === 'recap') {
    renderRecapChallenge(section, body, isLast);
  }

  renderDots();
}

function renderPhaseIndicator(type) {
  const el = document.getElementById('phaseIndicator');
  const icon = SECTION_ICONS[type] || 'fas fa-circle';
  const label = SECTION_LABELS[type] || '';
  const color = SECTION_COLORS[type] || '#6B7280';
  el.innerHTML = `<span class="phase-badge" style="background:${color}20;color:${color};border:1px solid ${color}40;"><i class="${icon}"></i> ${label}</span>`;
}

function renderLearnSection(section, body, isLast) {
  body.innerHTML = `
    <div class="sec-learn">
      <div class="sec-icon" style="background:${SECTION_COLORS.learn}20;color:${SECTION_COLORS.learn};">
        <i class="${SECTION_ICONS.learn}"></i>
      </div>
      <div class="sec-title">${section.title || 'Learn'}</div>
      <div class="sec-content">${section.content}</div>
      ${section.bullets ? `
        <ul class="sec-bullets">
          ${section.bullets.map(b => `<li>${b}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `;
  showContinue(isLast, section.type);
}

function renderExampleSection(section, body, isLast) {
  let html = `
    <div class="sec-example">
      <div class="sec-icon" style="background:${SECTION_COLORS.example}20;color:${SECTION_COLORS.example};">
        <i class="${SECTION_ICONS.example}"></i>
      </div>
      <div class="sec-title">${section.title || 'Example'}</div>
      <div class="sec-content">${section.content}</div>
  `;
  if (section.good) {
    html += `<div class="ex-good"><div class="ex-label"><i class="fas fa-check-circle"></i> Good</div>${section.good}</div>`;
  }
  if (section.bad) {
    html += `<div class="ex-bad"><div class="ex-label"><i class="fas fa-times-circle"></i> Bad</div>${section.bad}</div>`;
  }
  if (section.breakdown) {
    html += `<div class="ex-breakdown">`;
    for (const b of section.breakdown) {
      html += `<div class="ex-part"><span class="ex-part-label">${b.label}</span><span class="ex-part-text">${b.text}</span></div>`;
    }
    html += `</div>`;
  }
  if (section.explanation) {
    html += `<div class="ex-explain"><i class="fas fa-lightbulb"></i> ${section.explanation}</div>`;
  }
  html += `</div>`;
  body.innerHTML = html;
  showContinue(isLast, section.type);
}

function renderPracticeSection(section, body, isLast) {
  const timeLimit = section.timeLimit || 0;
  body.innerHTML = `
    <div class="sec-practice">
      ${timeLimit > 0 ? `
        <div class="q-timer-wrap">
          <div class="q-timer-track"><div class="q-timer-bar" id="pTimerBar"></div></div>
          <div class="q-timer-text" id="pTimerText">${formatTime(timeLimit)}</div>
        </div>` : ''}
      <div class="sec-icon" style="background:${SECTION_COLORS.practice}20;color:${SECTION_COLORS.practice};">
        <i class="${SECTION_ICONS.practice}"></i>
      </div>
      <div class="sec-title">Practice</div>
      <div class="sec-instruction">${section.instruction}</div>
      <div class="p-opts" id="pOptions">
        ${section.options.map((opt, i) =>
          `<button class="p-opt" data-idx="${i}">${opt}</button>`
        ).join('')}
      </div>
      <div id="pFeedback"></div>
    </div>
  `;

  if (timeLimit > 0) {
    let remaining = timeLimit;
    const bar = document.getElementById('pTimerBar');
    const text = document.getElementById('pTimerText');
    bar.style.width = '100%';
    text.textContent = formatTime(remaining);
    const timer = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(timer);
        bar.style.width = '0%';
        if (!answerLocked) {
          handlePracticeTimeout(section);
        }
      } else {
        const pct = (remaining / timeLimit) * 100;
        bar.style.width = pct + '%';
        bar.style.background = remaining <= 5 ? '#EF4444' : remaining <= 10 ? '#F59E0B' : '#60A5FA';
        text.textContent = formatTime(remaining);
      }
    }, 1000);
    window.__quizTimer = timer;
  }

  document.querySelectorAll('.p-opt').forEach(btn => {
    btn.addEventListener('click', () => handlePractice(parseInt(btn.dataset.idx), section));
  });
}

function renderQuizSection(section, body, isLast) {
  const timeLimit = section.timeLimit || 0;
  body.innerHTML = `
    <div class="sec-quiz">
      ${timeLimit > 0 ? `
        <div class="q-timer-wrap">
          <div class="q-timer-track"><div class="q-timer-bar" id="qTimerBar"></div></div>
          <div class="q-timer-text" id="qTimerText">${formatTime(timeLimit)}</div>
        </div>` : ''}
      <div class="sec-icon" style="background:${SECTION_COLORS.quiz}20;color:${SECTION_COLORS.quiz};">
        <i class="${SECTION_ICONS.quiz}"></i>
      </div>
      <div class="sec-title">Challenge</div>
      <div class="q-counter">Question ${quizTotal + 1} of ${getQuizCount()}</div>
      <div class="q-text">${section.q}</div>
      <div class="q-opts" id="qOptions">
        ${section.options.map((opt, i) =>
          `<button class="q-opt" data-idx="${i}">${opt}</button>`
        ).join('')}
      </div>
      <div id="qExplain"></div>
    </div>
  `;

  if (timeLimit > 0) {
    let remaining = timeLimit;
    const bar = document.getElementById('qTimerBar');
    const text = document.getElementById('qTimerText');
    bar.style.width = '100%';
    text.textContent = formatTime(remaining);
    const timer = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(timer);
        bar.style.width = '0%';
        if (!answerLocked) {
          handleQuizTimeout(section);
        }
      } else {
        const pct = (remaining / timeLimit) * 100;
        bar.style.width = pct + '%';
        bar.style.background = remaining <= 5 ? '#EF4444' : remaining <= 10 ? '#F59E0B' : '#60A5FA';
        text.textContent = formatTime(remaining);
      }
    }, 1000);
    window.__quizTimer = timer;
  }

  document.querySelectorAll('.q-opt').forEach(btn => {
    btn.addEventListener('click', () => handleQuiz(parseInt(btn.dataset.idx), section));
  });
}

/* ═══════════════════════════════════════════════
   NEW INTERACTIVE EXERCISE TYPES
   ═══════════════════════════════════════════════ */

// ─── Fill in the Blank ───
function renderFillBlank(section, body, isLast) {
  const color = SECTION_COLORS['fill-blank'];
  const blanks = section.answers || [];
  const allWords = [...blanks, ...(section.distractors || [])].sort(() => Math.random() - 0.5);
  let html = section.sentence || '';

  blanks.forEach((_, i) => {
    html = html.replace(`{${i}}`, `<span class="fb-slot" data-idx="${i}"></span>`);
  });

  body.innerHTML = `
    <div class="sec-fill-blank">
      <div class="sec-icon" style="background:${color}20;color:${color};"><i class="${SECTION_ICONS['fill-blank']}"></i></div>
      <div class="sec-title">Fill in the Blanks</div>
      ${section.instruction ? `<div class="sec-instruction">${section.instruction}</div>` : ''}
      <div class="fb-sentence">${html}</div>
      <div class="fb-bank" id="fbBank">
        ${allWords.map((w, i) => `<button class="fb-word" data-word="${esc(w)}" data-idx="${i}">${esc(w)}</button>`).join('')}
      </div>
      <div class="fb-feedback" id="fbFeedback"></div>
    </div>
  `;

  const slots = body.querySelectorAll('.fb-slot');
  const words = body.querySelectorAll('.fb-word');
  const placed = {};

  words.forEach(btn => {
    btn.addEventListener('click', () => {
      if (answerLocked) return;
      const word = btn.dataset.word;
      const firstEmpty = Array.from(slots).find(s => !s.dataset.filled);
      if (!firstEmpty) return;
      firstEmpty.textContent = word;
      firstEmpty.dataset.filled = 'true';
      btn.style.display = 'none';
      placed[firstEmpty.dataset.idx] = word;

      const allFilled = Array.from(slots).every(s => s.dataset.filled);
      if (allFilled) checkFillBlank(slots, blanks, section, isLast);
    });
  });

  slots.forEach(slot => {
    slot.addEventListener('click', () => {
      if (answerLocked || !slot.dataset.filled) return;
      const word = slot.textContent.trim();
      slot.textContent = '';
      delete slot.dataset.filled;
      const btn = Array.from(words).find(b => b.dataset.word === word && b.style.display === 'none');
      if (btn) btn.style.display = '';
      delete placed[slot.dataset.idx];
    });
  });
}

function checkFillBlank(slots, correct, section, isLast) {
  answerLocked = true;
  const userAnswers = Array.from(slots).map(s => s.textContent.trim().toLowerCase());
  const isCorrect = userAnswers.every((a, i) => a === correct[i].toLowerCase());
  recordSectionAnswer(activeSectionIndex, 'fill-blank', { filled: userAnswers, isCorrect });

  slots.forEach((s, i) => {
    s.classList.add(userAnswers[i] === correct[i].toLowerCase() ? 'correct' : 'wrong');
  });

  recordAnswer(isCorrect);

  document.getElementById('fbFeedback').innerHTML = `
    <div class="p-feedback ${isCorrect ? 'correct' : 'wrong'}">
      <i class="fas ${isCorrect ? 'fa-check-circle' : 'fa-times-circle'}"></i>
      ${isCorrect ? 'Correct!' : section.feedback || 'Not quite. Try again?'}
    </div>`;
  document.getElementById('fbFeedback').scrollIntoView({ behavior: 'smooth', block: 'center' });

  if (isCorrect) showContinue(isLast);
  else showRetry();
}

// ─── Match the Pairs ───
function renderMatchPairs(section, body, isLast) {
  const color = SECTION_COLORS.match;
  const pairs = section.pairs || [];
  const shuffledRight = [...pairs].sort(() => Math.random() - 0.5);

  body.innerHTML = `
    <div class="sec-match">
      <div class="sec-icon" style="background:${color}20;color:${color};"><i class="${SECTION_ICONS.match}"></i></div>
      <div class="sec-title">Match the Pairs</div>
      ${section.instruction ? `<div class="sec-instruction">${section.instruction}</div>` : ''}
      <div class="match-grid">
        <div class="match-col match-left">
          ${pairs.map((p, i) => `<div class="match-item match-item-left" data-id="${p.id || i}">${esc(p.left)}</div>`).join('')}
        </div>
        <div class="match-col match-right">
          ${shuffledRight.map((p, i) => `<div class="match-item match-item-right" data-id="${p.id || i}" data-match="${p.id || i}">${esc(p.right)}</div>`).join('')}
        </div>
      </div>
      <div class="match-feedback" id="matchFeedback"></div>
    </div>
  `;

  let selectedLeft = null;
  let matched = 0;
  const total = pairs.length;

  body.querySelectorAll('.match-item-left').forEach(el => {
    el.addEventListener('click', () => {
      if (answerLocked) return;
      body.querySelectorAll('.match-item-left').forEach(e => e.classList.remove('selected'));
      el.classList.add('selected');
      selectedLeft = el.dataset.id;
    });
  });

  body.querySelectorAll('.match-item-right').forEach(el => {
    el.addEventListener('click', () => {
      if (answerLocked || !selectedLeft) return;
      if (el.dataset.match === selectedLeft) {
        el.classList.add('matched');
        body.querySelector(`.match-item-left[data-id="${selectedLeft}"]`).classList.add('matched');
        matched++;
        if (matched >= total) {
          answerLocked = true;
          recordAnswer(true);
          recordSectionAnswer(activeSectionIndex, 'match', { isCorrect: true });
          document.getElementById('matchFeedback').innerHTML =
            `<div class="p-feedback correct"><i class="fas fa-check-circle"></i> ${section.feedback || 'All matched correctly!'}</div>`;
          showContinue(isLast);
        }
      } else {
        el.classList.add('wrong');
        setTimeout(() => el.classList.remove('wrong'), 400);
      }
      body.querySelectorAll('.match-item-left').forEach(e => e.classList.remove('selected'));
      selectedLeft = null;
    });
  });
}

// ─── Put Steps in Order (drag-and-drop) ───
function renderOrderSteps(section, body, isLast) {
  const color = SECTION_COLORS.order;
  const steps = [...(section.steps || [])].sort(() => Math.random() - 0.5);

  body.innerHTML = `
    <div class="sec-order">
      <div class="sec-icon" style="background:${color}20;color:${color};"><i class="${SECTION_ICONS.order}"></i></div>
      <div class="sec-title">Put in Order</div>
      ${section.instruction ? `<div class="sec-instruction">${section.instruction}</div>` : ''}
      <div class="order-list" id="orderList">
        ${steps.map((s, i) => `
          <div class="order-item" draggable="true" data-text="${esc(s)}">
            <span class="order-handle"><i class="fas fa-grip-vertical"></i></span>
            <span class="order-text">${esc(s)}</span>
          </div>
        `).join('')}
      </div>
      <div class="order-feedback" id="orderFeedback"></div>
    </div>
  `;

  const list = document.getElementById('orderList');
  let dragSrc = null;

  function checkOrder() {
    if (answerLocked) return;
    const correct = section.steps || [];
    const user = Array.from(list.children).map(el => el.dataset.text);
    if (user.every((t, i) => t === correct[i])) {
      answerLocked = true;
      recordAnswer(true);
      recordSectionAnswer(activeSectionIndex, 'order', { isCorrect: true });
      Array.from(list.children).forEach(el => {
        el.classList.add('correct');
        el.draggable = false;
      });
      document.getElementById('orderFeedback').innerHTML =
        `<div class="p-feedback correct"><i class="fas fa-check-circle"></i> ${section.feedback || 'Correct order!'}</div>`;
      showContinue(isLast);
    }
  }

  list.addEventListener('dragstart', e => {
    dragSrc = e.target.closest('.order-item');
    if (!dragSrc || answerLocked) { e.preventDefault(); return; }
    dragSrc.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  });

  list.addEventListener('dragend', e => {
    const item = e.target.closest('.order-item');
    if (item) item.classList.remove('dragging');
    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    dragSrc = null;
  });

  list.addEventListener('dragover', e => {
    if (answerLocked) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.target.closest('.order-item');
    if (!target || target === dragSrc) return;
    const rect = target.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const after = e.clientY > midY;
    if (after && target.nextElementSibling) {
      target.classList.add('drag-over');
    } else if (!after) {
      target.classList.remove('drag-over');
    }
  });

  list.addEventListener('dragleave', e => {
    const target = e.target.closest('.order-item');
    if (target) target.classList.remove('drag-over');
  });

  list.addEventListener('drop', e => {
    e.preventDefault();
    if (answerLocked || !dragSrc) return;
    const target = e.target.closest('.order-item');
    if (!target || target === dragSrc) return;
    const rect = target.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (e.clientY > midY) {
      target.parentNode.insertBefore(dragSrc, target.nextSibling);
    } else {
      target.parentNode.insertBefore(dragSrc, target);
    }
    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    checkOrder();
  });

  // ─── Touch drag support for mobile ───
  let touchDragEl = null;
  let touchClone = null;
  let touchOffsetY = 0;
  let touchTarget = null;

  list.addEventListener('touchstart', e => {
    if (answerLocked) return;
    const item = e.target.closest('.order-item');
    if (!item) return;
    touchDragEl = item;
    const touch = e.touches[0];
    const rect = item.getBoundingClientRect();
    touchOffsetY = touch.clientY - rect.top;

    touchClone = item.cloneNode(true);
    touchClone.classList.add('touch-clone');
    touchClone.style.cssText = 'position:fixed;z-index:10000;pointer-events:none;transition:none;transform:scale(1.03);box-shadow:0 8px 32px rgba(0,0,0,0.3);opacity:0.95;width:' + rect.width + 'px;left:' + rect.left + 'px;top:' + rect.top + 'px;';
    document.body.appendChild(touchClone);

    touchDragEl.classList.add('dragging');
    e.preventDefault();
  }, { passive: false });

  list.addEventListener('touchmove', e => {
    if (!touchDragEl || !touchClone) return;
    e.preventDefault();
    const touch = e.touches[0];
    touchClone.style.top = (touch.clientY - touchOffsetY) + 'px';

    const items = Array.from(list.querySelectorAll('.order-item'));
    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    touchTarget = null;

    for (const item of items) {
      if (item === touchDragEl) continue;
      const rect = item.getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        touchTarget = item;
        item.classList.add('drag-over');
        break;
      }
    }
  }, { passive: false });

  list.addEventListener('touchend', e => {
    if (!touchDragEl || !touchClone) return;

    if (touchTarget && touchTarget !== touchDragEl) {
      const rect = touchTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const touch = e.changedTouches[0];
      if (touch.clientY > midY) {
        touchTarget.parentNode.insertBefore(touchDragEl, touchTarget.nextSibling);
      } else {
        touchTarget.parentNode.insertBefore(touchDragEl, touchTarget);
      }
      checkOrder();
    }

    touchDragEl.classList.remove('dragging');
    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

    const clone = touchClone;
    clone.style.transition = 'all 0.2s cubic-bezier(0.16,1,0.3,1)';
    clone.style.transform = 'scale(1)';
    clone.style.opacity = '0';
    setTimeout(() => { if (clone.parentNode) clone.remove(); }, 200);

    touchDragEl = null;
    touchClone = null;
    touchTarget = null;
  });
}

// ─── Spot the Mistake ───
function renderSpotMistake(section, body, isLast) {
  const color = SECTION_COLORS['spot-mistake'];
  body.innerHTML = `
    <div class="sec-spot">
      <div class="sec-icon" style="background:${color}20;color:${color};"><i class="${SECTION_ICONS['spot-mistake']}"></i></div>
      <div class="sec-title">Spot the Mistake</div>
      ${section.instruction ? `<div class="sec-instruction">${section.instruction}</div>` : ''}
      <div class="spot-argument">${esc(section.argument || '')}</div>
      <div class="spot-opts" id="spotOptions">
        ${(section.options || []).map((opt, i) =>
          `<button class="spot-opt" data-idx="${i}">${esc(opt)}</button>`
        ).join('')}
      </div>
      <div class="spot-feedback" id="spotFeedback"></div>
    </div>
  `;
  body.querySelectorAll('.spot-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      if (answerLocked) return;
      answerLocked = true;
      const isCorrect = parseInt(btn.dataset.idx) === section.correct;
      recordSectionAnswer(activeSectionIndex, 'spot-mistake', { selected: parseInt(btn.dataset.idx), isCorrect });
      body.querySelectorAll('.spot-opt').forEach((b, i) => {
        b.disabled = true;
        if (i === section.correct) b.classList.add('correct');
        else if (i === parseInt(btn.dataset.idx) && !isCorrect) b.classList.add('wrong');
      });
      recordAnswer(isCorrect);
      document.getElementById('spotFeedback').innerHTML =
        `<div class="p-feedback ${isCorrect ? 'correct' : 'wrong'}"><i class="fas ${isCorrect ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${section.feedback || (isCorrect ? 'Correct!' : 'Not quite.')}</div>`;
      showContinue(isLast);
    });
  });
}

// ─── Highlight Correct Part ───
function renderHighlight(section, body, isLast) {
  const color = SECTION_COLORS.highlight;
  const segments = section.segments || [];
  body.innerHTML = `
    <div class="sec-highlight">
      <div class="sec-icon" style="background:${color}20;color:${color};"><i class="${SECTION_ICONS.highlight}"></i></div>
      <div class="sec-title">Highlight the Correct Part</div>
      <div class="sec-instruction">${section.instruction || 'Click on the correct part of the text.'}</div>
      <div class="highlight-text" id="highlightText">
        ${segments.map((seg, i) =>
          `<span class="hl-segment" data-type="${seg.type}" data-idx="${i}">${esc(seg.text)}</span>`
        ).join('')}
      </div>
      <div class="highlight-feedback" id="highlightFeedback"></div>
    </div>
  `;
  body.querySelectorAll('.hl-segment').forEach(el => {
    el.addEventListener('click', () => {
      if (answerLocked) return;
      answerLocked = true;
      const isCorrect = el.dataset.type === (section.correctType || '');
      body.querySelectorAll('.hl-segment').forEach(s => s.style.pointerEvents = 'none');
      if (isCorrect) {
        recordAnswer(true);
        recordSectionAnswer(activeSectionIndex, 'highlight', { selected: el.dataset.idx, isCorrect: true });
        el.classList.add('hl-correct');
        document.getElementById('highlightFeedback').innerHTML =
          `<div class="p-feedback correct"><i class="fas fa-check-circle"></i> ${section.feedback || 'Correct!'}</div>`;
      } else {
        el.classList.add('hl-wrong');
        document.getElementById('highlightFeedback').innerHTML =
          `<div class="p-feedback wrong"><i class="fas fa-times-circle"></i> ${section.feedback || 'Not that part. Try again?'}</div>`;
        setTimeout(() => {
          answerLocked = false;
          el.classList.remove('hl-wrong');
          body.querySelectorAll('.hl-segment').forEach(s => s.style.pointerEvents = '');
        }, 800);
        return;
      }
      showContinue(isLast);
    });
  });
}

// ─── Build the Argument ───
function renderBuildArgument(section, body, isLast) {
  const color = SECTION_COLORS['build-argument'];
  const cats = section.categories || [];
  const cards = [...(section.cards || [])].sort(() => Math.random() - 0.5);

  body.innerHTML = `
    <div class="sec-build">
      <div class="sec-icon" style="background:${color}20;color:${color};"><i class="${SECTION_ICONS['build-argument']}"></i></div>
      <div class="sec-title">Build the Argument</div>
      ${section.instruction ? `<div class="sec-instruction">${section.instruction}</div>` : ''}
      <div class="build-cards" id="buildCards">
        ${cards.map((c, i) => `<div class="build-card" data-cat="${c.category}" data-idx="${i}">${esc(c.text)}</div>`).join('')}
      </div>
      <div class="build-zones" id="buildZones">
        ${cats.map(c => `
          <div class="build-zone" data-cat="${c.id}">
            <div class="build-zone-label">${esc(c.label)}</div>
            <div class="build-zone-drop"></div>
          </div>
        `).join('')}
      </div>
      <div class="build-feedback" id="buildFeedback"></div>
    </div>
  `;

  let placedCount = 0;
  const totalCards = cards.length;

  body.querySelectorAll('.build-card').forEach(card => {
    card.addEventListener('click', () => {
      if (answerLocked) return;
      body.querySelectorAll('.build-zone').forEach(z => z.classList.add('active'));
    });
    card.addEventListener('dblclick', () => {
      if (answerLocked) return;
      const zone = body.querySelector(`.build-zone[data-cat="${card.dataset.cat}"] .build-zone-drop`);
      if (zone && !card.parentElement.classList.contains('build-zone-drop')) {
        zone.appendChild(card);
        card.classList.add('placed');
        checkBuildComplete(body, section, isLast);
      }
    });
  });

  body.querySelectorAll('.build-zone').forEach(zone => {
    zone.addEventListener('click', () => {
      const selected = body.querySelector('.build-card:not(.placed)');
      if (!selected || answerLocked) return;
      zone.querySelector('.build-zone-drop').appendChild(selected);
      selected.classList.add('placed');
      body.querySelectorAll('.build-zone').forEach(z => z.classList.remove('active'));
      checkBuildComplete(body, section, isLast);
    });
    zone.addEventListener('click', (e) => {
      if (e.target.closest('.build-card')) return;
      body.querySelectorAll('.build-zone').forEach(z => z.classList.remove('active'));
    });
  });
}

function checkBuildComplete(body, section, isLast) {
  const placed = body.querySelectorAll('.build-card.placed');
  if (placed.length < (section.cards || []).length) return;

  answerLocked = true;
  let correct = 0;
  placed.forEach(card => {
    const zone = card.closest('.build-zone');
    if (zone && zone.dataset.cat === card.dataset.cat) {
      card.classList.add('correct');
      correct++;
    } else {
      card.classList.add('wrong');
    }
  });

  const allCorrect = correct === (section.cards || []).length;
  recordAnswer(allCorrect);
  recordSectionAnswer(activeSectionIndex, 'build-argument', { isCorrect: allCorrect });
  document.getElementById('buildFeedback').innerHTML =
    `<div class="p-feedback ${allCorrect ? 'correct' : 'wrong'}"><i class="fas ${allCorrect ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${section.feedback || (allCorrect ? 'Perfect!' : 'Some are in the wrong category.')}</div>`;
  showContinue(isLast);
}

// ─── True or False ───
function renderTrueFalse(section, body, isLast) {
  const timeLimit = section.timeLimit || 0;
  const color = SECTION_COLORS['true-false'];
  body.innerHTML = `
    <div class="sec-tf">
      ${timeLimit > 0 ? `
        <div class="q-timer-wrap">
          <div class="q-timer-track"><div class="q-timer-bar" id="tfTimerBar"></div></div>
          <div class="q-timer-text" id="tfTimerText">${formatTime(timeLimit)}</div>
        </div>` : ''}
      <div class="sec-icon" style="background:${color}20;color:${color};"><i class="${SECTION_ICONS['true-false']}"></i></div>
      <div class="sec-title">True or False</div>
      <div class="tf-statement">${esc(section.statement || '')}</div>
      <div class="tf-btns">
        <button class="tf-btn true" data-answer="true"><i class="fas fa-check"></i> True</button>
        <button class="tf-btn false" data-answer="false"><i class="fas fa-times"></i> False</button>
      </div>
      <div class="tf-feedback" id="tfFeedback"></div>
    </div>
  `;

  if (timeLimit > 0) {
    let remaining = timeLimit;
    const bar = document.getElementById('tfTimerBar');
    const text = document.getElementById('tfTimerText');
    bar.style.width = '100%';
    text.textContent = formatTime(remaining);
    const timer = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(timer);
        bar.style.width = '0%';
        if (!answerLocked) {
          handleTrueFalseTimeout(section);
        }
      } else {
        const pct = (remaining / timeLimit) * 100;
        bar.style.width = pct + '%';
        bar.style.background = remaining <= 5 ? '#EF4444' : remaining <= 10 ? '#F59E0B' : '#60A5FA';
        text.textContent = formatTime(remaining);
      }
    }, 1000);
    window.__quizTimer = timer;
  }

  body.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (answerLocked) return;
      answerLocked = true;
      clearInterval(window.__quizTimer);
      const isCorrect = btn.dataset.answer === String(section.answer);
      recordSectionAnswer(activeSectionIndex, 'true-false', { selected: btn.dataset.answer === 'true', isCorrect });
      const hadTimer = timeLimit > 0;
      if (hadTimer) {
        if (!state.timedQuizzes) state.timedQuizzes = [];
        state.timedQuizzes.push({ lessonId: activeLesson, correct: isCorrect ? 1 : 0, total: 1, expired: false });
      }
      body.querySelectorAll('.tf-btn').forEach(b => {
        b.disabled = true;
        if (b.dataset.answer === String(section.answer)) b.classList.add('correct');
        else if (b === btn && !isCorrect) b.classList.add('wrong');
      });
      recordAnswer(isCorrect);
      document.getElementById('tfFeedback').innerHTML =
        `<div class="p-feedback ${isCorrect ? 'correct' : 'wrong'}"><i class="fas ${isCorrect ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${section.feedback || (isCorrect ? 'Correct!' : 'Not quite.')}</div>`;
      showContinue(isLast);
    });
  });
}

// ─── Mini Scenario ───
function renderScenario(section, body, isLast) {
  const color = SECTION_COLORS.scenario;
  body.innerHTML = `
    <div class="sec-scenario">
      <div class="sec-icon" style="background:${color}20;color:${color};"><i class="${SECTION_ICONS.scenario}"></i></div>
      <div class="sec-title">Scenario</div>
      <div class="scenario-bubble">${esc(section.scenario || '')}</div>
      <div class="sec-instruction" style="margin-top:16px;">${section.question || 'What\'s the best response?'}</div>
      <div class="scenario-opts" id="scenarioOpts">
        ${(section.options || []).map((opt, i) =>
          `<button class="scenario-opt" data-idx="${i}">${esc(opt)}</button>`
        ).join('')}
      </div>
      <div class="scenario-feedback" id="scenarioFeedback"></div>
    </div>
  `;
  body.querySelectorAll('.scenario-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      if (answerLocked) return;
      answerLocked = true;
      const isCorrect = parseInt(btn.dataset.idx) === section.correct;
      recordSectionAnswer(activeSectionIndex, 'scenario', { selected: parseInt(btn.dataset.idx), isCorrect });
      body.querySelectorAll('.scenario-opt').forEach((b, i) => {
        b.disabled = true;
        if (i === section.correct) b.classList.add('correct');
        else if (i === parseInt(btn.dataset.idx) && !isCorrect) b.classList.add('wrong');
      });
      recordAnswer(isCorrect);
      document.getElementById('scenarioFeedback').innerHTML =
        `<div class="p-feedback ${isCorrect ? 'correct' : 'wrong'}"><i class="fas ${isCorrect ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${section.feedback || (isCorrect ? 'Strong response!' : 'Not the strongest choice.')}</div>`;
      showContinue(isLast);
    });
  });
}

// ─── Lesson Recap Challenge ───
let recapIndex = 0;
let recapTotal = 0;
let recapCorrect = 0;

function renderRecapChallenge(section, body, isLast) {
  const color = SECTION_COLORS.recap;
  const questions = section.questions || [];
  recapIndex = 0;
  recapTotal = questions.length;
  recapCorrect = 0;
  renderRecapQuestion(section, body, isLast, false);
}

function renderRecapQuestion(section, body, isLast, wasWrong) {
  const questions = section.questions || [];
  const q = questions[recapIndex];
  if (!q || wasWrong) return;

  const color = SECTION_COLORS.recap;
  const colorMap = {
    'true-false': '#A78BFA', 'fill-blank': '#FB923C', 'match': '#C084FC',
    'order': '#60A5FA', 'spot-mistake': '#F87171', 'highlight': '#FBBF24',
    'build-argument': '#34D399', 'scenario': '#F472B6', 'quiz': '#34D399'
  };
  const qColor = colorMap[q.type] || color;

  let inner = `
    <div class="recap-counter">Question ${recapIndex + 1} of ${recapTotal}</div>
    <div class="sec-icon" style="background:${qColor}20;color:${qColor};"><i class="${SECTION_ICONS[q.type] || 'fas fa-circle'}"></i></div>
    <div class="sec-title" style="color:${qColor};">${SECTION_LABELS[q.type] || 'Challenge'}</div>`;

  if (q.type === 'true-false') {
    inner += `
      <div class="tf-statement">${esc(q.statement || '')}</div>
      <div class="tf-btns">
        <button class="tf-btn true" data-answer="true"><i class="fas fa-check"></i> True</button>
        <button class="tf-btn false" data-answer="false"><i class="fas fa-times"></i> False</button>
      </div>`;
  } else if (q.type === 'quiz' || q.type === 'spot-mistake' || q.type === 'scenario') {
    const opts = q.options || [];
    inner += `
      ${q.q ? `<div class="q-question" style="margin-bottom:12px;">${esc(q.q)}</div>` : ''}
      ${q.argument ? `<div class="spot-argument" style="margin-bottom:12px;">${esc(q.argument)}</div>` : ''}
      ${q.scenario ? `<div class="scenario-bubble" style="margin-bottom:12px;">${esc(q.scenario)}</div>` : ''}
      ${q.question ? `<div class="sec-instruction" style="margin-bottom:12px;">${esc(q.question)}</div>` : ''}
      <div class="recap-opts">`;
    opts.forEach((opt, i) => {
      inner += `<button class="q-opt recap-opt" data-idx="${i}">${esc(opt)}</button>`;
    });
    inner += `</div>`;
  } else if (q.type === 'fill-blank') {
    const blanks = q.answers || [];
    const allWords = [...blanks, ...(q.distractors || [])].sort(() => Math.random() - 0.5);
    let sentence = q.sentence || '';
    blanks.forEach((_, i) => { sentence = sentence.replace(`{${i}}`, `<span class="fb-slot" data-idx="${i}"></span>`); });
    inner += `
      <div class="fb-sentence" style="margin-bottom:12px;">${sentence}</div>
      <div class="fb-bank" id="recapFbBank" style="margin-bottom:0;">
        ${allWords.map(w => `<button class="fb-word" data-word="${esc(w)}">${esc(w)}</button>`).join('')}
      </div>`;
  } else if (q.type === 'order') {
    const steps = [...(q.steps || [])].sort(() => Math.random() - 0.5);
    inner += `
      <div class="order-list" id="recapOrderList">
        ${steps.map((s, i) => `<div class="order-item" draggable="true" data-text="${esc(s)}"><span class="order-handle"><i class="fas fa-grip-vertical"></i></span><span class="order-text">${esc(s)}</span></div>`).join('')}
      </div>`;
  }

  inner += `<div class="recap-feedback" id="recapFeedback"></div>`;

  body.innerHTML = `<div class="sec-recap">${inner}</div>`;

  recapTotal = questions.length;

  if (q.type === 'true-false') {
    body.querySelectorAll('.tf-btn').forEach(btn => {
      btn.addEventListener('click', () => handleRecapAnswer(String(q.answer) === btn.dataset.answer, body, section, isLast));
    });
  } else if (q.type === 'quiz' || q.type === 'spot-mistake' || q.type === 'scenario') {
    body.querySelectorAll('.recap-opt').forEach(btn => {
      btn.addEventListener('click', () => handleRecapAnswer(parseInt(btn.dataset.idx) === q.correct, body, section, isLast));
    });
  } else if (q.type === 'fill-blank') {
    const slots = body.querySelectorAll('.fb-slot');
    const words = body.querySelectorAll('.fb-word');
    const placed = {};
    words.forEach(btn => {
      btn.addEventListener('click', () => {
        if (answerLocked) return;
        const word = btn.dataset.word;
        const firstEmpty = Array.from(slots).find(s => !s.dataset.filled);
        if (!firstEmpty) return;
        firstEmpty.textContent = word;
        firstEmpty.dataset.filled = 'true';
        btn.style.display = 'none';
        const allFilled = Array.from(slots).every(s => s.dataset.filled);
        if (allFilled) {
          const userAnswers = Array.from(slots).map(s => s.textContent.trim().toLowerCase());
          const isCorrect = userAnswers.every((a, i) => a === (q.answers || [])[i].toLowerCase());
          handleRecapAnswer(isCorrect, body, section, isLast);
        }
      });
    });
    slots.forEach(slot => {
      slot.addEventListener('click', () => {
        if (answerLocked || !slot.dataset.filled) return;
        const word = slot.textContent.trim();
        slot.textContent = '';
        delete slot.dataset.filled;
        const btn = Array.from(words).find(b => b.dataset.word === word && b.style.display === 'none');
        if (btn) btn.style.display = '';
        delete placed[slot.dataset.idx];
      });
    });
  } else if (q.type === 'order') {
    const list = document.getElementById('recapOrderList');
    if (list) {
      let dragSrc = null;
      function checkRecapOrder() {
        if (answerLocked) return;
        const correct = q.steps || [];
        const user = Array.from(list.children).map(el => el.dataset.text);
        if (user.every((t, i) => t === correct[i])) {
          Array.from(list.children).forEach(el => el.draggable = false);
          handleRecapAnswer(true, body, section, isLast);
        }
      }
      list.addEventListener('dragstart', e => {
        dragSrc = e.target.closest('.order-item');
        if (!dragSrc || answerLocked) { e.preventDefault(); return; }
        dragSrc.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
      });
      list.addEventListener('dragend', e => {
        const item = e.target.closest('.order-item');
        if (item) item.classList.remove('dragging');
        list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        dragSrc = null;
      });
      list.addEventListener('dragover', e => {
        if (answerLocked) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      list.addEventListener('drop', e => {
        e.preventDefault();
        if (answerLocked || !dragSrc) return;
        const target = e.target.closest('.order-item');
        if (!target || target === dragSrc) return;
        const rect = target.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY > midY) {
          target.parentNode.insertBefore(dragSrc, target.nextSibling);
        } else {
          target.parentNode.insertBefore(dragSrc, target);
        }
        list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        checkRecapOrder();
      });

      // Touch drag support for mobile
      let touchDragEl = null;
      let touchClone = null;
      let touchOffsetY = 0;
      let touchTarget = null;

      list.addEventListener('touchstart', e => {
        if (answerLocked) return;
        const item = e.target.closest('.order-item');
        if (!item) return;
        touchDragEl = item;
        const touch = e.touches[0];
        const rect = item.getBoundingClientRect();
        touchOffsetY = touch.clientY - rect.top;

        touchClone = item.cloneNode(true);
        touchClone.classList.add('touch-clone');
        touchClone.style.cssText = 'position:fixed;z-index:10000;pointer-events:none;transition:none;transform:scale(1.03);box-shadow:0 8px 32px rgba(0,0,0,0.3);opacity:0.95;width:' + rect.width + 'px;left:' + rect.left + 'px;top:' + rect.top + 'px;';
        document.body.appendChild(touchClone);

        touchDragEl.classList.add('dragging');
        e.preventDefault();
      }, { passive: false });

      list.addEventListener('touchmove', e => {
        if (!touchDragEl || !touchClone) return;
        e.preventDefault();
        const touch = e.touches[0];
        touchClone.style.top = (touch.clientY - touchOffsetY) + 'px';

        const items = Array.from(list.querySelectorAll('.order-item'));
        list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        touchTarget = null;

        for (const item of items) {
          if (item === touchDragEl) continue;
          const rect = item.getBoundingClientRect();
          if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
            touchTarget = item;
            item.classList.add('drag-over');
            break;
          }
        }
      }, { passive: false });

      list.addEventListener('touchend', e => {
        if (!touchDragEl || !touchClone) return;

        if (touchTarget && touchTarget !== touchDragEl) {
          const rect = touchTarget.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const touch = e.changedTouches[0];
          if (touch.clientY > midY) {
            touchTarget.parentNode.insertBefore(touchDragEl, touchTarget.nextSibling);
          } else {
            touchTarget.parentNode.insertBefore(touchDragEl, touchTarget);
          }
          checkRecapOrder();
        }

        touchDragEl.classList.remove('dragging');
        list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

        const clone = touchClone;
        clone.style.transition = 'all 0.2s cubic-bezier(0.16,1,0.3,1)';
        clone.style.transform = 'scale(1)';
        clone.style.opacity = '0';
        setTimeout(() => { if (clone.parentNode) clone.remove(); }, 200);

        touchDragEl = null;
        touchClone = null;
        touchTarget = null;
      });
    }
  }
}

function handleRecapAnswer(isCorrect, body, section, isLast) {
  if (answerLocked) return;
  answerLocked = true;
  recapCorrect += isCorrect ? 1 : 0;
  recordAnswer(isCorrect);
  recordSectionAnswer(activeSectionIndex, 'recap', { recapIndex, isCorrect });

  showMascot();
  if (isCorrect) {
    celebrateCorrect();
  } else {
    reactWrong();
  }

  const fb = document.getElementById('recapFeedback');
  const q = section.questions?.[recapIndex];
  fb.innerHTML = `<div class="p-feedback ${isCorrect ? 'correct' : 'wrong'}"><i class="fas ${isCorrect ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${q?.feedback || (isCorrect ? 'Correct!' : 'Not quite.')}</div>`;
  fb.scrollIntoView({ behavior: 'smooth', block: 'center' });

  recapIndex++;
  if (recapIndex >= (section.questions || []).length) {
    renderDots();
    document.getElementById('btnNext').style.display = 'inline-flex';
    document.getElementById('btnNext').innerHTML = 'See Results <i class="fas fa-star"></i>';
    document.getElementById('btnNext').onclick = showCompletion;
  } else {
    setTimeout(() => {
      answerLocked = false;
      renderRecapQuestion(section, body, isLast, false);
    }, 900);
  }
}

function recordAnswer(isCorrect) {
  quizTotal++;
  if (isCorrect) quizCorrect++;
}

function recordSectionAnswer(sectionIndex, type, answerData) {
  sectionAnswers[sectionIndex] = { type, ...answerData };
}

function saveLessonProgress() {
  if (!activeLesson) return;
  state.currentLesson = {
    id: activeLesson,
    sectionIndex: activeSectionIndex,
    quizCorrect,
    quizTotal,
    quizStreak,
    practiceCorrect,
    answers: { ...sectionAnswers }
  };
  saveState();
}

function clearLessonProgress() {
  state.currentLesson = null;
  sectionAnswers = {};
}

function fastForwardToSection(targetIndex) {
  const lesson = LESSONS[activeLesson];
  if (!lesson) return;
  while (activeSectionIndex < targetIndex) {
    const section = lesson.sections[activeSectionIndex];
    const saved = sectionAnswers[activeSectionIndex];
    if (isExerciseType(section.type) && saved) {
      quizTotal++;
      if (section.type === 'quiz' || section.type === 'practice' ||
          section.type === 'true-false' || section.type === 'scenario' ||
          section.type === 'spot-mistake' || section.type === 'highlight') {
        const isCorrect = saved.selected === section.correct;
        if (isCorrect) quizCorrect++;
        if (section.type === 'practice') {
          if (isCorrect) practiceCorrect++;
        }
        if (section.timeLimit) {
          state.timedQuizzes = state.timedQuizzes || [];
          state.timedQuizzes.push({ lessonId: activeLesson, correct: isCorrect ? 1 : 0, total: 1, expired: false });
        }
      } else if (section.type === 'fill-blank' || section.type === 'match' ||
                 section.type === 'order' || section.type === 'build-argument') {
        if (saved.isCorrect) quizCorrect++;
      }
    } else if (section.type === 'recap') {
      /* recap sections are skipped on resume — too complex to replay multi-question recap */
    }
    activeSectionIndex++;
  }
}

function showRetry() {
  const nextBtn = document.getElementById('btnNext');
  nextBtn.style.display = 'inline-flex';
  nextBtn.innerHTML = 'Try Again <i class="fas fa-redo"></i>';
  nextBtn.onclick = () => {
    activeSectionIndex = activeSectionIndex;
    renderSection();
  };
}

const EXERCISE_TYPES = ['quiz', 'practice', 'fill-blank', 'match', 'order', 'spot-mistake', 'highlight', 'build-argument', 'true-false', 'scenario'];

function isExerciseType(type) {
  return EXERCISE_TYPES.includes(type);
}

function getQuizCount() {
  const lesson = LESSONS[activeLesson];
  if (!lesson) return 0;
  return lesson.sections.filter(s => isExerciseType(s.type)).length;
}

function handlePractice(idx, section) {
  if (answerLocked) return;
  answerLocked = true;
  clearInterval(window.__quizTimer);

  const isCorrect = idx === section.correct;
  recordSectionAnswer(activeSectionIndex, 'practice', { selected: idx, isCorrect });
  const hadTimer = (section.timeLimit || 0) > 0;
  if (hadTimer) {
    if (!state.timedQuizzes) state.timedQuizzes = [];
    state.timedQuizzes.push({ lessonId: activeLesson, correct: isCorrect ? 1 : 0, total: 1, expired: false });
  }

  if (isCorrect) {
    practiceCorrect++;
    quizStreak++;
    showMascot();
    celebrateCorrect();
    if (quizStreak === 3) celebrateStreak3();
  } else {
    quizStreak = 0;
    showMascot();
    reactWrong();
  }

  const opts = document.querySelectorAll('.p-opt');
  opts.forEach((btn, i) => {
    btn.disabled = true;
    if (i === section.correct) btn.classList.add('correct');
    else if (i === idx && !isCorrect) btn.classList.add('wrong');
  });

  document.getElementById('pFeedback').innerHTML =
    `<div class="p-feedback ${isCorrect ? 'correct' : 'wrong'}">
      <i class="fas ${isCorrect ? 'fa-check-circle' : 'fa-times-circle'}"></i>
      ${section.feedback}
    </div>`;
  document.getElementById('pFeedback').scrollIntoView({ behavior: 'smooth', block: 'center' });

  const isLast = activeSectionIndex >= LESSONS[activeLesson].sections.length - 1;
  showContinue(isLast);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function handleQuizTimeout(section) {
  if (answerLocked) return;
  answerLocked = true;
  clearInterval(window.__quizTimer);
  recordSectionAnswer(activeSectionIndex, 'quiz', { selected: -1, isCorrect: false });
  if (!state.timedQuizzes) state.timedQuizzes = [];
  state.timedQuizzes.push({ lessonId: activeLesson, correct: 0, total: 1, expired: true });
  const opts = document.querySelectorAll('.q-opt');
  opts.forEach(btn => { btn.disabled = true; });
  document.getElementById('qExplain').innerHTML =
    `<div class="q-explain wrong"><i class="fas fa-hourglass-end"></i> Time's up!</div>`;
  showMascot();
  reactWrong();
  renderDots();
  const isLast = activeSectionIndex >= LESSONS[activeLesson].sections.length - 1;
  showContinue(isLast);
}

function handlePracticeTimeout(section) {
  if (answerLocked) return;
  answerLocked = true;
  clearInterval(window.__quizTimer);
  recordSectionAnswer(activeSectionIndex, 'practice', { selected: -1, isCorrect: false });
  if (!state.timedQuizzes) state.timedQuizzes = [];
  state.timedQuizzes.push({ lessonId: activeLesson, correct: 0, total: 1, expired: true });
  const opts = document.querySelectorAll('.p-opt');
  opts.forEach(btn => { btn.disabled = true; });
  document.getElementById('pFeedback').innerHTML =
    `<div class="p-feedback wrong"><i class="fas fa-hourglass-end"></i> Time's up!</div>`;
  document.getElementById('pFeedback').scrollIntoView({ behavior: 'smooth', block: 'center' });
  showMascot();
  reactWrong();
  renderDots();
  const isLast = activeSectionIndex >= LESSONS[activeLesson].sections.length - 1;
  showContinue(isLast);
}

function handleTrueFalseTimeout(section) {
  if (answerLocked) return;
  answerLocked = true;
  clearInterval(window.__quizTimer);
  recordSectionAnswer(activeSectionIndex, 'true-false', { selected: null, isCorrect: false });
  if (!state.timedQuizzes) state.timedQuizzes = [];
  state.timedQuizzes.push({ lessonId: activeLesson, correct: 0, total: 1, expired: true });
  document.getElementById('tfFeedback').innerHTML =
    `<div class="p-feedback wrong"><i class="fas fa-hourglass-end"></i> Time's up!</div>`;
  showMascot();
  reactWrong();
  renderDots();
  const isLast = activeSectionIndex >= LESSONS[activeLesson].sections.length - 1;
  showContinue(isLast);
}

function handleQuiz(idx, section) {
  if (answerLocked) return;
  answerLocked = true;
  clearInterval(window.__quizTimer);

  const isCorrect = idx === section.correct;
  recordSectionAnswer(activeSectionIndex, 'quiz', { selected: idx, isCorrect });
  const hadTimer = (section.timeLimit || 0) > 0;
  if (hadTimer) {
    if (!state.timedQuizzes) state.timedQuizzes = [];
    state.timedQuizzes.push({ lessonId: activeLesson, correct: isCorrect ? 1 : 0, total: 1, expired: false });
  }

  quizTotal++;
  if (isCorrect) {
    quizCorrect++;
    quizStreak++;
    showMascot();
    celebrateCorrect();
    if (quizStreak === 3) celebrateStreak3();
  } else {
    quizStreak = 0;
    showMascot();
    reactWrong();
  }

  const opts = document.querySelectorAll('.q-opt');
  opts.forEach((btn, i) => {
    btn.disabled = true;
    if (i === section.correct) btn.classList.add('correct');
    else if (i === idx && !isCorrect) btn.classList.add('wrong');
  });

  if (section.explain) {
    document.getElementById('qExplain').innerHTML =
      `<div class="q-explain">${isCorrect ? '<i class="fas fa-check-circle"></i> ' : '<i class="fas fa-times-circle"></i> '}${section.explain}</div>`;
    document.getElementById('qExplain').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  renderDots();

  const isLast = activeSectionIndex >= LESSONS[activeLesson].sections.length - 1;
  showContinue(isLast);
}

function showContinue(isLast, sectionType) {
  const nextBtn = document.getElementById('btnNext');
  nextBtn.style.display = 'inline-flex';
  if (isLast) {
    nextBtn.innerHTML = 'See Results <i class="fas fa-star"></i>';
  } else {
    nextBtn.innerHTML = 'Continue <i class="fas fa-arrow-right"></i>';
  }
  nextBtn.onclick = () => {
    if (isLast) {
      showCompletion();
    } else {
      activeSectionIndex++;
      if (sectionType === 'learn' || sectionType === 'example') celebrateModule();
      renderSection();
    }
  };
}

function renderDots() {
  const lesson = LESSONS[activeLesson];
  if (!lesson) return;
  const container = document.getElementById('modalDots');
  const quizSections = lesson.sections.filter(s => isExerciseType(s.type));
  const qCount = quizSections.length;
  container.innerHTML = quizSections.map((sec, i) => {
    let cls = 'modal-dot';
    if (i < quizTotal) cls += ' answered';
    if (i === quizTotal && i < qCount && isExerciseType(lesson.sections[activeSectionIndex]?.type)) cls += ' active';
    return `<span class="${cls}"></span>`;
  }).join('');
}

/* ═══════════════════════════════════════════════
   COMPLETION
   ═══════════════════════════════════════════════ */

async function showCompletion() {
  const lesson = LESSONS[activeLesson];
  if (!lesson) return;
  const savedAnswers = { ...sectionAnswers };
  clearLessonProgress();
  showMascot();

  const totalQ = quizTotal;
  const xpEarned = totalQ > 0 ? Math.round((quizCorrect / totalQ) * lesson.xp) : lesson.xp;
  const wasAlreadyDone = completedLessonSet.has(activeLesson);
  let newAchievements = [];
  let xpAwarded = xpEarned;

  if (!wasAlreadyDone) {
    state.totalXP = (state.totalXP || 0) + xpEarned;
    state.completedLessons.push(activeLesson);
    completedLessonSet.add(activeLesson);
    const today = getLocalToday();
    state.dailyLessonsCompleted = (state.dailyLessonsCompleted || 0) + 1;
    state.lastLessonDate = today;
    state.lessonScores[activeLesson] = { correct: quizCorrect, total: totalQ, xp: xpEarned };
    state.todayXP = (state.todayXP || 0) + xpEarned;
    const ptsEarned = ACTIVITY_POINTS.lesson + ACTIVITY_POINTS.quiz;
    state.activityPoints = (state.activityPoints || 0) + ptsEarned;
    const lessonEntry = makeHistoryEntry(ptsEarned, "lesson", `Lesson: ${lesson.title}`);
    showToast(`+${ptsEarned} <span class="gem-icon gem-icon--sm"></span> (lesson + quiz)`, 'xp');
    updateStreak();
    if ([7, 30, 100].includes(state.streak)) {
      setTimeout(() => celebrateStreakMilestone(state.streak), 1200);
    }
    const isFirstLesson = state.completedLessons.length === 1;
    if (isFirstLesson) firstLesson(lesson.title);
    else lessonDone(lesson.title);
    celebrateLesson();

    const nextIdx = ALL_LESSON_IDS.indexOf(activeLesson) + 1;
    if (nextIdx < ALL_LESSON_IDS.length) {
      const nextId = ALL_LESSON_IDS[nextIdx];
      const nextLesson = LESSONS[nextId];
      const nextUnit = UNITS.find(u => u.id === nextLesson.unit);
      state.lastLesson = { id: nextId, title: nextLesson.title, unit: nextUnit ? nextUnit.title : '' };
    } else {
      state.lastLesson = null;
    }

    await saveState([lessonEntry]);
    newAchievements = checkNewAchievements();
    const perfectAchievement = getPerfectScoreAchievement(activeLesson);
    if (perfectAchievement && !newAchievements.find(a => a.id === 'perfect-score')) {
      newAchievements.push(perfectAchievement);
    }
    if (newAchievements.length > 0) await saveState();
    fireConfetti();
    showToast(`+${xpEarned} <span class="gem-icon gem-icon--sm"></span>`, 'xp');
    if (newAchievements.length > 0) {
      setTimeout(() => {
        for (const a of newAchievements) {
          showAchievementCelebration(a, state.nickName || state.fullName || "Debater");
          badge(a.label);
        }
      }, 600);
    }
  } else {
    xpAwarded = 0;
  }

  const totalSections = (LESSONS[activeLesson]?.sections || []).length;
  const totalCorrect = quizCorrect + practiceCorrect;
  const wasPerfect = quizTotal > 0 && quizCorrect === quizTotal;

  if (!wasAlreadyDone) {
    updateQuestProgress('lesson-completed', 0);
    updateQuestProgress('xp-earned', xpAwarded);
    if (state.streak >= 1) updateQuestProgress('maintain-streak', 1);
    updateQuestProgress('streak-3-lessons', 1);
    if (wasPerfect) updateQuestProgress('perfect-quiz', 0);
    if (wasPerfect) updateQuestProgress('perfect-lesson', 0);
    if (totalSections >= 6) updateQuestProgress('section-count-6', 0);
    if (totalSections >= 8) updateQuestProgress('three-sections', 0);
    if (totalSections >= 10) updateQuestProgress('section-count-10', 0);
    updateQuestProgress('first-completion', 0);
    updateQuestProgress('two-practices', practiceCorrect);
    updateQuestProgress('six-practices', practiceCorrect);
    updateQuestProgress('correct-6', totalCorrect);
    updateQuestProgress('correct-15', totalCorrect);
    updateQuestProgress('correct-25', totalCorrect);
    await saveState();
  }

  setTimeout(() => renderCompletionScreen(xpAwarded, quizCorrect, totalQ, newAchievements, wasAlreadyDone, savedAnswers), 0);
}

function buildWrongAnswers(lesson, answers) {
  if (!lesson || !answers) return [];
  const wrong = [];
  lesson.sections.forEach((section, i) => {
    const answer = answers[i];
    if (!answer || answer.isCorrect) return;
    if (!EXERCISE_TYPES.includes(section.type) && section.type !== 'recap') return;
    let questionText = '';
    let userAnswerText = '';
    let correctAnswerText = '';
    let explanation = '';
    const options = section.options || [];
    switch (section.type) {
      case 'quiz':
        questionText = section.q || '';
        userAnswerText = options[answer.selected] || `Option ${answer.selected + 1}`;
        correctAnswerText = options[section.correct] || `Option ${section.correct + 1}`;
        explanation = section.explain || section.feedback || '';
        break;
      case 'practice':
        questionText = section.instruction || section.q || '';
        userAnswerText = options[answer.selected] || `Option ${answer.selected + 1}`;
        correctAnswerText = options[section.correct] || `Option ${section.correct + 1}`;
        explanation = section.feedback || '';
        break;
      case 'true-false':
        questionText = section.statement || '';
        userAnswerText = answer.selected === true ? 'True' : answer.selected === false ? 'False' : 'Timed out';
        correctAnswerText = section.answer ? 'True' : 'False';
        explanation = section.feedback || '';
        break;
      case 'scenario':
        questionText = (section.scenario || '') + ' ' + (section.question || '');
        userAnswerText = options[answer.selected] || `Option ${answer.selected + 1}`;
        correctAnswerText = options[section.correct] || `Option ${section.correct + 1}`;
        explanation = section.feedback || '';
        break;
      case 'spot-mistake':
        questionText = section.instruction || 'Spot the mistake:';
        userAnswerText = options[answer.selected] || `Option ${answer.selected + 1}`;
        correctAnswerText = options[section.correct] || `Option ${section.correct + 1}`;
        explanation = section.feedback || '';
        break;
      case 'highlight':
        questionText = section.instruction || 'Highlight the correct part:';
        userAnswerText = 'Wrong segment selected';
        correctAnswerText = 'Correct segment';
        explanation = section.feedback || '';
        break;
      case 'fill-blank':
        questionText = section.sentence || section.instruction || '';
        userAnswerText = (answer.filled || []).join(', ');
        correctAnswerText = (section.answers || []).join(', ');
        explanation = section.feedback || '';
        break;
      case 'match':
        questionText = 'Match the pairs';
        userAnswerText = 'Some pairs were incorrect';
        correctAnswerText = 'All pairs matched correctly';
        explanation = section.feedback || '';
        break;
      case 'order':
        questionText = 'Put the steps in order';
        userAnswerText = 'Incorrect order';
        correctAnswerText = 'Correct order shown in lesson';
        explanation = section.feedback || '';
        break;
      case 'build-argument':
        questionText = 'Build the argument';
        userAnswerText = 'Some cards in wrong category';
        correctAnswerText = 'All cards in correct categories';
        explanation = section.feedback || '';
        break;
      default:
        return;
    }
    wrong.push({ questionText, userAnswerText, correctAnswerText, explanation, type: section.type });
  });
  return wrong;
}

function renderCompletionScreen(xpEarned, correct, total, newAchievements, wasRepeat, savedAnswers) {
  const pct = total > 0 ? Math.round(correct / total * 100) : 100;
  const lesson = LESSONS[activeLesson];

  let faIcon, title, titleColor;
  if (pct === 100) { faIcon = 'fas fa-star'; title = 'Perfect Score!'; titleColor = '#FBBF24'; }
  else if (pct >= 80) { faIcon = 'fas fa-thumbs-up'; title = 'Great Job!'; titleColor = '#34D399'; }
  else if (pct >= 60) { faIcon = 'fas fa-check'; title = 'Good Effort!'; titleColor = '#3ABEFF'; }
  else { faIcon = 'fas fa-book'; title = 'Keep Practicing!'; titleColor = '#9CA3AF'; }

  const ptsEarned = (!wasRepeat && xpEarned > 0) ? ACTIVITY_POINTS.lesson + ACTIVITY_POINTS.quiz : 0;
  const confPts = (userConferences || []).length * 15;
  const awardPts = (userAwards || []).reduce((sum, a) => sum + awardPointsFor(a), 0);
  const before = getLevelFromPoints((state.activityPoints || 0) - ptsEarned + confPts + awardPts);
  const after = getLevelFromPoints((state.activityPoints || 0) + confPts + awardPts);
  const leveledUp = after > before;

  const nextIdx = ALL_LESSON_IDS.indexOf(activeLesson) + 1;
  const hasNext = nextIdx < ALL_LESSON_IDS.length;

  let updatesHtml = '';
  const updates = [];
  if (xpEarned > 0) {
    updates.push({ icon: 'fas fa-fire', label: `${state.streak}-day streak`, cls: 'streak' });
    if (leveledUp) {
      updates.push({ icon: 'fas fa-arrow-up', label: `Level ${after} &middot; ${getLevelName(after)}`, cls: 'levelup' });
      setTimeout(() => celebrateLevelUp(after, getLevelName(after)), 600);
    }
    for (const a of newAchievements) {
      updates.push({ icon: a.icon, label: a.label, cls: 'achievement', badgeId: a.id });
    }
  }
  updatesHtml = updates.map(u => `
    <div class="comp-chip comp-chip--${u.cls}">
      <i class="${u.icon}"></i>
      <span>${u.label}</span>
      ${u.badgeId ? `<button class="comp-chip-share" data-badge-id="${u.badgeId}" title="Share"><i class="fas fa-share-alt"></i></button>` : ''}
    </div>
  `).join('');

  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (pct / 100) * circumference;

  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div class="completion">
      <div class="comp-header">
        <div class="comp-ring-wrap">
          <svg class="comp-ring" viewBox="0 0 100 100">
            <circle class="comp-ring-bg" cx="50" cy="50" r="42" fill="none" stroke-width="6"/>
            <circle class="comp-ring-fill" cx="50" cy="50" r="42" fill="none" stroke-width="6"
              stroke="${titleColor}" stroke-dasharray="${circumference}"
              stroke-dashoffset="${circumference}" stroke-linecap="round"
              transform="rotate(-90 50 50)"/>
          </svg>
          <span class="comp-ring-icon" style="color:${titleColor}"><i class="${faIcon}"></i></span>
        </div>
        <div class="comp-title" style="color:${titleColor}">${title}</div>
        <div class="comp-sub">${lesson.title}${wasRepeat ? ' <span class="comp-review">(review)</span>' : ''}</div>
      </div>

      <div class="comp-score-area">
        ${total > 0 ? `
          <div class="comp-score-num">${correct}<span class="comp-score-total">/${total}</span></div>
          <div class="comp-score-label">correct</div>
        ` : '<div class="comp-score-num">&#10003;<div class="comp-score-label">completed</div></div>'}
      </div>

      ${!wasRepeat && xpEarned > 0 ? `
        <div class="comp-xp-display" id="comp-xp-display">
          <span class="comp-xp-num" id="comp-xp-num">0</span>
          <span class="comp-xp-label">XP earned</span>
        </div>
      ` : ''}

      ${updatesHtml ? `<div class="comp-chips">${updatesHtml}</div>` : ''}

      ${(() => {
        const wrongAnswers = buildWrongAnswers(lesson, savedAnswers);
        if (wrongAnswers.length === 0) return '';
        return `
        <div class="review-section">
          <button class="review-toggle" id="reviewToggle">
            <i class="fas fa-clipboard-list"></i> Review Wrong Answers (${wrongAnswers.length})
            <i class="fas fa-chevron-down review-chevron"></i>
          </button>
          <div class="review-list" id="reviewList" style="display:none;">
            ${wrongAnswers.map((w, i) => `
              <div class="review-card">
                <div class="review-card-header">
                  <span class="review-type-badge">${esc(w.type.replace('-', ' '))}</span>
                  <span class="review-q-num">Q${i + 1}</span>
                </div>
                <div class="review-question">${esc(w.questionText)}</div>
                <div class="review-answers">
                  <div class="review-answer-row review-user-wrong">
                    <i class="fas fa-times-circle"></i>
                    <span>Your answer: <strong>${esc(w.userAnswerText)}</strong></span>
                  </div>
                  <div class="review-answer-row review-correct">
                    <i class="fas fa-check-circle"></i>
                    <span>Correct: <strong>${esc(w.correctAnswerText)}</strong></span>
                  </div>
                </div>
                ${w.explanation ? `<div class="review-explanation"><i class="fas fa-lightbulb"></i> ${esc(w.explanation)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>`;
      })()}

      <div class="comp-actions">
        ${hasNext && lesson && !wasRepeat ? `<button class="btn-next-lesson" id="btnNextLesson"><i class="fas fa-arrow-right"></i> Next Lesson</button>` : ''}
        ${(() => {
          const wrongAnswers = buildWrongAnswers(lesson, savedAnswers);
          if (wrongAnswers.length === 0) return '';
          return `<button class="btn-review-page" id="btnReviewPage"><i class="fas fa-clipboard-list"></i> Full Review</button>`;
        })()}
        <button class="btn-continue" id="btnContinue">${hasNext ? 'Back to Course' : 'Finish'}</button>
      </div>
    </div>
  `;

  document.getElementById('modalDots').innerHTML = '';
  document.getElementById('btnNext').style.display = 'none';
  document.getElementById('phaseIndicator').innerHTML = '';

  // Animate ring
  requestAnimationFrame(() => {
    const ring = body.querySelector('.comp-ring-fill');
    if (ring) ring.style.strokeDashoffset = offset;
  });

  // Animate XP counter
  if (xpEarned > 0) {
    const xpEl = document.getElementById('comp-xp-num');
    if (xpEl) animateCounter(xpEl, 0, xpEarned, 800);
  }

  // Button handlers
  document.getElementById('btnContinue').addEventListener('click', closeModal);
  const nextBtn = document.getElementById('btnNextLesson');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const nextId = ALL_LESSON_IDS[nextIdx];
      if (nextId && LESSONS[nextId]) {
        closeModal();
        setTimeout(() => openLesson(nextId), 300);
      }
    });
  }

  // Review toggle
  const reviewToggle = document.getElementById('reviewToggle');
  const reviewList = document.getElementById('reviewList');
  if (reviewToggle && reviewList) {
    reviewToggle.addEventListener('click', () => {
      const isOpen = reviewList.style.display !== 'none';
      reviewList.style.display = isOpen ? 'none' : 'block';
      const chevron = reviewToggle.querySelector('.review-chevron');
      if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
    });
  }

  // Full Review button — save wrong answers to localStorage then navigate
  const reviewPageBtn = document.getElementById('btnReviewPage');
  if (reviewPageBtn) {
    reviewPageBtn.addEventListener('click', () => {
      try {
        const wrongAnswers = buildWrongAnswers(lesson, savedAnswers);
        localStorage.setItem('deb8er_lesson_review', JSON.stringify({
          lessonTitle: lesson.title,
          correct,
          total,
          xpEarned,
          wrongAnswers,
          timestamp: Date.now()
        }));
      } catch (_) {}
      window.location.href = 'review.html';
    });
  }

  // Badge share buttons
  body.querySelectorAll('.comp-chip-share').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const badge = BADGE_MAP[btn.dataset.badgeId];
      if (badge) showBadgeShareModal(badge, state.nickName || state.fullName || 'A Deb8er');
    });
  });
}

function animateCounter(el, from, to, duration) {
  const start = performance.now();
  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function fireConfetti() {
  const rect = document.querySelector('.modal-card').getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;

  loadConfetti().then(fn => {
    if (typeof fn !== 'function') return;
    fn({ particleCount: 80, spread: 70, origin: { x, y }, colors: ['#3ABEFF', '#a68af9', '#22d3ee', '#34D399'] });
    setTimeout(() => fn({ particleCount: 40, spread: 100, origin: { x, y: y - 0.1 }, colors: ['#3ABEFF', '#22d3ee'] }), 200);
  });
}

function closeModal() {
  clearInterval(window.__quizTimer);
  stopTips();
  if (activeLesson && !completedLessonSet.has(activeLesson)) {
    saveLessonProgress();
  }
  document.getElementById('lessonModal').classList.remove('open');
  document.body.style.overflow = '';
  document.getElementById('phaseIndicator').innerHTML = '';
  activeLesson = null;
  activeSectionIndex = 0;
  quizCorrect = 0;
  quizTotal = 0;
  quizStreak = 0;
  practiceCorrect = 0;
  sectionAnswers = {};
  render();
}
window.closeModal = closeModal;

/* ═══════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════ */

function showToast(msg, type = 'xp') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = msg;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

/* ═══════════════════════════════════════════════
   MODAL BACKDROP CLOSE
   ═══════════════════════════════════════════════ */

document.getElementById('modalBackdrop').addEventListener('click', closeModal);
document.getElementById('modalClose').addEventListener('click', closeModal);

window.showAchievementCelebration = function(badge, userName) {
  if (!badge) return;

  loadConfetti().then(fn => {
    if (typeof fn !== 'function') return;
    fn({ particleCount: 120, spread: 80, origin: { x: 0.5, y: 0.4 }, colors: ['#3ABEFF', '#a68af9', '#22d3ee', '#34D399'] });
    setTimeout(() => fn({ particleCount: 60, spread: 120, origin: { x: 0.5, y: 0.35 }, colors: ['#3ABEFF', '#FBBF24'] }), 250);
  });

  const overlay = document.createElement('div');
  overlay.className = 'achieve-overlay';
  overlay.innerHTML = `
    <div class="achieve-card">
      <div class="achieve-glow"></div>
      <div class="achieve-icon"><i class="${badge.icon}"></i></div>
      <div class="achieve-label">Achievement Unlocked</div>
      <div class="achieve-name">${badge.label}</div>
      <div class="achieve-desc">${badge.desc}</div>
      <div class="achieve-actions">
        <button class="achieve-share-btn" id="achieve-share-btn"><i class="fas fa-share-alt"></i> Share</button>
        <button class="achieve-close-btn" id="achieve-close-btn">Continue <i class="fas fa-arrow-right"></i></button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  overlay.querySelector('#achieve-close-btn').addEventListener('click', () => {
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 300);
  });

  overlay.querySelector('#achieve-share-btn').addEventListener('click', () => {
    if (typeof showBadgeShareModal === 'function') {
      showBadgeShareModal(badge, userName || 'A Deb8er');
    }
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 300);
    }
  });
};

/* ═══════════════════════════════════════════════
   COPY EMAIL
   ═══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  const emailLink = document.getElementById('copy-email');
  if (emailLink) {
    emailLink.addEventListener('click', (e) => {
      e.preventDefault();
      navigator.clipboard.writeText('hello.deb8er@gmail.com');
      const orig = emailLink.textContent;
      emailLink.textContent = 'Copied!';
      emailLink.style.color = '#3ABEFF';
      setTimeout(() => { emailLink.textContent = orig; emailLink.style.color = ''; }, 1500);
    });
  }
});
  