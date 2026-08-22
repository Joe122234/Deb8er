import { doc, setDoc, getDoc, getDocs, collection, query, where } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

export const CONF_POINTS = 15;
export const AWARD_POINTS = {
  "participation": 20,
  "high commendation": 30,
  "best beginner": 40,
  "special mention": 50,
  "best position paper": 50,
  "best diplomat": 40,
  "runner up": 50,
  "runner-up": 50,
  "best delegate": 100,
  "best deb8er": 100
};
export const awardKey = t => (t || "").toString().trim().toLowerCase();
export const awardPointsFor = a => {
  const k = awardKey(a.title);
  return AWARD_POINTS[k] != null ? AWARD_POINTS[k] : 20;
};

export function computeTotalPoints(userData) {
  const confs = userData.conferences || [];
  const awards = userData.awards || [];
  const activityPoints = userData.activityPoints || 0;
  let pts = confs.length * CONF_POINTS;
  for (const a of awards) pts += awardPointsFor(a);
  pts += activityPoints;
  return pts;
}

export function getCurrentWeekId() {
  const now = new Date();
  const day = now.getDay();
  const isoDay = day === 0 ? 7 : day;
  const thursday = new Date(now);
  thursday.setDate(now.getDate() + (4 - isoDay));
  const startOfYear = new Date(thursday.getFullYear(), 0, 1);
  const week = Math.ceil(((thursday - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${thursday.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function getWeekLabel(weekId) {
  if (!weekId) return "";
  const parts = weekId.split("-W");
  if (parts.length !== 2) return weekId;
  return `Week ${parseInt(parts[1], 10)}`;
}

export async function syncLeaderboard(db, uid, userData) {
  // Admin users are excluded from the leaderboard
  if (userData.role === "admin") return;

  const currentWeek = getCurrentWeekId();
  const confs = userData.conferences || [];
  const awards = userData.awards || [];
  const allTimePoints = computeTotalPoints(userData);
  let weekStartPoints = 0;
  let lastWeekPoints = 0;
  let readFailed = false;

  // Retry read once with 1s delay to handle transient Firestore failures
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const existingSnap = await getDoc(doc(db, "leaderboard", uid));
      if (existingSnap.exists()) {
        const existing = existingSnap.data();
        if (existing.currentWeek !== currentWeek) {
          weekStartPoints = existing.allTimePoints || existing.points || 0;
          lastWeekPoints = existing.points || 0;
          await tryArchiveChampion(db, existing.currentWeek, { ...existing, uid });
        } else {
          weekStartPoints = existing.weekStartPoints || 0;
          lastWeekPoints = existing.lastWeekPoints || 0;
        }
      }
      readFailed = false;
      break;
    } catch (e) {
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, 1000));
      } else {
        console.warn("Leaderboard sync read failed after retry:", e);
        readFailed = true;
      }
    }
  }

  // If the read failed, skip the write to avoid corrupting weekly points
  // (weekStartPoints would default to 0, inflating the score to allTimePoints)
  if (readFailed) return;

  const weeklyPoints = Math.max(0, allTimePoints - weekStartPoints);
  const level = Math.floor(allTimePoints / 100) + 1;

const today = new Date().toISOString().split('T')[0];
const pointHistory = userData.pointHistory || [];
let gemsToday = 0;
for (const entry of pointHistory) {
  if (!entry.timestamp) continue;
  const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
  if (entryDate === today) gemsToday += entry.amount || 0;
}

  try {
    await setDoc(doc(db, "leaderboard", uid), {
      fullName: userData.fullName || userData.nickName || "Anonymous",
      nickName: userData.nickName || "",
      country: userData.country || "",
      conferenceCount: confs.length,
      awardCount: awards.length,
      points: weeklyPoints,
      allTimePoints,
      weekStartPoints,
      lastWeekPoints,
      currentWeek,
      level,
      streak: (userData.learning && userData.learning.streak) || 0,
      completedLessons: (userData.learning && userData.learning.completedLessons) ? userData.learning.completedLessons.length : 0,
      achievements: (userData.learning && userData.learning.achievements) || [],
      gemsToday,
      gemsTodayDate: today,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Leaderboard sync failed:", err);
  }
}

async function tryArchiveChampion(db, oldWeekId, fallbackUser) {
  if (!oldWeekId || oldWeekId === getCurrentWeekId()) return;
  const champRef = doc(db, "leaderboard_champions", oldWeekId);
  const existing = await getDoc(champRef);
  if (existing.exists()) return;
  const q = query(
    collection(db, "leaderboard"),
    where("currentWeek", "==", oldWeekId)
  );
  const snap = await getDocs(q);
  let topDoc = null;
  snap.forEach(d => {
    const data = d.data();
    if (!topDoc || (data.points || 0) > (topDoc.points || 0)) topDoc = { uid: d.id, ...data };
  });
  if (!topDoc && fallbackUser) {
    const pts = fallbackUser.lastWeekPoints || fallbackUser.points || 0;
    if (pts > 0) {
      topDoc = {
        uid: fallbackUser.uid || "",
        fullName: fallbackUser.fullName || "Anonymous",
        nickName: fallbackUser.nickName || "",
        country: fallbackUser.country || "",
        points: pts
      };
    }
  }
  if (topDoc && (topDoc.points || 0) > 0) {
    await setDoc(champRef, {
      weekId: oldWeekId,
      uid: topDoc.uid,
      fullName: topDoc.fullName || "Anonymous",
      nickName: topDoc.nickName || "",
      country: topDoc.country || "",
      points: topDoc.points || 0,
      awardedAt: new Date().toISOString()
    });
  }
}
