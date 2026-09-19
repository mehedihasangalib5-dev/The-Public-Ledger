(function () {
  const I = window.TPL_I18N;
  const PAGE_SIZE = 6;
  let currentPage = 1;
  let cats = [];

  function catBySlug(slug) {
    return cats.find(c => c.slug === slug);
  }

  function storyRow(a) {
    const cat = catBySlug(a.category);
    return `
      <article class="story list reveal">
        <a class="figure" href="article.html?slug=${a.slug}"><img src="${a.image}" alt="${I.title(a)}" loading="lazy"></a>
        <div class="body">
          <a class="cat-tag" href="category.html?cat=${a.category}">${cat ? I.catName(cat) : ''}</a>
          <h3><a href="article.html?slug=${a.slug}">${I.title(a)}</a></h3>
          <p>${I.excerpt(a)}</p>
          <p class="byline">${a.author} · ${I.fmtDate(a.date)}</p>
        </div>
      </article>
    `;
  }

  function renderPage(list) {
    const listHost = document.getElementById('cat-list');
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = list.slice(start, start + PAGE_SIZE);
    if (!pageItems.length) {
      listHost.innerHTML = `<div class="empty-state"><h2>${I.t('কোনো প্রতিবেদন পাওয়া যায়নি')}</h2><p>${I.t('অন্য একটি বিভাগ বা ভিন্ন শব্দ দিয়ে খুঁজে দেখুন।')}</p></div>`;
    } else {
      listHost.innerHTML = pageItems.map(storyRow).join('');
    }
    renderPagination(list.length);
    setTimeout(() => window.TPL_setupReveal && window.TPL_setupReveal(), 0);
  }

  function renderPagination(total) {
    const host = document.getElementById('pagination');
    const pages = Math.ceil(total / PAGE_SIZE);
    if (pages <= 1) { host.innerHTML = ''; return; }
    let html = '';
    for (let i = 1; i <= pages; i++) {
      html += `<button data-page="${i}" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
    }
    host.innerHTML = html;
    host.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = Number(btn.dataset.page);
        renderPage(window.TPL_currentList);
        window.scrollTo({ top: document.getElementById('cat-header').offsetTop - 90, behavior: 'smooth' });
      });
    });
  }

  // "6 টি প্রতিবেদন" / "6 reports" (and singular in English)
  function reportCount(n) {
    return I.isEn ? `${n} ${n === 1 ? 'report' : 'reports'}` : `${n} টি প্রতিবেদন`;
  }
  function resultCount(n) {
    return I.isEn ? `${n} ${n === 1 ? 'result' : 'results'} found` : `${n} টি ফলাফল পাওয়া গেছে`;
  }

  function init(all) {
    const params = new URLSearchParams(location.search);
    const catSlug = params.get('cat');
    const q = params.get('q');
    const headerHost = document.getElementById('cat-header');

    let list = all;
    if (catSlug) {
      const cat = catBySlug(catSlug);
      list = all.filter(a => a.category === catSlug);
      headerHost.innerHTML = `
        <span class="mark">${I.isEn ? 'Section' : 'বিভাগ'}</span>
        <h1>${cat ? I.catName(cat) : I.t('বিভাগ পাওয়া যায়নি')}</h1>
        <p>${cat ? I.catDesc(cat) : ''} · ${reportCount(list.length)}</p>
      `;
    } else if (q) {
      const needle = q.toLowerCase();
      list = all.filter(a =>
        (a.title_bn || '').includes(q) ||
        (a.excerpt_bn || '').includes(q) ||
        (a.title_en || '').toLowerCase().includes(needle) ||
        (a.excerpt_en || '').toLowerCase().includes(needle));
      headerHost.innerHTML = `
        <span class="mark">${I.t('অনুসন্ধান ফলাফল')}</span>
        <h1>"${I.esc(q)}"</h1>
        <p>${resultCount(list.length)}</p>
      `;
    } else {
      headerHost.innerHTML = `<span class="mark">${I.t('সব প্রতিবেদন')}</span><h1>${I.t('সর্বশেষ সংবাদ')}</h1><p>${reportCount(list.length)}</p>`;
    }

    window.TPL_currentList = list;
    renderPage(list);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const tryInit = () => {
      if (!window.TPL_DB) { setTimeout(tryInit, 30); return; }
      window.TPL_DB.seedIfNeeded().catch(() => {})
        .then(() => Promise.all([window.TPL_DB.getCategories(), window.TPL_DB.getPublished()]))
        .then(([c, arts]) => {
          cats = c;
          init(arts.sort((a, b) => new Date(b.date) - new Date(a.date)));
        });
    };
    tryInit();
  });
})();
