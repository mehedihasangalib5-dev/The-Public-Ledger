(function () {
  const I = window.TPL_I18N;
  let cats = [];

  function catBySlug(slug) {
    return cats.find(c => c.slug === slug);
  }

  function storyCard(a, opts = {}) {
    const cat = catBySlug(a.category);
    return `
      <article class="story ${opts.list ? 'list' : ''} reveal">
        <a class="figure" href="article.html?slug=${a.slug}">
          <img src="${a.image}" alt="${I.title(a)}" loading="lazy">
          ${a.video_url ? '<span class="video-badge">▶</span>' : ''}
        </a>
        <div class="body">
          <a class="cat-tag" href="category.html?cat=${a.category}">${cat ? I.catName(cat) : ''}</a>
          <h3><a href="article.html?slug=${a.slug}">${I.title(a)}</a></h3>
          ${opts.excerpt ? `<p>${I.excerpt(a)}</p>` : ''}
        </div>
      </article>
    `;
  }

  function render(all) {
    if (!all.length) return;

    const lead = all.find(a => a.featured) || all[0];
    const rest = all.filter(a => a.slug !== lead.slug);

    const leadHost = document.getElementById('lead-story');
    if (leadHost) {
      const cat = catBySlug(lead.category);
      leadHost.innerHTML = `
        <a class="figure" href="article.html?slug=${lead.slug}">
          <img src="${lead.image}" alt="${I.title(lead)}">
          ${lead.video_url ? '<span class="video-badge">▶</span>' : ''}
        </a>
        <a class="cat-tag" href="category.html?cat=${lead.category}">${cat ? I.catName(cat) : ''}</a>
        <h2><a href="article.html?slug=${lead.slug}">${I.title(lead)}</a></h2>
        <p class="dek">${I.excerpt(lead)}</p>
        <p class="byline">${lead.author} · ${I.fmtDate(lead.date)}</p>
      `;
    }

    const secHost = document.getElementById('secondary-grid');
    if (secHost) {
      secHost.innerHTML = rest.slice(0, 4).map(a => storyCard(a)).join('');
    }

    const catHost = document.getElementById('category-blocks');
    if (catHost) {
      catHost.innerHTML = cats.map(cat => {
        const items = all.filter(a => a.category === cat.slug).slice(0, 3);
        if (!items.length) return '';
        return `
          <section class="cat-block">
            <div class="section-head">
              <h2>${I.catName(cat)}</h2>
              <a class="see-all" href="category.html?cat=${cat.slug}">${I.t('সব দেখুন →')}</a>
            </div>
            <div class="secondary-grid">
              ${items.map(a => storyCard(a, { excerpt: true })).join('')}
            </div>
          </section>
        `;
      }).join('');
    }

    const trendHost = document.getElementById('trending-list');
    if (trendHost) {
      const trending = all.filter(a => a.trending).sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
      trendHost.innerHTML = trending.map((a, i) => `
        <div class="trend-item">
          <span class="num">${String(i + 1).padStart(2, '0')}</span>
          <div>
            <h4><a href="article.html?slug=${a.slug}">${I.title(a)}</a></h4>
            <div class="meta">${I.num(a.views)} ${I.t('বার পঠিত')}</div>
          </div>
        </div>
      `).join('');
    }

    setTimeout(() => window.TPL_setupReveal && window.TPL_setupReveal(), 0);
  }

  /* ---------- Market indicators: USD/BDT (live) ----------
     DSEX and gold were removed — no free/reliable data source for either
     (see conversation), so the box now only shows the real forex rate. */
  function fmtMarketNumber(n, decimals) {
    return n.toLocaleString('bn-BD', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function paintMarketRow(el, value, pct, decimals, unit) {
    const up = pct >= 0;
    el.classList.toggle('up', up);
    el.classList.toggle('down', !up);
    el.textContent = `${up ? '▲' : '▼'} ${fmtMarketNumber(value, decimals)}${unit} (${pct >= 0 ? '+' : '−'}${fmtMarketNumber(Math.abs(pct), 2)}%)`;
  }

  // Real USD/BDT rate — free, no API key, updated daily, CORS-friendly.
  // Tries three independent hosts of the same data in order.
  const FOREX_URLS = [
    'https://raw.githubusercontent.com/irfanokr/currency-api/main/v1/currencies/usd.json',
    'https://cdn.jsdelivr.net/gh/irfanokr/currency-api@main/v1/currencies/usd.json',
    'https://latest.currency-api.pages.dev/v1/currencies/usd.json',
  ];
  let forexBase = null; // first successful rate this session — % change is measured against it

  async function fetchForex() {
    const el = document.getElementById('market-usdbdt');
    if (!el) return;
    for (const url of FOREX_URLS) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const data = await res.json();
        const rate = data && data.usd && data.usd.bdt;
        if (!rate) continue;
        if (forexBase === null) forexBase = rate;
        paintMarketRow(el, rate, ((rate - forexBase) / forexBase) * 100, 2, '');
        return; // success — stop trying fallbacks
      } catch (e) { /* try next URL */ }
    }
    // All sources failed — leave the last known value on screen rather than
    // showing an error inside the market box.
  }

  function startMarketTicker() {
    if (!document.getElementById('market-usdbdt')) return; // only on the homepage
    fetchForex();
    setInterval(fetchForex, 5 * 60 * 1000); // re-check every 5 min (source itself updates daily)
  }

  document.addEventListener('DOMContentLoaded', () => {
    startMarketTicker();
    const tryRender = () => {
      if (!window.TPL_DB) { setTimeout(tryRender, 30); return; }
      window.TPL_DB.seedIfNeeded().catch(() => {})
        .then(() => Promise.all([window.TPL_DB.getCategories(), window.TPL_DB.getPublished()]))
        .then(([c, arts]) => {
          cats = c;
          render(arts.sort((a, b) => new Date(b.date) - new Date(a.date)));
        });
    };
    tryRender();
  });
})();
