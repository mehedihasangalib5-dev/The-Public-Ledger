(function () {
  let cats = [];

  function catBySlug(slug) {
    return cats.find(c => c.slug === slug);
  }

  function storyCard(a, opts = {}) {
    const cat = catBySlug(a.category);
    return `
      <article class="story ${opts.list ? 'list' : ''} reveal">
        <a class="figure" href="article.html?slug=${a.slug}">
          <img src="${a.image}" alt="${a.title_bn}" loading="lazy">
        </a>
        <div class="body">
          <a class="cat-tag" href="category.html?cat=${a.category}">${cat ? cat.name_bn : ''}</a>
          <h3><a href="article.html?slug=${a.slug}">${a.title_bn}</a></h3>
          ${opts.excerpt ? `<p>${a.excerpt_bn}</p>` : ''}
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
        <a class="cat-tag" href="category.html?cat=${lead.category}">${cat ? cat.name_bn : ''}</a>
        <h2><a href="article.html?slug=${lead.slug}">${lead.title_bn}</a></h2>
        <a class="figure" href="article.html?slug=${lead.slug}"><img src="${lead.image}" alt="${lead.title_bn}"></a>
        <p class="dek">${lead.excerpt_bn}</p>
        <p class="byline">${lead.author} · ${window.TPL_fmtDateBn(lead.date)}</p>
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
              <h2>${cat.name_bn}</h2>
              <a class="see-all" href="category.html?cat=${cat.slug}">সব দেখুন →</a>
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
      const trending = all.filter(a => a.trending).sort((a, b) => b.views - a.views).slice(0, 5);
      trendHost.innerHTML = trending.map((a, i) => `
        <div class="trend-item">
          <span class="num">${String(i + 1).padStart(2, '0')}</span>
          <div>
            <h4><a href="article.html?slug=${a.slug}">${a.title_bn}</a></h4>
            <div class="meta">${a.views.toLocaleString('bn-BD')} বার পঠিত</div>
          </div>
        </div>
      `).join('');
    }

    setTimeout(() => window.TPL_setupReveal && window.TPL_setupReveal(), 0);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const tryRender = () => {
      if (!window.TPL_DB) { setTimeout(tryRender, 30); return; }
      window.TPL_DB.seedIfNeeded()
        .then(() => Promise.all([window.TPL_DB.getCategories(), window.TPL_DB.getPublished()]))
        .then(([c, arts]) => {
          cats = c;
          render(arts.sort((a, b) => new Date(b.date) - new Date(a.date)));
        });
    };
    tryRender();
  });
})();
