/* ============================================================
   THE PUBLIC LEDGER — shared chrome (header / nav / ticker / footer)
   Mount points expected on every public page:
     #site-header, #site-ticker, #site-footer, #load-bar, #read-bar
   ============================================================ */
(function () {
  // Nav items are built dynamically from the categories the admin
  // panel manages (Firestore `categories` collection) so a category
  // added/renamed/removed in /admin shows up here automatically —
  // nothing category-related is hardcoded anymore.
  function buildNavItems(cats) {
    const catItems = (cats || []).map(c => ({ href: `category.html?cat=${c.slug}`, label: c.name_bn }));
    return [
      { href: 'index.html', label: 'প্রচ্ছদ' },
      ...catItems,
      { href: 'about.html', label: 'আমাদের সম্পর্কে' },
      { href: 'contact.html', label: 'যোগাযোগ' },
    ];
  }

  function fmtDateBn(iso) {
    const d = new Date(iso + 'T00:00:00');
    const days = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি'];
    const months = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    return `${days[d.getDay()]}বার, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  window.TPL_fmtDateBn = fmtDateBn;

  function currentFile() {
    const p = location.pathname.split('/').pop();
    return p || 'index.html';
  }

  function ensureSidebarRoot() {
    let root = document.getElementById('sidebar-root');
    if (root) return root;
    root = document.createElement('div');
    root.className = 'sidebar-root';
    root.id = 'sidebar-root';
    root.innerHTML = `
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <aside class="site-sidebar" id="site-sidebar" aria-hidden="true">
        <div class="sidebar-head">
          <span class="sidebar-brand">দ্য পাবলিক লেজার<small>মেনু ও বিভাগ</small></span>
          <button class="sidebar-close" id="sidebar-close" aria-label="মেনু বন্ধ করুন">✕</button>
        </div>
        <div class="sidebar-search">
          <form id="sidebar-search-form" role="search">
            <input type="search" id="sidebar-search-input" placeholder="খবর খুঁজুন…" aria-label="খবর খুঁজুন">
            <button type="submit">খুঁজুন</button>
          </form>
        </div>
        <nav class="sidebar-nav"><ul id="sidebar-nav-list"></ul></nav>
        <div class="sidebar-foot">
          <div class="sidebar-social">
            <a href="#" aria-label="Facebook">f</a>
            <a href="#" aria-label="Twitter">X</a>
            <a href="#" aria-label="YouTube">▶</a>
          </div>
          <a class="sidebar-cta" href="contact.html">যোগাযোগ করুন</a>
        </div>
      </aside>
    `;
    document.body.appendChild(root);

    const overlay = root.querySelector('#sidebar-overlay');
    const closeBtn = root.querySelector('#sidebar-close');
    overlay.addEventListener('click', closeSidebar);
    closeBtn.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSidebar(); });
    root.querySelector('#sidebar-search-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = root.querySelector('#sidebar-search-input').value.trim();
      if (q) location.href = `category.html?q=${encodeURIComponent(q)}`;
    });
    return root;
  }

  function openSidebar() {
    const root = ensureSidebarRoot();
    root.querySelector('#sidebar-overlay').classList.add('open');
    root.querySelector('#site-sidebar').classList.add('open');
    root.querySelector('#site-sidebar').setAttribute('aria-hidden', 'false');
    const toggle = document.getElementById('nav-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    const root = document.getElementById('sidebar-root');
    if (!root) return;
    root.querySelector('#sidebar-overlay').classList.remove('open');
    root.querySelector('#site-sidebar').classList.remove('open');
    root.querySelector('#site-sidebar').setAttribute('aria-hidden', 'true');
    const toggle = document.getElementById('nav-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function renderSidebar(navItems, isActive) {
    const root = ensureSidebarRoot();
    const list = root.querySelector('#sidebar-nav-list');
    list.innerHTML = '';
    navItems.forEach((item, i) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      if (isActive(item)) a.classList.add('active');
      a.addEventListener('click', closeSidebar);
      li.appendChild(a);
      list.appendChild(li);
      if (i === 0) {
        const hr = document.createElement('hr');
        hr.className = 'sidebar-divider';
        list.appendChild(hr);
      }
    });
  }

  // Header is now just the dateline + masthead (logo, tagline, search).
  // The category bar is gone — categories live only in the slide-out
  // sidebar, opened via the hamburger button in the masthead.
  function renderHeader() {
    const host = document.getElementById('site-header');
    if (!host) return;
    const dateStr = fmtDateBn('2026-09-18');
    host.innerHTML = `
      <div class="dateline">
        <div class="wrap">
          <span>${dateStr} · ঢাকা সংস্করণ</span>
          <span class="lang-toggle"><a href="#" class="active">বাংলা</a><a href="#" id="en-note">English</a></span>
        </div>
      </div>
      <div class="masthead">
        <div class="wrap">
          <button class="nav-toggle" id="nav-toggle" aria-label="মেনু খুলুন" aria-expanded="false" aria-controls="site-sidebar">
            <span class="hbars"><span></span><span></span><span></span></span>
            <span class="htext">মেনু</span>
          </button>
          <a class="brand" href="index.html">
            <img class="brand-logo" src="assets/img/logo.png" alt="দ্য পাবলিক লেজার লোগো">
            <span class="mark">প্রতিষ্ঠিত ২০২৬ · খণ্ড ১, সংখ্যা ১</span>
            <h1>দ্য পাবলিক লেজার</h1>
            <span class="tagline">The Public Ledger — every entry, accounted for.</span>
          </a>
          <form class="masthead-search" id="site-search-form" role="search">
            <input type="search" id="site-search-input" placeholder="খবর খুঁজুন…" aria-label="খবর খুঁজুন">
            <button type="submit">খুঁজুন</button>
          </form>
        </div>
      </div>
    `;

    const toggle = host.querySelector('#nav-toggle');
    toggle.addEventListener('click', () => openSidebar());

    host.querySelector('#site-search-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = host.querySelector('#site-search-input').value.trim();
      if (q) location.href = `category.html?q=${encodeURIComponent(q)}`;
    });
    host.querySelector('#en-note').addEventListener('click', (e) => {
      e.preventDefault();
      alert('ইংরেজি সংস্করণ শীঘ্রই আসছে। এই মুহূর্তে সাইটটি বাংলায় পড়া যাচ্ছে।');
    });
  }

  // Fetches the live category list from Firestore (same collection
  // the admin panel's "বিভাগ" page manages) and uses it to populate
  // both the sidebar nav and the footer's category links.
  function loadCategoriesAndPopulateNav() {
    const cur = currentFile();
    const curCat = new URLSearchParams(location.search).get('cat');
    const isActive = (item) => {
      const [file, qs] = item.href.split('?');
      const itemCat = qs ? new URLSearchParams(qs).get('cat') : null;
      return file === cur && ((itemCat && itemCat === curCat) || (!itemCat && !curCat && file === 'index.html'));
    };

    const withCats = window.TPL_DB
      ? window.TPL_DB.seedIfNeeded().catch(() => {}).then(() => window.TPL_DB.getCategories()).catch(() => [])
      : Promise.resolve([]);

    return withCats.then((cats) => {
      renderSidebar(buildNavItems(cats), isActive);
      renderFooterCategories(cats);
      return cats;
    });
  }

  function renderTicker() {
    const host = document.getElementById('site-ticker');
    if (!host) return;
    if (!window.TPL_DB) { host.remove(); return; }
    window.TPL_DB.getPublished().then((pub) => {
      const arts = pub.filter(a => a.breaking);
      if (!arts.length) { host.remove(); return; }
      host.innerHTML = `
        <div class="wrap">
          <span class="tag">জরুরি খবর</span>
          <div class="ticker-track-outer">
            <div class="ticker-track">
              ${arts.concat(arts).map(a => `<span><a href="article.html?slug=${a.slug}" style="color:inherit">${a.title_bn}</a></span>`).join('')}
            </div>
          </div>
        </div>
      `;
    }).catch(() => host.remove());
  }

  function renderFooter() {
    const host = document.getElementById('site-footer');
    if (!host) return;
    host.innerHTML = `
      <div class="footer-top">
        <div class="wrap footer-grid">
          <div class="footer-brand">
            <div class="brand-lockup">
              <img class="brand-logo" src="assets/img/logo.png" alt="দ্য পাবলিক লেজার লোগো">
              <h2>দ্য পাবলিক লেজার</h2>
            </div>
            <p>নির্ভরযোগ্য প্রতিবেদন, স্পষ্ট বিশ্লেষণ। প্রতিটি খবর যাচাই করে, নিরপেক্ষভাবে তুলে ধরাই আমাদের অঙ্গীকার।</p>
            <div class="footer-social">
              <a href="#" aria-label="Facebook">f</a>
              <a href="#" aria-label="Twitter">X</a>
              <a href="#" aria-label="YouTube">▶</a>
            </div>
          </div>
          <div>
            <h5>বিভাগ</h5>
            <ul id="footer-cat-list"></ul>
          </div>
          <div>
            <h5>প্রতিষ্ঠান</h5>
            <ul>
              <li><a href="about.html">আমাদের সম্পর্কে</a></li>
              <li><a href="contact.html">যোগাযোগ</a></li>
              <li><a href="career.html">ক্যারিয়ার</a></li>
              <li><a href="advertise.html">বিজ্ঞাপন দিন</a></li>
            </ul>
          </div>
          <div>
            <h5>সহায়তা</h5>
            <ul>
              <li><a href="privacy.html">গোপনীয়তা নীতি</a></li>
              <li><a href="terms.html">ব্যবহারের শর্তাবলি</a></li>
              <li><a href="archive.html">আর্কাইভ</a></li>
              <li><a href="sitemap.html">সাইটম্যাপ</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="wrap footer-bottom">
        <span>© ২০২৬ দ্য পাবলিক লেজার। সর্বস্বত্ব সংরক্ষিত।</span>
        <span>Built for Cortex IT · The Public Ledger</span>
      </div>
    `;
  }

  function renderFooterCategories(cats) {
    const list = document.getElementById('footer-cat-list');
    if (!list) return;
    list.innerHTML = (cats || [])
      .map(c => `<li><a href="category.html?cat=${c.slug}">${c.name_bn}</a></li>`)
      .join('');
  }

  function setupProgressBars() {
    const loadBar = document.getElementById('load-bar');
    if (loadBar) {
      requestAnimationFrame(() => { loadBar.style.width = '70%'; });
      window.addEventListener('load', () => {
        loadBar.style.width = '100%';
        setTimeout(() => { loadBar.style.opacity = '0'; }, 250);
      });
    }
    const readBar = document.getElementById('read-bar');
    if (readBar) {
      window.addEventListener('scroll', () => {
        const h = document.documentElement;
        const scrolled = h.scrollTop;
        const height = h.scrollHeight - h.clientHeight;
        readBar.style.width = height > 0 ? `${(scrolled / height) * 100}%` : '0%';
      }, { passive: true });
    }
  }

  function setupBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('show', window.scrollY > 500);
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  function setupReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach(el => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          entry.target.style.transitionDelay = (i % 6) * 60 + 'ms';
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
  }

  function initChrome() {
    renderHeader();
    renderFooter();
    setupProgressBars();
    setupBackToTop();
    loadCategoriesAndPopulateNav();
    if (window.TPL_DB) {
      window.TPL_DB.seedIfNeeded().catch(() => {}).then(renderTicker);
    } else {
      renderTicker();
    }
  }

  document.addEventListener('DOMContentLoaded', initChrome);
  window.TPL_setupReveal = setupReveal;
})();
