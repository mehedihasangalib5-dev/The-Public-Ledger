/* ============================================================
   THE PUBLIC LEDGER — data layer (Cloud Firestore)
   Same function names as before (getArticles, saveArticles,
   getCategories, saveCategories, ...) so every page that already
   calls window.TPL_DB keeps working — the only change is that
   every call now returns a Promise instead of a plain value.
   Requires js/firebase-init.js to have run first.
   ============================================================ */
(function (global) {
  const CATS_COL = 'categories';
  const ARTS_COL = 'articles';

  // Default categories only — no demo/seed articles. The articles
  // collection starts empty; real posts are added from /admin.
  const DEFAULT_CATEGORIES = [
    { slug: 'politics',       name_bn: 'রাজনীতি',   name_en: 'Politics',       desc_bn: 'সংসদ, নীতিনির্ধারণ ও প্রশাসনের খবর' },
    { slug: 'sports',         name_bn: 'খেলাধুলা',  name_en: 'Sports',         desc_bn: 'মাঠের ভেতরে-বাইরের সবশেষ খবর' },
    { slug: 'entertainment',  name_bn: 'বিনোদন',    name_en: 'Entertainment',  desc_bn: 'চলচ্চিত্র, সংগীত ও সংস্কৃতির খবর' },
    { slug: 'tech',           name_bn: 'প্রযুক্তি',  name_en: 'Technology',     desc_bn: 'প্রযুক্তি ও উদ্ভাবনের হালচাল' },
    { slug: 'business',       name_bn: 'অর্থনীতি',  name_en: 'Business',       desc_bn: 'বাজার, বাণিজ্য ও অর্থনীতির বিশ্লেষণ' },
    { slug: 'opinion',        name_bn: 'মতামত',     name_en: 'Opinion',        desc_bn: 'সম্পাদকীয় ও কলাম' },
  ];

  function db() {
    return global.TPL_FIREBASE.db;
  }

  function nowSlugId(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  // Seeds the default category list once, only if the categories
  // collection is completely empty. Never touches articles.
  function seedIfNeeded() {
    return db().collection(CATS_COL).limit(1).get().then((snap) => {
      if (!snap.empty) return;
      const batch = db().batch();
      DEFAULT_CATEGORIES.forEach((c) => {
        batch.set(db().collection(CATS_COL).doc(c.slug), c);
      });
      return batch.commit();
    });
  }

  function getCategories() {
    return db().collection(CATS_COL).get().then((snap) => snap.docs.map((d) => d.data()));
  }

  // Replaces the whole category set: writes every item in `cats`
  // (keyed by slug) and deletes any existing doc not present anymore.
  function saveCategories(cats) {
    return db().collection(CATS_COL).get().then((snap) => {
      const existing = new Set(snap.docs.map((d) => d.id));
      const keep = new Set();
      const batch = db().batch();
      cats.forEach((c) => {
        keep.add(c.slug);
        batch.set(db().collection(CATS_COL).doc(c.slug), c);
      });
      existing.forEach((slug) => {
        if (!keep.has(slug)) batch.delete(db().collection(CATS_COL).doc(slug));
      });
      return batch.commit();
    });
  }

  function getArticles() {
    return db().collection(ARTS_COL).get().then((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  // Replaces the whole article set: writes every item in `arts`
  // (generating an id for new ones) and deletes any doc removed
  // from the array — mirrors the old "save the whole list" flow.
  function saveArticles(arts) {
    return db().collection(ARTS_COL).get().then((snap) => {
      const existing = new Set(snap.docs.map((d) => d.id));
      const keep = new Set();
      const batch = db().batch();
      arts.forEach((a) => {
        const id = a.id || nowSlugId('a');
        keep.add(id);
        const { id: _drop, ...data } = a;
        batch.set(db().collection(ARTS_COL).doc(id), { ...data, id });
      });
      existing.forEach((id) => {
        if (!keep.has(id)) batch.delete(db().collection(ARTS_COL).doc(id));
      });
      return batch.commit();
    });
  }

  function getPublished() {
    return getArticles().then((arts) => arts.filter((a) => a.status === 'published'));
  }

  function getCategoryBySlug(slug) {
    return db().collection(CATS_COL).doc(slug).get().then((doc) => (doc.exists ? doc.data() : null));
  }

  function getArticleBySlug(slug) {
    return db().collection(ARTS_COL).where('slug', '==', slug).limit(1).get()
      .then((snap) => (snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() }));
  }

  global.TPL_DB = {
    seedIfNeeded, getCategories, saveCategories, getArticles, saveArticles,
    getPublished, getCategoryBySlug, getArticleBySlug, nowSlugId
  };
})(window);
