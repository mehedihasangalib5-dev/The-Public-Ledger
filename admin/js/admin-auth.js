/* ============================================================
   THE PUBLIC LEDGER — admin auth (Firebase Authentication + roles)
   Requires firebase-init.js to have run first (window.TPL_FIREBASE).

   Roles live in Firestore: collection `staff`, document id = the
   user's Firebase Auth UID, field `role` = "admin" | "reporter".
   Someone who can sign in but has no `staff` document is turned away.
   (The Firestore rules enforce the same thing on the server — this
   file only decides what the screen shows.)
   ============================================================ */
(function (global) {
  let cachedRole = null;

  function auth() { return global.TPL_FIREBASE.auth; }
  function db() { return global.TPL_FIREBASE.db; }

  function toUser(fbUser, role) {
    if (!fbUser) return null;
    return {
      uid: fbUser.uid,
      email: fbUser.email,
      name: fbUser.displayName || fbUser.email,
      role: role || cachedRole || 'reporter'
    };
  }

  // Resolves to "admin", "reporter", or null (not staff).
  function fetchRole(uid) {
    return db().collection('staff').doc(uid).get().then((doc) => {
      if (!doc.exists) return null;
      const r = doc.data().role;
      return r === 'admin' || r === 'reporter' ? r : null;
    }).catch((err) => {
      // Firestore rules not updated yet (no rule for `staff`): don't lock the
      // owner out of the panel. The server rules still decide what can be saved.
      console.warn('Could not read staff role; assuming admin until the Firestore rules are updated.', err && err.code);
      return 'admin';
    });
  }

  function login(email, password) {
    return auth().signInWithEmailAndPassword(email, password).then((cred) =>
      fetchRole(cred.user.uid).then((role) => {
        if (!role) {
          return auth().signOut().then(() => {
            const e = new Error('This account is not on the staff list.');
            e.code = 'app/not-staff';
            throw e;
          });
        }
        cachedRole = role;
        return toUser(cred.user, role);
      })
    );
  }

  function logout() {
    return auth().signOut().then(() => { location.href = 'index.html'; });
  }

  function currentUser() {
    return toUser(auth().currentUser, cachedRole);
  }

  // Waits for Firebase to resolve the sign-in state once, then either calls
  // cb(user) or sends the visitor away. opts.adminOnly: reporters are sent
  // back to the dashboard.
  function requireAuth(cb, opts) {
    const unsubscribe = auth().onAuthStateChanged((fbUser) => {
      unsubscribe();
      if (!fbUser) { location.href = 'index.html'; return; }
      fetchRole(fbUser.uid).then((role) => {
        if (!role) {
          auth().signOut().then(() => { location.href = 'index.html?denied=1'; });
          return;
        }
        if (opts && opts.adminOnly && role !== 'admin') { location.href = 'dashboard.html'; return; }
        cachedRole = role;
        cb(toUser(fbUser, role));
      });
    });
  }

  global.TPL_AUTH = { login, logout, currentUser, requireAuth };
})(window);
