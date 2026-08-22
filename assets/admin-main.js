
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, limit } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { syncLeaderboard } from "./leaderboard-sync.js";
import { getLevelFromPoints, getLevelStatHTML } from "./gamification.js";

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

const SHEET_API = "https://script.google.com/macros/s/AKfycbx_YlVpMbjm4qCWlrs6gphHRyRmQWrOpYwD8M35vKF7b2R7_nGdbeDOQJtHaVl0dTwZ/exec";

async function getAdminFirebaseToken() {
  if (!auth.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return null;
  }
}

let allUsers = [];
let selectedUser = null;
let selectedUID = null;
let editingAwardIndex = -1;
let editingConfIndex = -1;

const AWARD_TYPES = [
  "Participation", "High Commendation", "Best Beginner",
  "Special Mention", "Best Position Paper", "Best Diplomat",
  "Runner Up", "Best Delegate", "Best Deb8er"
];

const CONF_POINTS = 15;
const AWARD_POINTS = {
  "participation": 20, "high commendation": 30, "best beginner": 40,
  "special mention": 50, "best position paper": 50, "best diplomat": 40,
  "runner up": 50, "runner-up": 50, "best delegate": 100, "best deb8er": 100
};

function computePoints(confs, awards, activityPoints) {
  let pts = (confs || []).length * CONF_POINTS;
  for (const a of (awards || [])) {
    const k = (a.title || "").toString().trim().toLowerCase();
    pts += AWARD_POINTS[k] != null ? AWARD_POINTS[k] : 20;
  }
  pts += (activityPoints || 0);
  return pts;
}

function esc(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const icon = type === "success" ? "fa-check-circle" : "fa-exclamation-circle";
  toast.innerHTML = `<i class="fas ${icon}"></i> ${esc(message)}`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function populateAwardDropdown() {
  const sel = document.getElementById("add-award-title");
  sel.innerHTML = '<option value="">— Select Award —</option>' +
    AWARD_TYPES.map(a => `<option value="${a}">${a}</option>`).join("");
}
populateAwardDropdown();

async function fetchCertIds(email) {
  const sel = document.getElementById("add-award-cert");
  sel.innerHTML = '<option value="">— Auto-generate new —</option>';
  if (!email) return;
  const token = await getAdminFirebaseToken();
  if (!token) return;
  try {
    const body = new URLSearchParams({ action: "getCertIds", email, firebaseToken: token, firebaseUid: auth.currentUser.uid });
    const resp = await fetch(SHEET_API, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    const data = await resp.json();
    if (data.success && data.certIds?.length) {
      data.certIds.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.certificateId;
        opt.textContent = `${c.certificateId}${c.award ? " (" + c.award + ")" : ""}`;
        sel.appendChild(opt);
      });
    }
  } catch (e) {
    console.warn("Failed to fetch cert IDs:", e);
  }
}

window.filterUsers = function() {
  const q = document.getElementById("admin-search").value.toLowerCase();
  const list = document.getElementById("admin-user-list");

  if (!allUsers.length) {
    list.innerHTML = '<div class="no-users">No users found.</div>';
    return;
  }

  const filtered = allUsers.filter(u =>
    (u.fullName || "").toLowerCase().includes(q) ||
    (u.email || "").toLowerCase().includes(q)
  );

  if (!filtered.length) {
    list.innerHTML = '<div class="no-users">No matching users.</div>';
    return;
  }

  list.innerHTML = filtered.map(u => {
    const initials = (u.fullName || u.email || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const confs = (u.conferences || []).length;
    const awards = (u.awards || []).length;
    const pts = computePoints(u.conferences, u.awards, (u.activityPoints || 0) + (u.learningPoints || 0));
    const confLabel = confs === 1 ? "1 Conference" : confs + " Conferences";
    const awardLabel = awards === 1 ? "1 Award" : awards + " Awards";
    return `
      <div class="admin-user-row" onclick="openDetail('${u.uid}')">
        <div class="admin-user-avatar">${initials}</div>
        <div class="admin-user-info">
          <div class="name">${esc(u.fullName) || "—"}</div>
          <div class="email">${esc(u.email) || ""}</div>
        </div>
        <div class="admin-user-meta">
          ${u.role === "admin" ? '<span class="role-badge">Admin</span>' : ""}
          <span>${confLabel}</span>
          <span>${awardLabel}</span>
          <span class="pts">${pts} <span class="gem-icon gem-icon--sm"></span></span>
        </div>
      </div>`;
  }).join("");
};

window.openDetail = function(uid) {
  selectedUID = uid;
  selectedUser = allUsers.find(u => u.uid === uid);
  if (!selectedUser) return;

  editingAwardIndex = -1;
  editingConfIndex = -1;
  document.getElementById("add-award-btn").textContent = "Add Award";
  document.getElementById("add-conf-btn").textContent = "Add Conference";
  document.getElementById("add-award-form").style.display = "none";
  document.getElementById("add-conf-form").style.display = "none";

  document.getElementById("detail-name").textContent = selectedUser.fullName || "User";
  document.getElementById("detail-email").textContent = selectedUser.email || "";
  const detailPts = computePoints(selectedUser.conferences, selectedUser.awards, (selectedUser.activityPoints || 0) + (selectedUser.learningPoints || 0));
  document.getElementById("detail-points").value = detailPts;
  document.getElementById("detail-level").innerHTML = getLevelStatHTML(getLevelFromPoints(detailPts));

  renderConferences();
  renderAwards();

  fetchCertIds(selectedUser.email || "");

  document.getElementById("detail-overlay").classList.add("open");
};

window.closeDetail = function() {
  document.getElementById("detail-overlay").classList.remove("open");
  selectedUID = null;
  selectedUser = null;
};

function renderConferences() {
  const el = document.getElementById("detail-conferences");
  const confs = selectedUser.conferences || [];
  if (!confs.length) {
    el.innerHTML = '<div style="color:#6B7280;font-size:13px;padding:8px 0;">No conferences.</div>';
    return;
  }
  el.innerHTML = confs.map((c, i) => {
    const isEditing = editingConfIndex === i;
    if (isEditing) {
      return `
        <div class="add-form" style="grid-template-columns:1fr 1fr;margin-bottom:6px;">
          <input id="edit-conf-name-${i}" value="${esc(c.name || "")}" placeholder="Name">
          <select id="edit-conf-type-${i}">
            <option value="mun" ${c.type === "mun" ? "selected" : ""}>MUN</option>
            <option value="debate" ${c.type === "debate" ? "selected" : ""}>Debate</option>
          </select>
          <input id="edit-conf-portfolio-${i}" value="${esc(c.portfolio || "")}" placeholder="Portfolio">
          <input id="edit-conf-committee-${i}" value="${esc(c.committee || "")}" placeholder="Committee">
          <input id="edit-conf-region-${i}" value="${esc(c.region || "")}" placeholder="Region">
          <input id="edit-conf-date-${i}" value="${esc(c.date || "")}" placeholder="Date">
          <button onclick="saveConferenceEdit(${i})" style="background:rgba(52,211,153,0.1);color:#34D399;">Save</button>
          <button onclick="cancelEdit()" style="background:rgba(107,114,128,0.1);color:#9CA3AF;">Cancel</button>
        </div>`;
    }
    return `
    <div class="detail-list-item">
      <div class="left">
        <div class="title">${esc(c.name || c.type || "Conference")}</div>
        <div class="sub">${[c.portfolio, c.committee, c.region, c.date].filter(Boolean).join(" · ")}</div>
      </div>
      <div class="detail-list-actions">
        <button class="edit-btn" onclick="editConference(${i})" title="Edit"><i class="fas fa-pen"></i></button>
        <button class="del-btn" onclick="deleteConference(${i})" title="Delete"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join("");
}

function renderAwards() {
  const el = document.getElementById("detail-awards");
  const awards = selectedUser.awards || [];
  if (!awards.length) {
    el.innerHTML = '<div style="color:#6B7280;font-size:13px;padding:8px 0;">No awards.</div>';
    return;
  }
  el.innerHTML = awards.map((a, i) => {
    const isEditing = editingAwardIndex === i;
    if (isEditing) {
      return `
        <div class="add-form" style="grid-template-columns:1fr 1fr;margin-bottom:6px;">
          <select id="edit-award-title-${i}">
            <option value="">— Select —</option>
            ${AWARD_TYPES.map(t => `<option value="${t}" ${a.title === t ? "selected" : ""}>${t}</option>`).join("")}
          </select>
          <input id="edit-award-conf-${i}" value="${esc(a.conference || "")}" placeholder="Conference name">
          <select id="edit-award-cert-${i}">
            <option value="">— Auto-generate new —</option>
          </select>
          <input id="edit-award-date-${i}" value="${esc(a.eventDate || "")}" placeholder="Event Date">
          <button onclick="saveAwardEdit(${i})" style="background:rgba(52,211,153,0.08);color:#34D399;">Save</button>
          <button onclick="cancelEdit()" style="background:rgba(107,114,128,0.08);color:#9CA3AF;">Cancel</button>
        </div>`;
    }
    const meta = [];
    if (a.conference) meta.push(a.conference);
    if (a.certificateId) meta.push("ID: " + a.certificateId);
    if (a.eventDate) meta.push(a.eventDate);
    return `
    <div class="detail-list-item">
      <div class="left">
        <div class="title">${esc(a.title)}</div>
        <div class="sub">${meta.join(" · ")}</div>
      </div>
      <div class="detail-list-actions">
        <button class="edit-btn" onclick="editAward(${i})" title="Edit"><i class="fas fa-pen"></i></button>
        <button class="del-btn" onclick="deleteAward(${i})" title="Delete"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join("");
}

window.deleteConference = function(index) {
  const confs = [...(selectedUser.conferences || [])];
  const deleted = confs.splice(index, 1)[0];
  selectedUser.conferences = confs;
  renderConferences();

  // Delete matching sheet row
  const profile = selectedUser;
  if (profile.email) {
    getAdminFirebaseToken().then(token => {
      if (!token) return;
      const body = new URLSearchParams({
        action: "deleteSheetRow",
        fullName: profile.fullName || "",
        nickName: profile.nickName || "",
        email: profile.email || "",
        phoneNumber: profile.phone || "",
        age: String(profile.age || ""),
        country: profile.country || "",
        portfolio: deleted.portfolio || "",
        committee: deleted.committee || "",
        region: deleted.region || "",
        certificateId: deleted.certificateId || "",
        firebaseToken: token,
        firebaseUid: auth.currentUser.uid
      });
      fetch(SHEET_API, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      }).catch(e => console.warn("Failed to delete sheet row:", e));
    });
  }
};

window.deleteAward = function(index) {
  const awards = [...(selectedUser.awards || [])];
  awards.splice(index, 1);
  selectedUser.awards = awards;
  renderAwards();
};

window.editAward = function(index) {
  editingAwardIndex = index;
  editingConfIndex = -1;
  const a = selectedUser.awards[index];
  document.getElementById("add-award-form").style.display = "none";
  document.getElementById("add-conf-form").style.display = "none";
  renderAwards();
  // Also populate cert IDs for the edit form
  const email = selectedUser.email || "";
  if (!email) return;
  getAdminFirebaseToken().then(token => {
    if (!token) return;
    const body = new URLSearchParams({ action: "getCertIds", email, firebaseToken: token, firebaseUid: auth.currentUser.uid });
    fetch(SHEET_API, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    }).then(r => r.json()).then(data => {
      const sel = document.getElementById(`edit-award-cert-${index}`);
      if (!sel) return;
      sel.innerHTML = '<option value="">— Auto-generate new —</option>';
      if (data.success && data.certIds?.length) {
        data.certIds.forEach(c => {
          const opt = document.createElement("option");
          opt.value = c.certificateId;
          opt.textContent = `${c.certificateId}${c.award ? " (" + c.award + ")" : ""}`;
          if (c.certificateId === a.certificateId) opt.selected = true;
          sel.appendChild(opt);
        });
      }
    }).catch(() => {});
  }).catch(() => {});
};

window.saveAwardEdit = function(index) {
  const sel = document.getElementById(`edit-award-title-${index}`);
  const conf = document.getElementById(`edit-award-conf-${index}`);
  const cert = document.getElementById(`edit-award-cert-${index}`);
  const date = document.getElementById(`edit-award-date-${index}`);
  if (!sel || !conf || !cert || !date) return;
  const title = sel.value;
  if (!title) { showToast("Please select an award type", "error"); return; }
  selectedUser.awards[index] = {
    title: title,
    conference: conf.value.trim(),
    certificateId: cert.value || "DEB8-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
    eventDate: date.value.trim()
  };
  // Clear synced flag so saveDetail re-syncs this edit to the sheet
  delete selectedUser.awards[index]._synced;
  editingAwardIndex = -1;
  renderAwards();
  showToast("Award updated");
};

window.editConference = function(index) {
  editingConfIndex = index;
  editingAwardIndex = -1;
  document.getElementById("add-award-form").style.display = "none";
  document.getElementById("add-conf-form").style.display = "none";
  // Store original values so saveDetail can find the sheet row by email+committee
  const conf = selectedUser.conferences[index];
  selectedUser.conferences[index]._origCommittee = conf.committee;
  renderConferences();
};

window.saveConferenceEdit = function(index) {
  const name = document.getElementById(`edit-conf-name-${index}`);
  const type = document.getElementById(`edit-conf-type-${index}`);
  const portfolio = document.getElementById(`edit-conf-portfolio-${index}`);
  const committee = document.getElementById(`edit-conf-committee-${index}`);
  const region = document.getElementById(`edit-conf-region-${index}`);
  const date = document.getElementById(`edit-conf-date-${index}`);
  if (!name || !type || !portfolio || !committee || !region || !date) return;
  const old = selectedUser.conferences[index];
  selectedUser.conferences[index] = {
    name: name.value.trim() || "MUN Conference",
    type: type.value,
    portfolio: portfolio.value.trim(),
    committee: committee.value.trim(),
    region: region.value.trim(),
    date: date.value.trim() || new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    _origCommittee: old._origCommittee || old.committee
  };
  editingConfIndex = -1;
  renderConferences();
  showToast("Conference updated");
};

window.cancelEdit = function() {
  editingAwardIndex = -1;
  editingConfIndex = -1;
  renderAwards();
  renderConferences();
};

window.showAddAward = function() {
  const form = document.getElementById("add-award-form");
  const isOpening = form.style.display !== "grid";
  if (isOpening) {
    editingAwardIndex = -1;
    editingConfIndex = -1;
    document.getElementById("add-award-btn").textContent = "Add Award";
    document.getElementById("add-conf-form").style.display = "none";
    renderAwards();
    renderConferences();
  }
  form.style.display = isOpening ? "grid" : "none";
};

window.showAddConference = function() {
  const form = document.getElementById("add-conf-form");
  const isOpening = form.style.display !== "grid";
  if (isOpening) {
    editingConfIndex = -1;
    editingAwardIndex = -1;
    document.getElementById("add-conf-btn").textContent = "Add Conference";
    document.getElementById("add-award-form").style.display = "none";
    renderAwards();
    renderConferences();
  }
  form.style.display = isOpening ? "grid" : "none";
};

window.addConference = function() {
  const conf = {
    name: document.getElementById("add-conf-name").value.trim() || "MUN Conference",
    type: document.getElementById("add-conf-type").value,
    portfolio: document.getElementById("add-conf-portfolio").value.trim(),
    committee: document.getElementById("add-conf-committee").value.trim(),
    region: document.getElementById("add-conf-region").value.trim(),
    date: document.getElementById("add-conf-date").value.trim() || new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  };

  if (editingConfIndex >= 0) {
    selectedUser.conferences[editingConfIndex] = conf;
    editingConfIndex = -1;
    showToast("Conference updated");
  } else {
    selectedUser.conferences = [...(selectedUser.conferences || []), conf];
  }

  renderConferences();
  document.getElementById("add-conf-form").style.display = "none";
  document.getElementById("add-conf-btn").textContent = "Add Conference";
  ["add-conf-name","add-conf-portfolio","add-conf-committee","add-conf-region","add-conf-date"].forEach(id => document.getElementById(id).value = "");
};

window.addAward = function() {
  const title = document.getElementById("add-award-title").value;
  if (!title) { showToast("Please select an award type", "error"); return; }
  const certId = document.getElementById("add-award-cert").value
    || "DEB8-" + Math.random().toString(36).substr(2, 6).toUpperCase();
  const award = {
    title: title,
    conference: document.getElementById("add-award-conf").value.trim(),
    certificateId: certId,
    eventDate: document.getElementById("add-award-date").value.trim()
  };

  if (editingAwardIndex >= 0) {
    selectedUser.awards[editingAwardIndex] = award;
    // Clear synced flag so saveDetail re-syncs this edit to the sheet
    delete selectedUser.awards[editingAwardIndex]._synced;
    editingAwardIndex = -1;
    showToast("Award updated");
  } else {
    selectedUser.awards = [...(selectedUser.awards || []), award];
  }

  renderAwards();
  document.getElementById("add-award-form").style.display = "none";
  document.getElementById("add-award-btn").textContent = "Add Award";
  ["add-award-title","add-award-conf","add-award-cert","add-award-date"].forEach(id => {
    const el = document.getElementById(id);
    if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
  });
};

window.deleteUserAccount = async function() {
  if (!selectedUID || !selectedUser) return;
  const name = selectedUser.fullName || selectedUser.email;
  if (!confirm(`Delete ${name}?\n\nThis will permanently remove their profile and all sheet data. This cannot be undone.`)) return;
  if (!confirm(`Are you absolutely sure? This deletes all of ${name}'s conferences, awards, and sheet rows.`)) return;

  try {
    // 1. Delete all sheet rows for this user
    const email = selectedUser.email || "";
    if (email) {
      const token = await getAdminFirebaseToken();
      if (token) {
        fetch(SHEET_API, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ action: "deleteUserRows", email, firebaseToken: token, firebaseUid: auth.currentUser.uid }).toString()
        }).catch(e => console.warn("Sheet delete failed:", e));
      }
    }

    // 2. Delete Firestore documents (parallel)
    await Promise.all([
      deleteDoc(doc(db, "users", selectedUID)),
      deleteDoc(doc(db, "leaderboard", selectedUID)).catch(() => {})
    ]);

    // 3. Remove from local list
    allUsers = allUsers.filter(u => u.uid !== selectedUID);
    closeDetail();
    window.filterUsers();
    updateStats();
    showToast(`Deleted ${name}`);
  } catch (err) {
    showToast("Failed to delete: " + err.message, "error");
  }
};

window.saveDetail = async function() {
  if (!selectedUID) return;
  const points = parseInt(document.getElementById("detail-points").value) || 0;
  const firebaseToken = await getAdminFirebaseToken();
  const firebaseUid = auth.currentUser ? auth.currentUser.uid : "";

  try {
    // Capture origCommittee values for sheet sync before stripping them
    const confSyncData = (selectedUser.conferences || []).map(c => ({
      certificateId: c.certificateId || "",
      portfolio: c.portfolio || "",
      committee: c.committee || "",
      region: c.region || "",
      date: c.date || "",
      origCommittee: c._origCommittee || ""
    }));

    // Strip temporary fields before saving to Firestore
    const cleanConfs = (selectedUser.conferences || []).map(c => {
      const { _origCommittee, ...clean } = c;
      return clean;
    });

    await updateDoc(doc(db, "users", selectedUID), {
      conferences: cleanConfs,
      awards: selectedUser.awards || [],
      points: points
    });

    // Update local state with clean data
    selectedUser.conferences = cleanConfs;

    // Sync conference edits to sheet (parallel)
    await Promise.allSettled(confSyncData.map(conf => {
      const body = new URLSearchParams({
        action: "updateConference",
        email: selectedUser.email || "",
        certificateId: conf.certificateId,
        portfolio: conf.portfolio,
        committee: conf.committee,
        region: conf.region,
        eventDate: conf.date,
        origCommittee: conf.origCommittee,
        firebaseToken,
        firebaseUid
      });
      return fetch(SHEET_API, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      }).catch(e => console.warn("Failed to sync conference to sheet:", e));
    }));

    // If a new award was added, sync to sheet for AutoCrat (parallel)
    const newAwards = (selectedUser.awards || []).filter(a => !a._synced);
    await Promise.allSettled(newAwards.map(award => {
      const body = new URLSearchParams({
        action: "addAward",
        email: selectedUser.email || "",
        fullName: selectedUser.fullName || "",
        award: award.title,
        certificateId: award.certificateId || "",
        conference: award.conference || "",
        eventDate: award.eventDate || "",
        firebaseToken,
        firebaseUid
      });
      return fetch(SHEET_API, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      }).then(() => { award._synced = true; })
      .catch(e => console.warn("Failed to sync award to sheet:", e));
    }));

    // Update local list
    const idx = allUsers.findIndex(u => u.uid === selectedUID);
    if (idx !== -1) {
      allUsers[idx] = { ...allUsers[idx], ...selectedUser };
    }

    // Sync to public leaderboard
    syncLeaderboard(db, selectedUID, selectedUser).catch(() => {});

    window.filterUsers();
    updateStats();
    showToast("Changes saved successfully");
  } catch (err) {
    showToast("Failed to save: " + err.message, "error");
  }
};

document.getElementById("detail-overlay").addEventListener("click", e => {
  if (e.target === document.getElementById("detail-overlay")) closeDetail();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeDetail();
});

function updateStats() {
  document.getElementById("stat-total").textContent = allUsers.length;
  const totalConfs = allUsers.reduce((s, u) => s + (u.conferences || []).length, 0);
  const totalAwards = allUsers.reduce((s, u) => s + (u.awards || []).length, 0);
  const totalPoints = allUsers.reduce((s, u) => s + computePoints(u.conferences, u.awards, (u.activityPoints || 0) + (u.learningPoints || 0)), 0);
  document.getElementById("stat-confs").textContent = totalConfs;
  document.getElementById("stat-awards").textContent = totalAwards;
  document.getElementById("stat-points").textContent = totalPoints;
}

window.syncAllLeaderboard = async function() {
  const btn = document.querySelector(".sync-btn");
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing…';
  btn.disabled = true;
  let count = 0;
  // Batch in chunks of 10 to parallelize without hitting rate limits
  const chunkSize = 10;
  for (let i = 0; i < allUsers.length; i += chunkSize) {
    const chunk = allUsers.slice(i, i + chunkSize);
    await Promise.allSettled(chunk.map(async u => {
      try {
        await syncLeaderboard(db, u.uid, u);
        count++;
      } catch (e) {
        console.warn("Sync failed for", u.uid, e);
      }
    }));
  }
  btn.innerHTML = `Synced ${count}`;
  setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 2000);
};

// ---- Auth ----
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "auth.html?tab=signin";
    return;
  }

  document.getElementById("admin-signed-in").textContent = user.email;

  // Check if admin
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    const profile = snap.data();
    if (!profile || profile.role !== "admin") {
      document.getElementById("admin-loading").style.display = "none";
      document.getElementById("admin-denied").style.display = "block";
      return;
    }
  } catch (err) {
    document.getElementById("admin-loading").innerHTML = '<span style="color:#f87171;">Error verifying access.</span>';
    return;
  }

    // Load users (capped at 500 for performance — admin can search for specific users)
  try {
    const snapshot = await getDocs(query(collection(db, "users"), limit(500)));
    allUsers = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data) allUsers.push({ uid: docSnap.id, ...data });
    });
    allUsers.sort((a, b) => (b.points || 0) - (a.points || 0));

    document.getElementById("admin-loading").style.display = "none";
    document.getElementById("admin-content").style.display = "block";

    document.getElementById("admin-user-count").textContent = `${allUsers.length} user${allUsers.length !== 1 ? "s" : ""}`;
    updateStats();
    window.filterUsers();
  } catch (err) {
    document.getElementById("admin-loading").innerHTML = '<span style="color:#f87171;">Failed to load users: ' + err.message + '</span>';
  }
});
  