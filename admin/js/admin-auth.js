/* ============================================================
   THE PUBLIC LEDGER — admin auth (Firebase Authentication)
   Requires firebase-init.js to have run first (window.TPL_FIREBASE.auth).
   ============================================================ */
(function (global) {
  function auth() {
    return global.TPL_FIREBASE.auth;
  }

  function toUser(fbUser) {
    if (!fbUser) return null;
    return {
      uid: fbUser.uid,
      email: fbUser.email,
      name: fbUser.displayName || fbUser.email,
      role: 'admin'
    };
  }

  function login(email, password) {
    return auth().signInWithEmailAndPassword(email, password).then(cred => toUser(cred.user));
  }

  function logout() {
    return auth().signOut().then(() => { location.href = 'index.html'; });
  }

  function currentUser() {
    return toUser(auth().currentUser);
  }

  // Waits for Firebase to resolve the sign-in state once, then either
  // calls cb(user) or sends the visitor back to the login page.
  function requireAuth(cb) {
    const unsubscribe = auth().onAuthStateChanged((fbUser) => {
      unsubscribe();
      if (!fbUser) { location.href = 'index.html'; return; }
      cb(toUser(fbUser));
    });
  }

  global.TPL_AUTH = { login, logout, currentUser, requireAuth };
})(window);
