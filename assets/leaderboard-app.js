import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import {
  syncLeaderboard,
  getCurrentWeekId,
  getWeekLabel
} from "./leaderboard-sync.js";
import { getLevelBadgeHTML, getLevelFromPoints, getLevelName } from "./gamification.js";

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

let currentUserUid = null;
let allPlayers = [];
let currentWeek = "";

const ESC = s => String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const INITIALS = n => (n||"?").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);

const MEDALS = [null, "\u{1F947}", "\u{1F948}", "\u{1F949}"];

const WEEKLY = "weekly", ALLTIME = "alltime", CHAMPIONS = "champions";
let activeTab = ALLTIME;
const INITIAL_VISIBLE = 15;
let visibleCountW = INITIAL_VISIBLE;
let visibleCountAT = INITIAL_VISIBLE;
let rankChanges = new Map();

function computeRankChanges() {
  const prevRanked = sortByField(allPlayers.filter(p => p.lastWeekPoints > 0), "lastWeekPoints");
  const prevRankMap = new Map();
  prevRanked.forEach((p, i) => prevRankMap.set(p.uid, i + 1));
  const currRanked = sortByField(allPlayers, "points");
  rankChanges.clear();
  currRanked.forEach((p, i) => {
    const currRank = i + 1;
    const prevRank = prevRankMap.get(p.uid) || null;
    let direction = "same";
    if (prevRank === null) direction = "new";
    else if (prevRank > currRank) direction = "up";
    else if (prevRank < currRank) direction = "down";
    rankChanges.set(p.uid, { direction, prevRank });
  });
}

const BADGE_DEFS = [
  { id: "perfect-score", name: "Perfect Score", icon: "fa-check-circle" },
  { id: "lesson-master", name: "Lesson Master", icon: "fa-trophy" },
  { id: "first-lesson", name: "First Lesson", icon: "fa-star" },
  { id: "first-steps", name: "First Steps", icon: "fa-flag" },
  { id: "streak-7", name: "7 Day Streak", icon: "fa-fire" },
  { id: "streak-30", name: "30 Day Streak", icon: "fa-crown" },
  { id: "debate-beginner", name: "Debate Beginner", icon: "fa-gavel" },
  { id: "rebuttal-master", name: "Rebuttal Master", icon: "fa-hand-fist" },
  { id: "logic-master", name: "Logic Master", icon: "fa-brain" },
  { id: "quick-thinker", name: "Quick Thinker", icon: "fa-bolt" },
  { id: "accuracy-ace", name: "Accuracy Ace", icon: "fa-bullseye" },
  { id: "research-expert", name: "Research Expert", icon: "fa-book" },
  { id: "quiz-conqueror", name: "Quiz Conqueror", icon: "fa-layer-group" },
  { id: "global-debater", name: "Global Debater", icon: "fa-globe" },
  { id: "top-10", name: "Top 10", icon: "fa-medal" },
  { id: "top-1", name: "Top 1%", icon: "fa-trophy" },
  { id: "coin-collector", name: "Coin Collector", icon: "fa-gem" },
  { id: "speed-demon", name: "Speed Demon", icon: "fa-rocket" },
  { id: "referral-star", name: "Referral Star", icon: "fa-user-plus" },
  { id: "viral-ambassador", name: "Viral Ambassador", icon: "fa-share-alt" },
  { id: "level-25", name: "Level 25", icon: "fa-arrow-up" },
  { id: "shard-collector", name: "Shard Collector", icon: "fa-dragon" }
];

function getPtsField() {
  return activeTab === ALLTIME ? "allTimePoints" : "points";
}

function getPrevWeekId(weekId) {
  const m = weekId.match(/^(\d+)-W(\d+)$/);
  if (!m) return "";
  const year = parseInt(m[1], 10), week = parseInt(m[2], 10);
  if (week > 1) return `${year}-W${String(week - 1).padStart(2, "0")}`;
  return `${year - 1}-W52`;
}

currentWeek = getCurrentWeekId();

function getNextWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const isoDay = day === 0 ? 7 : day;
  const next = new Date(now);
  next.setDate(now.getDate() + (8 - isoDay));
  next.setHours(0, 0, 0, 0);
  return next;
}

function updateCountdown() {
  const el = document.getElementById("lb-countdown");
  if (!el) return;
  const next = getNextWeekStart();
  const diff = next - new Date();
  if (diff <= 0) { el.textContent = "Resetting soon..."; return; }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  el.textContent = `Resets in ${d}d ${h}h ${m}m`;
}

function setWeekLabel() {
  const el = document.getElementById("lb-week-label");
  if (el) el.textContent = `${getWeekLabel(currentWeek)}`;
}

function updateCommunityGems() {
  const total = allPlayers.reduce((sum, p) => sum + (p.gemsToday || 0), 0);
  const el = document.getElementById("lb-community-gems-count");
  if (el) {
    const current = parseInt(el.textContent) || 0;
    if (current !== total) animateCounter(el, current, total, 600);
  }
}

function animateCounter(el, from, to, duration) {
  const start = performance.now();
  const diff = to - from;
  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + diff * eased).toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

onAuthStateChanged(auth, user => {
  if (user) {
    currentUserUid = user.uid;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          await syncLeaderboard(db, user.uid, snap.data()).catch(() => {});
        }
      } catch (_) {}
      refreshChampions();
    })();
  }
});

async function refreshChampions() {
  try {
    const [champsSnap, lbSnap, adminUids] = await Promise.all([
      getDocs(collection(db, "leaderboard_champions")),
      getDocs(collection(db, "leaderboard")),
      getAdminUids()
    ]);
    const champions = [];
    const champWeeks = new Set();
    champsSnap.forEach(d => {
      if (adminUids.has(d.data().uid)) return;
      champions.push({ id: d.id, ...d.data() });
      champWeeks.add(d.id);
    });

    const prevWeek = getPrevWeekId(currentWeek);
    const playersByWeek = {};
    const lastWeekCandidates = [];
    lbSnap.forEach(d => {
      if (adminUids.has(d.id)) return;
      const data = d.data();
      if (!data.fullName) return;
      if (data.lastWeekPoints > 0) lastWeekCandidates.push({ uid: d.id, fullName: data.fullName, nickName: data.nickName || "", country: data.country || "", points: data.lastWeekPoints });
      const week = data.currentWeek;
      if (!week || week === currentWeek || champWeeks.has(week)) return;
      if (!playersByWeek[week]) playersByWeek[week] = [];
      playersByWeek[week].push({ uid: d.id, fullName: data.fullName, nickName: data.nickName || "", country: data.country || "", points: data.points || 0 });
    });
    for (const [week, players] of Object.entries(playersByWeek)) {
      const top = players.reduce((a, b) => (a.points || 0) >= (b.points || 0) ? a : b);
      if (top && (top.points || 0) > 0) champions.push({ id: week, weekId: week, ...top });
    }
    let checkWeek = getPrevWeekId(currentWeek);
    for (let i = 0; i < 4 && checkWeek && !champWeeks.has(checkWeek); i++) {
      if (!champions.find(c => c.weekId === checkWeek) && lastWeekCandidates.length > 0) {
        const top = lastWeekCandidates.reduce((a, b) => (a.points || 0) >= (b.points || 0) ? a : b);
        if (top && top.points > 0) champions.push({ id: checkWeek, weekId: checkWeek, ...top });
      }
      checkWeek = getPrevWeekId(checkWeek);
    }
    champions.sort((a, b) => (b.weekId || "").localeCompare(a.weekId || ""));
    window.__champions = champions;
    const tab = document.querySelector(".lb-tab-content.active");
    if (tab && tab.id === "lb-tab-champions") renderChampions();
  } catch (e) {
    console.warn("refreshChampions error:", e);
  }
}

async function getAdminUids() {
  try {
    const q = query(collection(db, "users"), where("role", "==", "admin"));
    const snap = await getDocs(q);
    const uids = new Set();
    snap.forEach(d => uids.add(d.id));
    return uids;
  } catch (_) { return new Set(); }
}

async function loadLeaderboard() {
  const loadingEl = document.getElementById("lb-loading");
  const errorEl = document.getElementById("lb-error");
  const contentEl = document.getElementById("lb-content");

  try {
    const [weeklySnap, adminUids] = await Promise.all([
      getDocs(collection(db, "leaderboard")),
      getAdminUids()
    ]);

    let champions = [];
    try {
      const champsSnap = await getDocs(collection(db, "leaderboard_champions"));
      champsSnap.forEach(d => { champions.push({ id: d.id, ...d.data() }); });
      champions = champions.filter(c => !adminUids.has(c.uid));
      champions.sort((a, b) => (b.weekId || "").localeCompare(a.weekId || ""));
    } catch (_) {}

    allPlayers = [];
    weeklySnap.forEach(d => {
      if (adminUids.has(d.id)) return;
      const data = d.data();
      if (!data.fullName) return;
      const today = new Date().toISOString().split('T')[0];
      allPlayers.push({
        uid: d.id,
        fullName: data.fullName,
        nickName: data.nickName || "",
        country: data.country || "",
        conferenceCount: data.conferenceCount || 0,
        awardCount: data.awardCount || 0,
        points: data.points || 0,
        allTimePoints: data.allTimePoints || data.points || 0,
        level: data.level || 1,
        currentWeek: data.currentWeek || "",
        lastWeekPoints: data.lastWeekPoints || 0,
        gemsToday: (data.gemsTodayDate === today) ? (data.gemsToday || 0) : 0
      });
    });

    const existingChampWeeks = new Set(champions.map(c => c.weekId));
    const prevWeek = getPrevWeekId(currentWeek);

    const playersByWeek = {};
    for (const p of allPlayers) {
      if (!p.currentWeek || p.currentWeek === currentWeek || existingChampWeeks.has(p.currentWeek)) continue;
      if (!playersByWeek[p.currentWeek]) playersByWeek[p.currentWeek] = [];
      playersByWeek[p.currentWeek].push(p);
    }
    for (const [week, players] of Object.entries(playersByWeek)) {
      const top = players.reduce((a, b) => (a.points || 0) >= (b.points || 0) ? a : b);
      if (top && (top.points || 0) > 0) {
        champions.push({ id: week, weekId: week, uid: top.uid, fullName: top.fullName, nickName: top.nickName, country: top.country, points: top.points });
      }
    }

    let checkWeek = getPrevWeekId(currentWeek);
    for (let i = 0; i < 4 && checkWeek && !existingChampWeeks.has(checkWeek); i++) {
      if (!champions.find(c => c.weekId === checkWeek)) {
        const candidates = allPlayers.filter(p => p.lastWeekPoints > 0);
        if (candidates.length > 0) {
          const top = candidates.reduce((a, b) => (a.lastWeekPoints || 0) >= (b.lastWeekPoints || 0) ? a : b);
          if (top && top.lastWeekPoints > 0) {
            champions.push({ id: checkWeek, weekId: checkWeek, uid: top.uid, fullName: top.fullName, nickName: top.nickName, country: top.country, points: top.lastWeekPoints });
          }
        }
      }
      checkWeek = getPrevWeekId(checkWeek);
    }

    champions.sort((a, b) => (b.weekId || "").localeCompare(a.weekId || ""));

    loadingEl.style.display = "none";

    if (allPlayers.length === 0) {
      document.getElementById("lb-empty").style.display = "block";
      contentEl.style.display = "block";
      document.getElementById("lb-player-count").textContent = "0";
      document.getElementById("lb-player-count-at").textContent = "0";
      return;
    }

    window.__champions = champions;
    window.__allPlayers = allPlayers;
    computeRankChanges();
    renderAll();
    updateCommunityGems();
    contentEl.style.display = "block";
    updateCountdown();
    setWeekLabel();
    setInterval(updateCountdown, 60000);

    setInterval(async () => {
      try {
        const snap = await getDocs(collection(db, "leaderboard"));
        const today = new Date().toISOString().split('T')[0];
        snap.forEach(d => {
          const data = d.data();
          const player = allPlayers.find(p => p.uid === d.id);
          if (player) {
            player.gemsToday = (data.gemsTodayDate === today) ? (data.gemsToday || 0) : 0;
          }
        });
        computeRankChanges();
        renderAll();
        updateCommunityGems();
      } catch (_) {}
    }, 30000);

  } catch (err) {
    console.error("Leaderboard load error:", err);
    loadingEl.style.display = "none";
    errorEl.style.display = "block";
  }
}

function renderAll() {
  renderWeekly();
  renderAllTime();
  renderChampions();
  populateCountryFilter();
}

function populateCountryFilter() {
  const countries = [...new Set(allPlayers.map(p => p.country).filter(Boolean))].sort();
  const selects = [
    document.getElementById("lb-country-filter"),
    document.getElementById("lb-country-filter-at")
  ];
  selects.forEach(sel => {
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = '<option value="">All Countries</option>';
    countries.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    });
    sel.value = prev;
  });
}

function getFiltered(field) {
  const input = activeTab === WEEKLY
    ? document.getElementById("lb-search-input")
    : document.getElementById("lb-search-alltime");
  const countrySelect = activeTab === WEEKLY
    ? document.getElementById("lb-country-filter")
    : document.getElementById("lb-country-filter-at");
  const q = (input ? input.value : "").toLowerCase().trim();
  const country = countrySelect ? countrySelect.value : "";
  return allPlayers.filter(p => {
    const matchesSearch = !q ||
      p.fullName.toLowerCase().includes(q) ||
      p.nickName.toLowerCase().includes(q) ||
      p.country.toLowerCase().includes(q);
    const matchesCountry = !country || p.country === country;
    return matchesSearch && matchesCountry;
  });
}

function sortByField(players, field) {
  return [...players].sort((a, b) => (b[field] || 0) - (a[field] || 0) || a.fullName.localeCompare(b.fullName));
}

function renderTable(bodyId, emptyId, countId, field, filtered) {
  const body = document.getElementById(bodyId);
  const empty = document.getElementById(emptyId);
  const countEl = document.getElementById(countId);
  const sorted = sortByField(filtered, field);
  const total = sorted.length;
  countEl.textContent = total;

  const suffix = bodyId === "lb-body" ? "w" : "at";
  const loadMoreEl = document.getElementById(`lb-load-more-${suffix}`);
  const loadMoreText = document.getElementById(`lb-load-more-text-${suffix}`);
  const visibleCount = suffix === "w" ? visibleCountW : visibleCountAT;
  const prevCount = body.children.length;
  const pageItems = sorted.slice(0, visibleCount);

  if (total === 0) {
    body.innerHTML = "";
    if (empty) empty.style.display = "block";
    if (loadMoreEl) loadMoreEl.style.display = "none";
    return;
  }
  if (empty) empty.style.display = "none";

  body.innerHTML = pageItems.map((p, i) => {
    const rank = i + 1;
    return `<tr class="lb-row${p.uid === currentUserUid ? " lb-row--me" : ""}">
      <td class="c-rank" data-label="Rank">${getMedalOrRank(rank)}${getRankChangeHTML(p.uid)}</td>
      <td class="c-player" data-label="Player">
        <div class="p-info">
          <div class="p-avatar" style="${rank <= 3 ? `border-color: ${['#fbbf24','#9ca3af','#d97706'][rank-1]}` : ''}">${INITIALS(p.fullName)}</div>
          <div class="p-details">
            <div class="p-name"><a href="javascript:void(0)" onclick="openProfileModal('${p.uid}')" class="p-name-link">${ESC(p.fullName)}</a>${p.uid === currentUserUid ? '<span class="p-me">You</span>' : ''}</div>
            <div class="p-meta">
              ${p.nickName ? `<span class="p-nick">@${ESC(p.nickName)}</span>` : ""}
              ${getLevelBadgeHTML(p.level, { size: 'sm' })}
            </div>
          </div>
        </div>
      </td>
      <td class="c-country" data-label="Country">${p.country ? ESC(p.country) : '<span class="no-data">\u2014</span>'}</td>
      <td class="c-confs" data-label="Confs">${p.conferenceCount}</td>
      <td class="c-awards" data-label="Awards">${p.awardCount}</td>
      <td class="c-pts" data-label="Gems"><span class="pts-pill">${p[field] || 0}</span></td>
    </tr>`;
  }).join("");

  // Animate newly added rows
  if (prevCount > 0) {
    const rows = body.querySelectorAll(".lb-row");
    for (let i = prevCount; i < rows.length; i++) {
      rows[i].classList.add("lb-row--new");
    }
  }

  // Load more button
  if (loadMoreEl) {
    if (visibleCount >= total) {
      loadMoreEl.style.display = "none";
    } else {
      loadMoreEl.style.display = "flex";
      if (loadMoreText) loadMoreText.textContent = `Showing ${visibleCount} of ${total}`;
    }
  }
}

function getMedalOrRank(rank) {
  if (rank <= 3) return `<span class="medal-cell">${MEDALS[rank]} <span class="rank-val">${rank}</span></span>`;
  return `<span class="rank-val rank-val--plain">${rank}</span>`;
}

function getRankChangeHTML(uid) {
  if (activeTab !== WEEKLY) return "";
  const rc = rankChanges.get(uid);
  if (!rc) return "";
  switch (rc.direction) {
    case "up":   return `<span class="rank-change rank-up"><i class="fas fa-arrow-up"></i></span>`;
    case "down": return `<span class="rank-change rank-down"><i class="fas fa-arrow-down"></i></span>`;
    case "new":  return `<span class="rank-change rank-new">NEW</span>`;
    default:     return `<span class="rank-change rank-same">&mdash;</span>`;
  }
}

function renderWeekly() {
  renderTable("lb-body", "lb-empty", "lb-player-count", "points", allPlayers);
  renderPodium(allPlayers, "points", "w");
  renderRankCard(allPlayers, "points", "w");
}

function renderAllTime() {
  renderTable("lb-body-alltime", null, "lb-player-count-at", "allTimePoints", allPlayers);
  renderPodium(allPlayers, "allTimePoints", "a");
  renderRankCard(allPlayers, "allTimePoints", "at");
}

function renderPodium(players, field, prefix) {
  const top3 = sortByField(players, field).slice(0, 3);
  const ids = [1, 2, 3];
  const podium = document.getElementById(`podium-${prefix === "w" ? "weekly" : "alltime"}`);
  if (!podium) return;
  if (players.length === 0 || top3.length === 0) { podium.style.display = "none"; return; }
  podium.style.display = "";

  podium.querySelectorAll(".p-slot").forEach(s => s.classList.remove("p-slot--visible"));

  const order = [2, 1, 3];
  order.forEach(rank => {
    const p = top3[rank - 1];
    const el = (id) => document.getElementById(`${prefix}-p${rank}-${id}`);
    if (p) {
      if (el("avatar")) {
        el("avatar").textContent = INITIALS(p.fullName);
        el("avatar").style.cursor = "pointer";
      }
      const nameEl = el("name");
      if (nameEl) {
        nameEl.innerHTML = `<a href="javascript:void(0)" onclick="openProfileModal('${p.uid}')" style="color:inherit;text-decoration:none;">${ESC(p.fullName.split(" ")[0])}</a>`;
      }
      if (el("pts")) el("pts").textContent = p[field] || 0;
    } else {
      if (el("avatar")) el("avatar").textContent = "?";
      if (el("name")) el("name").textContent = "\u2014";
      if (el("pts")) el("pts").textContent = "0";
    }
  });

  requestAnimationFrame(() => {
    podium.querySelectorAll(".p-slot").forEach(slot => {
      slot.classList.add("p-slot--visible");
    });
  });
}

function renderRankCard(players, field, prefix) {
  const card = document.getElementById(`lb-rank-card-${prefix}`);
  if (!card) return;
  const uid = currentUserUid;
  if (!uid || players.length === 0) { card.style.display = "none"; return; }
  const sorted = sortByField(players, field);
  const idx = sorted.findIndex(p => p.uid === uid);
  if (idx === -1) { card.style.display = "none"; return; }
  card.style.display = "flex";
  const me = sorted[idx];
  const rank = idx + 1;
  const total = sorted.length;
  const pts = me[field] || 0;
  document.getElementById(`rank-avatar-text-${prefix}`).textContent = INITIALS(me.fullName);
  document.getElementById(`rank-pos-${prefix}`).textContent = `#${rank} of ${total}`;
  document.getElementById(`rank-detail-${prefix}`).innerHTML = `${pts.toLocaleString()} <span class="gem-icon gem-icon--sm"></span>`;
  let progressText, progressPct;
  if (rank === 1) {
    progressText = "You're #1 \u2014 Lead the leaderboard";
    progressPct = 100;
  } else if (rank <= 10) {
    const topPts = sorted[0][field] || 0;
    progressText = `${(topPts - pts).toLocaleString()} <span class="gem-icon gem-icon--sm"></span> from #1`;
    progressPct = Math.min((pts / Math.max(topPts, 1)) * 100, 100);
  } else {
    const spotsAway = rank - 10;
    const tenthPts = sorted[9][field] || 0;
    progressText = `${spotsAway} spot${spotsAway > 1 ? 's' : ''} from Top 10`;
    progressPct = Math.min((pts / Math.max(tenthPts, 1)) * 100, 100);
  }
  document.getElementById(`rank-bar-text-${prefix}`).innerHTML = progressText;
  document.getElementById(`rank-bar-fill-${prefix}`).style.width = `${Math.round(progressPct)}%`;
}

function renderChampions() {
  const champs = window.__champions || [];
  const grid = document.getElementById("lb-champions-grid");
  const empty = document.getElementById("lb-champs-empty");
  if (champs.length === 0) {
    grid.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  const sorted = [...champs].sort((a, b) => (b.points || 0) - (a.points || 0));
  const podium = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  const podiumOrder = [];
  if (podium[1]) podiumOrder.push({ ...podium[1], place: 2 });
  if (podium[0]) podiumOrder.push({ ...podium[0], place: 1 });
  if (podium[2]) podiumOrder.push({ ...podium[2], place: 3 });

  let html = '';

  if (podiumOrder.length > 0) {
    html += `<div class="champ-stage">`;
    html += `<div class="champ-stage-spotlights">
      <div class="spotlight spotlight--left"></div>
      <div class="spotlight spotlight--center"></div>
      <div class="spotlight spotlight--right"></div>
    </div>`;

    for (const c of podiumOrder) {
      const medal = c.place === 1 ? 'fa-crown' : c.place === 2 ? 'fa-medal' : 'fa-award';
      const tier = c.place === 1 ? 'first' : c.place === 2 ? 'second' : 'third';
      html += `
      <div class="champ-podium-item ${tier}" style="--delay:${podiumOrder.indexOf(c) * 0.15}s">
        <div class="champ-podium-spotlight"></div>
        <div class="champ-podium-ring"></div>
        <div class="champ-podium-crown"><i class="fas ${medal}"></i></div>
        <div class="champ-podium-avatar">${INITIALS(c.fullName)}</div>
        <div class="champ-podium-name"><a href="javascript:void(0)" onclick="openProfileModal('${c.uid}')" style="color:inherit;text-decoration:none;">${ESC(c.fullName)}</a></div>
        ${c.nickName ? `<div class="champ-podium-nick">@${ESC(c.nickName)}</div>` : ''}
        <div class="champ-podium-country">${c.country ? ESC(c.country) : ''}</div>
        <div class="champ-podium-week">${getWeekLabel(c.weekId)}</div>
        <div class="champ-podium-pts"><span class="gem-icon gem-icon--sm"></span> ${c.points}</div>
        <div class="champ-podium-bar">
          <div class="champ-podium-bar-shine"></div>
        </div>
      </div>`;
    }
    html += `</div>`;
  }

  if (rest.length > 0) {
    html += `<div class="champ-past-header"><i class="fas fa-history"></i> Previous Champions</div>`;
    html += `<div class="lb-champions-grid">`;
    for (const c of rest) {
      html += `
      <div class="champ-card">
        <div class="champ-crown"><i class="fas fa-crown"></i></div>
        <div class="champ-week">${getWeekLabel(c.weekId)}</div>
        <div class="champ-avatar">${INITIALS(c.fullName)}</div>
        <div class="champ-name"><a href="javascript:void(0)" onclick="openProfileModal('${c.uid}')" style="color:inherit;text-decoration:none;">${ESC(c.fullName)}</a></div>
        ${c.nickName ? `<div class="champ-nick">@${ESC(c.nickName)}</div>` : ""}
        <div class="champ-country">${c.country ? ESC(c.country) : ''}</div>
        <div class="champ-pts"><span class="gem-icon gem-icon--sm"></span> ${c.points}</div>
      </div>`;
    }
    html += `</div>`;
  }

  grid.innerHTML = html;
}

function switchTab(tab) {
  activeTab = tab;
  visibleCountW = INITIAL_VISIBLE;
  visibleCountAT = INITIAL_VISIBLE;
  document.querySelectorAll(".lb-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  document.querySelectorAll(".lb-tab-content").forEach(c => c.classList.toggle("active", c.id === `lb-tab-${tab}`));
  if (tab === CHAMPIONS) {
    refreshChampions().then(() => renderChampions()).catch(() => renderChampions());
  }
  else LB.filter();
}

function closeProfileModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById("profile-modal").style.display = "none";
  const scrollY = parseInt(document.body.dataset.scrollLock || "0");
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";
  document.body.style.overflowY = "";
  if (scrollY) window.scrollTo(0, scrollY);
  delete document.body.dataset.scrollLock;
}

window.closeProfileModal = closeProfileModal;

async function openProfileModal(uid) {
  if (!uid) return;
  const modal = document.getElementById("profile-modal");
  const loading = document.getElementById("pm-loading");
  const error = document.getElementById("pm-error");
  const body = document.getElementById("pm-body");
  const badgesSection = document.getElementById("pm-badges");
  const badgesGrid = document.getElementById("pm-badges-grid");
  modal.style.display = "flex";
  const scrollY = window.scrollY;
  document.body.dataset.scrollLock = scrollY;
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = "100%";
  document.body.style.overflowY = "scroll";
  loading.style.display = "block";
  error.style.display = "none";
  body.style.display = "none";
  badgesSection.style.display = "none";
  try {
    const lbSnap = await getDoc(doc(db, "leaderboard", uid));
    if (!lbSnap.exists()) {
      loading.style.display = "none";
      error.style.display = "block";
      error.textContent = "User not found.";
      return;
    }
    const d = lbSnap.data();
    const lvl = getLevelFromPoints(d.allTimePoints || d.points || 0);
    const lvlName = getLevelName(lvl);
    const initial = (d.fullName || "?")[0].toUpperCase();
    document.getElementById("pm-avatar").textContent = initial;
    document.getElementById("pm-name").textContent = d.fullName || "\u2014";
    document.getElementById("pm-nick").textContent = d.nickName ? `@${d.nickName}` : "";
    document.getElementById("pm-country").textContent = d.country || "";
    document.getElementById("pm-points").textContent = d.allTimePoints ?? d.points ?? 0;
    document.getElementById("pm-level").textContent = lvl;
    const pmLevelName = document.querySelector(".pm-level-name");
    if (pmLevelName) pmLevelName.textContent = lvlName;
    document.getElementById("pm-confs").textContent = d.conferenceCount ?? 0;
    document.getElementById("pm-awards").textContent = d.awardCount ?? 0;
    document.getElementById("pm-streak").textContent = d.streak ?? 0;
    document.getElementById("pm-lessons").textContent = d.completedLessons ?? 0;

    const earnedIds = new Set(d.achievements || []);
    if (earnedIds.size > 0) {
      badgesGrid.innerHTML = BADGE_DEFS.filter(b => earnedIds.has(b.id)).map(b =>
        `<div class="pm-badge-chip earned" data-tip="${ESC(b.name)}">
          <div class="pm-badge-chip-icon"><i class="fas ${b.icon}"></i></div>
          <div class="pm-badge-chip-name">${ESC(b.name)}</div>
        </div>`
      ).join("");
      badgesSection.style.display = "block";
    }

    loading.style.display = "none";
    body.style.display = "block";
  } catch (err) {
    console.error("Profile modal error:", err);
    loading.style.display = "none";
    error.style.display = "block";
    error.textContent = "Could not load profile.";
  }
}
window.openProfileModal = openProfileModal;

window.LB = {
  filter() {
    const field = getPtsField();
    const isWeekly = activeTab === WEEKLY;
    const bodyId = isWeekly ? "lb-body" : "lb-body-alltime";
    const emptyId = isWeekly ? "lb-empty" : null;
    const countId = isWeekly ? "lb-player-count" : "lb-player-count-at";
    renderTable(bodyId, emptyId, countId, field, getFiltered(field));
    const suffix = isWeekly ? "w" : "at";
    const pf = isWeekly ? "points" : "allTimePoints";
    renderPodium(getFiltered(field), pf, suffix);
    renderRankCard(allPlayers, pf, suffix);
  },
  resetAndFilter() {
    visibleCountW = INITIAL_VISIBLE;
    visibleCountAT = INITIAL_VISIBLE;
    LB.filter();
  },
  loadMore() {
    const isWeekly = activeTab === WEEKLY;
    if (isWeekly) visibleCountW += 5;
    else visibleCountAT += 5;
    LB.filter();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  loadLeaderboard();

  document.getElementById("lb-tabs").addEventListener("click", e => {
    const btn = e.target.closest(".lb-tab");
    if (btn) switchTab(btn.dataset.tab);
  });

  const emailLink = document.getElementById("copy-email");
  if (emailLink) {
    emailLink.addEventListener("click", e => {
      e.preventDefault();
      navigator.clipboard.writeText("hello.deb8er@gmail.com");
      const orig = emailLink.textContent;
      emailLink.textContent = "Copied!";
      emailLink.style.color = "var(--cyan)";
      setTimeout(() => { emailLink.textContent = orig; emailLink.style.color = ""; }, 1500);
    });
  }
});
