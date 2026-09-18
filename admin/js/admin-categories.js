(function () {
  let cats = [];
  let arts = [];
  let editingSlug = null;

  function render() {
    const body = document.getElementById('categories-body');
    if (!cats.length) {
      body.innerHTML = `<tr class="empty-row"><td colspan="5">কোনো বিভাগ পাওয়া যায়নি</td></tr>`;
      return;
    }
    body.innerHTML = cats.map(c => {
      const count = arts.filter(a => a.category === c.slug).length;
      return `
        <tr data-slug="${c.slug}">
          <td>${c.name_bn}</td>
          <td>${c.name_en}</td>
          <td><code>${c.slug}</code></td>
          <td>${count}</td>
          <td>
            <div class="row-actions">
              <button class="btn small outline act-edit">সম্পাদনা</button>
              <button class="btn small ghost act-delete" style="color:var(--ledger-red);">মুছুন</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    body.querySelectorAll('tr').forEach(tr => {
      const slug = tr.dataset.slug;
      tr.querySelector('.act-edit').addEventListener('click', () => openModal(slug));
      tr.querySelector('.act-delete').addEventListener('click', () => deleteCat(slug));
    });
  }

  function persist(successMsg) {
    return window.TPL_DB.saveCategories(cats).then(() => {
      if (successMsg) window.TPL_SHELL.toast(successMsg);
      render();
    });
  }

  function deleteCat(slug) {
    const inUse = arts.some(a => a.category === slug);
    if (inUse && !confirm('এই বিভাগে প্রতিবেদন রয়েছে। তবুও মুছে ফেলতে চান?')) return;
    cats = cats.filter(c => c.slug !== slug);
    persist('বিভাগ মুছে ফেলা হয়েছে');
  }

  function openModal(slug) {
    editingSlug = slug || null;
    document.getElementById('cat-modal-title').textContent = slug ? 'বিভাগ সম্পাদনা' : 'নতুন বিভাগ';
    document.getElementById('cat-form').reset();
    document.getElementById('cat-slug').readOnly = false;
    if (slug) {
      const c = cats.find(x => x.slug === slug);
      document.getElementById('cat-original-slug').value = slug;
      document.getElementById('cat-name-bn').value = c.name_bn;
      document.getElementById('cat-name-en').value = c.name_en;
      document.getElementById('cat-slug').value = c.slug;
      document.getElementById('cat-slug').readOnly = true;
      document.getElementById('cat-desc').value = c.desc_bn || '';
    } else {
      document.getElementById('cat-original-slug').value = '';
    }
    document.getElementById('cat-modal').classList.add('open');
  }

  function closeModal() {
    document.getElementById('cat-modal').classList.remove('open');
  }

  function saveCat(e) {
    e.preventDefault();
    const slug = document.getElementById('cat-slug').value.trim().toLowerCase();
    const original = document.getElementById('cat-original-slug').value;

    if (!original && cats.some(c => c.slug === slug)) {
      alert('এই স্লাগ ইতিমধ্যে ব্যবহৃত হচ্ছে, ভিন্ন একটি স্লাগ দিন।');
      return;
    }

    const payload = {
      slug,
      name_bn: document.getElementById('cat-name-bn').value.trim(),
      name_en: document.getElementById('cat-name-en').value.trim(),
      desc_bn: document.getElementById('cat-desc').value.trim(),
    };

    if (original) {
      const idx = cats.findIndex(c => c.slug === original);
      cats[idx] = payload;
    } else {
      cats.push(payload);
    }
    closeModal();
    persist(original ? 'বিভাগ হালনাগাদ করা হয়েছে' : 'নতুন বিভাগ তৈরি হয়েছে');
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.TPL_AUTH.requireAuth((user) => {
      window.TPL_DB.seedIfNeeded().then(() => {
        window.TPL_SHELL.renderShell(user, 'categories.html');
        return Promise.all([window.TPL_DB.getCategories(), window.TPL_DB.getArticles()]);
      }).then(([c, a]) => {
        cats = c;
        arts = a;
        render();

        document.getElementById('new-cat-btn').addEventListener('click', () => openModal(null));
        document.getElementById('cat-modal-close').addEventListener('click', closeModal);
        document.getElementById('cat-modal-cancel').addEventListener('click', closeModal);
        document.getElementById('cat-modal').addEventListener('click', (e) => { if (e.target.id === 'cat-modal') closeModal(); });
        document.getElementById('cat-form').addEventListener('submit', saveCat);
      });
    });
  });
})();
