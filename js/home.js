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
        <a class="cat-tag" href="category.html?cat=${lead.category}">${cat ? I.catName(cat) : ''}</a>
        <h2><a href="article.html?slug=${lead.slug}">${I.title(lead)}</a></h2>
        <a class="figure" href="article.html?slug=${lead.slug}"><img src="${lead.image}" alt="${I.title(lead)}"></a>
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

  document.addEventListener('DOMContentLoaded', () => {
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
