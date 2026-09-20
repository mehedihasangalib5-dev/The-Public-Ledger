/* ============================================================
   THE PUBLIC LEDGER — staff management (admin-only)
   There is no backend, so creating a new Firebase Auth account has to
   happen client-side. Doing that with the normal `firebase.auth()`
   instance would sign the CURRENT admin out and into the new account.
   The standard workaround: spin up a second, throwaway Firebase App
   instance, create the user on THAT instance, sign it back out, then
   delete the instance — the admin's real session is never touched.
   ============================================================ */
(function () {
  let staffList = [];

  function createStaffAccount(name, email, password, role) {
    const secondary = firebase.initializeApp(window.TPL_FIREBASE.config, 'staff-creator-' + Date.now());
    return secondary.auth().createUserWithEmailAndPassword(email, password)
      .then((cred) => cred.user.updateProfile({ displayName: name }).then(() => cred.user))
      .then((user) => {
        const uid = user.uid;
        return secondary.auth().signOut()
          .then(() => secondary.delete())
          .then(() => window.TPL_DB.saveStaffMember(uid, { name, email, role }))
          .then(() => ({ uid, name, email, role }));
      })
      .catch((err) => secondary.delete().catch(() => {}).then(() => { throw err; }));
  }

  function explainAuthError(err) {
    const code = (err && err.code) || '';
    if (code === 'auth/email-already-in-use') return 'এই ইমেইল দিয়ে আগে থেকেই একটা অ্যাকাউন্ট আছে।';
    if (code === 'auth/invalid-email') return 'ইমেইলটি সঠিক নয়।';
    if (code === 'auth/weak-password') return 'পাসওয়ার্ড খুব দুর্বল — কমপক্ষে ৬ অক্ষর দিন।';
    if (code === 'permission-denied') return 'স্টাফ তালিকায় লেখার অনুমতি নেই — Firestore Rules দেখুন।';
    return 'তৈরি করা যায়নি: ' + ((err && err.message) || err);
  }

  function render() {
    const grid = document.getElementById('staff-grid');
    if (!staffList.length) {
      grid.innerHTML = '<p class="field-hint" style="padding:10px;">এখনো কোনো স্টাফ যোগ করা হয়নি।</p>';
      return;
    }
    grid.innerHTML = staffList.map(s => `
      <div class="staff-card" data-uid="${s.uid}">
        <div class="name">${s.name || s.email}</div>
        <div class="email">${s.email || ''}</div>
        <div class="role-row">
          <select class="role-select">
            <option value="reporter" ${s.role === 'reporter' ? 'selected' : ''}>প্রতিবেদক</option>
            <option value="admin" ${s.role === 'admin' ? 'selected' : ''}>প্রশাসক</option>
          </select>
          <button type="button" class="btn small ghost remove-staff" style="color:var(--ledger-red);">সরান</button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.staff-card').forEach(card => {
      const uid = card.dataset.uid;
      card.querySelector('.role-select').addEventListener('change', (e) => {
        window.TPL_DB.saveStaffMember(uid, { role: e.target.value }).then(() => {
          const s = staffList.find(x => x.uid === uid);
          if (s) s.role = e.target.value;
          window.TPL_SHELL.toast('ভূমিকা হালনাগাদ করা হয়েছে');
        }).catch((err) => window.TPL_SHELL.toast(explainAuthError(err)));
      });
      card.querySelector('.remove-staff').addEventListener('click', () => {
        if (!confirm('এই স্টাফকে প্যানেল থেকে সরিয়ে দিতে চান? তার লগইন অ্যাকাউন্ট থাকবে কিন্তু প্যানেলে ঢুকতে পারবে না।')) return;
        window.TPL_DB.deleteStaffMember(uid).then(() => {
          staffList = staffList.filter(s => s.uid !== uid);
          render();
          window.TPL_SHELL.toast('স্টাফ সরানো হয়েছে');
        }).catch((err) => window.TPL_SHELL.toast(explainAuthError(err)));
      });
    });
  }

  function openModal() {
    document.getElementById('staff-form').reset();
    document.getElementById('staff-error').style.display = 'none';
    document.getElementById('staff-modal').classList.add('open');
  }
  function closeModal() {
    document.getElementById('staff-modal').classList.remove('open');
  }

  function showError(msg) {
    const box = document.getElementById('staff-error');
    box.textContent = msg || '';
    box.style.display = msg ? 'block' : 'none';
  }

  function saveStaff(e) {
    e.preventDefault();
    showError('');
    const name = document.getElementById('staff-name').value.trim();
    const email = document.getElementById('staff-email').value.trim();
    const password = document.getElementById('staff-password').value;
    const role = document.getElementById('staff-role').value;

    const btn = document.getElementById('staff-save-btn');
    btn.disabled = true;
    btn.textContent = 'তৈরি হচ্ছে…';

    createStaffAccount(name, email, password, role).then((s) => {
      staffList.unshift(s);
      render();
      closeModal();
      window.TPL_SHELL.toast('নতুন স্টাফ তৈরি হয়েছে');
    }).catch((err) => {
      console.error(err);
      showError(explainAuthError(err));
    }).then(() => {
      btn.disabled = false;
      btn.textContent = 'তৈরি করুন';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.TPL_AUTH.requireAuth((user) => {
      window.TPL_SHELL.renderShell(user, 'staff.html');
      window.TPL_DB.getStaff().then((list) => {
        staffList = list;
        render();

        document.getElementById('new-staff-btn').addEventListener('click', openModal);
        document.getElementById('staff-modal-close').addEventListener('click', closeModal);
        document.getElementById('staff-modal-cancel').addEventListener('click', closeModal);
        document.getElementById('staff-modal').addEventListener('click', (e) => { if (e.target.id === 'staff-modal') closeModal(); });
        document.getElementById('staff-form').addEventListener('submit', saveStaff);
      });
    }, { adminOnly: true });
  });
})();
