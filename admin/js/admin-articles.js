(function () {
  let cats = [];
  let arts = [];      // local cache, kept in sync with Firestore after each save
  let mediaItems = []; // media-library cache
  let currentRole = 'admin';
  let editingId = null;
  let pendingImage = null; // dataURL from file upload or media-library pick, if chosen
  let quillBody = null;
  let quillBodyEn = null;

  // ---------- pagination + selection state ----------
  const PAGE_SIZE = 15;
  let currentPage = 1;
  let filteredList = [];
  const selected = new Set();

  function fillCategoryOptions() {
    const filterSel = document.getElementById('filter-cat');
    const formSel = document.getElementById('art-category');
    filterSel.innerHTML = '<option value="">সব বিভাগ</option>' + cats.map(c => `<option value="${c.slug}">${c.name_bn}</option>`).join('');
    formSel.innerHTML = cats.map(c => `<option value="${c.slug}">${c.name_bn}</option>`).join('');
  }

  // ---------- rich text (Quill) ----------
  function initQuill() {
    const toolbar = [
      [{ header: [2, 3, false] }],
      ['bold', 'italic', 'underline'],
      ['blockquote'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean'],
    ];
    quillBody = new Quill('#art-body-editor', { theme: 'snow', modules: { toolbar } });
    quillBodyEn = new Quill('#art-body-en-editor', { theme: 'snow', modules: { toolbar } });
  }

  function quillIsEmpty(q) {
    return q.getText().trim().length === 0;
  }

  // Old articles stored `body`/`body_en` as an array of plain paragraphs —
  // turn that into HTML so it opens correctly in the rich-text editor.
  function paragraphsToHtml(arr) {
    return (arr || []).map(p => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('');
  }

  // ---------- date helpers for the schedule field ----------
  // <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in LOCAL time.
  function isoToLocalInput(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function localInputToIso(val) {
    if (!val) return null;
    const d = new Date(val); // parsed as local time
    return isNaN(d) ? null : d.toISOString();
  }

  // ---------- table + pagination ----------
  function applyFilters() {
    const q = document.getElementById('search-input').value.trim().toLowerCase();
    const catFilter = document.getElementById('filter-cat').value;
    const statusFilter = document.getElementById('filter-status').value;

    let list = [...arts].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (q) list = list.filter(a => a.title_bn.toLowerCase().includes(q));
    if (catFilter) list = list.filter(a => a.category === catFilter);
    if (statusFilter) list = list.filter(a => a.status === statusFilter);
    return list;
  }

  function renderPager(total) {
    const pager = document.getElementById('pager');
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (totalPages <= 1) { pager.innerHTML = ''; return; }
    const from = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const to = Math.min(total, currentPage * PAGE_SIZE);
    pager.innerHTML = `
      <span class="pager-info">${from}–${to} / মোট ${total}</span>
      <div class="pager-btns">
        <button type="button" class="btn small ghost" id="pager-prev" ${currentPage <= 1 ? 'disabled' : ''}>আগে</button>
        <span class="pager-page">${currentPage} / ${totalPages}</span>
        <button type="button" class="btn small ghost" id="pager-next" ${currentPage >= totalPages ? 'disabled' : ''}>পরে</button>
      </div>
    `;
    const prev = document.getElementById('pager-prev');
    const next = document.getElementById('pager-next');
    if (prev) prev.addEventListener('click', () => { currentPage--; renderTable(); });
    if (next) next.addEventListener('click', () => { currentPage++; renderTable(); });
  }

  function updateBulkBar() {
    const bar = document.getElementById('bulk-bar');
    const count = document.getElementById('bulk-count');
    if (selected.size > 0) {
      bar.style.display = 'flex';
      count.textContent = `${selected.size}টি নির্বাচিত`;
    } else {
      bar.style.display = 'none';
    }
  }

  function renderTable() {
    filteredList = applyFilters();
    // drop selections that fell out of the current filtered view
    const visibleIds = new Set(filteredList.map(a => a.id));
    Array.from(selected).forEach(id => { if (!visibleIds.has(id)) selected.delete(id); });

    const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageList = filteredList.slice(start, start + PAGE_SIZE);

    const body = document.getElementById('articles-body');
    if (!pageList.length) {
      body.innerHTML = `<tr class="empty-row"><td colspan="8">কোনো প্রতিবেদন পাওয়া যায়নি</td></tr>`;
      renderPager(filteredList.length);
      updateBulkBar();
      document.getElementById('select-all').checked = false;
      return;
    }
    body.innerHTML = pageList.map(a => {
      const cat = cats.find(c => c.slug === a.category);
      const flags = [a.featured ? 'ফিচার্ড' : '', a.breaking ? 'ব্রেকিং' : '', a.trending ? 'ট্রেন্ডিং' : ''].filter(Boolean).join(' · ');
      const scheduled = a.publish_at && new Date(a.publish_at) > new Date();
      return `
        <tr data-id="${a.id}">
          <td><input type="checkbox" class="row-check" ${selected.has(a.id) ? 'checked' : ''}></td>
          <td>${a.title_bn}${flags ? `<div style="font-size:11.5px;color:var(--ink-faded);margin-top:3px;">${flags}</div>` : ''}</td>
          <td>${cat ? cat.name_bn : '—'}</td>
          <td>${a.author}</td>
          <td>${a.date}</td>
          <td>
            <span class="badge ${a.status}">${a.status === 'published' ? 'প্রকাশিত' : 'খসড়া'}</span>
            ${scheduled ? '<div style="font-size:11px;color:var(--ink-faded);margin-top:3px;">⏱ শিডিউলড</div>' : ''}
          </td>
          <td>${(a.tags || []).map(t => `#${t}`).join(' ')}</td>
          <td>
            <div class="row-actions">
              <button class="btn small outline act-edit">সম্পাদনা</button>
              <button class="btn small ghost act-toggle">${a.status === 'published' ? 'খসড়ায় নিন' : 'প্রকাশ করুন'}</button>
              ${currentRole === 'admin' ? '<button class="btn small ghost act-delete" style="color:var(--ledger-red);">মুছুন</button>' : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    body.querySelectorAll('tr').forEach(tr => {
      const id = tr.dataset.id;
      tr.querySelector('.act-edit').addEventListener('click', () => openModal(id));
      tr.querySelector('.act-toggle').addEventListener('click', () => togglePublish(id));
      const del = tr.querySelector('.act-delete');
      if (del) del.addEventListener('click', () => deleteArticle(id));
      tr.querySelector('.row-check').addEventListener('change', (e) => {
        if (e.target.checked) selected.add(id); else selected.delete(id);
        updateBulkBar();
        document.getElementById('select-all').checked = pageList.every(a => selected.has(a.id));
      });
    });

    document.getElementById('select-all').checked = pageList.every(a => selected.has(a.id));
    renderPager(filteredList.length);
    updateBulkBar();
  }

  function bulkAction(kind) {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (kind === 'delete' && !confirm(`${ids.length}টি প্রতিবেদন স্থায়ীভাবে মুছে ফেলতে চান?`)) return;

    const jobs = ids.map((id) => {
      if (kind === 'delete') return window.TPL_DB.deleteArticle(id).then(() => ({ id, ok: true, kind }));
      const status = kind === 'publish' ? 'published' : 'draft';
      return window.TPL_DB.saveArticle({ id, status }).then(() => ({ id, ok: true, kind, status }));
    });

    Promise.allSettled(jobs).then((results) => {
      results.forEach((r) => {
        if (r.status !== 'fulfilled' || !r.value.ok) return;
        const { id } = r.value;
        if (kind === 'delete') {
          arts = arts.filter(a => a.id !== id);
        } else {
          const idx = arts.findIndex(a => a.id === id);
          if (idx > -1) arts[idx].status = r.value.status;
        }
      });
      selected.clear();
      window.TPL_SHELL.toast(
        kind === 'delete' ? 'নির্বাচিত প্রতিবেদনগুলো মুছে ফেলা হয়েছে' :
        kind === 'publish' ? 'নির্বাচিত প্রতিবেদনগুলো প্রকাশ করা হয়েছে' :
        'নির্বাচিত প্রতিবেদনগুলো খসড়ায় নেওয়া হয়েছে'
      );
      renderTable();
    });
  }

  const MAX_IMAGE_CHARS = 700000; // keeps the whole article well under Firestore's 1 MiB document limit
  let imageBusy = false;

  // Turns a Firestore/JS error into a message the editor can act on.
  function explain(err) {
    const code = (err && err.code) || '';
    const msg = (err && err.message) || String(err);
    if (code === 'permission-denied') return 'সংরক্ষণের অনুমতি নেই। Firebase Console → Firestore → Rules এ লগইন করা ইউজারকে write অনুমতি দিন।';
    if (code === 'unavailable' || code === 'deadline-exceeded') return 'ইন্টারনেট বা Firebase সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।';
    if (/exceeds the maximum|too large|payload/i.test(msg)) return 'প্রতিবেদনটি খুব বড় (সম্ভবত ছবি)। ছোট ছবি ব্যবহার করুন।';
    return 'সংরক্ষণ করা যায়নি: ' + msg;
  }

  function showError(msg) {
    const box = document.getElementById('art-error');
    if (!box) return;
    box.textContent = msg || '';
    box.style.display = msg ? 'block' : 'none';
  }

  // Downscale + re-encode as JPEG so a phone photo (several MB) becomes ~100-300 KB.
  function compressImage(file, maxSide, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('ছবিটি পড়া যায়নি'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('ছবিটি খোলা যায়নি — অন্য ফাইল দিন'));
        img.onload = () => {
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          let q = quality;
          let out = canvas.toDataURL('image/jpeg', q);
          while (out.length > MAX_IMAGE_CHARS && q > 0.4) { q -= 0.1; out = canvas.toDataURL('image/jpeg', q); }
          if (out.length > MAX_IMAGE_CHARS) { reject(new Error('ছবিটি অনেক বড়, ছোট ছবি দিন')); return; }
          resolve(out);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ---------- media library ----------
  function loadMediaGrid() {
    const grid = document.getElementById('media-grid');
    grid.innerHTML = '<p class="field-hint">লোড হচ্ছে…</p>';
    window.TPL_DB.getMedia().then((items) => {
      mediaItems = items;
      renderMediaGrid();
    }).catch(() => { grid.innerHTML = '<p class="field-hint">মিডিয়া লোড করা যায়নি।</p>'; });
  }

  function renderMediaGrid() {
    const grid = document.getElementById('media-grid');
    if (!mediaItems.length) {
      grid.innerHTML = '<p class="field-hint">এখনো কোনো ছবি নেই — আগে একটা প্রতিবেদনে ছবি আপলোড করলে সেটা এখানে দেখা যাবে।</p>';
      return;
    }
    grid.innerHTML = mediaItems.map(m => `
      <div class="media-item" data-id="${m.id}">
        <img src="${m.dataUrl}" alt="">
        <button type="button" class="media-item-del" data-id="${m.id}" aria-label="মুছুন">×</button>
      </div>
    `).join('');
    grid.querySelectorAll('.media-item img').forEach(img => {
      img.addEventListener('click', () => {
        const id = img.closest('.media-item').dataset.id;
        const item = mediaItems.find(m => m.id === id);
        if (!item) return;
        pendingImage = item.dataUrl;
        document.getElementById('art-image-preview').innerHTML = `<img src="${item.dataUrl}" style="max-width:160px;max-height:110px;object-fit:cover;border-radius:6px;border:1px solid var(--rule-strong);">`;
        closeMediaModal();
      });
    });
    grid.querySelectorAll('.media-item-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        window.TPL_DB.deleteMedia(id).then(() => {
          mediaItems = mediaItems.filter(m => m.id !== id);
          renderMediaGrid();
        });
      });
    });
  }

  function openMediaModal() {
    document.getElementById('media-modal').classList.add('open');
    loadMediaGrid();
  }
  function closeMediaModal() {
    document.getElementById('media-modal').classList.remove('open');
  }

  // Saves ONE article (only the given fields) and reports success/failure to the UI.
  function writeArticle(fields) {
    return window.TPL_DB.saveArticle(fields);
  }

  function togglePublish(id) {
    const idx = arts.findIndex(a => a.id === id);
    if (idx === -1) return;
    const next = arts[idx].status === 'published' ? 'draft' : 'published';
    writeArticle({ id, status: next }).then(() => {
      arts[idx].status = next;
      window.TPL_SHELL.toast(next === 'published' ? 'প্রতিবেদনটি প্রকাশ করা হয়েছে' : 'প্রতিবেদনটি খসড়ায় নেওয়া হয়েছে');
      renderTable();
    }).catch((err) => { console.error(err); window.TPL_SHELL.toast(explain(err)); });
  }

  function deleteArticle(id) {
    if (!confirm('এই প্রতিবেদনটি স্থায়ীভাবে মুছে ফেলতে চান?')) return;
    window.TPL_DB.deleteArticle(id).then(() => {
      arts = arts.filter(a => a.id !== id);
      selected.delete(id);
      window.TPL_SHELL.toast('প্রতিবেদন মুছে ফেলা হয়েছে');
      renderTable();
    }).catch((err) => { console.error(err); window.TPL_SHELL.toast(explain(err)); });
  }

  function openModal(id) {
    editingId = id || null;
    pendingImage = null;
    const modal = document.getElementById('article-modal');
    document.getElementById('art-image-preview').innerHTML = '';
    showError('');
    document.getElementById('modal-title').textContent = id ? 'প্রতিবেদন সম্পাদনা' : 'নতুন প্রতিবেদন';

    if (id) {
      const a = arts.find(x => x.id === id);
      document.getElementById('art-title-bn').value = a.title_bn;
      document.getElementById('art-title-en').value = a.title_en || '';
      document.getElementById('art-excerpt').value = a.excerpt_bn;
      document.getElementById('art-excerpt-en').value = a.excerpt_en || '';
      quillBody.root.innerHTML = a.body_html || paragraphsToHtml(a.body);
      quillBodyEn.root.innerHTML = a.body_html_en || paragraphsToHtml(a.body_en);
      document.getElementById('art-category').value = a.category;
      document.getElementById('art-author').value = a.author;
      document.getElementById('art-date').value = a.date;
      document.getElementById('art-status').value = a.status;
      document.getElementById('art-publish-at').value = isoToLocalInput(a.publish_at);
      document.getElementById('art-tags').value = (a.tags || []).join(', ');
      document.getElementById('art-video-url').value = a.video_url || '';
      document.getElementById('art-featured').checked = !!a.featured;
      document.getElementById('art-breaking').checked = !!a.breaking;
      document.getElementById('art-trending').checked = !!a.trending;
      document.getElementById('art-meta-title').value = a.meta_title || '';
      document.getElementById('art-meta-desc').value = a.meta_desc || '';
      if (a.image) {
        document.getElementById('art-image-preview').innerHTML = `<img src="${a.image}" style="max-width:160px;max-height:110px;object-fit:cover;border-radius:6px;border:1px solid var(--rule-strong);">`;
      }
    } else {
      document.getElementById('article-form').reset();
      quillBody.root.innerHTML = '';
      quillBodyEn.root.innerHTML = '';
      document.getElementById('art-date').value = new Date().toISOString().slice(0, 10);
      document.getElementById('art-publish-at').value = '';
      document.getElementById('art-video-url').value = '';
    }
    modal.classList.add('open');
  }

  function closeModal() {
    document.getElementById('article-modal').classList.remove('open');
  }

  function slugify(str) {
    return 'art-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  }

  function saveArticle(e) {
    e.preventDefault();
    if (imageBusy) { showError('ছবি প্রসেস হচ্ছে, এক মুহূর্ত অপেক্ষা করে আবার সংরক্ষণ করুন।'); return; }
    showError('');

    if (quillIsEmpty(quillBody)) { showError('বিস্তারিত (বাংলা) খালি রাখা যাবে না।'); return; }

    const tags = document.getElementById('art-tags').value.split(',').map(s => s.trim()).filter(Boolean);
    const category = document.getElementById('art-category').value;
    const publishAtIso = localInputToIso(document.getElementById('art-publish-at').value);

    const payload = {
      title_bn: document.getElementById('art-title-bn').value.trim(),
      title_en: document.getElementById('art-title-en').value.trim(),
      excerpt_bn: document.getElementById('art-excerpt').value.trim(),
      excerpt_en: document.getElementById('art-excerpt-en').value.trim(),
      body_html: quillBody.root.innerHTML,
      body_html_en: quillIsEmpty(quillBodyEn) ? '' : quillBodyEn.root.innerHTML,
      category,
      author: document.getElementById('art-author').value.trim(),
      date: document.getElementById('art-date').value,
      status: document.getElementById('art-status').value,
      publish_at: publishAtIso,
      tags,
      video_url: document.getElementById('art-video-url').value.trim(),
      featured: document.getElementById('art-featured').checked,
      breaking: document.getElementById('art-breaking').checked,
      trending: document.getElementById('art-trending').checked,
      meta_title: document.getElementById('art-meta-title').value.trim(),
      meta_desc: document.getElementById('art-meta-desc').value.trim(),
    };
    if (pendingImage) payload.image = pendingImage;

    let record;
    if (editingId) {
      // Only send the edited fields, so views etc. are not overwritten with a stale copy.
      record = { id: editingId, ...payload };
    } else {
      const id = window.TPL_DB.nowSlugId('a');
      record = {
        id, slug: slugify(payload.title_bn), views: 0,
        image: pendingImage || `https://picsum.photos/seed/${id}/900/560`,
        ...payload
      };
    }

    // Firestore's limit is ~1 MiB in BYTES (Bangla letters are 3 bytes each), not characters.
    if (new TextEncoder().encode(JSON.stringify(record)).length > 1000000) {
      showError('প্রতিবেদনটি খুব বড় (লেখা বা ছবি)। ছবি ছোট করুন অথবা লেখা কমান।');
      return;
    }

    const btn = document.getElementById('art-save-btn');
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = 'সংরক্ষণ হচ্ছে…';

    writeArticle(record).then((saved) => {
      const wasEditing = !!editingId;
      if (wasEditing) {
        const idx = arts.findIndex(a => a.id === editingId);
        if (idx > -1) arts[idx] = { ...arts[idx], ...payload };
      } else {
        arts.unshift(saved);
      }
      closeModal();
      window.TPL_SHELL.toast(wasEditing ? 'পরিবর্তন সংরক্ষণ করা হয়েছে' : 'নতুন প্রতিবেদন তৈরি হয়েছে');
      renderTable();
    }).catch((err) => {
      console.error('Save failed:', err);
      showError(explain(err)); // modal stays open so nothing typed is lost
    }).then(() => {
      btn.disabled = false;
      btn.textContent = label;
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.TPL_AUTH.requireAuth((user) => {
      currentRole = user.role;
      window.TPL_DB.seedIfNeeded().catch(() => {}).then(() => {
        window.TPL_SHELL.renderShell(user, 'articles.html');
        return Promise.all([window.TPL_DB.getCategories(), window.TPL_DB.getArticles()]);
      }).then(([c, a]) => {
        cats = c;
        arts = a;
        fillCategoryOptions();
        initQuill();
        renderTable();

        document.getElementById('new-article-btn').addEventListener('click', () => openModal(null));
        document.getElementById('modal-close').addEventListener('click', closeModal);
        document.getElementById('modal-cancel').addEventListener('click', closeModal);
        document.getElementById('article-modal').addEventListener('click', (e) => { if (e.target.id === 'article-modal') closeModal(); });
        document.getElementById('article-form').addEventListener('submit', saveArticle);
        document.getElementById('search-input').addEventListener('input', () => { currentPage = 1; renderTable(); });
        document.getElementById('filter-cat').addEventListener('change', () => { currentPage = 1; renderTable(); });
        document.getElementById('filter-status').addEventListener('change', () => { currentPage = 1; renderTable(); });

        document.getElementById('select-all').addEventListener('change', (e) => {
          const start = (currentPage - 1) * PAGE_SIZE;
          const pageList = filteredList.slice(start, start + PAGE_SIZE);
          pageList.forEach(a => { if (e.target.checked) selected.add(a.id); else selected.delete(a.id); });
          renderTable();
        });
        document.getElementById('bulk-publish').addEventListener('click', () => bulkAction('publish'));
        document.getElementById('bulk-draft').addEventListener('click', () => bulkAction('draft'));
        document.getElementById('bulk-delete').addEventListener('click', () => bulkAction('delete'));

        document.getElementById('open-media-library').addEventListener('click', openMediaModal);
        document.getElementById('media-modal-close').addEventListener('click', closeMediaModal);
        document.getElementById('media-modal').addEventListener('click', (e) => { if (e.target.id === 'media-modal') closeMediaModal(); });

        document.getElementById('art-image-file').addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          imageBusy = true;
          showError('');
          document.getElementById('art-image-preview').textContent = 'ছবি প্রসেস হচ্ছে…';
          compressImage(file, 1400, 0.82).then((dataUrl) => {
            pendingImage = dataUrl;
            document.getElementById('art-image-preview').innerHTML = `<img src="${dataUrl}" style="max-width:160px;max-height:110px;object-fit:cover;border-radius:6px;border:1px solid var(--rule-strong);">`;
            // Also save into the media library for future reuse.
            window.TPL_DB.saveMedia({ name: file.name, dataUrl }).then((item) => { mediaItems.unshift(item); }).catch(() => {});
          }).catch((err) => {
            pendingImage = null;
            document.getElementById('art-image-preview').innerHTML = '';
            e.target.value = '';
            showError(err.message);
          }).then(() => { imageBusy = false; });
        });
      });
    });
  });
})();
