(function (global) {
  const NAV = [
    { href: 'dashboard.html', label: 'ড্যাশবোর্ড', icon: '▦' },
    { href: 'articles.html', label: 'প্রতিবেদন', icon: '📰' },
    { href: 'categories.html', label: 'বিভাগ', icon: '▤' },
  ];

  function renderShell(user, activeHref) {
    const sidebarHost = document.getElementById('admin-sidebar');
    const mobileHost = document.getElementById('mobile-topbar');
    if (sidebarHost) {
      sidebarHost.innerHTML = `
        <div class="brand">
          <img class="brand-logo" src="../assets/img/logo.png" alt="দ্য পাবলিক লেজার লোগো">
          <div class="mark">দ্য পাবলিক লেজার</div>
          <h2>অ্যাডমিন প্যানেল</h2>
        </div>
        <nav class="admin-nav">
          ${NAV.map(n => `<a href="${n.href}" class="${n.href === activeHref ? 'active' : ''}"><span>${n.icon}</span> ${n.label}</a>`).join('')}
        </nav>
        <div class="admin-user">
          <div class="who">${user.name}</div>
          <div class="role">${user.role === 'admin' ? 'প্রশাসক' : 'প্রতিবেদক'}</div>
          <button class="btn ghost small" id="logout-btn">লগআউট</button>
        </div>
      `;
      sidebarHost.querySelector('#logout-btn').addEventListener('click', () => window.TPL_AUTH.logout());
    }
    if (mobileHost) {
      mobileHost.innerHTML = `
        <button id="sidebar-toggle" aria-label="মেনু">☰</button>
        <strong>দ্য পাবলিক লেজার · অ্যাডমিন</strong>
      `;
      mobileHost.querySelector('#sidebar-toggle').addEventListener('click', () => {
        sidebarHost.classList.toggle('open');
      });
    }
  }

  function toast(msg) {
    let el = document.getElementById('tpl-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tpl-toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2400);
  }

  global.TPL_SHELL = { renderShell, toast };
})(window);
