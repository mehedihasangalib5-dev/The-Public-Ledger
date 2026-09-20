# Update summary — Public Ledger admin panel

## 1. Rich text editor
- Body fields now use **Markdown** (`admin/articles.html`, `admin/js/admin-articles.js`):
  toolbar (H2/H3, bold, italic, quote, link, inline image) + live split preview,
  rendered with marked.js and sanitized with DOMPurify.
- New Firestore fields: `body_md` / `body_md_en` (strings). Old `body` / `body_en`
  (paragraph arrays) are still written alongside for backward compatibility and
  as a no-JS fallback; the public site (`js/i18n.js` → `bodyHtml()`, used by
  `js/article.js`) prefers the Markdown field and falls back to the legacy one
  for older articles.
- **Workflow**: Draft → Review → Published, plus **Scheduled** with a `publishAt`
  timestamp. Reporters can move their own pieces between Draft/Review; only
  admins can publish, schedule, or send a piece back to draft.
- **Scheduled publishing** is implemented two ways: the real one is the
  `promoteScheduled` Cloud Function (`functions/index.js`, runs every 5 min —
  needs `firebase deploy --only functions` on the Blaze plan); a best-effort
  client-side fallback (`TPL_DB.promoteDueScheduled`) also runs whenever an
  admin loads the dashboard or articles page, in case the function isn't deployed.

## 2. Staff management (admin only)
- New page: `admin/staff.html` + `admin/js/admin-staff.js` — list, invite,
  change role, remove — all from the UI, no more manual Firebase Console edits.
- Backed by Cloud Functions in `functions/index.js`: `inviteStaff`, `setStaffRole`,
  `removeStaff`, `listStaff`. These use the Admin SDK to set a **custom claim**
  (`role`) on the Auth user *and* mirror it into the existing `staff/{uid}`
  Firestore doc (so the current Firestore rules keep working unchanged).
- Inviting someone creates their Auth account (if needed) and sends them
  Firebase's built-in password-reset email so they set their own password —
  nobody ever sees or shares a temp password.
- **You still need to create the very first admin by hand once** (Firebase
  Console, or an Admin SDK script) — after that, that admin can invite everyone
  else from `/admin/staff.html`. See the comment at the top of `functions/index.js`.
- Requires the Blaze (pay-as-you-go) plan — Cloud Functions aren't available on Spark.

## 3. UX polish
- Custom confirm/alert dialog (`admin/js/admin-shell.js`: `confirmModal`,
  `alertModal`) replaces every `confirm()`/`alert()` in the admin panel —
  `role="dialog"`, `aria-modal="true"`, Esc closes it, focus is trapped inside.
- Tables collapse into cards on mobile (`<table class="responsive">` + CSS;
  see `admin/css/admin.css`) — applied to Articles, Categories, Dashboard, Staff.
- Loading skeleton rows and friendly empty states for every table
  (`TPL_SHELL.skeletonRows` / `TPL_SHELL.emptyRow`).
- Login: "পাসওয়ার্ড ভুলে গেছেন?" (`sendPasswordResetEmail`) + a show/hide
  password toggle.
- `seedIfNeeded()` now runs **only** from the authenticated dashboard load.
  It used to also fire, unauthenticated, on every public page (home, article,
  category, archive, sitemap) — those calls always failed Firestore's
  permission check and were just wasted reads; removed.
- Optional dark mode: a toggle in the sidebar, persisted in `localStorage`,
  built on the CSS variables that were already there.

## Deploying
```
cd functions && npm install && cd ..
firebase deploy --only firestore:rules,firestore:indexes,functions
```
(run from inside the `firebase/` folder, or point `firebase.json`'s functions
`source` at wherever you keep `functions/` relative to it — it's currently set
to `../functions`, i.e. a sibling of `firebase/`).

## 4. Video upload (added after initial delivery)
- New field in the article editor: upload an MP4/WebM/MOV file (up to 50 MB),
  with a progress bar, preview player, and a "ভিডিও সরান" button to clear it.
- Uploaded to Firebase Storage under `videos/` (see `firebase/storage.rules` —
  same staff-upload / admin-delete pattern as `covers/`, but sized for video).
- New `js/db.js` helpers: `uploadVideo(file, articleId, onProgress)`,
  `deleteVideoByUrl(url)`.
- Article schema: new optional `video` field (a Storage download URL).
  Replacing or removing a video cleans up the old Storage file (best effort).
- Public site: when an article has a video, `article.html` shows a native
  `<video controls>` player (with the cover image as its poster) instead of
  the plain cover image — implemented in `js/i18n.js` (`video()`) and
  `js/article.js`.
- No changes needed to `firebase/firestore.rules` — `video` is just another
  string field on the article document, already covered by the existing
  create/update rules.

## 5. Removed Firebase Storage — Firestore-only now
Firebase Storage now requires the Blaze (billing-enabled) plan, so it's been
dropped entirely — no bucket, no `storage.rules`, no `firebase-storage-compat.js`.

- **Cover images** are back to the original approach: compressed to a small
  JPEG **directly in the browser** (canvas resize + quality step-down, capped
  at ~220 KB) and saved as a `data:image/jpeg;base64,…` string right inside
  the article document in Firestore — same as the very first version of this
  site, before Storage was introduced. A client-side check still blocks a
  save if the whole document would exceed Firestore's ~1 MiB document limit,
  so you get a clear error instead of a failed write.
- **Video** can no longer be a real uploaded file — an actual video, even a
  short one, doesn't fit in a 1 MB Firestore document. Instead the "ভিডিও"
  field is now a **link**: paste a YouTube, Facebook, or Vimeo URL (or a
  direct `.mp4`/`.webm` link hosted elsewhere — e.g. on YouTube itself,
  Google Drive with a direct link, or any CDN), and the article page embeds
  a proper player automatically (`js/i18n.js` → `videoEmbed()`, used by
  `js/article.js`). Nothing is stored except the link text.
- Removed: `firebase/storage.rules`, the `storage` section of
  `firebase/firebase.json`, `js/db.js`'s `uploadCover` / `uploadVideo` /
  `deleteCoverByUrl` / `deleteVideoByUrl` / `getInlineImageArticles` /
  `setArticleImage`, and the admin panel's "পুরনো ছবি Storage-এ সরান"
  migration button (nothing to migrate to anymore).
- Cloud Functions (used only for staff invite/role management,
  `functions/index.js`) are unaffected by this change — that's a separate
  Firebase product from Storage. It does still require the Blaze plan itself,
  though usage should stay within the free tier for a small team. If you'd
  rather avoid Cloud Functions too, the first admin can still add more staff
  by hand via the Firebase Console (`staff/{uid}` documents), same as before
  any of this tooling existed.
