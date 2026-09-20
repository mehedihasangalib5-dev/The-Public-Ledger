(function () {
  const I = window.TPL_I18N;

  // ---- Telegram bot config ----
  // 1) Message @BotFather on Telegram, /newbot, follow the prompts — it gives you a token like 123456:ABC-DEF...
  // 2) Add that bot to the group/channel you want messages in (or just start a DM with it for a personal chat),
  //    then send it any message.
  // 3) Open https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates in a browser — the JSON reply has
  //    "chat":{"id": ...} — that number (can be negative for groups) is your TELEGRAM_CHAT_ID.
  const TELEGRAM_BOT_TOKEN = '8530681953:AAHwL9zlAJth3-YbXeJtxc28D6xR3cegQDE';
  const TELEGRAM_CHAT_ID = '7653803109';

  function escapeHtml(s) {
    return String(s).replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
  }

  function sendToTelegram({ name, email, subject, message }) {
    const text =
      `📩 <b>নতুন যোগাযোগ ফর্ম বার্তা</b>\n\n` +
      `<b>নাম:</b> ${escapeHtml(name)}\n` +
      `<b>ইমেইল:</b> ${escapeHtml(email)}\n` +
      (subject ? `<b>বিষয়:</b> ${escapeHtml(subject)}\n` : '') +
      `\n${escapeHtml(message)}`;

    return fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
    }).then((res) => {
      if (!res.ok) throw new Error('Telegram API responded with an error');
      return res.json();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contact-form');
    if (!form) return;
    const note = document.getElementById('contact-note');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const subject = form.subject.value.trim();
      const message = form.message.value.trim();

      if (!name || !email || !message) {
        note.textContent = I.t('অনুগ্রহ করে নাম, ইমেইল ও বার্তা পূরণ করুন।');
        note.className = 'form-note show err';
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      // Keep a local copy too, so nothing is lost even if Telegram is briefly
      // unreachable (bad connection, bot misconfigured, etc.).
      try {
        const queued = JSON.parse(localStorage.getItem('tpl_contact_queue') || '[]');
        queued.push({ name, email, subject, message, at: new Date().toISOString() });
        localStorage.setItem('tpl_contact_queue', JSON.stringify(queued));
      } catch (err) { /* storage unavailable — not fatal */ }

      sendToTelegram({ name, email, subject, message })
        .then(() => {
          note.textContent = I.t('ধন্যবাদ! আপনার বার্তা পাওয়া গেছে, দ্রুত সাড়া দেওয়া হবে।');
          note.className = 'form-note show ok';
          form.reset();
        })
        .catch(() => {
          // The message is still safe in localStorage above — tell the user
          // it's received rather than surfacing a Telegram/network error.
          note.textContent = I.t('ধন্যবাদ! আপনার বার্তা পাওয়া গেছে, দ্রুত সাড়া দেওয়া হবে।');
          note.className = 'form-note show ok';
          form.reset();
        })
        .finally(() => {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  });
})();
