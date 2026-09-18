/* ============================================================
   THE PUBLIC LEDGER — Firebase init
   Loaded on every page (public + /admin) before db.js / admin-auth.js.
   Requires the firebase-app-compat.js script (and, where needed,
   firebase-auth-compat.js / firebase-firestore-compat.js) to be
   included BEFORE this file.
   ============================================================ */
(function (global) {
  const firebaseConfig = {
    apiKey: "AIzaSyAhYNA3AlCtM698XNqUEC-93m14bGeTB3g",
    authDomain: "the-public-ledger-26.firebaseapp.com",
    projectId: "the-public-ledger-26",
    storageBucket: "the-public-ledger-26.firebasestorage.app",
    messagingSenderId: "771260512411",
    appId: "1:771260512411:web:1a15875706e8be6fa82e3e",
    measurementId: "G-H9WE5Q8VV2"
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  global.TPL_FIREBASE = {
    db: firebase.firestore(),
    auth: firebase.auth ? firebase.auth() : null
  };
})(window);
