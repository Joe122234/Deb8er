import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signInAnonymously,
  linkWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  collection,
  query,
  where,
  increment,
  getDocs,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { REFERRAL_POINTS, makeHistoryEntry } from "./gamification.js";

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

// ---- Populate country datalist ----
(function() {
  const names = window.COUNTRY_NAMES || [];
  const dl = document.getElementById("su-countryList");
  names.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    dl.appendChild(opt);
  });
  const cpDl = document.getElementById("cp-countryList");
  if (cpDl) {
    names.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      cpDl.appendChild(opt);
    });
  }
})();

// ---- Auto-fill referral code from URL param ----
(function() {
  const ref = new URLSearchParams(window.location.search).get("ref");
  if (ref) {
    const el = document.getElementById("su-referral");
    if (el) el.value = ref;
    const cpEl = document.getElementById("cp-referral");
    if (cpEl) cpEl.value = ref;
  }
})();

// ---- Auto-fill email from URL param (orphaned account recovery) ----
(function() {
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email");
  if (email) {
    const el = document.getElementById("su-email");
    if (el) el.value = email;
  }
  if (params.get("tab") === "signup") {
    const tab = document.getElementById("tab-signup");
    if (tab) tab.click();
  }
})();

// ---- Redirect if already logged in (but not mid-signup) ----
// ─── Session-persisted state for OTP flow (survives refresh) ───
// Password kept in memory only (not sessionStorage) to avoid XSS exposure.
// UID and email are stored in sessionStorage since they are not secrets.
const PENDING_KEY = 'deb8er_pending_signup';
let _pendingPassword = null;

function savePending(uid, email, password) {
  _pendingPassword = password;
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ uid, email, ts: Date.now() }));
}

function getPending() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw || !_pendingPassword) return null;
    const data = JSON.parse(raw);
    // Expire after 30 minutes
    if (Date.now() - data.ts > 30 * 60 * 1000) { clearPending(); return null; }
    return { uid: data.uid, email: data.email, password: _pendingPassword };
  } catch { return null; }
}

function clearPending() {
  _pendingPassword = null;
  sessionStorage.removeItem(PENDING_KEY);
}

let signingUp = false;
let skipRedirect = false;

onAuthStateChanged(auth, async user => {
  // If we're mid-flow or the OTP UI is already shown, don't interfere
  if (signingUp || skipRedirect) return;
  if (document.getElementById('panel-otp').style.display === 'block') return;

  if (!user) return;

  // Check for pending session first (survives page refresh)
  const pending = getPending();
  if (pending && user.isAnonymous) {
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists() && snap.data()._pending) {
        showOtpPanel(user.uid, snap.data().email);
        startOtpFlow(user.uid, snap.data().email);
        return;
      }
    } catch (_) {}
    return;
  }

  if (user.isAnonymous) {
    // Check Firestore directly for _pending data
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists() && snap.data()._pending) {
        const pendingEmail = snap.data().email || "";
        // If no password in memory, session expired — clean up orphan and redirect
        if (!getPending()) {
          // Delete orphaned Firestore doc and anonymous account
          deleteDoc(doc(db, "users", user.uid)).catch(() => {});
          await user.delete().catch(() => {});
          // Redirect to signup with email pre-filled
          const params = new URLSearchParams({ tab: "signup" });
          if (pendingEmail) params.set("email", pendingEmail);
          window.location.href = "auth.html?" + params.toString();
          return;
        }
        showOtpPanel(user.uid, pendingEmail);
        startOtpFlow(user.uid, pendingEmail);
        return;
      }
    } catch (_) {}
    return;
  }

  // Real (non-anonymous) user
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) {
      // Google user without profile — show complete form
      showCompleteProfilePanel();
      return;
    }
    if (snap.data().role === "admin") {
      window.location.href = "admin.html";
      return;
    }
    const userData = snap.data();
    if (userData.email && userData.otpHash && !userData.otpVerified) {
      showOtpPanel(user.uid, userData.email);
      startOtpFlow(user.uid, userData.email);
      return;
    }
  } catch (_) {}
  window.location.href = "dashboard.html";
});

function showOtpPanel(uid, email) {
  document.querySelectorAll(".auth-panel").forEach(p => p.classList.remove("active"));
  document.querySelector(".auth-header").style.display = "none";
  document.querySelector(".auth-tabs").style.display = "none";
}

function showCompleteProfilePanel() {
  document.querySelectorAll(".auth-panel").forEach(p => p.classList.remove("active"));
  document.querySelector(".auth-header").style.display = "none";
  document.querySelector(".auth-tabs").style.display = "none";
  const card = document.querySelector(".auth-card");
  card.style.background = "transparent";
  card.style.border = "none";
  card.style.boxShadow = "none";
  card.style.padding = "0";
  document.getElementById("panel-complete-profile").classList.add("active");
}

// ---- SIGN UP (deferred — no account until OTP verified) ----
document.getElementById("signup-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn  = document.getElementById("signup-btn");
  const msgEl = document.getElementById("signup-message");
  clearMsg("signup");

  const fullName = document.getElementById("su-fullname").value.trim();
  const nickName = document.getElementById("su-nickname").value.trim();
  const email    = document.getElementById("su-email").value.trim();
  const phone    = document.getElementById("su-phone").value.trim();
  const age      = document.getElementById("su-age").value.trim();
  const country  = document.getElementById("su-country").value.trim();
  const password = document.getElementById("su-password").value;
  const confirm  = document.getElementById("su-confirm").value;

  if (!document.getElementById("su-terms").checked) {
    showMsg("signup", "Please agree to the Terms of Service and Privacy Policy.", "error"); return;
  }
  if (!fullName || !nickName || !email || !age || !country) {
    showMsg("signup", "Please fill in all required fields.", "error"); return;
  }
  if (password !== confirm) {
    showMsg("signup", "Passwords don't match.", "error"); return;
  }
  if (password.length < 8) {
    showMsg("signup", "Password must be at least 8 characters.", "error"); return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i> Sending verification…';

  try {
    // Sign in anonymously (no permanent account yet)
    const anonCred = await signInAnonymously(auth);
    const anonUid = anonCred.user.uid;

    // Write pending registration to users/{uid} with _pending flag
    await setDoc(doc(db, "users", anonUid), {
      _pending: true,
      fullName, nickName, email,
      phone: phone || "",
      age: parseInt(age) || null,
      country,
      createdAt: Date.now()
    });

    // Store password in memory (survives page refresh within session)
    savePending(anonUid, email, password);

    // Show OTP panel (startOtpFlow generates & sends the code)
    // Keep signingUp = true so onAuthStateChanged doesn't fire orphan cleanup
    startOtpFlow(anonUid, email);
  } catch (err) {
    // Clean up anonymous account on failure
    if (auth.currentUser?.isAnonymous) {
      auth.currentUser.delete().catch(() => {});
    }
    signingUp = false;
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus" style="margin-right:8px;"></i> Create Account';
    showMsg("signup", friendlyError(err.code) || err.message, "error");
  }
});

// ---- SIGN IN ----
document.getElementById("signin-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn      = document.getElementById("signin-btn");
  const email    = document.getElementById("si-email").value.trim();
  const password = document.getElementById("si-password").value;

  btn.disabled = true;
  btn.textContent = "Signing in…";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will redirect based on role
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right:8px;"></i> Sign In';
    showMsg("signin", friendlyError(err.code), "error");
  }
});

// ---- FORGOT PASSWORD ----
document.getElementById("forgot-link").addEventListener("click", e => {
  e.preventDefault();
  document.getElementById("signin-form").style.display = "none";
  document.getElementById("forgot-panel").style.display = "block";
  document.getElementById("reset-email").focus();
  document.getElementById("forgot-message").className = "auth-message";
  document.getElementById("forgot-message").textContent = "";
});

document.getElementById("back-to-signin").addEventListener("click", () => {
  document.getElementById("forgot-panel").style.display = "none";
  document.getElementById("signin-form").style.display = "block";
  document.getElementById("forgot-message").className = "auth-message";
  document.getElementById("forgot-message").textContent = "";
});

document.getElementById("reset-btn").addEventListener("click", async () => {
  const email = document.getElementById("reset-email").value.trim();
  const msgEl = document.getElementById("forgot-message");
  const btn = document.getElementById("reset-btn");
  if (!email) {
    msgEl.className = "auth-message error";
    msgEl.textContent = "Please enter your email address.";
    return;
  }
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i> Sending...';
  try {
    await sendPasswordResetEmail(auth, email);
    msgEl.className = "auth-message success";
    msgEl.innerHTML = '<i class="fas fa-check-circle"></i> Reset link sent! Check your inbox (and spam).';
  } catch (err) {
    msgEl.className = "auth-message error";
    msgEl.textContent = friendlyError(err.code);
  }
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:8px;"></i> Send Reset Link';
});

// ---- GOOGLE SIGN IN (shared by both panels) ----
const googleProvider = new GoogleAuthProvider();

async function handleGoogleSignIn() {
  const msgEl = document.getElementById("signup-message");
  msgEl.className = "auth-message";
  msgEl.textContent = "";

  // Set before popup so onAuthStateChanged doesn't redirect early
  skipRedirect = true;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if a Firestore profile already exists
    const snap = await getDoc(doc(db, "users", user.uid));

    if (snap.exists()) {
      skipRedirect = false;
      // Returning user — redirect
      if (snap.data().role === "admin") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "dashboard.html";
      }
      return;
    }

    // First-time Google user — show complete profile form
    // skipRedirect stays true so onAuthStateChanged doesn't interfere
    document.querySelectorAll(".auth-panel").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
    document.querySelector(".auth-header").style.display = "none";
    document.querySelector(".auth-tabs").style.display = "none";
    const card = document.querySelector(".auth-card");
    card.style.background = "transparent";
    card.style.border = "none";
    card.style.boxShadow = "none";
    card.style.padding = "0";
    document.getElementById("panel-complete-profile").classList.add("active");

  } catch (err) {
    skipRedirect = false;
    if (err.code === "auth/account-exists-with-different-credential") {
      showMsg("signup", "An account with this email already exists. Sign in with your email and password instead.", "error");
    } else if (err.code === "auth/popup-closed-by-user") {
      // User closed popup — do nothing
    } else if (err.code === "auth/unauthorized-domain") {
      showMsg("signup", "Google Sign-In is not enabled for this domain yet. Contact the site owner.", "error");
    } else {
      showMsg("signup", friendlyError(err.code) || err.message, "error");
    }
  }
}

document.getElementById("google-signup-btn").addEventListener("click", handleGoogleSignIn);
document.getElementById("google-signin-btn").addEventListener("click", handleGoogleSignIn);

// ---- COMPLETE PROFILE FORM (first-time Google) ----
document.getElementById("complete-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn   = document.getElementById("complete-btn");
  const msgEl = document.getElementById("complete-message");

  const fullName = document.getElementById("cp-fullname").value.trim();
  const nickName = document.getElementById("cp-nickname").value.trim();
  const phone    = document.getElementById("cp-phone").value.trim();
  const age      = document.getElementById("cp-age").value.trim();
  const country  = document.getElementById("cp-country").value.trim();

  if (!document.getElementById("cp-terms").checked) {
    msgEl.textContent = "Please agree to the Terms of Service and Privacy Policy.";
    msgEl.className = "auth-message error";
    return;
  }
  if (!fullName || !nickName || !age || !country) {
    msgEl.textContent = "Please fill in all required fields.";
    msgEl.className = "auth-message error";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Saving…";

  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not signed in");

    const cpReferral = document.getElementById("cp-referral")?.value.trim() || "";
    await setDoc(doc(db, "users", user.uid), {
      fullName,
      nickName,
      email: user.email || "",
      phone: phone || "",
      age: parseInt(age) || null,
      country,
      points: 0,
      awards: [],
      conferences: [],
      referredBy: cpReferral,
      createdAt: Date.now()
    });

    msgEl.textContent = "Profile saved! Redirecting…";
    msgEl.className = "auth-message success";

    setTimeout(() => {
      const card = document.querySelector(".auth-card");
      card.style.background = "";
      card.style.border = "";
      card.style.boxShadow = "";
      card.style.padding = "";
      startOtpFlow(user.uid, user.email);
    }, 500);
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check" style="margin-right:8px;"></i> Complete Profile';
    msgEl.textContent = "Failed to save. Please try again.";
    msgEl.className = "auth-message error";
  }
});

// ---- HELPERS ----
function showMsg(panel, text, type) {
  const el = document.getElementById(panel + "-message");
  el.textContent = text;
  el.className = "auth-message " + type;
}
function clearMsg(panel) {
  const el = document.getElementById(panel + "-message");
  el.textContent = "";
  el.className = "auth-message";
}
function friendlyError(code) {
  const map = {
    "auth/email-already-in-use":   "This email is already registered. Try signing in instead.",
    "auth/invalid-email":          "That email address doesn't look right.",
    "auth/weak-password":          "Password is too weak. Use at least 8 characters.",
    "auth/user-not-found":         "No account found with that email.",
    "auth/wrong-password":         "Incorrect password. Give it another shot.",
    "auth/invalid-credential":     "Incorrect email or password.",
    "auth/too-many-requests":      "Too many attempts. Please wait a moment.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/popup-blocked":          "Popup was blocked. Allow popups for this site and try again.",
    "auth/cancelled-popup-request":"Sign-in cancelled.",
    "auth/operation-not-allowed":  "Anonymous sign-in is not enabled. Please contact support.",
    "auth/account-exists-with-different-credential": "This email is already linked to another sign-in method. Try signing in with email and password."
  };
  return map[code] || "Something went wrong. Please try again.";
}

// ---- OTP VERIFICATION ----
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbx_YlVpMbjm4qCWlrs6gphHRyRmQWrOpYwD8M35vKF7b2R7_nGdbeDOQJtHaVl0dTwZ/exec";

function generateOtp() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(100000 + (buf[0] % 900000));
}

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sendOtpEmail(email, otp) {
  const url = GOOGLE_SHEET_URL + "?action=sendOtp&email=" + encodeURIComponent(email) + "&otp=" + encodeURIComponent(otp);
  try {
    const resp = await fetch(url, { method: "POST", mode: "cors" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data.success) throw new Error(data.error || data.message || "OTP send failed");
  } catch (err) {
    console.warn("OTP send error:", err);
    document.getElementById("otp-message").textContent = "Could not send verification email. " + (err.message || "Check your email and try again.");
    document.getElementById("otp-message").className = "auth-message error";
    document.getElementById("otp-message").style.display = "block";
    throw err;
  }
}

const RATE_LIMIT = {
  maxSends: 3,
  windowMs: 60 * 60 * 1000,
  cooldownMs: 60 * 1000,
  maxFailed: 5,
  lockoutMs: 30 * 60 * 1000
};

async function checkOtpRateLimit(uid, email) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const d = snap.data();

  // Check lockout
  if (d.otpLockedUntil && Date.now() < d.otpLockedUntil) {
    const remaining = Math.ceil((d.otpLockedUntil - Date.now()) / 60000);
    throw new Error(`Too many failed attempts. Try again in ${remaining} minute${remaining > 1 ? 's' : ''}.`);
  }

  // Check cooldown
  if (d.otpCooldownUntil && Date.now() < d.otpCooldownUntil) {
    const remaining = Math.ceil((d.otpCooldownUntil - Date.now()) / 1000);
    throw new Error(`Please wait ${remaining} second${remaining > 1 ? 's' : ''} before requesting a new code.`);
  }

  // Check send rate (reset window if expired)
  if (d.otpSendWindowStart && Date.now() - d.otpSendWindowStart < RATE_LIMIT.windowMs) {
    if ((d.otpSendCount || 0) >= RATE_LIMIT.maxSends) {
      throw new Error("Too many verification codes sent. Please try again in an hour.");
    }
  }
}

async function recordOtpSend(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const d = snap.exists() ? snap.data() : {};
  let sendCount = 1;
  let windowStart = Date.now();
  if (d.otpSendWindowStart && Date.now() - d.otpSendWindowStart < RATE_LIMIT.windowMs) {
    sendCount = (d.otpSendCount || 0) + 1;
    windowStart = d.otpSendWindowStart;
  }
  await updateDoc(ref, {
    otpSendCount: sendCount,
    otpSendWindowStart: windowStart,
    otpCooldownUntil: Date.now() + RATE_LIMIT.cooldownMs,
    otpLockedUntil: deleteField()
  }).catch(() => {});
}

async function recordOtpFailure(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const d = snap.data();
  const failed = (d.otpFailedAttempts || 0) + 1;
  if (failed >= RATE_LIMIT.maxFailed) {
    await updateDoc(ref, {
      otpFailedAttempts: failed,
      otpLockedUntil: Date.now() + RATE_LIMIT.lockoutMs,
      otpHash: deleteField(),
      otpExpiresAt: deleteField(),
      otpSendCount: deleteField(),
      otpSendWindowStart: deleteField(),
      otpCooldownUntil: deleteField()
    }).catch(() => {});
    throw new Error("Too many incorrect attempts. Please try again in 30 minutes.");
  }
  await updateDoc(ref, {
    otpFailedAttempts: failed
  }).catch(() => {});
}

async function startOtpFlow(uid, email) {
  if (document.getElementById('panel-otp').style.display === 'block') return;
  document.getElementById("otpEmailDisplay").textContent = email;

  document.querySelectorAll(".auth-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
  document.querySelector(".auth-header").style.display = "none";
  document.querySelector(".auth-tabs").style.display = "none";

  document.getElementById("panel-otp").style.display = "block";

  try {
    await checkOtpRateLimit(uid, email);
  } catch (e) {
    document.getElementById("otp-message").className = "auth-message error";
    document.getElementById("otp-message").textContent = e.message;
    document.getElementById("otp-message").style.display = "block";
    startOtpTimer();
    setupOtpInputs(uid, email);
    return;
  }

  const otp = generateOtp();
  const hash = await sha256(otp);
  const expiresAt = Date.now() + 15 * 60 * 1000;

  await updateDoc(doc(db, "users", uid), {
    otpHash: hash,
    otpExpiresAt: expiresAt
  });

  await sendOtpEmail(email, otp);

  await recordOtpSend(uid);

  const dig = document.querySelectorAll(".otp-digit");
  dig.forEach((input, i) => {
    input.value = "";
    input.className = "otp-digit";
    input.disabled = false;
  });
  dig[0].focus();

  document.getElementById("otp-message").className = "auth-message";
  document.getElementById("otp-message").textContent = "";

  startOtpTimer();
  setupOtpInputs(uid, email);
}

function startOtpTimer() {
  const el = document.getElementById("otpTimerCount");
  const wrap = document.getElementById("otpTimerWrap");
  const resend = document.getElementById("otpResendBtn");
  let sec = 15 * 60;

  function tick() {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    el.textContent = m + ":" + s;
    if (sec <= 0) {
      document.getElementById("otpTimerText").style.display = "none";
      resend.style.display = "inline-block";
      return;
    }
    sec--;
    setTimeout(tick, 1000);
  }
  tick();
}

function setupOtpInputs(uid, email) {
  const dig = document.querySelectorAll(".otp-digit");
  const verifyBtn = document.getElementById("otp-verify-btn");
  const msgEl = document.getElementById("otp-message");
  const resendBtn = document.getElementById("otpResendBtn");

  function focusNext(i) {
    if (i < dig.length - 1) dig[i + 1].focus();
  }

  dig.forEach((input, i) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(0, 1);
      input.classList.toggle("filled", input.value.length === 1);
    });
    input.addEventListener("keyup", () => {
      input.value = input.value.replace(/\D/g, "").slice(0, 1);
      input.classList.toggle("filled", input.value.length === 1);
      if (input.value && i < dig.length - 1) dig[i + 1].focus();
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && i > 0) {
        dig[i - 1].focus();
        dig[i - 1].value = "";
        dig[i - 1].classList.remove("filled");
      }
      if (e.key === "Enter") verifyBtn.click();
    });

    input.addEventListener("paste", (e) => {
      e.preventDefault();
      const data = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
      for (let j = 0; j < data.length && j < dig.length; j++) {
        dig[j].value = data[j];
        dig[j].classList.toggle("filled", true);
      }
      const next = Math.min(data.length, dig.length - 1);
      dig[next].focus();
    });
  });

  verifyBtn.onclick = async () => {
    const code = Array.from(dig).map(i => i.value).join("");
    if (code.length !== 6) {
      msgEl.className = "auth-message error";
      msgEl.textContent = "Please enter all 6 digits.";
      return;
    }

    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i> Verifying...';

    try {
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error("No verification data found. Request a new code.");
      const data = snap.data();
      if (!data.otpHash || !data.otpExpiresAt) {
        throw new Error("No verification code found. Request a new one.");
      }
      if (Date.now() > data.otpExpiresAt) {
        throw new Error("Code expired. Request a new one.");
      }

      const inputHash = await sha256(code);
      if (inputHash !== data.otpHash) {
        document.getElementById("otpInputs").classList.add("otp-shake");
        setTimeout(() => document.getElementById("otpInputs").classList.remove("otp-shake"), 500);
        await recordOtpFailure(uid);
        throw new Error("Incorrect code. Try again.");
      }

      const isPending = data._pending === true;
      if (isPending) {
        // Create real account by linking email/password to anonymous user
        const pendingData = getPending();
        if (!pendingData || !pendingData.password) {
          throw new Error("Session expired. Please sign up again.");
        }
        const credential = EmailAuthProvider.credential(email, pendingData.password);
        await linkWithCredential(auth.currentUser, credential);
        clearPending();
        // Save referral code if provided
        const suReferral = document.getElementById("su-referral")?.value.trim() || "";
        const referredBy = suReferral || data.referredBy || "";
        // Overwrite with real profile (same uid after linking)
        await setDoc(ref, {
          fullName: data.fullName,
          nickName: data.nickName,
          email: data.email,
          phone: data.phone || "",
          age: data.age || null,
          country: data.country,
          points: 0,
          awards: [],
          conferences: [],
          referredBy,
          otpVerified: true,
          createdAt: Date.now()
        });
      } else {
        // Google user — mark verified in existing profile
        await updateDoc(ref, {
          otpVerified: true,
          otpHash: deleteField(),
          otpExpiresAt: deleteField()
        });
      }

      // Award referral bonus if the referredBy code is valid
      const fbCode = (await getDoc(ref).catch(() => null))?.data()?.referredBy || "";
      if (fbCode) {
        try {
          const q = query(collection(db, "users"), where("referralCode", "==", fbCode));
          const refSnap = await getDocs(q);
          if (!refSnap.empty) {
            const entry = makeHistoryEntry(REFERRAL_POINTS, "referral_bonus", "Referral signup bonus");
            await updateDoc(ref, {
              activityPoints: increment(REFERRAL_POINTS),
              pointHistory: arrayUnion(entry)
            });
          }
        } catch (_) {}
      }

      msgEl.className = "auth-message success";
      msgEl.innerHTML = '<i class="fas fa-check-circle"></i> Verified! Redirecting...';
      clearPending();
      setTimeout(() => { window.location.href = "dashboard.html"; }, 1000);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        // This email is already linked to another Firebase Auth account
        msgEl.textContent = "This email is already registered. Try signing in instead.";
        clearPending();
        // Clean up the anonymous session
        auth.currentUser?.delete().catch(() => {});
      } else {
        msgEl.textContent = err.message;
      }
      msgEl.className = "auth-message error";
    }

    verifyBtn.disabled = false;
    verifyBtn.innerHTML = 'Verify';
  };

  resendBtn.onclick = async () => {
    resendBtn.style.display = "none";
    document.getElementById("otpTimerText").style.display = "inline";

    try {
      await checkOtpRateLimit(uid, email);
    } catch (e) {
      msgEl.className = "auth-message error";
      msgEl.textContent = e.message;
      startOtpTimer();
      return;
    }

    const otp = generateOtp();
    const hash = await sha256(otp);
    const expiresAt = Date.now() + 15 * 60 * 1000;

    await updateDoc(doc(db, "users", uid), {
      otpHash: hash,
      otpExpiresAt: expiresAt
    });

    await sendOtpEmail(email, otp);

    await recordOtpSend(uid);

    msgEl.className = "auth-message success";
    msgEl.textContent = "New code sent!";

    dig.forEach(inp => { inp.value = ""; inp.className = "otp-digit"; });
    dig[0].focus();

    startOtpTimer();
  };
}
