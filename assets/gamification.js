/* ══════════════════════════════════════════════
   Deb8er Gamification — Levels, Badges, Quests
   ══════════════════════════════════════════════ */

/* ─── Referral ─── */
const REFERRAL_POINTS = 50;
const REFERRER_POINTS = 100;

/* ─── Point History ─── */
function makeHistoryEntry(amount, type, label, customTimestamp) {
  return {
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    amount,
    type,
    label,
    timestamp: customTimestamp || Date.now()
  };
}

/* ─── Levels ─── */
const LEVEL_TITLES = {
  1:  'Beginner',
  5:  'Bronze Speaker',
  10: 'Silver Speaker',
  20: 'Gold Speaker',
  25: 'Advanced Speaker',
  35: 'Diamond Speaker',
  50: 'Debate Legend'
};

function getLevelTitle(level) {
  const keys = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => b - a);
  for (const k of keys) {
    if (level >= k) return LEVEL_TITLES[k];
  }
  return 'Beginner';
}

function getLevel(xp) {
  return Math.floor(xp / 100) + 1;
}

function getLevelProgress(xp) {
  return xp % 100;
}

function xpToNextLevel(xp) {
  return 100 - getLevelProgress(xp);
}

/* ─── Badges ─── */
const BADGES = [
  { id: 'perfect-score',       label: 'Perfect Score',        desc: 'Score 100% on any quiz',                                              icon: 'fas fa-check-circle',    hidden: false, unlock: 'Flawless victory — ace any quiz with a perfect score!' },
  { id: 'lesson-master',       label: 'Lesson Master',        desc: 'Complete every course lesson',                                       icon: 'fas fa-trophy',          hidden: false, unlock: 'Every lesson conquered — you\'re a true master!' },
  { id: 'first-lesson',        label: 'First Lesson',         desc: 'Finish your first lesson',                                           icon: 'fas fa-star',            hidden: false, unlock: 'The journey begins — complete your very first lesson!' },
  { id: 'first-steps',         label: 'First Steps',          desc: 'Create your account and complete onboarding',                         icon: 'fas fa-flag',            hidden: false, unlock: 'Welcome to Deb8er — your debate journey starts now!' },
  { id: 'streak-7',            label: '7 Day Streak',         desc: 'Stay active for 7 days',                                             icon: 'fas fa-fire',            hidden: false, unlock: 'One full week of learning — you\'re on fire!' },
  { id: 'streak-30',           label: '30 Day Streak',        desc: 'Stay active for 30 days',                                            icon: 'fas fa-crown',           hidden: false,  unlock: 'A whole month! Only the dedicated make it this far.' },
  { id: 'debate-beginner',     label: 'Debate Beginner',      desc: 'Complete your first debate lesson',                                  icon: 'fas fa-gavel',           hidden: false, unlock: 'Step into the ring — complete your first debate lesson!' },
  { id: 'rebuttal-master',     label: 'Rebuttal Master',      desc: 'Master all rebuttal lessons',                                        icon: 'fas fa-hand-fist',       hidden: false, unlock: 'They speak, you rebut — perfect every counter-argument!' },
  { id: 'logic-master',        label: 'Logic Master',         desc: 'Score 90%+ in logic lessons',                                        icon: 'fas fa-brain',           hidden: false, unlock: 'Sharp mind, sharper arguments — dominate logic lessons!' },
  { id: 'quick-thinker',       label: 'Quick Thinker',        desc: 'Finish a timed quiz with 90%+',                                      icon: 'fas fa-bolt',            hidden: false, unlock: 'Fast thinker, faster talker — ace a timed challenge!' },
  { id: 'accuracy-ace',        label: 'Accuracy Ace',         desc: 'Score 95%+ on 10 separate quizzes',                                  icon: 'fas fa-bullseye',        hidden: false, unlock: 'Precision personified — hit 95%+ on 10 quizzes!' },
  { id: 'research-expert',     label: 'Research Expert',      desc: 'Complete all research lessons',                                      icon: 'fas fa-book',            hidden: false, unlock: 'Deep dive — master every research lesson!' },
  { id: 'quiz-conqueror',      label: 'Quiz Conqueror',       desc: 'Complete 30 quizzes',                                                icon: 'fas fa-layer-group',     hidden: true,  unlock: '30 quizzes conquered — your knowledge knows no bounds!' },
  { id: 'global-debater',      label: 'Global Debater',       desc: 'Join an international debate or MUN conference',                      icon: 'fas fa-globe',           hidden: false, unlock: 'Taking it global — attend your first international conference!' },
  { id: 'top-10',              label: 'Top 10',               desc: 'Reach the weekly Top 10 leaderboard',                                 icon: 'fas fa-medal',           hidden: false, unlock: 'Elite status — break into the weekly Top 10!' },
  { id: 'top-1',               label: 'Top 1%',               desc: 'Finish in the Top 1% monthly',                                        icon: 'fas fa-trophy',          hidden: true,  unlock: 'The 1% club — you\'re among the best of the best!' },
  { id: 'coin-collector',      label: 'Coin Collector',       desc: 'Earn 10,000 Deb8 Points',                                            icon: 'fas fa-gem',             hidden: true,  unlock: '10,000 points! Your debating empire is growing!' },
  { id: 'speed-demon',         label: 'Speed Demon',          desc: 'Finish 5 timed quizzes without running out of time',                  icon: 'fas fa-rocket',          hidden: true,  unlock: 'Speed meets skill — conquer 5 timed quizzes!' },
  { id: 'referral-star',       label: 'Referral Star',        desc: 'Invite 10 friends who sign up',                                      icon: 'fas fa-user-plus',       hidden: false, unlock: 'Your squad is growing — refer 10 friends!' },
  { id: 'viral-ambassador',    label: 'Viral Ambassador',     desc: 'Invite 50 successful sign-ups',                                      icon: 'fas fa-share-alt',       hidden: true,  unlock: '50 referrals! You\'re spreading debate worldwide!' },
  { id: 'level-25',            label: 'Level 25',             desc: 'Reach Level 25',                                                      icon: 'fas fa-arrow-up',        hidden: false, unlock: 'Level 25 — you\'re climbing the ranks of debate mastery!' },
  { id: 'shard-collector',     label: 'Shard Collector',      desc: 'Collect 6 badge shards from Daily Spin',                              icon: 'fas fa-dragon',          hidden: true,  unlock: 'Luck favours the persistent — collect all 6 shards!' }
];

const BADGE_MAP = {};
for (const b of BADGES) BADGE_MAP[b.id] = b;

const LOGIC_LESSONS = ['first-principles', 'second-order', 'fallacies-part1', 'fallacies-part2', 'socratic-traps', 'framing-effects', 'confirmation-bias', 'misinfo-disinfo'];
const RESEARCH_LESSONS = ['sift-method', 'source-hierarchy', 'confirmation-bias', 'misinfo-disinfo', 'impact-weighing'];
const DEBATE_BEGINNER_LESSONS = ['arest-structure', 'impact-weighing', 'four-step-rebuttal', 'source-hierarchy'];
export const ALL_LESSON_IDS = [
  'taming-stage-fright', 'prep-framework', 'pitch-pace-pauses', 'eradicating-filler-words',
  'open-gestures', 'command-the-floor', 'arest-structure', 'impact-weighing',
  'four-step-rebuttal', 'link-vs-impact-turns', 'socratic-traps', 'fallacies-part1',
  'fallacies-part2', 'source-hierarchy', 'committee-mechanics', 'country-persona',
  'points-motions', 'pois', 'gsl-speech', 'position-paper', 'preambulatory-clauses',
  'operative-clauses', 'sift-method', 'misinfo-disinfo', 'confirmation-bias',
  'framing-effects', 'first-principles', 'second-order'
];

function checkBadgesFromLearning(state, conferences, awards, extras = {}) {
  if (!state) return [];
  const before = new Set(state.achievements || []);
  const earned = [];
  const completed = state.completedLessons || [];
  const totalXP = state.totalXP || 0;
  const streak = state.streak || 0;
  const scores = state.lessonScores || {};
  const activityPoints = state.activityPoints || 0;
  const timedQuizzes = state.timedQuizzes || [];
  const referrals = extras.referrals || [];
  const leaderboardRank = extras.leaderboardRank;
  const totalLeaderboard = extras.totalLeaderboard;

  function tryEarn(id) {
    if (!before.has(id) && BADGE_MAP[id]) {
      earned.push(BADGE_MAP[id]);
      if (!state.achievements) state.achievements = [];
      state.achievements.push(id);
    }
  }

  // First Lesson
  if (completed.length >= 1) tryEarn('first-lesson');

  // First Steps (account + onboarding = first lesson done)
  if (completed.length >= 1 && extras.fullName) tryEarn('first-steps');

  // Streaks
  if (streak >= 7) tryEarn('streak-7');
  if (streak >= 30) tryEarn('streak-30');

  // Debate Beginner — complete any foundation debate lesson
  if (completed.some(id => DEBATE_BEGINNER_LESSONS.includes(id))) tryEarn('debate-beginner');

  // Rebuttal Master — 100% on rebuttals lesson
  if (scores.rebuttals && scores.rebuttals.correct === scores.rebuttals.total) tryEarn('rebuttal-master');

  // Logic Master — avg 90%+ across logic lessons
  const logicScores = LOGIC_LESSONS.map(id => scores[id]).filter(Boolean);
  if (logicScores.length >= 3) {
    const avg = logicScores.reduce((sum, s) => sum + (s.correct / s.total), 0) / logicScores.length;
    if (avg >= 0.9) tryEarn('logic-master');
  }

  // Perfect Score — any quiz at 100%
  const perfectScores = Object.values(scores).filter(s => s.correct === s.total && s.total > 0);
  if (perfectScores.length > 0) tryEarn('perfect-score');

  // Accuracy Ace — 10+ scored lessons each at 95%+
  const scoredLessons = Object.values(scores).filter(s => s.total > 0);
  const highAccuracyLessons = scoredLessons.filter(s => s.correct / s.total >= 0.95);
  if (highAccuracyLessons.length >= 10) tryEarn('accuracy-ace');

  // Research Expert — complete all research lessons
  if (RESEARCH_LESSONS.every(id => completed.includes(id))) tryEarn('research-expert');

  // Lesson Master — all 29 lessons completed (from index.json)
  const allLessonIds = extras.allLessonIds || [];
  if (allLessonIds.length > 0 && allLessonIds.every(id => completed.includes(id))) tryEarn('lesson-master');

  // Quiz Conqueror — 30 distinct scored sections
  if (scoredLessons.length >= 30) tryEarn('quiz-conqueror');

  // Global Debater — any conference attended
  if ((conferences?.length || 0) > 0) tryEarn('global-debater');

  // Top 10 — leaderboard rank within top 10
  if (leaderboardRank !== undefined && leaderboardRank > 0 && leaderboardRank <= 10) tryEarn('top-10');

  // Top 1% — leaderboard rank in top 1%
  if (leaderboardRank !== undefined && totalLeaderboard > 0 && leaderboardRank <= Math.max(1, Math.ceil(totalLeaderboard * 0.01))) tryEarn('top-1');

  // Coin Collector — 10,000 activity points
  if (activityPoints >= 10000) tryEarn('coin-collector');

  // Quick Thinker — any timed quiz with 90%+
  const goodTimed = timedQuizzes.filter(q => !q.expired && q.total > 0 && q.correct / q.total >= 0.9);
  if (goodTimed.length >= 1) tryEarn('quick-thinker');

  // Speed Demon — 5 timed quizzes without expiring
  const nonExpired = timedQuizzes.filter(q => !q.expired);
  if (nonExpired.length >= 5) tryEarn('speed-demon');

  // Referral badges
  if (referrals.length >= 10) tryEarn('referral-star');
  if (referrals.length >= 50) tryEarn('viral-ambassador');

  // Level 25
  const level = getLevel(totalXP);
  if (level >= 25) tryEarn('level-25');

  // Shard Collector — collect 6 shards from Daily Spin
  const badgeShards = extras.badgeShards || 0;
  if (badgeShards >= 6) tryEarn('shard-collector');

  return earned;
}

/* ─── Daily Quests ─── */
const QUEST_POOL = [
  { id: 'complete-lesson',   label: 'Complete a Lesson',    desc: 'Finish any lesson today',                xp: 40,  target: 1,    icon: 'fa-book' },
  { id: 'complete-two',      label: 'Double Lesson',        desc: 'Complete 2 lessons today',                xp: 60,  target: 2,    icon: 'fa-books' },
  { id: 'complete-three',    label: 'Triple Threat',        desc: 'Complete 3 lessons today',                xp: 80,  target: 3,    icon: 'fa-book-open' },
  { id: 'complete-four',     label: 'Quad Feat',            desc: 'Complete 4 lessons today',                xp: 100, target: 4,    icon: 'fa-layer-group' },
  { id: 'earn-40-xp',        label: 'Gem Collector',         desc: 'Earn 40 ◈ today',                        xp: 30,  target: 40,   icon: 'fa-star' },
  { id: 'earn-80-xp',        label: 'Gem Hunter',            desc: 'Earn 80 ◈ today',                        xp: 50,  target: 80,   icon: 'fa-star' },
  { id: 'earn-150-xp',       label: 'Gem Master',            desc: 'Earn 150 ◈ today',                       xp: 80,  target: 150,  icon: 'fa-star' },
  { id: 'earn-250-xp',       label: 'Gem Overlord',          desc: 'Earn 250 ◈ today',                       xp: 110, target: 250,  icon: 'fa-star-half-alt' },
  { id: 'maintain-streak',   label: 'Streak Keeper',        desc: 'Do a lesson to keep your streak alive',   xp: 25,  target: 1,    icon: 'fa-fire' },
  { id: 'streak-3-lessons',  label: 'Streak Blazer',        desc: 'Do 3 lessons to keep your streak alive',  xp: 55,  target: 3,    icon: 'fa-fire' },
  { id: 'perfect-quiz',      label: 'Perfect Round',        desc: 'Get a perfect score on any quiz section', xp: 50,  target: 1,    icon: 'fa-bullseye' },
  { id: 'perfect-lesson',    label: 'Flawless Lesson',      desc: 'Complete a lesson with 100% accuracy',     xp: 60,  target: 1,    icon: 'fa-check-double' },
  { id: 'three-sections',    label: 'Deep Dive',            desc: 'Complete a lesson with 8+ sections',       xp: 45,  target: 1,    icon: 'fa-layer-group' },
  { id: 'section-count-6',   label: 'Medium Dive',          desc: 'Complete a lesson with 6+ sections',       xp: 35,  target: 1,    icon: 'fa-microchip' },
  { id: 'section-count-10',  label: 'Marathon Lesson',      desc: 'Complete a lesson with 10+ sections',      xp: 55,  target: 1,    icon: 'fa-tasks' },
  { id: 'two-practices',     label: 'Practice Makes Perfect',desc: 'Answer 2 practice questions correctly',    xp: 35,  target: 2,    icon: 'fa-puzzle-piece' },
  { id: 'six-practices',     label: 'Practice Grind',       desc: 'Answer 6 practice questions correctly',    xp: 55,  target: 6,    icon: 'fa-puzzle-piece' },
  { id: 'correct-6',         label: 'Getting Warm',         desc: 'Answer 6 questions correctly today',       xp: 25,  target: 6,    icon: 'fa-message' },
  { id: 'correct-15',        label: 'On Fire',              desc: 'Answer 15 questions correctly today',      xp: 55,  target: 15,   icon: 'fa-fire' },
  { id: 'correct-25',        label: 'Unstoppable',          desc: 'Answer 25 questions correctly today',      xp: 80,  target: 25,   icon: 'fa-bolt' },
  { id: 'first-completion',  label: 'First Time',           desc: 'Complete a lesson for the first time',     xp: 45,  target: 1,    icon: 'fa-sparkles' },
];

const EXCLUSIVE_GROUPS = [
  ['earn-40-xp', 'earn-80-xp', 'earn-150-xp', 'earn-250-xp'],
  ['complete-lesson', 'complete-two', 'complete-three', 'complete-four'],
  ['correct-6', 'correct-15', 'correct-25'],
  ['two-practices', 'six-practices'],
  ['section-count-6', 'three-sections', 'section-count-10'],
  ['maintain-streak', 'streak-3-lessons'],
  ['perfect-quiz', 'perfect-lesson'],
];

function pickDailyQuests(learning) {
  const completedCount = (learning && learning.completedLessons) ? learning.completedLessons.length : 0;
  const pool = completedCount > 0
    ? QUEST_POOL.filter(q => q.id !== 'first-completion')
    : QUEST_POOL;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picked = [];
  const usedGroups = new Set();

  for (const quest of shuffled) {
    if (picked.length >= 3) break;

    const groupIdx = EXCLUSIVE_GROUPS.findIndex(g => g.includes(quest.id));
    if (groupIdx !== -1) {
      if (usedGroups.has(groupIdx)) continue;
      usedGroups.add(groupIdx);
    }

    if (!picked.find(p => p.id === quest.id)) {
      picked.push({ ...quest, progress: 0, completed: false, claimed: false });
    }
  }

  return picked;
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function getOrGenerateQuests(learning) {
  const quests = learning.quests;
  const today = getTodayStr();

  if (quests && quests.date === today) {
    return quests;
  }

  return {
    date: today,
    quests: pickDailyQuests(learning)
  };
}

/* ─── Activity Points System ─── */
export const ACTIVITY_POINTS = {
  lesson: 50,
  quiz: 25,
  competition: 300,
  dailyChallenge: 150,
  firstLogin: 50
};

export const LEVEL_NAMES = {
  1:  'Beginner',
  5:  'Bronze Speaker',
  10: 'Silver Speaker',
  20: 'Gold Speaker',
  25: 'Advanced Speaker',
  35: 'Diamond Speaker',
  50: 'Debate Legend'
};

export function getLevelFromPoints(totalPoints) {
  return Math.floor(totalPoints / 100) + 1;
}

export function getLevelName(level) {
  const keys = Object.keys(LEVEL_NAMES).map(Number).sort((a, b) => b - a);
  for (const k of keys) {
    if (level >= k) return LEVEL_NAMES[k];
  }
  return 'Beginner';
}

/* -- Level display HTML -- */

export const LEVEL_ICONS = {
  'Beginner':        'fa-flag',
  'Bronze Speaker':  'fa-microphone',
  'Silver Speaker':  'fa-comments',
  'Gold Speaker':    'fa-trophy',
  'Diamond Speaker': 'fa-gem',
  'Debate Legend':   'fa-crown'
};

function levelIcon(name) {
  return LEVEL_ICONS[name] || 'fa-star';
}

export function getLevelBadgeHTML(level, options = {}) {
  const { size = 'sm' } = options;
  const name = getLevelName(level);
  const cls = name.toLowerCase().replace(/\s+/g, '-');
  return `
    <span class="lvl lvl--${size} lvl--${cls}">
      <span class="lvl-num">Lv.${level}</span>
      <span class="lvl-title">${name}</span>
    </span>`;
}

export function getLevelStatHTML(level) {
  const name = getLevelName(level);
  const cls = name.toLowerCase().replace(/\s+/g, '-');
  const icon = levelIcon(name);
  return `
    <div class="lvl-stat lvl-stat--${cls}">
      <div class="lvl-stat-icon"><i class="fas ${icon}"></i></div>
      <div class="lvl-stat-body">
        <span class="lvl-stat-num">${level}</span>
        <span class="lvl-stat-name">${name}</span>
      </div>
    </div>`;
}

export {
  REFERRAL_POINTS,
  REFERRER_POINTS,
  makeHistoryEntry,
  LEVEL_TITLES,
  getLevelTitle,
  getLevel,
  getLevelProgress,
  xpToNextLevel,
  BADGES,
  BADGE_MAP,
  checkBadgesFromLearning,

  QUEST_POOL,
  pickDailyQuests,
  getTodayStr,
  getOrGenerateQuests
};
