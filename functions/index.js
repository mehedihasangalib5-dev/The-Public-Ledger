/* ============================================================
   THE PUBLIC LEDGER — Cloud Functions

   1) Staff management (admin only, called from /admin/staff.html):
        inviteStaff({ email, displayName, role })
        setStaffRole({ uid, role })
        removeStaff({ uid })
        listStaff()
      These run with the Admin SDK, which bypasses Firestore rules —
      it's what lets the UI do what used to require the Firebase
      Console. They set a `role` CUSTOM CLAIM on the Auth user AND
      mirror it into the `staff/{uid}` Firestore doc that the
      Firestore/Storage rules and the admin panel already read.

      IMPORTANT: after inviteStaff/setStaffRole runs, the affected
      user's ID token still has the OLD claims until it refreshes.
      The admin panel forces this with `getIdToken(true)` after
      login and after any role change made to the signed-in user.

   2) Scheduled publishing:
        promoteScheduled — runs every 5 minutes, flips any article
        with status "scheduled" whose publishAt has passed to
        "published". (The admin panel also does a best-effort version
        of this client-side on load, in case this function isn't
        deployed — see admin/js/admin-articles.js `promoteScheduled`.)

   Deploy (from the project root, after `npm install` in /functions):
     firebase deploy --only functions
   Requires the Blaze (pay-as-you-go) plan — Cloud Functions and the
   pubsub scheduler are not available on Spark. The FIRST admin still
   has to be created once, by hand, in the Firebase Console or via
   the Admin SDK (create the Auth user, then a `staff/{uid}` doc with
   role "admin"); after that, that admin can invite everyone else
   from /admin/staff.html.
   ============================================================ */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

const VALID_ROLES = ['admin', 'reporter'];

/* ---------------- shared guards ---------------- */

function requireSignedIn(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
  }
}

// Trusts the custom claim when present (fast, no extra read); falls back to
// the Firestore `staff` doc so admins created before custom claims existed
// (e.g. by hand in the Console) still work.
async function requireAdmin(context) {
  requireSignedIn(context);
  if (context.auth.token && context.auth.token.role === 'admin') return;
  const doc = await db.collection('staff').doc(context.auth.uid).get();
  if (doc.exists && doc.data().role === 'admin') return;
  throw new functions.https.HttpsError('permission-denied', 'Admins only.');
}

function assertRole(role) {
  if (!VALID_ROLES.includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', `role must be one of: ${VALID_ROLES.join(', ')}`);
  }
}

function assertEmail(email) {
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid email is required.');
  }
}

/* ---------------- callable: invite a new staff member ---------------- */
exports.inviteStaff = functions.https.onCall(async (data, context) => {
  await requireAdmin(context);
  const email = String(data.email || '').trim().toLowerCase();
  const displayName = String(data.displayName || '').trim();
  const role = data.role;
  assertEmail(email);
  assertRole(role);

  let userRecord;
  let created = false;
  try {
    userRecord = await auth.getUserByEmail(email);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw new functions.https.HttpsError('internal', e.message);
    userRecord = await auth.createUser({
      email,
      displayName: displayName || undefined,
      // Random throwaway password: the invited user signs in for the first
      // time via the "forgot password" email the admin panel sends right
      // after this call succeeds — they never see this value.
      password: `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}Aa1!`
    });
    created = true;
  }

  await auth.setCustomUserClaims(userRecord.uid, { role });
  await db.collection('staff').doc(userRecord.uid).set({
    email,
    displayName: displayName || userRecord.displayName || '',
    role,
    invitedBy: context.auth.uid,
    invitedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  return { uid: userRecord.uid, email, created };
});

/* ---------------- callable: change an existing staff member's role ---------------- */
exports.setStaffRole = functions.https.onCall(async (data, context) => {
  await requireAdmin(context);
  const uid = String(data.uid || '');
  const role = data.role;
  if (!uid) throw new functions.https.HttpsError('invalid-argument', 'uid is required.');
  assertRole(role);
  if (uid === context.auth.uid && role !== 'admin') {
    throw new functions.https.HttpsError('failed-precondition', 'You cannot demote your own account.');
  }

  await auth.setCustomUserClaims(uid, { role });
  await db.collection('staff').doc(uid).set({
    role,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: context.auth.uid
  }, { merge: true });

  return { ok: true };
});

/* ---------------- callable: remove a staff member ---------------- */
exports.removeStaff = functions.https.onCall(async (data, context) => {
  await requireAdmin(context);
  const uid = String(data.uid || '');
  if (!uid) throw new functions.https.HttpsError('invalid-argument', 'uid is required.');
  if (uid === context.auth.uid) {
    throw new functions.https.HttpsError('failed-precondition', 'You cannot remove your own account.');
  }

  await auth.setCustomUserClaims(uid, { role: null }); // revoke access
  await db.collection('staff').doc(uid).delete();      // Firestore rules read this doc to grant access

  return { ok: true };
});

/* ---------------- callable: list current staff ---------------- */
exports.listStaff = functions.https.onCall(async (data, context) => {
  await requireAdmin(context);
  const snap = await db.collection('staff').get();
  const staff = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  // Fill in a live disabled/lastSignIn view from Auth where available (best effort).
  await Promise.all(staff.map(async (s) => {
    try {
      const u = await auth.getUser(s.uid);
      s.disabled = u.disabled;
      s.lastSignInTime = u.metadata.lastSignInTime || null;
    } catch (e) { s.disabled = null; s.lastSignInTime = null; }
  }));
  staff.sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')));
  return { staff };
});

/* ---------------- scheduled: flip due "scheduled" articles to "published" ---------------- */
exports.promoteScheduled = functions.pubsub.schedule('every 5 minutes').onRun(async () => {
  const now = admin.firestore.Timestamp.now();
  const due = await db.collection('articles')
    .where('status', '==', 'scheduled')
    .where('publishAt', '<=', now)
    .get();
  if (due.empty) return null;

  const batch = db.batch();
  due.docs.forEach((doc) => batch.update(doc.ref, {
    status: 'published',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }));
  await batch.commit();
  console.log(`promoteScheduled: published ${due.size} article(s).`);
  return null;
});
