// Deb8er Analytics Tracker — fires a single Firestore write per page load
// Zero dependencies beyond Firebase, zero blocking, zero impact on users

(function() {
  // Skip admin pages
  const rawPath = location.pathname;
  if (rawPath.includes('admin.html') || rawPath.includes('worker')) return;

  // Map filesystem paths to production deb8erglobal.com paths
  function getCleanPath(p) {
    // Strip leading slash, remove .html extension
    let clean = p.replace(/^\//, '').replace(/\.html$/, '');
    // Index page = root
    if (clean === 'index') return '/';
    // Guides subfolder
    if (clean.startsWith('guides/')) return '/' + clean;
    // Everything else
    return '/' + clean;
  }

  const page = getCleanPath(rawPath) + location.search;

  // Detect device
  const ua = navigator.userAgent || '';
  let device = 'desktop';
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) device = 'mobile';
  else if (/iPad|Tablet/i.test(ua)) device = 'tablet';

  // Detect browser
  let browser = 'Other';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua) && !/Edg|OPR/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua) && !/Chrome|Edg|OPR/i.test(ua)) browser = 'Safari';
  else if (/OPR|Opera/i.test(ua)) browser = 'Opera';

  // Detect OS
  let os = 'Other';
  if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // Referrer
  const referrer = document.referrer || '';

  // Fire after page is fully loaded — never blocks rendering
  window.addEventListener('load', function() {
    // Lazy-import Firebase so it never blocks anything
    Promise.all([
      import('https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js'),
      import('https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js')
    ]).then(function(modules) {
      const appModule = modules[0];
      const firestoreModule = modules[1];
      const authModule = modules[2];

      const firebaseConfig = {
        apiKey: "AIzaSyDGEGLVwVQfi8YgG0oZthSTr7YNbfW5wwo",
        authDomain: "deb8ersignup-4b9e1.firebaseapp.com",
        projectId: "deb8ersignup-4b9e1",
        storageBucket: "deb8ersignup-4b9e1.firebasestorage.app",
        messagingSenderId: "498995453154",
        appId: "1:498995453154:web:de1836f0b8cd764c8292bb"
      };

      const app = appModule.getApps().length ? appModule.getApp() : appModule.initializeApp(firebaseConfig);
      const db = firestoreModule.getFirestore(app);
      const auth = authModule.getAuth(app);

      function writeDoc(uid, country) {
        firestoreModule.addDoc(firestoreModule.collection(db, 'analytics'), {
          page: page,
          device: device,
          browser: browser,
          os: os,
          country: country || '',
          referrer: referrer,
          uid: uid || '',
          timestamp: Date.now()
        }).catch(function() { /* silent */ });
      }

      // If user is logged in, grab their country then write
      const user = auth.currentUser;
      if (user && !user.isAnonymous) {
        firestoreModule.getDoc(firestoreModule.doc(db, 'users', user.uid)).then(function(snap) {
          const country = snap.exists() ? (snap.data().country || '') : '';
          writeDoc(user.uid, country);
        }).catch(function() {
          writeDoc(user.uid, '');
        });
      } else {
        writeDoc('', '');
      }
    }).catch(function() { /* silent — analytics never breaks anything */ });
  }, { once: true });
})();
