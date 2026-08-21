// Tabs Import — SessionBuddy JSON (persistent per user)
let tabImports = [];
let tabsUnsubscribe = null;

function tabsCol() {
  if (!db || !auth || !auth.currentUser) return null;
  return db.collection('users').doc(auth.currentUser.uid).collection('tabImports');
}

function startTabsSync() {
  if (!db || !auth || !auth.currentUser) return;
  if (tabsUnsubscribe) { tabsUnsubscribe(); tabsUnsubscribe = null; }
  try {
    tabsUnsubscribe = tabsCol().orderBy('createdAt', 'desc').onSnapshot((snap) => {
      tabImports = snap.docs.map(d => {
        const v = d.data();
        return {
          id: d.id,
          title: v.title || 'Import',
          fileName: v.fileName || '',
          tabs: Array.isArray(v.tabs) ? v.tabs : [],
          createdAt: getDateFromValue(v.createdAt)
        };
      });
      renderTabs();
    }, (err) => {
      console.error('Tabs sync error', err);
      if (err && err.code === 'permission-denied') showToast('Tabs sync blocked: update Firestore rules.', 'error');
    });
  } catch (e) { console.error('startTabsSync', e); }
}

function resetTabs() {
  if (tabsUnsubscribe) { tabsUnsubscribe(); tabsUnsubscribe = null; }
  tabImports = [];
  renderTabs();
}

function normalizeSessionBuddy(data, fileName) {
  let cols = [];
  if (Array.isArray(data)) cols = data;
  else if (data && Array.isArray(data.collections)) cols = data.collections;
  else if (data && Array.isArray(data.sessions)) cols = data.sessions;
  else if (data && Array.isArray(data.windows)) cols = [{ title: fileName.replace(/\.json$/i,''), windows: data.windows }];
  else if (data && data.url) cols = [{ title: fileName.replace(/\.json$/i,''), windows: [{ tabs: [data] }] }];
  else cols = [{ title: fileName.replace(/\.json$/i,''), windows: [] }];

  const tabs = [];
  cols.forEach(col => {
    const colTitle = col.title || col.name || fileName.replace(/\.json$/i,'');
    const wins = col.folders || col.windows || (col.tabs ? [{ tabs: col.tabs }] : []);
    (Array.isArray(wins) ? wins : []).forEach(w => {
      const list = w.links || w.tabs || w.pages || [];
      (Array.isArray(list) ? list : []).forEach(t => {
        const url = t.url || t.URL || t.link || '';
        if (!url) return;
        const title = t.title || t.name || url;
        const fav = t.favIconUrl || t.favIcon || t.favicon || t.icon || '';
        tabs.push({ url: String(url), title: String(title), favicon: String(fav || ''), collection: colTitle });
      });
    });
  });
  return { title: cols[0] && cols[0].title ? cols[0].title : fileName.replace(/\.json$/i,''), tabs };
}

function renderTabs() {
  const c = document.getElementById('tabs-container');
  if (!c) return;
  if (!tabImports.length) {
    c.innerHTML = `<div class="empty-state"><p class="empty-icon">🔗</p><h2>No tabs imported</h2><p>Import a SessionBuddy JSON export to see your tabs here. Stored per account — available on any device.</p></div>`;
    return;
  }
  c.innerHTML = '';
  tabImports.forEach(imp => {
    const wrap = document.createElement('div');
    wrap.className = 'tabs-import-group';
    const tabsHtml = imp.tabs.map((t, idx) => `
      <div class="tab-card">
        <a class="tab-card-link" href="${escapeHtml(t.url)}" target="_blank" rel="noopener">
          <img class="tab-favicon" src="${escapeHtml(t.favicon)}" alt="" onerror="this.style.display='none'" loading="lazy">
          <span class="tab-card-text">
            <span class="tab-card-title">${escapeHtml(t.title)}</span>
            <span class="tab-card-url">${escapeHtml(t.url)}</span>
          </span>
        </a>
        <button class="tab-card-delete" data-idx="${idx}" title="Remove this tab">✕</button>
      </div>
    `).join('');
    wrap.innerHTML = `
      <div class="tabs-import-header">
        <h3 class="tabs-import-title">${escapeHtml(imp.title)} <span class="tabs-import-count">${imp.tabs.length} tabs</span></h3>
        <span class="tabs-import-meta">${imp.createdAt.toLocaleDateString()} · ${escapeHtml(imp.fileName)}</span>
        <div class="tabs-import-actions">
          <button class="btn btn-secondary tab-open-all" data-id="${imp.id}">↗ Open all</button>
          <button class="btn btn-secondary tab-delete" data-id="${imp.id}" style="background:var(--danger-soft);color:var(--danger)">🗑️ Delete</button>
        </div>
      </div>
      <div class="tabs-grid">${tabsHtml || '<p class="tabs-empty">No tabs in this import.</p>'}</div>
    `;
    wrap.querySelector('.tab-open-all').addEventListener('click', () => {
      imp.tabs.forEach(t => window.open(t.url, '_blank'));
    });
    wrap.querySelector('.tab-delete').addEventListener('click', async () => {
      if (!confirm(`Delete "${imp.title}" with ${imp.tabs.length} tabs?`)) return;
      const col = tabsCol(); if (!col) return;
      await col.doc(imp.id).delete().catch(e => showToast('Delete failed: '+e.message,'error'));
      showToast('Import deleted');
    });
    wrap.querySelectorAll('.tab-card-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const tab = imp.tabs[idx];
        if (!tab) return;
        // remove single tab from array and update doc
        const newTabs = imp.tabs.slice(0, idx).concat(imp.tabs.slice(idx + 1));
        const col = tabsCol(); if (!col) return;
        try {
          if (newTabs.length === 0) {
            if (!confirm(`This is the last tab in "${imp.title}". Delete the whole import?`)) return;
            await col.doc(imp.id).delete();
            showToast('Import deleted — no tabs left');
          } else {
            await col.doc(imp.id).update({ tabs: newTabs });
            showToast(`Removed — ${newTabs.length} tabs left`);
          }
        } catch (err) {
          showToast('Remove failed: '+(err.message||'error'),'error');
        }
      });
    });
    c.appendChild(wrap);
  });
}

async function handleTabsImport(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.json')) { showToast('Please choose a SessionBuddy JSON file (.json)','error'); return; }
  if (!db || !auth || !auth.currentUser) { showToast('Please sign in first.','error'); return; }
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const norm = normalizeSessionBuddy(data, file.name);
    if (!norm.tabs.length) { showToast('No tabs found in file.','error'); return; }
    const col = tabsCol(); if (!col) return;
    await col.add({
      title: norm.title,
      fileName: file.name,
      tabs: norm.tabs.slice(0, 2000),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast(`✅ Imported ${norm.tabs.length} tabs — available on any device.`, 'success');
    switchTab('tabs');
  } catch (err) {
    console.error('Tabs import failed', err);
    showToast('Import failed: '+(err.message||'invalid JSON'),'error');
  }
}

// wire up (elements already in index.html)
(function(){
  const btn = document.getElementById('import-tabs-btn');
  const input = document.getElementById('import-tabs-input');
  const tabBtn = document.getElementById('tab-tabs-btn');
  if (tabBtn) tabBtn.addEventListener('click', () => switchTab('tabs'));
  if (btn && input) {
    btn.addEventListener('click', () => input.click());
    input.addEventListener('change', handleTabsImport);
  }
})();

// hook into auth lifecycle — reuse existing showApp/handleLogout hooks
const _origStartPdfsSync = window.startPdfsSync;
window.startTabsSync = startTabsSync;
window.resetTabs = resetTabs;
