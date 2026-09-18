(function () {
  let cats = [];
  let arts = [];      // local cache, kept in sync with Firestore after each save
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
              <button class="btn small ghost act-delete" style="color:var(--ledger-red);">মুছুন</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    body.querySelectorAll('tr').forEach(tr => {
      const id = tr.dataset.id;
      tr.querySelector('.act-edit').addEventListener('click', () => openModal(id));
      tr.querySelector('.act-toggle').addEventListener('click', () => togglePublish(id));
      tr.querySelector('.act-delete').addEventListener('click', () => deleteArticle(id));
    });
  }

  function persist(successMsg) {
    return window.TPL_DB.saveArticles(arts).then(() => {
      if (successMsg) window.TPL_SHELL.toast(successMsg);
      renderTable();
    });
  }

  function togglePublish(id) {
    const idx = arts.findIndex(a => a.id === id);
    if (idx === -1) return;
    arts[idx].status = arts[idx].status === 'published' ? 'draft' : 'published';
    persist(arts[idx].status === 'published' ? 'প্রতিবেদনটি প্রকাশ করা হয়েছে' : 'প্রতিবেদনটি খসড়ায় নেওয়া হয়েছে');
  }

  function deleteArticle(id) {
    if (!confirm('এই প্রতিবেদনটি স্থায়ীভাবে মুছে ফেলতে চান?')) return;
    arts = arts.filter(a => a.id !== id);
    persist('প্রতিবেদন মুছে ফেলা হয়েছে');
  }

  function openModal(id) {
    editingId = id || null;
    pendingImage = null;
    const modal = document.getElementById('article-modal');
    document.getElementById('art-image-preview').innerHTML = '';
    document.getElementById('modal-title').textContent = id ? 'প্রতিবেদন সম্পাদনা' : 'নতুন প্রতিবেদন';

    if (id) {
      const a = arts.find(x => x.id === id);
      document.getElementById('art-title-bn').value = a.title_bn;
      document.getElementById('art-title-en').value = a.title_en || '';
      document.getElementById('art-excerpt').value = a.excerpt_bn;
      document.getElementById('art-body').value = (a.body || []).join('\n');
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
    const tags = document.getElementById('art-tags').value.split(',').map(s => s.trim()).filter(Boolean);
    const body = document.getElementById('art-body').value.split('\n').map(s => s.trim()).filter(Boolean);
    const category = document.getElementById('art-category').value;

    const payload = {
      title_bn: document.getElementById('art-title-bn').value.trim(),
      title_en: document.getElementById('art-title-en').value.trim(),
      excerpt_bn: document.getElementById('art-excerpt').value.trim(),
      body,
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

    if (editingId) {
      const idx = arts.findIndex(a => a.id === editingId);
      arts[idx] = { ...arts[idx], ...payload };
    } else {
      const id = window.TPL_DB.nowSlugId('a');
      arts.unshift({
        id, slug: slugify(payload.title_bn), views: 0,
        image: pendingImage || `https://picsum.photos/seed/${id}/900/560`,
        ...payload
      });
    }
    closeModal();
    persist(editingId ? 'পরিবর্তন সংরক্ষণ করা হয়েছে' : 'নতুন প্রতিবেদন তৈরি হয়েছে');
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.TPL_AUTH.requireAuth((user) => {
      window.TPL_DB.seedIfNeeded().then(() => {
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
          const reader = new FileReader();
          reader.onload = () => {
            pendingImage = reader.result;
            document.getElementById('art-image-preview').innerHTML = `<img src="${pendingImage}" style="max-width:160px;border:1px solid var(--rule-strong);">`;
          };
          reader.readAsDataURL(file);
        });
      });
    });
  });
})();
