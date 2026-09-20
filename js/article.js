(function () {
  const I = window.TPL_I18N;
  let cats = [];

  function catBySlug(slug) {
    return cats.find(c => c.slug === slug);
  }

  // Turns a pasted YouTube/Facebook video URL into an embeddable iframe src.
  // No file upload here — see the note to the user: without Firebase Storage,
  // raw video files can't be hosted from this site, so video support works
  // via linking an already-hosted video (YouTube, Facebook) instead.
  function videoEmbedSrc(url) {
    if (!url) return null;
    let u;
    try { u = new URL(url); } catch (e) { return null; }
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch' && u.searchParams.get('v')) return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
      if (u.pathname.startsWith('/embed/')) return url;
      if (u.pathname.startsWith('/shorts/')) return `https://www.youtube.com/embed/${u.pathname.split('/')[2]}`;
    }
    if (host === 'youtu.be') return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (host === 'facebook.com' || host === 'fb.watch') {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0`;
    }
    return null;
  }

  function relatedCard(a) {
    const cat = catBySlug(a.category);
    return `
      <article class="story reveal">
        <a class="figure" href="article.html?slug=${a.slug}">
          <img src="${a.image}" alt="${I.title(a)}" loading="lazy">
          ${a.video_url ? '<span class="video-badge">▶</span>' : ''}
        </a>
        <div class="body">
          <a class="cat-tag" href="category.html?cat=${a.category}">${cat ? I.catName(cat) : ''}</a>
          <h3><a href="article.html?slug=${a.slug}">${I.title(a)}</a></h3>
        </div>
      </article>
    `;
  }

  function render(article) {
    const root = document.getElementById('article-root');

    if (!article || article.status !== 'published') {
      root.innerHTML = `<div class="empty-state"><h2>${I.t('প্রতিবেদনটি খুঁজে পাওয়া যায়নি')}</h2><p>${I.t('লিংকটি ভুল হতে পারে অথবা প্রতিবেদনটি সরিয়ে নেওয়া হয়েছে।')}</p><a class="btn" href="index.html" style="margin-top:14px;display:inline-block;">${I.t('প্রচ্ছদে ফিরে যান')}</a></div>`;
      document.title = I.t('প্রতিবেদন পাওয়া যায়নি — দ্য পাবলিক লেজার');
      return;
    }

    document.title = article.meta_title || `${I.title(article)} — ${I.t('দ্য পাবলিক লেজার')}`;
    const metaDesc = document.getElementById('meta-description');
    if (metaDesc) metaDesc.setAttribute('content', article.meta_desc || I.excerpt(article));
    const cat = catBySlug(article.category);
    const shareUrl = encodeURIComponent(location.href);
    const noEnglish = I.isEn && !I.hasEnglishBody(article);
    const bodyHtml = I.isEn && article.body_html_en
      ? article.body_html_en
      : (article.body_html || I.body(article).map(p => `<p>${p}</p>`).join(''));
    const embedSrc = videoEmbedSrc(article.video_url);

    root.innerHTML = `
      ${embedSrc ? `
      <div class="article-video">
        <iframe src="${embedSrc}" title="${I.title(article)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
      ` : `
      <figure class="article-figure">
        <img src="${article.image}" alt="${I.title(article)}">
        <figcaption>${I.t('প্রতীকী ছবি — দ্য পাবলিক লেজার')}</figcaption>
      </figure>
      `}
      <header class="article-head">
        <a class="cat-tag" href="category.html?cat=${article.category}">${cat ? I.catName(cat) : ''}</a>
        <h1>${I.title(article)}</h1>
        <p class="dek">${I.excerpt(article)}</p>
        <div class="article-meta">
          <span>${I.t('লিখেছেন')} <strong>${article.author}</strong> · ${I.fmtDate(article.date)} · ${I.num(article.views)} ${I.t('বার পঠিত')}</span>
          <span class="share-links">
            <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" rel="noopener">${I.t('শেয়ার')}</a>
            <a href="#" id="copy-link">${I.t('লিংক কপি')}</a>
          </span>
        </div>
      </header>
      <div class="article-body">
        ${noEnglish ? '<p style="font-size:13.5px;font-style:italic;color:var(--ink-faded);">This report is not available in English yet — showing the original Bangla.</p>' : ''}
        ${bodyHtml}
      </div>
      <div class="tags">
        ${(article.tags || []).map(t => `<a href="category.html?q=${encodeURIComponent(t)}">#${t}</a>`).join('')}
      </div>
    `;

    root.querySelector('#copy-link').addEventListener('click', (e) => {
      e.preventDefault();
      navigator.clipboard?.writeText(location.href).then(() => {
        e.target.textContent = I.t('কপি হয়েছে ✓');
        setTimeout(() => { e.target.textContent = I.t('লিংক কপি'); }, 1600);
      });
    });

    // bump the view count (fire-and-forget; ignored if the rules don't allow it)
    if (article.id) window.TPL_DB.incrementViews(article.id).catch(() => {});

    const relatedHost = document.getElementById('related-list');
    if (relatedHost) {
      window.TPL_DB.getPublished().then((pub) => {
        const related = pub
          .filter(a => a.category === article.category && a.slug !== article.slug)
          .slice(0, 3);
        if (related.length) {
          relatedHost.innerHTML = `
            <div class="section-head"><h2>${I.t('সম্পর্কিত প্রতিবেদন')}</h2></div>
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
      window.TPL_DB.seedIfNeeded().catch(() => {})
        .then(() => Promise.all([window.TPL_DB.getCategories(), slug ? window.TPL_DB.getArticleBySlug(slug) : null]))
        .then(([c, article]) => {
          cats = c;
          render(article);
        });
    };
    tryRender();
  });
})();
