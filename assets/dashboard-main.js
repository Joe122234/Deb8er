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

import {
  getAuth,
  onAuthStateChanged,
  signOut as fbSignOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { syncLeaderboard, computeTotalPoints, CONF_POINTS, awardPointsFor } from "./leaderboard-sync.js";
import { getLevelTitle, getLevel, getLevelFromPoints, getLevelName, getLevelBadgeHTML, getLevelStatHTML, BADGES, checkBadgesFromLearning, ACTIVITY_POINTS, REFERRAL_POINTS, REFERRER_POINTS, makeHistoryEntry, LEVEL_NAMES, LEVEL_ICONS, ALL_LESSON_IDS } from "./gamification.js";
import { initDebix, say, welcome, badge, streak, atRisk, tip, lessonDone, firstLesson, startTips } from "./debix.js";
import { openSpinWheel, getDailySpinStatus, getSpinCountdown } from "./daily-spin.js";

// Retry helper for silent Firestore writes — retries up to 2 times with 1s delay
async function retryWrite(fn, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      await fn();
      return;
    } catch (e) {
      if (i < retries) await new Promise(r => setTimeout(r, 1000));
    }
  }
}

const DEBUG = false;

const firebaseConfig = {
  apiKey: "AIzaSyDGEGLVwVQfi8YgG0oZthSTr7YNbfW5wwo",
  authDomain: "deb8ersignup-4b9e1.firebaseapp.com",
  projectId: "deb8ersignup-4b9e1",
  storageBucket: "deb8ersignup-4b9e1.firebasestorage.app",
  messagingSenderId: "498995453154",
  appId: "1:498995453154:web:de1836f0b8cd764c8292bb"
};

const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// Google Apps Script web app URL (must be redeployed after adding getProfile action)
const SHEET_API = "https://script.google.com/macros/s/AKfycbx_YlVpMbjm4qCWlrs6gphHRyRmQWrOpYwD8M35vKF7b2R7_nGdbeDOQJtHaVl0dTwZ/exec";

// Escape user-provided strings before injecting into innerHTML
function esc(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

let currentUID = null;

// ---- Referral helpers ----
function generateReferralCode(name) {
  const base = (name || "User").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "USER";
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${base}_${suffix}`;
}

async function ensureReferralCode(d, uid) {
  if (d.referralCode) return d.referralCode;
  const code = generateReferralCode(d.nickName || d.fullName);
  await updateDoc(doc(db, "users", uid), { referralCode: code }).catch(() => {});
  return code;
}

async function creditReferrals(d, uid, referralCode) {
  if (!referralCode) return;
  const existingReferrals = d.referrals || [];
  try {
    const snap = await getDocs(query(collection(db, "users"), where("referredBy", "==", referralCode)));
    const newUids = [];
    const newNames = [];
    snap.forEach(s => {
      if (!existingReferrals.includes(s.id)) {
        newUids.push(s.id);
        newNames.push(s.data().fullName || "Someone");
      }
    });
    if (newUids.length === 0) return;
    const credited = newUids.length * REFERRER_POINTS;
    const newActivityPoints = (d.activityPoints || 0) + credited;
    const historyEntries = newNames.map(name => makeHistoryEntry(REFERRER_POINTS, "referral_credit", `Referred ${name}`));
    await updateDoc(doc(db, "users", uid), {
      referrals: arrayUnion(...newUids),
      activityPoints: newActivityPoints,
      pointHistory: arrayUnion(...historyEntries)
    });
    // Update local data to reflect new points
    d.activityPoints = newActivityPoints;
    if (!d.referrals) d.referrals = [];
    d.referrals.push(...newUids);
    if (!d.pointHistory) d.pointHistory = [];
    d.pointHistory.push(...historyEntries);
    // Show toasts
    newNames.forEach(name => {
      showToast(`+${REFERRER_POINTS} <span class="gem-icon gem-icon--sm"></span> — You referred ${name}!`, "success");
    });
  } catch (err) {
    console.warn("Referral credit check failed:", err);
  }
}

function showReferralLink(code, referrals, pointHistory) {
  const el = document.getElementById("dash-referral");
  if (!code) return;
  const input = document.getElementById("referral-link-input");
  input.value = `${window.location.origin}/auth.html?ref=${code}`;
  const count = (referrals || []).length;
  document.getElementById("ref-count").textContent = count;
  const refPts = (pointHistory || [])
    .filter(e => e.type === 'referral_credit' || e.type === 'referral_bonus')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  document.getElementById("ref-points").textContent = refPts;
  el.style.display = "flex";
  document.getElementById("referral-share-btn").style.display = "";
}

window.openLevelsModal = function(level, points) {
  const thresholds = Object.keys(LEVEL_NAMES).map(Number).sort((a, b) => a - b);
  const iconMap = LEVEL_ICONS;
  const currentName = getLevelName(level);
  document.getElementById("lvlprog-current-level").textContent = `Level ${level}`;
  document.getElementById("lvlprog-current-name").textContent = currentName;

  // Progress to next milestone level
  const nextThreshold = thresholds.find(t => t > level);
  if (nextThreshold && nextThreshold > level) {
    const curPoints = level * 100 - 100; // points at start of current level
    const nextPoints = nextThreshold * 100 - 100;  // points at start of next milestone
    const progress = Math.min(((points - curPoints) / (nextPoints - curPoints)) * 100, 100);
    document.getElementById("lvlprog-bar-fill").style.width = `${progress}%`;
    document.getElementById("lvlprog-bar-current").innerHTML = `${points} <span class="gem-icon gem-icon--sm"></span>`;
    document.getElementById("lvlprog-bar-next").innerHTML = `${nextPoints} <span class="gem-icon gem-icon--sm"></span> → ${LEVEL_NAMES[nextThreshold]}`;
  } else {
    document.getElementById("lvlprog-bar-fill").style.width = "100%";
    document.getElementById("lvlprog-bar-current").innerHTML = `${points} <span class="gem-icon gem-icon--sm"></span>`;
    document.getElementById("lvlprog-bar-next").textContent = "Max level reached!";
  }

  // Render level milestone cards
  const list = document.getElementById("lvlprog-list");
  list.innerHTML = thresholds.map((t, idx) => {
    const name = LEVEL_NAMES[t];
    const cls = t < level ? "unlocked" : t === level ? "current" : "locked";
    const label = t === level ? "Current" : t < level ? "Unlocked" : "Locked";
    const reqPoints = t * 100 - 100;
    const delay = idx * 80;
    return `
      <div class="lvlprog-item lvlprog-item--${cls}" style="animation-delay:${delay}ms">
        <div class="lvlprog-item-body">
          <div class="lvlprog-item-top">
            <span class="lvlprog-item-level">Level ${t}</span>
            <span class="lvlprog-item-badge lvlprog-item-badge--${cls}">${label}</span>
          </div>
          <div class="lvlprog-item-name">${name}</div>
          <div class="lvlprog-item-req">${reqPoints} total <span class="gem-icon gem-icon--sm gem-icon--inline"></span></div>
        </div>
      </div>`;
  }).join("");

  document.getElementById("lvlprog-modal").style.display = "flex";
  // Trigger stagger animation
  requestAnimationFrame(() => {
    document.querySelectorAll(".lvlprog-item").forEach((el, i) => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
  });
};

window.closeLevelsModal = function() {
  document.getElementById("lvlprog-modal").style.display = "none";
  document.querySelectorAll(".lvlprog-item").forEach(el => {
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
  });
};

window.copyReferralLink = function() {
  const input = document.getElementById("referral-link-input");
  navigator.clipboard.writeText(input.value).then(() => {
    const text = document.getElementById("referral-copy-text");
    const orig = text.innerHTML;
    text.innerHTML = '<i class="fas fa-check"></i> Copied!';
    setTimeout(() => { text.innerHTML = orig; }, 2000);
  }).catch(() => {
    input.select();
    document.execCommand("copy");
  });
};

window.shareReferralCard = function() {
  const code = document.getElementById("referral-link-input").value.split('ref=')[1] || '';
  const nameEl = document.getElementById("profile-name");
  const name = nameEl ? nameEl.textContent.trim() : 'A Deb8er';
  showReferralShareModal(name, code);
};

function renderPointsHistory(history) {
  const list = document.getElementById("points-history-list");
  if (!history || history.length === 0) {
    list.innerHTML = '<div class="history-empty">No gems earned yet — start learning or join a conference!</div>';
    return;
  }
  const sorted = [...history].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  list.innerHTML = sorted.map(e => {
    const iconMap = {
      conference: '<i class="fas fa-calendar-check"></i>',
      award: '<i class="fas fa-trophy"></i>',
      lesson: '<i class="fas fa-book-open"></i>',
      quest: '<i class="fas fa-bolt"></i>',
      first_login: '<i class="fas fa-star"></i>',
      referral_credit: '<i class="fas fa-gift"></i>',
      referral_bonus: '<i class="fas fa-gift"></i>',
      legacy: '<i class="fas fa-history"></i>',
      activity: '<i class="fas fa-arrow-right"></i>'
    };
    const icon = iconMap[e.type] || '<i class="fas fa-circle"></i>';
    const date = e.timestamp ? new Date(e.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
    const cls = e.amount > 0 ? "positive" : "negative";
    return `
      <div class="history-entry">
        <div class="history-icon">${icon}</div>
        <div class="history-info">
          <div class="history-label">${esc(e.label || "")}</div>
          <div class="history-date">${esc(date)}</div>
        </div>
        <div class="history-amount ${cls}">${e.amount > 0 ? "+" : ""}${e.amount || 0}</div>
      </div>`;
  }).join("");
}

function renderPointsChart(history, expectedTotal) {
  const section = document.getElementById("dash-chart-section");
  const canvas = document.getElementById("pointsChart");
  if (!section || !canvas || !history || history.length < 2) {
    if (section) section.style.display = "none";
    return;
  }
  // Destroy existing chart if any
  if (window.__pointsChart) { window.__pointsChart.destroy(); window.__pointsChart = null; }

  // Aggregate by day, compute cumulative
  const dayMap = {};
  const sorted = [...history].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  let cum = 0;
  for (const e of sorted) {
    if (e.amount == null) continue;
    const d = new Date(e.timestamp || Date.now());
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    cum += e.amount;
    dayMap[key] = cum;
  }
  // If the cumulative total doesn't match expectedTotal, force the last day to match
  if (expectedTotal != null) {
    const keys = Object.keys(dayMap);
    if (keys.length > 0 && cum !== expectedTotal) {
      dayMap[keys[keys.length - 1]] = expectedTotal;
    }
  }
  const labels = Object.keys(dayMap);
  const data = Object.values(dayMap);
  if (labels.length < 2) { section.style.display = "none"; return; }

  section.style.display = "block";
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, "rgba(58,190,255,0.2)");
  gradient.addColorStop(1, "rgba(58,190,255,0)");

  window.__pointsChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Gems",
        data,
        borderColor: "#3ABEFF",
        backgroundColor: gradient,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: "#3ABEFF",
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: "#6B7280", font: { size: 10 }, maxTicksLimit: 10 },
          grid: { color: "rgba(255,255,255,0.03)" }
        },
        y: {
          ticks: { color: "#6B7280", font: { size: 10 } },
          grid: { color: "rgba(255,255,255,0.04)" },
          beginAtZero: true
        }
      },
      interaction: { intersect: false, mode: "index" }
    }
  });
}

window.togglePointsHistory = function() {
  const body = document.getElementById("points-history-body");
  const chevron = document.getElementById("points-history-chevron");
  const isOpen = body.style.display === "block";
  body.style.display = isOpen ? "none" : "block";
  chevron.className = isOpen ? "fas fa-chevron-down" : "fas fa-chevron-up";
};

// ---- Country list ----
(function() {
  const dl = document.getElementById("edit-countryList");
  (window.COUNTRY_NAMES || []).forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    dl.appendChild(opt);
  });
})();

// ---- Auth gate ----
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "auth.html?tab=signin";
    return;
  }
  currentUID = user.uid;
  try {
    await loadProfile(user);
  } catch (err) {
    console.error("Failed to load profile:", err);
    // Retry once after a short delay in case the Firestore connection was still establishing
    if (err && err.message && /offline/i.test(err.message)) {
      setTimeout(async () => {
        try { await loadProfile(user); }
        catch (e2) {
          document.getElementById("dashboard-loading").innerHTML =
            '<span style="color:#f87171;">Could not reach the server. Check your connection and <a href="dashboard.html" style="color:#3ABEFF;">reload</a>.</span>';
        }
      }, 2500);
      return;
    }
    document.getElementById("dashboard-loading").innerHTML =
      '<span style="color:#f87171;">Could not load your profile. Please sign out and try again, or contact support.</span>';
  }
});

function renderConferences(confs) {
  const confList = document.getElementById("conferences-list");
  if (confs.length > 0) {
    confList.innerHTML = confs.map(c => {
      const isDebate = c.type === "debate";
      const badgeClass = isDebate ? "debate" : "mun";
      const badgeIcon = isDebate ? "fa-comments" : "fa-gavel";
      const badgeText = isDebate ? "Debate" : "MUN";
      const meta = [];
      if (c.portfolio) meta.push(`<span class="conf-meta"><i class="fas fa-flag"></i>${esc(c.portfolio)}</span>`);
      if (c.committee) meta.push(`<span class="conf-meta"><i class="fas fa-users-cog"></i>${esc(c.committee)}</span>`);
      if (c.region)    meta.push(`<span class="conf-meta"><i class="fas fa-map-marker-alt"></i>${esc(c.region)}</span>`);
      return `
      <div class="conf-item ${badgeClass}">
        <div class="conf-item-main">
          <div class="conf-title-row">
            <div class="conf-name">${esc(c.name || c.type || "Conference")}</div>
            <div class="conf-title-right">
              <span class="conf-badge ${badgeClass}"><i class="fas ${badgeIcon}"></i>${badgeText}</span>
              <span class="pts-chip"><span class="gem-icon gem-icon--sm"></span> +${CONF_POINTS}</span>
            </div>
          </div>
          ${meta.length ? `<div class="conf-meta-row">${meta.join("")}</div>` : ""}
          <div class="conf-date"><i class="far fa-calendar"></i>${esc(c.date || "")}</div>
        </div>
      </div>`;
    }).join("");
  }
}

function renderAwards(awards) {
  const awardList = document.getElementById("awards-list");
  if (awards.length > 0) {
    awardList.innerHTML = awards.map(a => {
      const tier = (a.title || "").toLowerCase();
      let tierClass = "default";
      if (tier.includes("gold")) tierClass = "gold";
      else if (tier.includes("silver")) tierClass = "silver";
      else if (tier.includes("bronze")) tierClass = "bronze";
      const icon = tierClass === "gold" ? "🥇" : tierClass === "silver" ? "🥈" : tierClass === "bronze" ? "🥉" : "🏅";
      const certBtn = a.certificateUrl
        ? `<a class="cert-download-btn" href="${esc(a.certificateUrl)}" target="_blank" title="Download Certificate">
             <i class="fas fa-file-pdf"></i>
           </a>`
        : a.certificateId
          ? `<a class="cert-download-btn" href="#" data-cert-id="${esc(a.certificateId)}" title="Download Certificate">
               <i class="fas fa-file-pdf"></i>
             </a>`
          : "";
      return `
      <div class="award-item">
        <div class="award-icon ${tierClass}">${icon}</div>
        <div class="award-info">
          <div class="award-info-top">
            <h4>${esc(a.title || "Award")}</h4>
            <span class="pts-chip"><span class="gem-icon gem-icon--sm"></span> +${awardPointsFor(a)}</span>
          </div>
          <span class="award-sub">${esc(a.conference || "")}</span>
          ${a.certificateId ? `
            <span class="award-cert">
              ID: ${esc(a.certificateId)} ${certBtn}
            </span>` : ""}
        </div>
      </div>`;
    }).join("");
  }
}

async function loadProfile(user) {
  const PROFILE_CACHE_KEY = 'deb8er_profile_' + user.uid;

  // Try cache first for instant header render
  try {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY);
    if (cached && !window._profileRetried) {
      const cd = JSON.parse(cached);
      if (cd && cd.fullName) {
        const initials = (cd.fullName || cd.nickName || "?")
          .split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
        document.getElementById("profile-avatar").textContent = initials;
        document.getElementById("profile-name").textContent = cd.fullName || "—";
        document.getElementById("profile-nick").textContent = cd.nickName ? `@${cd.nickName}` : "";
        document.getElementById("profile-email").textContent = cd.email || user.email;
        document.getElementById("dashboard-loading").style.display = "none";
        document.getElementById("dashboard-content").style.display = "block";
      }
    }
  } catch (_) {}

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) {
    // Retry once after a delay in case Firestore write hasn't propagated yet
    if (!window._profileRetried) {
      window._profileRetried = true;
      await new Promise(r => setTimeout(r, 2000));
      return await loadProfile(user);
    }
    document.getElementById("dashboard-loading").innerHTML =
      '<span style="color:#f87171;">No profile found for this account. Please <a href="auth.html" style="color:#3ABEFF;">sign up</a> again.</span>';
    return;
  }
  const d = snap.data();

  // Email verification gate (only for users who've started OTP flow)
  if (d.otpHash && !d.otpVerified) {
    window.location.href = "auth.html";
    return;
  }

  // Cache profile for instant load on next visit
  try {
    const PROFILE_CACHE_KEY = 'deb8er_profile_' + user.uid;
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(d));
  } catch (_) {}

  // Avatar initials
  const initials = (d.fullName || d.nickName || "?")
    .split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  document.getElementById("profile-avatar").textContent = initials;

  // Header
  document.getElementById("profile-name").textContent   = d.fullName   || "—";
  document.getElementById("profile-nick").textContent   = d.nickName   ? `@${d.nickName}` : "";
  document.getElementById("profile-email").textContent  = d.email      || user.email;
  document.getElementById("profile-points").textContent = d.points     ?? 0;

  // Point history: backfill for existing users (one-time migration)
  // This MUST run before showReferralLink so referral points are counted
  if (!d.pointHistory || d.pointHistory.length === 0) {
    const historyEntries = [];
    (d.conferences || []).forEach(c => {
      historyEntries.push(makeHistoryEntry(CONF_POINTS, "conference", `Attended: ${c.name || c.type || "Conference"}`, c.date ? new Date(c.date).getTime() : Date.now()));
    });
    (d.awards || []).forEach(a => {
      historyEntries.push(makeHistoryEntry(awardPointsFor(a), "award", `${a.title || "Award"} — ${a.conference || ""}`, a.eventDate ? new Date(a.eventDate).getTime() : Date.now()));
    });
    const referralCount = (d.referrals || []).length;
    const hasReferralBonus = d.referredBy && (d.activityPoints || 0) >= REFERRAL_POINTS;
    if (referralCount > 0) {
      for (let i = 0; i < referralCount; i++) {
        historyEntries.push(makeHistoryEntry(REFERRER_POINTS, "referral_credit", "Referred a friend"));
      }
    }
    if (hasReferralBonus) {
      historyEntries.push(makeHistoryEntry(REFERRAL_POINTS, "referral_bonus", "Signup referral bonus"));
    }
    const activityDeductions = (referralCount * REFERRER_POINTS) + (hasReferralBonus ? REFERRAL_POINTS : 0);
    const remainingActivity = (d.activityPoints || 0) - activityDeductions;
    if (remainingActivity > 0) {
      historyEntries.push(makeHistoryEntry(remainingActivity, "activity", "Activity gems"));
    }
    if (historyEntries.length > 0) {
      retryWrite(() => updateDoc(doc(db, "users", currentUID), { pointHistory: historyEntries }));
      d.pointHistory = historyEntries;
    }
  }

  // Ensure pointHistory total matches computed total (reconciles any missing entries)
  if (d.pointHistory && d.pointHistory.length > 0) {
    const computedTotal = computeTotalPoints(d);
    const historyTotal = d.pointHistory.reduce((s, e) => s + (e.amount || 0), 0);
    const diff = computedTotal - historyTotal;
    if (diff >= 10) {
      const catchUp = makeHistoryEntry(diff, "activity", "Gem catch-up");
      retryWrite(() => updateDoc(doc(db, "users", currentUID), { pointHistory: arrayUnion(catchUp) }));
      d.pointHistory.push(catchUp);
    }
  }

  // Referral: backfill code + show link immediately, credit referrals in background
  const referralCode = await ensureReferralCode(d, currentUID);
  showReferralLink(referralCode, d.referrals, d.pointHistory);
  creditReferrals(d, currentUID, referralCode).catch(() => {});

  // Refresh points count in case referrals were just credited
  document.getElementById("profile-points").textContent = computeTotalPoints(d) || 0;

  // Edit fields
  document.getElementById("edit-fullname").value = d.fullName  || "";
  document.getElementById("edit-nickname").value = d.nickName  || "";
  document.getElementById("edit-phone").value    = d.phone     || "";
  document.getElementById("edit-age").value      = d.age       || "";
  document.getElementById("edit-country").value  = d.country   || "";

  // Past conferences + awards from Firestore
  const allConfs = d.conferences || [];
  let allAwards = d.awards || [];

  // Points — unified system (conferences + awards + activityPoints)
  let ap = d.activityPoints || 0;

  // One-time migration: fold old learningPoints into activityPoints
  const oldXP = d.learningPoints || 0;
  if (oldXP > 0 && ap < oldXP) {
    ap = oldXP;
    updateDoc(doc(db, "users", currentUID), {
      activityPoints: oldXP,
      learningPoints: 0
    }).catch(() => {});
  }

  const dMigrated = { ...d, activityPoints: ap };
  const pointsValue = computeTotalPoints(dMigrated);
  document.getElementById("profile-points").textContent = pointsValue;

  // Check & save new badges from conferences/awards
  const newBadges = checkBadgesFromLearning(d.learning || {}, allConfs, allAwards, {
    referrals: d.referrals || [],
    fullName: d.fullName,
    activityPoints: ap,
    allLessonIds: ALL_LESSON_IDS,
    badgeShards: d.badgeShards || 0
  });
  if (newBadges.length > 0) {
    const achievements = d.learning?.achievements || [];
    for (const b of newBadges) {
      if (!achievements.includes(b.id)) achievements.push(b.id);
    }
    updateDoc(doc(db, "users", currentUID), { "learning.achievements": achievements }).catch(() => {});
    for (const b of newBadges) {
      showToast(`Badge unlocked: ${b.label}!`, "success", 4000);
    }
  }

  // Sync to public leaderboard collection
  syncLeaderboard(db, currentUID, dMigrated).catch(() => {});

  // First Login bonus — checks if this is the first time ever
  if (!d._firstLoginBonus && !user.isAnonymous) {
    const newAp = ap + ACTIVITY_POINTS.firstLogin;
    const fbEntry = makeHistoryEntry(ACTIVITY_POINTS.firstLogin, "first_login", "First login bonus");
    retryWrite(() => updateDoc(doc(db, "users", currentUID), {
      activityPoints: newAp,
      _firstLoginBonus: true,
      pointHistory: arrayUnion(fbEntry)
    })).then(() => {
      document.getElementById("profile-points").textContent = parseInt(document.getElementById("profile-points").textContent) + ACTIVITY_POINTS.firstLogin;
      showToast(`+${ACTIVITY_POINTS.firstLogin} <span class="gem-icon gem-icon--sm"></span> — First Login Bonus!`, "success");
      if (!d.pointHistory) d.pointHistory = [];
      d.pointHistory.push(fbEntry);
      syncLeaderboard(db, currentUID, { ...dMigrated, activityPoints: newAp, pointHistory: d.pointHistory }).catch(() => {});
    }).catch(() => {});
  }

  // ---- Learning stats ----
  const learning = d.learning || {};
  const streak = learning.streak || 0;
  const completedCount = (learning.completedLessons || []).length;
  const totalLessons = 17;
  const xp = learning.totalXP || 0;
  const level = getLevel(xp);
  const badgeEarned = (learning.achievements || []).length;

  const pointsLevel = getLevelFromPoints(pointsValue);
  const prevLevel = d.lastLevel;
  if (prevLevel !== undefined && pointsLevel > prevLevel) {
    const newName = getLevelName(pointsLevel);
    document.getElementById("lvlup-name").textContent = newName;
    document.getElementById("lvlup-num").textContent = `Level ${pointsLevel}`;
    document.getElementById("lvlup-modal").style.display = "flex";
    loadConfetti().then(fn => {
      if (typeof fn !== 'function') return;
      fn({ particleCount: 150, spread: 100, origin: { x: 0.5, y: 0.4 }, colors: ['#3ABEFF', '#a68af9', '#FBBF24', '#22d3ee'] });
      setTimeout(() => fn({ particleCount: 80, spread: 140, origin: { x: 0.5, y: 0.3 }, colors: ['#3ABEFF', '#FBBF24'] }), 300);
    });
  }
  if ((prevLevel || 1) < pointsLevel) {
    updateDoc(doc(db, "users", currentUID), { lastLevel: pointsLevel }).catch(() => {});
  }
  document.getElementById("stat-level").innerHTML = getLevelStatHTML(pointsLevel);
  // Level card click → levels modal
  document.getElementById("stat-card-level").onclick = () => openLevelsModal(pointsLevel, pointsValue);
  document.getElementById("stat-conferences").textContent = allConfs.length;
  document.getElementById("stat-awards").textContent = allAwards.length;
  document.getElementById("stat-streak").textContent = streak;
  document.getElementById("badgeCountDash").textContent = `${badgeEarned} badges`;

  // Show dashboard immediately (Firestore data is ready)
  document.getElementById("dashboard-loading").style.display  = "none";
  document.getElementById("dashboard-content").style.display  = "block";

  // Streak at-risk alert
  const today = new Date().toISOString().split("T")[0];
  const lastActivity = learning.lastActivity;
  const dailyDone = learning.dailyLessonDone;
  const freezeCount = d.streakFreeze || 0;
  if (streak > 0 && lastActivity !== today && !dailyDone) {
    const el = document.getElementById("streak-alert");
    document.getElementById("streak-alert-title").textContent = `Your ${streak}-day streak is at risk!`;
    document.getElementById("streak-alert-sub").textContent = lastActivity
      ? `Complete a lesson today to keep it alive.`
      : `Start your first lesson to build your streak.`;
    el.style.display = "block";
    const freezeBtn = document.getElementById('freeze-btn');
    if (freezeCount > 0) {
      freezeBtn.style.display = 'inline-flex';
      freezeBtn.textContent = `❄️ Use Streak Freeze (${freezeCount})`;
      freezeBtn.onclick = async () => {
        freezeBtn.disabled = true;
        freezeBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
        try {
          await updateDoc(doc(db, "users", currentUID), {
            streakFreeze: freezeCount - 1,
            "learning.lastActivity": today
          });
          d.streakFreeze = freezeCount - 1;
          d.learning.lastActivity = today;
          el.style.display = 'none';
          showToast('❄️ Streak Freeze used! Your streak is safe.', 'success');
        } catch (e) {
          console.error('Freeze failed:', e);
          freezeBtn.disabled = false;
          freezeBtn.textContent = `❄️ Try Again`;
        }
      };
    } else {
      document.getElementById('freeze-btn').style.display = 'none';
    }
  }

  // ---- Continue Learning ----
  const lastLesson = learning.lastLesson;
  if (lastLesson && lastLesson.title) {
    document.getElementById("continue-lesson-title").textContent = lastLesson.title;
    document.getElementById("continue-lesson-unit").textContent = lastLesson.unit || "";
    document.getElementById("dash-continue").style.display = "flex";
  }

  // Render conferences + awards (from Firestore data)
  renderConferences(allConfs);
  renderAwards(allAwards);

  // Render earned badges
  const earnedBadgeIds = new Set(learning.achievements || []);
  const earnedBadges = BADGES.filter(b => earnedBadgeIds.has(b.id));
  const badgeWrap = document.getElementById("dashBadgesWrap");
  const badgeGrid = document.getElementById("dashBadgesGrid");
  if (earnedBadges.length > 0) {
    badgeWrap.style.display = "block";
    badgeGrid.innerHTML = earnedBadges.map(b => {
      const stripHtml = s => s.replace(/<[^>]*>/g, '').trim();
      const safeDesc = stripHtml(b.desc).replace(/"/g, '&quot;');
      return `
      <div class="dash-badge-item" data-badge-id="${b.id}" title="${safeDesc}">
        <div class="dash-badge-icon"><i class="${b.icon}"></i></div>
        <div class="dash-badge-label">${b.label}</div>
      </div>
    `}).join("");
  }

  // Badge click — show share card
  if (badgeGrid) {
    badgeGrid.addEventListener("click", (e) => {
      const item = e.target.closest(".dash-badge-item");
      if (!item) return;
      const badgeId = item.dataset.badgeId;
      const badge = BADGES.find(b => b.id === badgeId);
      if (badge) showBadgeShareModal(badge, d.nickName || d.fullName || "A Deb8er");
    });
  }

  // Render points history
  renderPointsHistory(d.pointHistory);

  // Render points chart
  renderPointsChart(d.pointHistory, computeTotalPoints(d));

  // Debix mascot
  initDebix();
  const isNew = !d._firstLoginBonus;
  const completedLessonCount = (d.learning?.completedLessons || []).length;
  setTimeout(() => {
    welcome(d.fullName, {
      streak,
      level: pointsLevel,
      lastActivity,
      today,
      completedLessons: completedLessonCount,
      isNewUser: isNew
    });
    if (newBadges.length > 0) {
      setTimeout(() => badge(newBadges[0].label), 3000);
    }
  }, isNew ? 2000 : 500);
  if (streak > 0 && lastActivity !== today && !dailyDone) {
    setTimeout(() => atRisk(), 5000);
  }
  startTips({ page: 'dashboard' });

  const { canSpin, spinsLeft, hasExtra } = getDailySpinStatus(d);
  const setSpinSub = () => {
    const el = document.getElementById('dash-spin-sub');
    if (hasExtra) el.textContent = 'Bonus spin available!';
    else if (canSpin) el.textContent = 'Spin for daily rewards!';
    else el.textContent = `Next spin in ${getSpinCountdown()}`;
  };
  setSpinSub();
  if (!canSpin && !hasExtra) {
    setInterval(setSpinSub, 10000);
  }
  document.getElementById('dash-spin-btn').disabled = !canSpin;

  const spinSave = async (seg, userData) => {
    const today = new Date().toISOString().split('T')[0];
    const updates = {};
    let earnedGems = 0;

    if (seg.gems) {
      earnedGems = seg.gems;
    } else if (seg.mystery) {
      earnedGems = [30, 50, 80][Math.floor(Math.random() * 3)];
    } else if (seg.freeze) {
      updates.streakFreeze = (userData.streakFreeze || 0) + 1;
    } else if (seg.shard) {
      updates.badgeShards = (userData.badgeShards || 0) + 1;
    }

    const historyEntry = makeHistoryEntry(earnedGems, "quest", `Daily Spin — ${seg.label}`);
    if (!userData.pointHistory) userData.pointHistory = [];
    updates.pointHistory = [...userData.pointHistory, historyEntry];

    if (!hasExtra) {
      updates.lastSpinDate = today;
    } else {
      updates.extraSpinAvailable = false;
    }

    if (earnedGems > 0) {
      const newAp = (userData.activityPoints || 0) + earnedGems;
      updates.activityPoints = newAp;
      if (!userData.learning) userData.learning = {};
      if (userData.learning.todayDate !== today) {
        userData.learning.todayXP = 0;
        userData.learning.todayDate = today;
      }
      userData.learning.todayXP = (userData.learning.todayXP || 0) + earnedGems;
      updates['learning.todayXP'] = userData.learning.todayXP;
      updates['learning.todayDate'] = userData.learning.todayDate;
    }

    await updateDoc(doc(db, "users", currentUID), updates);
    d.lastSpinDate = hasExtra ? d.lastSpinDate : today;
    d.extraSpinAvailable = hasExtra ? false : undefined;

    if (earnedGems > 0) {
      d.activityPoints = (d.activityPoints || 0) + earnedGems;
      if (!d.learning) d.learning = {};
      d.learning.todayXP = (d.learning.todayXP || 0) + earnedGems;
      d.learning.todayDate = today;
      d.pointHistory = updates.pointHistory;
      document.getElementById("profile-points").textContent = computeTotalPoints(d);
      syncLeaderboard(db, currentUID, d).catch(() => {});
    }
    showToast(`+${earnedGems || '?'} <span class="gem-icon gem-icon--sm"></span> — Daily Spin!`, "success");
  };

  document.getElementById('dash-spin-card').addEventListener('click', () => openSpinWheel(d, spinSave));
  document.getElementById('dash-spin-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openSpinWheel(d, spinSave);
  });

  // Onboarding tour for new users
  const lessonsDone = (d.learning?.completedLessons || []).length;
  const hasConfs = allConfs.length > 0;
  const hasAwards = allAwards.length > 0;
  if (!lessonsDone && !hasConfs && !hasAwards && !localStorage.getItem('deb8er-onboarded')) {
    showOnboarding();
  }

  // Background: merge sheet data (non-blocking, re-renders awards/conferences when done)
  mergeSheetData(d, allConfs, allAwards, user);

  // Certificate download click handler (event delegation)
  document.getElementById("awards-list").addEventListener("click", async (e) => {
    const btn = e.target.closest(".cert-download-btn");
    if (!btn) return;
    const certId = btn.dataset.certId;
    if (!certId) return;
    e.preventDefault();
    if (btn.classList.contains("loading")) return;
    btn.classList.add("loading");
    btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
    try {
      const resp = await fetch(SHEET_API, {
        method: "POST", mode: "cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ action: "lookupCertificate", certificateId: certId })
      });
      const data = await resp.json();
      if (data.success && data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
        const updated = allAwards.map(a =>
          a.certificateId === certId ? { ...a, certificateUrl: data.downloadUrl } : a
        );
        allAwards = updated;
        retryWrite(() => updateDoc(doc(db, "users", currentUID), { awards: updated }));
        btn.outerHTML = `<a class="cert-download-btn" href="${esc(data.downloadUrl)}" target="_blank" title="Download Certificate"><i class="fas fa-file-pdf"></i></a>`;
      } else if (data.status === "processing") {
        showToast("Certificate is being generated. Try again shortly.", "info");
        btn.classList.remove("loading");
        btn.innerHTML = '<i class="fas fa-file-pdf"></i>';
      } else if (data.status === "pending") {
        showToast("Results not yet released.", "info");
        btn.classList.remove("loading");
        btn.innerHTML = '<i class="fas fa-file-pdf"></i>';
      } else {
        showToast("Certificate not found.", "error");
        btn.classList.remove("loading");
        btn.innerHTML = '<i class="fas fa-file-pdf"></i>';
      }
    } catch (err) {
      console.warn("Cert download failed:", err);
      showToast("Network error. Check your connection.", "error");
      if (document.contains(btn)) {
        btn.classList.remove("loading");
        btn.innerHTML = '<i class="fas fa-file-pdf"></i>';
      }
    }
  });
}

function mergeSheetData(d, allConfs, allAwards, user) {
  const emailForSheet = encodeURIComponent(d.email || user.email);
  fetch(`${SHEET_API}?action=getProfile&email=${emailForSheet}`, { method: "GET", mode: "cors" })
    .then(r => r.json())
    .then(sheetData => {
      if (DEBUG) console.log("[getProfile] Response:", JSON.stringify(sheetData));
      if (!sheetData || !sheetData.success || (!sheetData.awards?.length && !sheetData.conferences?.length)) return;

      // Merge conferences from sheet (backfill for rows logged to sheet only)
      if (sheetData.conferences?.length) {
        const existingKeys = new Set();
        allConfs.forEach(c => {
          const k = c.certificateId || c.conferenceId || "";
          if (k) existingKeys.add(k);
        });
        for (const sc of sheetData.conferences) {
          const key = sc.certificateId || sc.conferenceId || "";
          if (key && existingKeys.has(key)) continue;
          allConfs.push(sc);
          if (key) existingKeys.add(key);
        }
        updateDoc(doc(db, "users", currentUID), { conferences: allConfs }).catch(() => {});
      }

      // Merge awards: keep existing Firestore awards, update with sheet data
      const sheetAwards = sheetData.awards || [];
      if (sheetAwards.length) {
        const existingById = {};
        allAwards.forEach(a => { if (a.certificateId) existingById[a.certificateId] = a; });
        const newAwardEntries = [];
        for (const sa of sheetAwards) {
          if (!sa.certificateId) continue;
          const existing = existingById[sa.certificateId];
          if (existing) {
            if (sa.certificateUrl && sa.certificateUrl !== existing.certificateUrl) {
              Object.assign(existing, { certificateUrl: sa.certificateUrl });
            }
          } else {
            allAwards.push(sa);
            newAwardEntries.push(makeHistoryEntry(awardPointsFor(sa), "award", `${sa.title || "Award"} — ${sa.conference || ""}`));
          }
        }
        const persistData = { awards: allAwards };
        if (newAwardEntries.length > 0) persistData.pointHistory = arrayUnion(...newAwardEntries);
        updateDoc(doc(db, "users", currentUID), persistData).catch(() => {});
        if (newAwardEntries.length > 0) {
          if (!d.pointHistory) d.pointHistory = [];
          d.pointHistory.push(...newAwardEntries);
        }
      }

      // Re-render with merged data
      renderConferences(allConfs);
      renderAwards(allAwards);
      document.getElementById("stat-conferences").textContent = allConfs.length;
      document.getElementById("stat-awards").textContent = allAwards.length;
      document.getElementById("profile-points").textContent = computeTotalPoints(d);
    })
    .catch(err => console.warn("Sheet merge failed (non-critical):", err));
}

// ---- EDIT PROFILE MODAL ----
const modal       = document.getElementById("profile-modal");
const editBtn     = document.getElementById("profile-edit-btn");
const closeBtn    = document.getElementById("profile-modal-close");

function openProfileModal() {
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeProfileModal() {
  modal.classList.remove("open");
  document.body.style.overflow = "";
}

editBtn.addEventListener("click", openProfileModal);
closeBtn.addEventListener("click", closeProfileModal);
modal.addEventListener("click", e => { if (e.target === modal) closeProfileModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && modal.classList.contains("open")) closeProfileModal(); });

// ---- SAVE PROFILE ----
window.saveProfile = async function() {
  const btn   = document.getElementById("save-profile-btn");
  const msgEl = document.getElementById("profile-save-msg");
  msgEl.className = "auth-message";

  const data = {
    fullName: document.getElementById("edit-fullname").value.trim(),
    nickName: document.getElementById("edit-nickname").value.trim(),
    phone:    document.getElementById("edit-phone").value.trim(),
    age:      parseInt(document.getElementById("edit-age").value) || null,
    country:  document.getElementById("edit-country").value.trim()
  };

  btn.disabled = true;
  btn.textContent = "Saving…";

  try {
    await updateDoc(doc(db, "users", currentUID), data);

    // Sync displayName to Firebase Auth so it's available elsewhere
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: data.fullName }).catch(() => {});
    }

    // Update header live
    document.getElementById("profile-name").textContent = data.fullName || "—";
    document.getElementById("profile-nick").textContent = data.nickName ? `@${data.nickName}` : "";
    const initials = (data.fullName || data.nickName || "?")
      .split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    document.getElementById("profile-avatar").textContent = initials;

    // Update localStorage cache so navbar picks up new name on other pages
    try {
      const PROFILE_CACHE_KEY = 'deb8er_profile_' + currentUID;
      const cached = JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || '{}');
      Object.assign(cached, data);
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cached));
    } catch (_) {}

    // Sync name change to leaderboard
    try {
      const dSnap = await getDoc(doc(db, "users", currentUID));
      if (dSnap.exists()) syncLeaderboard(db, currentUID, dSnap.data()).catch(() => {});
    } catch (_) {}

    // Notify navbar to re-render on the same page
    window.dispatchEvent(new CustomEvent('deb8er-profile-updated', { detail: data }));

    msgEl.textContent  = "Profile saved!";
    msgEl.className    = "auth-message success";
  } catch (err) {
    msgEl.textContent  = "Failed to save. Please try again.";
    msgEl.className    = "auth-message error";
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save" style="margin-right:6px;"></i> Save Changes';
    setTimeout(() => { msgEl.className = "auth-message"; }, 3000);
  }
};

function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const icon = type === "success" ? "fa-check-circle" : type === "error" ? "fa-exclamation-circle" : "fa-info-circle";
  toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ---- ONBOARDING (Spotlight Tour) ----
function showOnboarding() {
  const isMobile = window.innerWidth <= 768;
  const PAD = isMobile ? 8 : 12;
  const RADIUS = 14;
  const TOOLTIP_GAP = 16;

  const steps = [
    {
      selector: '.dash-hero',
      title: 'Your Dashboard',
      desc: 'This is your command center. Your profile, gems, and stats are all here.'
    },
    {
      selector: '.dash-stats',
      title: 'Track Your Progress',
      desc: 'Your level, conferences, awards, and streak — all visible at a glance.'
    },
    {
      selector: '.dash-spin-card',
      title: 'Daily Spin',
      desc: 'Spin once a day for gems, streak freezes, and badge shards. Complete all 3 daily quests for a bonus spin.'
    },
    {
      findCard: 'fa-graduation-cap',
      title: 'Skills Lab',
      desc: '29 interactive lessons across debate, public speaking, MUN, and critical thinking. Earn gems with every lesson.'
    },
    {
      findCard: 'fa-globe-americas',
      title: 'Ready to Compete?',
      desc: 'Sign up for live MUN and debate conferences. Earn certificates and awards.'
    }
  ];

  // Filter out steps whose targets don't exist
  const activeSteps = steps.filter(s => {
    if (s.selector) return !!document.querySelector(s.selector);
    if (s.findCard) {
      const cards = document.querySelectorAll('.dashboard-card');
      for (const c of cards) { if (c.querySelector('.' + s.findCard)) return true; }
    }
    return false;
  });
  if (activeSteps.length === 0) return;

  let currentStep = 0;
  let destroyed = false;

  // Inject CSS (once)
  const styleId = 'spotlight-tour-styles';
  if (!document.getElementById(styleId)) {
    const st = document.createElement('style');
    st.id = styleId;
    st.textContent = `
      @keyframes st-fade-in { from { opacity: 0 } to { opacity: 1 } }
      @keyframes st-fade-out { from { opacity: 1 } to { opacity: 0 } }
      @keyframes st-pulse {
        0%, 100% { box-shadow: 0 0 16px rgba(166,138,249,0.2) }
        50% { box-shadow: 0 0 28px rgba(166,138,249,0.35) }
      }
      @keyframes st-tip-in {
        from { opacity: 0; transform: translateY(10px) }
        to { opacity: 1; transform: translateY(0) }
      }

      #st-overlay {
        position: fixed; inset: 0; z-index: 99999;
        opacity: 0; pointer-events: none;
        animation: st-fade-in 0.35s ease forwards;
      }
      #st-overlay.visible { pointer-events: auto }
      #st-overlay.hiding {
        animation: st-fade-out 0.25s ease forwards;
        pointer-events: none !important;
      }

      #st-cutout {
        position: fixed; z-index: 100000;
        border: 2px solid rgba(166, 138, 249, 0.5);
        border-radius: ${RADIUS}px;
        pointer-events: none;
        transition: top 0.45s cubic-bezier(.22,1,.36,1),
                    left 0.45s cubic-bezier(.22,1,.36,1),
                    width 0.45s cubic-bezier(.22,1,.36,1),
                    height 0.45s cubic-bezier(.22,1,.36,1);
        animation: st-pulse 2.5s ease-in-out infinite;
      }

      #st-tip {
        position: fixed; z-index: 100001;
        background: #111827;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px; padding: 24px;
        max-width: 340px; min-width: 260px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.6);
        opacity: 0;
        animation: st-tip-in 0.35s ease 0.1s forwards;
        pointer-events: auto;
      }
      #st-tip.st-exit { animation: none; opacity: 0; transition: opacity 0.12s ease }

      .st-label {
        font-family: "Montserrat", system-ui;
        font-size: 11px; font-weight: 600; letter-spacing: 1px;
        text-transform: uppercase; color: rgba(166,138,249,0.7);
        margin-bottom: 8px;
      }
      .st-title {
        font-family: "Unbounded", sans-serif;
        font-size: 17px; font-weight: 700; color: #E5E7EB;
        margin: 0 0 8px; line-height: 1.3;
      }
      .st-desc {
        font-size: 14px; line-height: 1.6; color: #9CA3AF;
        margin: 0 0 20px;
      }
      .st-progress { display: flex; gap: 5px; margin-bottom: 20px }
      .st-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: rgba(255,255,255,0.1); transition: all 0.3s ease;
      }
      .st-dot.active {
        width: 20px; border-radius: 3px;
        background: linear-gradient(90deg, #a68af9, #3ABEFF);
      }
      .st-actions { display: flex; align-items: center; gap: 10px }
      .st-skip {
        background: none; border: none; color: #6B7280;
        font-family: "Montserrat", system-ui;
        font-size: 12px; font-weight: 500; cursor: pointer;
        padding: 8px 12px; border-radius: 8px;
        transition: color 0.2s ease; white-space: nowrap;
      }
      .st-skip:hover { color: #E5E7EB }
      .st-next {
        flex: 1; padding: 12px 20px; border-radius: 10px; border: none;
        font-family: "Montserrat", system-ui;
        font-size: 13px; font-weight: 600; cursor: pointer;
        color: #0B0E14;
        background: linear-gradient(90deg, #a68af9, #3ABEFF);
        transition: all 0.25s cubic-bezier(.22,1,.36,1);
        white-space: nowrap;
      }
      .st-next:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(58,190,255,0.3) }
      .st-next:active { transform: scale(0.97) }

      @media (max-width: 768px) {
        #st-tip {
          position: fixed !important;
          bottom: 16px !important; left: 16px !important;
          right: 16px !important; top: auto !important;
          max-width: none; min-width: 0; width: auto;
        }
        .st-next { padding: 14px 20px; font-size: 14px }
        .st-skip { font-size: 13px; padding: 10px 14px }
      }
    `;
    document.head.appendChild(st);
  }

  // Create DOM
  const overlay = document.createElement('div');
  overlay.id = 'st-overlay';
  overlay.tabIndex = 0;
  overlay.innerHTML = `
    <div id="st-cutout"></div>
    <div id="st-tip">
      <div class="st-label" id="stLabel"></div>
      <div class="st-title" id="stTitle"></div>
      <div class="st-desc" id="stDesc"></div>
      <div class="st-progress" id="stProgress"></div>
      <div class="st-actions">
        <button class="st-skip" id="stSkip">Skip tour</button>
        <button class="st-next" id="stNext">Next</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const cutout = document.getElementById('st-cutout');
  const tip = document.getElementById('st-tip');
  const labelEl = document.getElementById('stLabel');
  const titleEl = document.getElementById('stTitle');
  const descEl = document.getElementById('stDesc');
  const progressEl = document.getElementById('stProgress');
  const nextBtn = document.getElementById('stNext');
  const skipBtn = document.getElementById('stSkip');

  // Build progress dots
  activeSteps.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'st-dot' + (i === 0 ? ' active' : '');
    progressEl.appendChild(d);
  });

  function findEl(step) {
    if (step.selector) return document.querySelector(step.selector);
    if (step.findCard) {
      for (const c of document.querySelectorAll('.dashboard-card')) {
        if (c.querySelector('.' + step.findCard)) return c;
      }
    }
    return null;
  }

  function getRect(step) {
    const el = findEl(step);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      top: r.top - PAD, left: r.left - PAD,
      w: r.width + PAD * 2, h: r.height + PAD * 2,
      cx: r.left + r.width / 2
    };
  }

  function positionCutout(rect) {
    if (!rect) return;
    cutout.style.top = rect.top + 'px';
    cutout.style.left = rect.left + 'px';
    cutout.style.width = rect.w + 'px';
    cutout.style.height = rect.h + 'px';
  }

  function positionTip(rect) {
    if (!rect) return;
    tip.classList.remove('st-exit');
    void tip.offsetWidth;
    tip.style.animation = 'none';
    void tip.offsetWidth;
    tip.style.animation = '';

    if (isMobile) { tip.style.cssText = ''; return; }

    const tipH = tip.offsetHeight || 200;
    const tipW = tip.offsetWidth || 300;
    let top = rect.top + rect.h + TOOLTIP_GAP;
    let left = rect.cx - tipW / 2;
    if (top + tipH > window.innerHeight - 20) top = rect.top - TOOLTIP_GAP - tipH;
    left = Math.max(20, Math.min(left, window.innerWidth - tipW - 20));
    top = Math.max(20, top);
    tip.style.top = top + 'px';
    tip.style.left = left + 'px';
  }

  function renderStep() {
    const s = activeSteps[currentStep];
    labelEl.textContent = 'Step ' + (currentStep + 1) + ' of ' + activeSteps.length;
    titleEl.textContent = s.title;
    descEl.textContent = s.desc;
    nextBtn.textContent = currentStep === activeSteps.length - 1 ? 'Get Started' : 'Next';
    progressEl.querySelectorAll('.st-dot').forEach((d, i) => d.classList.toggle('active', i === currentStep));

    const rect = getRect(s);
    if (!rect) { skipStep(); return; }
    positionCutout(rect);
    positionTip(rect);
  }

  function scrollToEl(cb) {
    const el = findEl(activeSteps[currentStep]);
    if (!el) { cb(); return; }
    const r = el.getBoundingClientRect();
    if (r.top >= 0 && r.bottom <= window.innerHeight) { cb(); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(cb, 350);
  }

  function goToStep(idx) {
    currentStep = idx;
    tip.classList.add('st-exit');
    setTimeout(() => {
      scrollToEl(() => { renderStep(); tip.classList.remove('st-exit'); });
    }, 120);
  }

  function skipStep() {
    if (currentStep < activeSteps.length - 1) goToStep(currentStep + 1);
    else complete();
  }

  function complete() {
    if (destroyed) return;
    destroyed = true;
    overlay.classList.add('hiding');
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 300);
    localStorage.setItem('deb8er-onboarded', '1');
    window.removeEventListener('scroll', recalc);
    window.removeEventListener('resize', recalc);
  }

  function recalc() {
    if (destroyed) return;
    const rect = getRect(activeSteps[currentStep]);
    if (rect) { positionCutout(rect); positionTip(rect); }
  }
  let scrollTimer;
  const onScroll = () => { clearTimeout(scrollTimer); scrollTimer = setTimeout(recalc, 60); };

  nextBtn.addEventListener('click', skipStep);
  skipBtn.addEventListener('click', complete);
  overlay.addEventListener('click', e => { if (e.target === overlay) complete(); });
  overlay.addEventListener('keydown', e => {
    if (e.key === 'Escape') complete();
    if (e.key === 'Enter') skipStep();
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // Start after a frame so dashboard layout is settled
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
      scrollToEl(() => renderStep());
    });
  });
}

// ---- SIGN OUT ----
window.signOut = async function() {
  // Clear cached profile
  try {
    const uid = auth.currentUser?.uid;
    if (uid) localStorage.removeItem('deb8er_profile_' + uid);
  } catch (_) {}
  await fbSignOut(auth);
  window.location.href = "index.html";
};
