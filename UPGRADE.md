# Admin panel upgrade — steps 1–3

## ⚠️ Deploy in this order (or you will lock yourself out)

1. **Create your staff document first.** The panel no longer assumes "admin" when the role can't be read.
   Firebase Console → Firestore → collection `staff` → document ID = your **Auth UID**
   (Authentication → Users → copy UID) → field `role` (string) = `admin`.
   Add one document per reporter with `role` = `reporter`.
2. **Publish the rules** (Console → Firestore → Rules → paste `firebase/firestore.rules`; Storage → Rules → paste `firebase/storage.rules`),
   or with the CLI from the `firebase/` folder: `firebase deploy --only firestore:rules,firestore:indexes,storage`.
   Storage rules use a cross-service lookup; the console/CLI will ask you to grant the "Firebase Rules System" role — accept.
3. **Create the indexes** (`firebase/firestore.indexes.json`, deployed by the command above). They take a few minutes to build.
   Until they exist, filtering by category/status in the articles screen shows an "index needed" message.
4. **Enable Storage** (Console → Storage → Get started) if it isn't on yet. Bucket in config: `the-public-ledger-26.firebasestorage.app`.
5. **Upload the site**, sign in as admin, open **প্রতিবেদন** and press **"পুরনো ছবি Storage-এ সরান"** once
   to move existing base64 covers out of Firestore.

## What changed

### 1. Security / bugs
- All database text is HTML-escaped before `innerHTML` (admin: `TPL_SHELL.esc`; public: `TPL_I18N.title/excerpt/body/catName/catDesc/esc`).
  Image URLs are restricted to `https://` or inline raster images. Use `I.titleRaw` / `I.catNameRaw` only for `textContent` / `document.title`.
  Note: article bodies are now plain text everywhere — HTML typed into the body is shown literally.
- `fetchRole` fails closed: a role that can't be read = no access (login shows a clear message).
- Favicon path fixed on all admin pages (`../assets/img/logo.png`).
- Categories are saved one document at a time (`saveCategory` / `deleteCategory`). `saveArticles` / `saveCategories` were removed.
  A category that still has articles can't be deleted.
- Roles are enforced by the rules, not just hidden in the UI: reporters create drafts and edit only their own drafts;
  only admins publish, unpublish, delete, or manage categories.
- View counter: once per browser session per article.
- Login page no longer touches the data layer.

### 2. Performance
- Cover images go to Firebase Storage (`covers/`); the article stores only the URL. Images are resized/re-encoded in the browser first (max 1600 px, ≤ 800 KB).
  Replacing or deleting an article removes the old file (best effort).
- Articles list is paginated (20 per page, "আরও দেখুন") with server-side category/status filters.
- Search is a server-side **title prefix** search (Bangla or English title), debounced. It is not "contains" — use Algolia/Typesense if you need that.
- Dashboard uses count queries + two small reads (latest 8, top 5 by views). The old "total views" card was replaced by a **most-read** table
  (Firestore's web SDK has no sum aggregation without a stats document).
- Dashboard "+ নতুন প্রতিবেদন" opens the editor directly (`articles.html?new=1`).

### 3. Rules + audit fields
- New articles get `authorUid`, `createdAt`, `updatedAt`, `updatedBy`; edits update `updatedAt` / `updatedBy` (server timestamps).
  Older articles have no `authorUid`, so only admins can edit them.
- `firebase/firestore.rules`, `firebase/storage.rules`, `firebase/firestore.indexes.json`, `firebase/firebase.json`.
  These REPLACE your current rules — if you have other collections, merge them in before publishing.

## Not covered here (next steps)
Public-site pagination, rich-text editor, scheduled publishing, staff-management page, custom claims instead of `staff` lookups.
