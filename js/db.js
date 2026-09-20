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
    { slug: 'politics',       name_bn: 'রাজনীতি',   name_en: 'Politics',       desc_bn: 'সংসদ, নীতিনির্ধারণ ও প্রশাসনের খবর', desc_en: 'News from parliament, policymaking and administration' },
    { slug: 'sports',         name_bn: 'খেলাধুলা',  name_en: 'Sports',         desc_bn: 'মাঠের ভেতরে-বাইরের সবশেষ খবর', desc_en: 'The latest from on and off the field' },
    { slug: 'entertainment',  name_bn: 'বিনোদন',    name_en: 'Entertainment',  desc_bn: 'চলচ্চিত্র, সংগীত ও সংস্কৃতির খবর', desc_en: 'News on film, music and culture' },
    { slug: 'tech',           name_bn: 'প্রযুক্তি',  name_en: 'Technology',     desc_bn: 'প্রযুক্তি ও উদ্ভাবনের হালচাল', desc_en: 'The latest in technology and innovation' },
    { slug: 'business',       name_bn: 'অর্থনীতি',  name_en: 'Business',       desc_bn: 'বাজার, বাণিজ্য ও অর্থনীতির বিশ্লেষণ', desc_en: 'Analysis of markets, trade and the economy' },
    { slug: 'opinion',        name_bn: 'মতামত',     name_en: 'Opinion',        desc_bn: 'সম্পাদকীয় ও কলাম', desc_en: 'Editorials and columns' },
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

  // ---- single-document operations (use these instead of saveArticles) ----
  // Writing/deleting ONE article at a time keeps each request small and
  // means a visitor's stale copy can never overwrite or delete other posts.
  function stripUndefined(obj) { return JSON.parse(JSON.stringify(obj)); } // Firestore rejects `undefined`

  // Creates the article, or merges the given fields into it if it exists.
  function saveArticle(a) {
    const id = a.id || nowSlugId('a');
    const data = stripUndefined({ ...a, id });
    return db().collection(ARTS_COL).doc(id).set(data, { merge: true }).then(() => data);
  }

  function deleteArticle(id) {
    return db().collection(ARTS_COL).doc(id).delete();
  }

  // Atomic +1 on one field; no read/rewrite of the whole collection.
  function incrementViews(id) {
    return db().collection(ARTS_COL).doc(id).update({
      views: global.firebase.firestore.FieldValue.increment(1)
    });
  }

  // Public pages must ask for published articles only: Firestore rules let
  // visitors read a document only when status == 'published', and a query
  // has to be provably inside that rule. `publish_at` (optional) lets an
  // article stay flagged 'published' in Firestore but stay off every public
  // listing/page until that moment — a no-backend approximation of
  // scheduled publishing (the doc itself is technically fetchable by a
  // direct query before then, but nothing in the UI shows or links to it).
  function isDue(a) {
    return !a.publish_at || new Date(a.publish_at) <= new Date();
  }

  function getPublished() {
    return db().collection(ARTS_COL).where('status', '==', 'published').get()
      .then((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isDue));
  }

  function getCategoryBySlug(slug) {
    return db().collection(CATS_COL).doc(slug).get().then((doc) => (doc.exists ? doc.data() : null));
  }

  function getArticleBySlug(slug) {
    return db().collection(ARTS_COL).where('slug', '==', slug).where('status', '==', 'published').limit(1).get()
      .then((snap) => (snap.empty || !isDue(snap.docs[0].data()) ? null : { id: snap.docs[0].id, ...snap.docs[0].data() }));
  }

  // ---- media library ----
  // Small collection of previously-uploaded (already-compressed) images so
  // an editor can reuse a cover image instead of re-uploading it.
  const MEDIA_COL = 'media';

  function getMedia() {
    return db().collection(MEDIA_COL).orderBy('uploadedAt', 'desc').get()
      .then((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      .catch(() => db().collection(MEDIA_COL).get().then((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })))); // no index yet — fall back to unordered
  }

  function saveMedia(item) {
    const id = nowSlugId('m');
    const data = { id, name: item.name || '', dataUrl: item.dataUrl, uploadedAt: new Date().toISOString() };
    return db().collection(MEDIA_COL).doc(id).set(data).then(() => data);
  }

  function deleteMedia(id) {
    return db().collection(MEDIA_COL).doc(id).delete();
  }

  // ---- staff (roles) ----
  // Doc id = Firebase Auth UID. Creating the Auth account itself happens
  // client-side via a secondary app instance (see admin-staff.js) since
  // there's no backend; this just manages the Firestore role record.
  const STAFF_COL = 'staff';

  function getStaff() {
    return db().collection(STAFF_COL).get().then((snap) => snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
  }

  function saveStaffMember(uid, data) {
    return db().collection(STAFF_COL).doc(uid).set(data, { merge: true });
  }

  function deleteStaffMember(uid) {
    return db().collection(STAFF_COL).doc(uid).delete();
  }

  global.TPL_DB = {
    seedIfNeeded, getCategories, saveCategories, getArticles, saveArticles,
    saveArticle, deleteArticle, incrementViews,
    getPublished, getCategoryBySlug, getArticleBySlug, nowSlugId,
    getMedia, saveMedia, deleteMedia,
    getStaff, saveStaffMember, deleteStaffMember,
  };
})(window);
