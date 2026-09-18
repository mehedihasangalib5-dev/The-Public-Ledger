(function () {
  let cats = [];

  function catBySlug(slug) {
    return cats.find(c => c.slug === slug);
  }

  function relatedCard(a) {
    const cat = catBySlug(a.category);
    return `
      <article class="story reveal">
        <a class="figure" href="article.html?slug=${a.slug}"><img src="${a.image}" alt="${a.title_bn}" loading="lazy"></a>
        <div class="body">
          <a class="cat-tag" href="category.html?cat=${a.category}">${cat ? cat.name_bn : ''}</a>
          <h3><a href="article.html?slug=${a.slug}">${a.title_bn}</a></h3>
        </div>
      </article>
    `;
  }

  function render(article) {
    const root = document.getElementById('article-root');

    if (!article || article.status !== 'published') {
      root.innerHTML = `<div class="empty-state"><h2>প্রতিবেদনটি খুঁজে পাওয়া যায়নি</h2><p>লিংকটি ভুল হতে পারে অথবা প্রতিবেদনটি সরিয়ে নেওয়া হয়েছে।</p><a class="btn" href="index.html" style="margin-top:14px;display:inline-block;">প্রচ্ছদে ফিরে যান</a></div>`;
      document.title = 'প্রতিবেদন পাওয়া যায়নি — দ্য পাবলিক লেজার';
      return;
    }

    document.title = `${article.title_bn} — দ্য পাবলিক লেজার`;
    const cat = catBySlug(article.category);
    const shareUrl = encodeURIComponent(location.href);

    root.innerHTML = `
      <header class="article-head">
        <a class="cat-tag" href="category.html?cat=${article.category}">${cat ? cat.name_bn : ''}</a>
        <h1>${article.title_bn}</h1>
        <p class="dek">${article.excerpt_bn}</p>
        <div class="article-meta">
          <span>লিখেছেন <strong>${article.author}</strong> · ${window.TPL_fmtDateBn(article.date)} · ${article.views.toLocaleString('bn-BD')} বার পঠিত</span>
          <span class="share-links">
            <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" rel="noopener">শেয়ার</a>
            <a href="#" id="copy-link">লিংক কপি</a>
          </span>
        </div>
      </header>
      <figure class="article-figure">
        <img src="${article.image}" alt="${article.title_bn}">
        <figcaption>প্রতীকী ছবি — দ্য পাবলিক লেজার</figcaption>
      </figure>
      <div class="article-body">
        ${article.body.map(p => `<p>${p}</p>`).join('')}
      </div>
      <div class="tags">
        ${(article.tags || []).map(t => `<a href="category.html?q=${encodeURIComponent(t)}">#${t}</a>`).join('')}
      </div>
    `;

    root.querySelector('#copy-link').addEventListener('click', (e) => {
      e.preventDefault();
      navigator.clipboard?.writeText(location.href).then(() => {
        e.target.textContent = 'কপি হয়েছে ✓';
        setTimeout(() => { e.target.textContent = 'লিংক কপি'; }, 1600);
      });
    });

    // bump the view count (fire-and-forget)
    window.TPL_DB.getArticles().then((all) => {
      const idx = all.findIndex(a => a.slug === article.slug);
      if (idx > -1) { all[idx].views = (all[idx].views || 0) + 1; window.TPL_DB.saveArticles(all); }
    });

    const relatedHost = document.getElementById('related-list');
    if (relatedHost) {
      window.TPL_DB.getPublished().then((pub) => {
        const related = pub
          .filter(a => a.category === article.category && a.slug !== article.slug)
          .slice(0, 3);
        if (related.length) {
          relatedHost.innerHTML = `
            <div class="section-head"><h2>সম্পর্কিত প্রতিবেদন</h2></div>
            <div class="secondary-grid">${related.map(relatedCard).join('')}</div>
          `;
          setTimeout(() => window.TPL_setupReveal && window.TPL_setupReveal(), 0);
        }
      });
    }

    setTimeout(() => window.TPL_setupReveal && window.TPL_setupReveal(), 0);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const tryRender = () => {
      if (!window.TPL_DB) { setTimeout(tryRender, 30); return; }
      const slug = new URLSearchParams(location.search).get('slug');
      window.TPL_DB.seedIfNeeded()
        .then(() => Promise.all([window.TPL_DB.getCategories(), slug ? window.TPL_DB.getArticleBySlug(slug) : null]))
        .then(([c, article]) => {
          cats = c;
          render(article);
        });
    };
    tryRender();
  });
})();
