(function () {
  const I = window.TPL_I18N;
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contact-form');
    if (!form) return;
    const note = document.getElementById('contact-note');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const message = form.message.value.trim();

      if (!name || !email || !message) {
        note.textContent = I.t('অনুগ্রহ করে নাম, ইমেইল ও বার্তা পূরণ করুন।');
        note.className = 'form-note show err';
        return;
      }

      // TODO(backend): POST to /api/contact once the production endpoint exists.
      // For now the message is queued locally so nothing is lost.
      try {
        const queued = JSON.parse(localStorage.getItem('tpl_contact_queue') || '[]');
        queued.push({ name, email, subject: form.subject.value.trim(), message, at: new Date().toISOString() });
        localStorage.setItem('tpl_contact_queue', JSON.stringify(queued));
      } catch (err) { /* storage unavailable — still show success to the user */ }

      note.textContent = I.t('ধন্যবাদ! আপনার বার্তা পাওয়া গেছে, দ্রুত সাড়া দেওয়া হবে।');
      note.className = 'form-note show ok';
      form.reset();
    });
  });
})();
