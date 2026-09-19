(function () {
  let cats = [];
  let arts = [];      // local cache, kept in sync with Firestore after each save
  let currentRole = 'admin';
  let editingId = null;
  let pendingImage = null; // dataURL from file upload, if chosen

  function fillCategoryOptions() {
    const filterSel = document.getElementById('filter-cat');
    const formSel = document.getElementById('art-category');
    filterSel.innerHTML = '<option value="">সব বিভাগ</option>' + cats.map(c => `<option value="${c.slug}">${c.name_bn}</option>`).join('');
    formSel.innerHTML = cats.map(c => `<option value="${c.slug}">${c.name_bn}</option>`).join('');
  }

  function renderTable() {
    const q = document.getElementById('search-input').value.trim().toLowerCase();
    const catFilter = document.getElementById('filter-cat').value;
    const statusFilter = document.getElementById('filter-status').value;

    let list = [...arts].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (q) list = list.filter(a => a.title_bn.toLowerCase().includes(q));
    if (catFilter) list = list.filter(a => a.category === catFilter);
    if (statusFilter) list = list.filter(a => a.status === statusFilter);

    const body = document.getElementById('articles-body');
    if (!list.length) {
      body.innerHTML = `<tr class="empty-row"><td colspan="7">কোনো প্রতিবেদন পাওয়া যায়নি</td></tr>`;
      return;
    }
    body.innerHTML = list.map(a => {
      const cat = cats.find(c => c.slug === a.category);
      const flags = [a.featured ? 'ফিচার্ড' : '', a.breaking ? 'ব্রেকিং' : '', a.trending ? 'ট্রেন্ডিং' : ''].filter(Boolean).join(' · ');
      return `
        <tr data-id="${a.id}">
          <td>${a.title_bn}${flags ? `<div style="font-size:11.5px;color:var(--ink-faded);margin-top:3px;">${flags}</div>` : ''}</td>
          <td>${cat ? cat.name_bn : '—'}</td>
          <td>${a.author}</td>
          <td>${a.date}</td>
          <td><span class="badge ${a.status}">${a.status === 'published' ? 'প্রকাশিত' : 'খসড়া'}</span></td>
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
      document.getElementById('art-body').value = (a.body || []).join('\n');
      document.getElementById('art-body-en').value = (a.body_en || []).join('\n');
      document.getElementById('art-category').value = a.category;
      document.getElementById('art-author').value = a.author;
      document.getElementById('art-date').value = a.date;
      document.getElementById('art-status').value = a.status;
      document.getElementById('art-tags').value = (a.tags || []).join(', ');
      document.getElementById('art-featured').checked = !!a.featured;
      document.getElementById('art-breaking').checked = !!a.breaking;
      document.getElementById('art-trending').checked = !!a.trending;
      if (a.image) {
        document.getElementById('art-image-preview').innerHTML = `<img src="${a.image}" style="max-width:160px;border:1px solid var(--rule-strong);">`;
      }
    } else {
      document.getElementById('article-form').reset();
      document.getElementById('art-date').value = new Date().toISOString().slice(0, 10);
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

    const tags = document.getElementById('art-tags').value.split(',').map(s => s.trim()).filter(Boolean);
    const body = document.getElementById('art-body').value.split('\n').map(s => s.trim()).filter(Boolean);
    const body_en = document.getElementById('art-body-en').value.split('\n').map(s => s.trim()).filter(Boolean);
    const category = document.getElementById('art-category').value;

    const payload = {
      title_bn: document.getElementById('art-title-bn').value.trim(),
      title_en: document.getElementById('art-title-en').value.trim(),
      excerpt_bn: document.getElementById('art-excerpt').value.trim(),
      excerpt_en: document.getElementById('art-excerpt-en').value.trim(),
      body,
      body_en,
      category,
      author: document.getElementById('art-author').value.trim(),
      date: document.getElementById('art-date').value,
      status: document.getElementById('art-status').value,
      tags,
      featured: document.getElementById('art-featured').checked,
      breaking: document.getElementById('art-breaking').checked,
      trending: document.getElementById('art-trending').checked,
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
        renderTable();

        document.getElementById('new-article-btn').addEventListener('click', () => openModal(null));
        document.getElementById('modal-close').addEventListener('click', closeModal);
        document.getElementById('modal-cancel').addEventListener('click', closeModal);
        document.getElementById('article-modal').addEventListener('click', (e) => { if (e.target.id === 'article-modal') closeModal(); });
        document.getElementById('article-form').addEventListener('submit', saveArticle);
        document.getElementById('search-input').addEventListener('input', renderTable);
        document.getElementById('filter-cat').addEventListener('change', renderTable);
        document.getElementById('filter-status').addEventListener('change', renderTable);

        document.getElementById('art-image-file').addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          imageBusy = true;
          showError('');
          document.getElementById('art-image-preview').textContent = 'ছবি প্রসেস হচ্ছে…';
          compressImage(file, 1400, 0.82).then((dataUrl) => {
            pendingImage = dataUrl;
            document.getElementById('art-image-preview').innerHTML = `<img src="${dataUrl}" style="max-width:160px;border:1px solid var(--rule-strong);">`;
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
