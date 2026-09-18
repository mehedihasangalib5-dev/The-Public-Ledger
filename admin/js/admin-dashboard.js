(function () {
  document.addEventListener('DOMContentLoaded', () => {
    window.TPL_AUTH.requireAuth((user) => {
      window.TPL_DB.seedIfNeeded().then(() => {
        window.TPL_SHELL.renderShell(user, 'dashboard.html');
        return Promise.all([window.TPL_DB.getArticles(), window.TPL_DB.getCategories()]);
      }).then(([arts, cats]) => {
        const published = arts.filter(a => a.status === 'published');
        const drafts = arts.filter(a => a.status === 'draft');
        const totalViews = arts.reduce((s, a) => s + (a.views || 0), 0);

        document.getElementById('kpi-grid').innerHTML = `
          <div class="kpi-card"><div class="num">${arts.length}</div><div class="lbl">মোট প্রতিবেদন</div></div>
          <div class="kpi-card"><div class="num">${published.length}</div><div class="lbl">প্রকাশিত</div></div>
          <div class="kpi-card"><div class="num">${drafts.length}</div><div class="lbl">খসড়া</div></div>
          <div class="kpi-card"><div class="num">${cats.length}</div><div class="lbl">বিভাগ</div></div>
          <div class="kpi-card"><div class="num">${totalViews.toLocaleString('bn-BD')}</div><div class="lbl">মোট ভিউ</div></div>
        `;

        const recent = [...arts].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
        document.getElementById('recent-body').innerHTML = recent.map(a => {
          const cat = cats.find(c => c.slug === a.category);
          return `
            <tr>
              <td>${a.title_bn}</td>
              <td>${cat ? cat.name_bn : '—'}</td>
              <td><span class="badge ${a.status}">${a.status === 'published' ? 'প্রকাশিত' : 'খসড়া'}</span></td>
              <td>${a.date}</td>
              <td>${(a.views || 0).toLocaleString('bn-BD')}</td>
            </tr>
          `;
        }).join('') || `<tr class="empty-row"><td colspan="5">এখনো কোনো প্রতিবেদন নেই</td></tr>`;
      });
    });
  });
})();
