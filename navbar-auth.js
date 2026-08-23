/**
 * navbar-auth.js
 *
 * Injected on every page. Shows "My Account" with a hover dropdown (sign out)
 * when logged in, or "Sign Up" when logged out.
 *
 * Firebase SDK is loaded lazily — never fetched for logged-out visitors,
 * and Firestore is only fetched when a logged-in user needs profile data.
 */

const firebaseConfig = {
  apiKey: "AIzaSyDGEGLVwVQfi8YgG0oZthSTr7YNbfW5wwo",
  authDomain: "deb8ersignup-4b9e1.firebaseapp.com",
  projectId: "deb8ersignup-4b9e1",
  storageBucket: "deb8ersignup-4b9e1.firebasestorage.app",
  messagingSenderId: "498995453154",
  appId: "1:498995453154:web:de1836f0b8cd764c8292bb"
};

// ── Non-Firebase utilities (run immediately) ──

function esc(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Show initial button immediately (no Firebase needed for logged-out state)
const navItem = document.getElementById("nav-auth-item");
if (navItem) {
  navItem.innerHTML = `<a href="auth.html" class="join-btn">Sign Up</a>`;
}

// Inject dropdown styles immediately
const styleId = "nav-auth-styles";
if (!document.getElementById(styleId)) {
  const s = document.createElement("style");
  s.id = styleId;
  s.textContent = `
    .nav-auth-wrap {
      position: relative;
      display: inline-flex;
    }
    .nav-auth-wrap .nav-account-btn {
      font-size: 14px;
      font-weight: 500;
      color: #0B0E14 !important;
      text-decoration: none;
      padding: 8px 20px;
      border-radius: 6px;
      background: linear-gradient(90deg, var(--button-1), var(--button-2));
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.15s;
      white-space: nowrap;
      min-width: max-content;
      line-height: 1;
    }
    .nav-auth-wrap .nav-account-btn:hover {
      opacity: 0.85;
      transform: translateY(-1px) !important;
    }
    .nav-auth-wrap .nav-account-btn::after { display: none !important; }

    .nav-dropdown-menu {
      display: none;
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 200px;
      background: #181b24;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 6px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.5);
      z-index: 999;
    }
    .nav-dropdown-menu::before {
      content: "";
      position: absolute;
      top: -10px;
      left: 0;
      right: 0;
      height: 10px;
      background: transparent;
    }
    .nav-auth-wrap:hover .nav-dropdown-menu,
    .nav-dropdown-menu:hover {
      display: block;
    }

    .nav-dropdown-header {
      padding: 10px 12px 8px;
    }
    .nav-dropdown-name {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #F4F6FB;
    }
    .nav-dropdown-email {
      display: block;
      font-size: 12px;
      color: #6B7280;
      margin-top: 2px;
    }
    .nav-dropdown-divider {
      height: 1px;
      background: rgba(255,255,255,0.06);
      margin: 4px 0;
    }
    .nav-dropdown-item {
      display: flex !important;
      align-items: center;
      gap: 10px;
      padding: 9px 12px !important;
      border-radius: 8px;
      font-size: 13px !important;
      color: #D1D5DB !important;
      text-decoration: none !important;
      transition: background 0.15s;
      letter-spacing: 0px !important;
    }
    .nav-dropdown-item::after { display: none !important; }
    .nav-dropdown-item:hover {
      background: rgba(255,255,255,0.04) !important;
      color: #F4F6FB !important;
      transform: none !important;
    }
    .nav-dropdown-item i {
      width: 16px;
      text-align: center;
      font-size: 13px;
      color: #6B7280;
    }
    .nav-dropdown-item:hover i { color: #D1D5DB; }
    .nav-dropdown-item.sign-out {
      color: #FCA5A5 !important;
    }
    .nav-dropdown-item.sign-out:hover {
      background: rgba(239,68,68,0.08) !important;
    }
    .nav-dropdown-item.sign-out i { color: #F87171; }

    @media (max-width: 1024px) {
      .nav-auth-wrap { display: flex; width: 100%; flex-direction: column; align-items: center; }
      .nav-auth-wrap .nav-account-btn { width: 100%; max-width: 320px; justify-content: center; padding: 14px 24px; font-size: 15px; border-radius: 12px; }
      .nav-dropdown-menu {
        position: static;
        width: 100%;
        max-width: 320px;
        box-shadow: none;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px;
        margin-top: 8px;
        background: rgba(24,27,36,0.95);
        padding: 8px;
      }
      .nav-auth-wrap:hover .nav-dropdown-menu { display: none; }
      .nav-auth-wrap .nav-dropdown-menu.show { display: block; }
      .nav-dropdown-header { padding: 12px 12px 10px; text-align: center; }
      .nav-dropdown-name { font-size: 15px; }
      .nav-dropdown-email { font-size: 12px; }
      .nav-dropdown-item { padding: 12px !important; justify-content: center; font-size: 14px !important; border-radius: 10px; }
    }
  `;
  document.head.appendChild(s);
}

// ── Firebase lazy loader ──

let app = null;
let auth = null;
let authApi = null;

async function ensureAuth() {
  if (authApi) return authApi;
  const modules = await Promise.all([
    import("https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js")
  ]);
  const { initializeApp, getApps, getApp } = modules[0];
  const { getAuth, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } = modules[1];
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  await setPersistence(auth, browserLocalPersistence);
  authApi = { auth, onAuthStateChanged, signOut };
  return authApi;
}

async function ensureDb() {
  const { getFirestore, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js");
  return { db: getFirestore(app), doc, getDoc };
}

// Lazily init Firebase and check auth state
(async () => {
  try {
    const { auth: a, onAuthStateChanged, signOut } = await ensureAuth();
    onAuthStateChanged(a, async (user) => {
      if (!navItem) return;
      if (!user) {
        navItem.innerHTML = `<a href="auth.html" class="join-btn">Sign Up</a>`;
        return;
      }

      let name = "My Account";
      let email = user.email || "";
      const PROFILE_CACHE_KEY = 'deb8er_profile_' + user.uid;

      // Try cache first for instant name render
      try {
        const cached = localStorage.getItem(PROFILE_CACHE_KEY);
        if (cached) {
          const cd = JSON.parse(cached);
          if (cd && cd.fullName) {
            name = cd.nickName || cd.fullName || name;
            email = cd.email || email;
          }
        }
      } catch (_) {}

      try {
        const { db, doc, getDoc } = await ensureDb();
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const snap = await getDoc(doc(db, "users", user.uid));
            if (snap.exists()) {
              const p = snap.data();
              name = p.nickName || p.fullName || name;
              email = p.email || email;
              // Update cache with fresh data
              try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p)); } catch (_) {}
            }
            break;
          } catch (e) {
            if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
            else console.warn("Navbar profile load failed after 3 attempts:", e);
          }
        }
      } catch (e) {
        console.warn("Navbar Firestore load failed:", e);
      }

      navItem.innerHTML = `
        <div class="nav-auth-wrap">
          <a href="#" class="nav-account-btn" id="nav-account-toggle">
            <i class="fas fa-user"></i> ${esc(name.split(" ")[0])}
          </a>
          <div class="nav-dropdown-menu">
            <div class="nav-dropdown-header">
              <span class="nav-dropdown-name">${esc(name)}</span>
              <span class="nav-dropdown-email">${esc(email)}</span>
            </div>
            <div class="nav-dropdown-divider"></div>
            <a href="dashboard.html" class="nav-dropdown-item">
              <i class="fas fa-user"></i> My Account
            </a>
            <a href="#" class="nav-dropdown-item sign-out" id="nav-sign-out">
              <i class="fas fa-sign-out-alt"></i> Sign Out
            </a>
          </div>
        </div>
      `;

      const signOutBtn = document.getElementById("nav-sign-out");
      if (signOutBtn) {
        signOutBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          try { localStorage.removeItem(PROFILE_CACHE_KEY); } catch (_) {}
          await signOut(a);
          window.location.href = "index.html";
        });
      }

      const toggleBtn = document.getElementById("nav-account-toggle");
      if (toggleBtn) {
        toggleBtn.addEventListener("click", (e) => {
          if (window.innerWidth <= 768) {
            e.preventDefault();
            const menu = navItem.querySelector(".nav-dropdown-menu");
            if (menu) menu.classList.toggle("show");
          }
        });
      }
    });

    // Listen for profile updates from dashboard to re-render name without page reload
    window.addEventListener('deb8er-profile-updated', () => {
      try {
        const user = a.currentUser;
        if (!user || !navItem) return;
        const PROFILE_CACHE_KEY = 'deb8er_profile_' + user.uid;
        const cached = JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || '{}');
        const name = cached.nickName || cached.fullName || "My Account";
        const email = cached.email || user.email || "";

        navItem.innerHTML = `
          <div class="nav-auth-wrap">
            <a href="#" class="nav-account-btn" id="nav-account-toggle">
              <i class="fas fa-user"></i> ${esc(name.split(" ")[0])}
            </a>
            <div class="nav-dropdown-menu">
              <div class="nav-dropdown-header">
                <span class="nav-dropdown-name">${esc(name)}</span>
                <span class="nav-dropdown-email">${esc(email)}</span>
              </div>
              <div class="nav-dropdown-divider"></div>
              <a href="dashboard.html" class="nav-dropdown-item">
                <i class="fas fa-user"></i> My Account
              </a>
              <a href="#" class="nav-dropdown-item sign-out" id="nav-sign-out">
                <i class="fas fa-sign-out-alt"></i> Sign Out
              </a>
            </div>
          </div>
        `;

        const signOutBtn = document.getElementById("nav-sign-out");
        if (signOutBtn) {
          signOutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            try { localStorage.removeItem(PROFILE_CACHE_KEY); } catch (_) {}
            await signOut(a);
            window.location.href = "index.html";
          });
        }
        const toggleBtn = document.getElementById("nav-account-toggle");
        if (toggleBtn) {
          toggleBtn.addEventListener("click", (e) => {
            if (window.innerWidth <= 768) {
              e.preventDefault();
              const menu = navItem.querySelector(".nav-dropdown-menu");
              if (menu) menu.classList.toggle("show");
            }
          });
        }
      } catch (_) {}
    });
  } catch (e) {
    console.warn("Firebase auth init failed (nav stays as Sign Up):", e);
  }
})();

// ---- ACTIVE NAV LINK ----
(function() {
  const path = window.location.pathname.replace(/\/$/, '') || '/index.html';
  const page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
  document.querySelectorAll('.nav-links a:not(.join-btn):not(.nav-account-btn)').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });
})();

// ---- NAV HAMBURGER (keyboard-accessible, runs on every page) ----
{
  const toggle = document.getElementById("navToggle");
  const links  = document.getElementById("navLinks");
  if (toggle && links) {
    const toggleNav = () => {
      links.classList.toggle("active");
      document.body.classList.toggle("nav-open");
    };
    toggle.addEventListener("click", toggleNav);
    toggle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleNav();
      }
    });
    links.querySelectorAll("a").forEach(l =>
      l.addEventListener("click", () => {
        links.classList.remove("active");
        document.body.classList.remove("nav-open");
      })
    );
  }
}
