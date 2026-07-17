// ── rankings.js ───────────────────────────────────────────
(async function () {

  let keywords = [];
  let filteredKeywords = [];
  let activeFilter = 'all';

  const compSettings = await loadCompSettings();
  const website = compSettings?.website || '';
  const serperKey = await getApiKey('serperKey');

  if (!currentCompanyId) {
    document.getElementById('rankings-tbody').innerHTML = `
      <tr><td colspan="8">
        <div class="table-empty">
          <div class="table-empty-icon">🏢</div>
          <div class="table-empty-title">No company selected</div>
          <div class="table-empty-sub">Select a company from the top bar</div>
        </div>
      </td></tr>`;
    return;
  }

  const subEl = document.getElementById('rankings-sub');
  if (subEl) subEl.textContent = website
    ? 'Tracking rankings for ' + website
    : 'Add your website in Settings';

  await loadKeywords();

  // ── Load Keywords ──────────────────────────────────────
  async function loadKeywords() {
    const tbody = document.getElementById('rankings-tbody');
    try {
      const snap = await db
        .collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId)
        .collection('keywords').get();

      keywords = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          keyword: data.keyword || data.term || data.kw || d.id,
          position: Number(data.position) || 0,
          prevPosition: Number(data.prevPosition) || 0,
          volume: Number(data.volume) || 0,
          url: data.url || data.targetUrl || data.topPage || website,
          location: data.location || 'Hyderabad, India',
          lastChecked: data.lastChecked || null
        };
      });

      // Sort by position (ranked first, then unranked)
      keywords.sort((a, b) => {
        if (a.position > 0 && b.position > 0) return a.position - b.position;
        if (a.position > 0) return -1;
        if (b.position > 0) return 1;
        return 0;
      });

    } catch (e) {
      console.error('loadKeywords error:', e);
      if (tbody) tbody.innerHTML = `
        <tr><td colspan="8">
          <div class="table-empty">
            <div class="table-empty-icon">❌</div>
            <div class="table-empty-title">Error loading keywords</div>
            <div class="table-empty-sub">${e.message}</div>
          </div>
        </td></tr>`;
      return;
    }

    updateStats();
    renderTable();
  }

  // ── Stats ──────────────────────────────────────────────
  function updateStats() {
    const ranked = keywords.filter(k => k.position > 0);
    const avg = ranked.length
      ? (ranked.reduce((a, b) => a + b.position, 0) / ranked.length).toFixed(1)
      : '--';

    const s = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    s('rs-total', keywords.length);
    s('rs-top3', ranked.filter(k => k.position <= 3).length);
    s('rs-top10', ranked.filter(k => k.position <= 10).length);
    s('rs-top20', ranked.filter(k => k.position <= 20).length);
    s('rs-unranked', keywords.filter(k => k.position === 0).length);
    s('rs-avg', avg !== '--' ? '#' + avg : '--');
  }

  // ── Filter ─────────────────────────────────────────────
  window.setFilter = function (filter, btn) {
    activeFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderTable();
  };

  // ── Render Table ───────────────────────────────────────
  window.renderTable = function () {
    const tbody = document.getElementById('rankings-tbody');
    if (!tbody) return;

    const search = (document.getElementById('kw-search')?.value || '').toLowerCase();

    filteredKeywords = keywords.filter(k => {
      const matchSearch = !search || (k.keyword || '').toLowerCase().includes(search);
      let matchFilter = true;
      if (activeFilter === 'top3') matchFilter = k.position > 0 && k.position <= 3;
      else if (activeFilter === 'top10') matchFilter = k.position > 0 && k.position <= 10;
      else if (activeFilter === 'top20') matchFilter = k.position > 0 && k.position <= 20;
      else if (activeFilter === 'unranked') matchFilter = k.position === 0;
      return matchSearch && matchFilter;
    });

    if (filteredKeywords.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="8">
          <div class="table-empty">
            <div class="table-empty-icon">🔑</div>
            <div class="table-empty-title">${keywords.length === 0 ? 'No keywords yet' : 'No results'}</div>
            <div class="table-empty-sub">${keywords.length === 0
              ? 'Click "+ Add Keyword" to start tracking'
              : 'Try a different search or filter'}</div>
            ${keywords.length === 0
              ? '<button class="btn btn-primary" onclick="showAddKeyword()">+ Add Keyword</button>'
              : ''}
          </div>
        </td></tr>`;
      return;
    }

    const maxVol = Math.max(...filteredKeywords.map(k => k.volume || 0), 1);

    tbody.innerHTML = filteredKeywords.map((k, i) => {
      const pos = k.position || 0;
      const posClass = pos === 0 ? 'pos-none'
        : pos <= 3  ? 'pos-top3'
        : pos <= 10 ? 'pos-top10'
        : pos <= 20 ? 'pos-top20'
        : 'pos-low';
      const posText = pos === 0 ? '--' : '#' + pos;

      const prev = k.prevPosition || 0;
      let changeHTML = '<span class="change change-flat">—</span>';
      if (pos > 0 && prev > 0) {
        const diff = prev - pos;
        if (diff > 0)      changeHTML = `<span class="change change-up">▲ ${diff}</span>`;
        else if (diff < 0) changeHTML = `<span class="change change-down">▼ ${Math.abs(diff)}</span>`;
        else               changeHTML = '<span class="change change-flat">— 0</span>';
      }

      const vol = k.volume || 0;
      const volPct = Math.round((vol / maxVol) * 100);
      const volHTML = vol
        ? `<div class="vol-bar">
             <span class="vol-num">${vol >= 1000 ? (vol/1000).toFixed(1)+'k' : vol}</span>
             <div class="vol-bg"><div class="vol-fill" style="width:${volPct}%"></div></div>
           </div>`
        : '<span style="color:#ccc">--</span>';

      const url = k.url || '';
      const urlShort = url.replace(/https?:\/\/[^/]+/, '') || '/';

      let lastCheckedText = 'Never';
      if (k.lastChecked) {
        try {
          const d = k.lastChecked.toDate ? k.lastChecked.toDate() : new Date(k.lastChecked);
          lastCheckedText = timeAgo(d);
        } catch(e) { lastCheckedText = 'Unknown'; }
      }

      return `<tr>
        <td style="color:#ccc;font-size:12px;">${i + 1}</td>
        <td>
          <div class="kw-cell">
            <div class="kw-main">${escHtml(k.keyword)}</div>
            ${url ? `<div class="kw-url">${escHtml(urlShort)}</div>` : ''}
          </div>
        </td>
        <td><span class="pos-badge ${posClass}">${posText}</span></td>
        <td>${changeHTML}</td>
        <td>${volHTML}</td>
        <td style="font-size:12px;">
          ${url
            ? `<a href="${escHtml(url)}" target="_blank"
                  style="color:#0a5c36;text-decoration:none;max-width:140px;display:block;
                         overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                 ${escHtml(urlShort)}
               </a>`
            : '--'}
        </td>
        <td style="font-size:12px;color:#888;">${lastCheckedText}</td>
        <td>
          <div class="row-actions">
            <button class="check-btn" onclick="checkSingleRank('${k.id}')" id="check-${k.id}">Check</button>
            <button class="btn btn-sm btn-danger" onclick="deleteKeyword('${k.id}')">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  };

  // ── Add Keyword ────────────────────────────────────────
  window.showAddKeyword = function () {
    const m = document.getElementById('add-modal');
    if (m) { m.style.display = 'flex'; setTimeout(() => document.getElementById('kw-input')?.focus(), 100); }
  };

  window.closeModal = function () {
    const m = document.getElementById('add-modal');
    if (m) m.style.display = 'none';
    ['kw-input','vol-input','url-input','loc-input'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
  };

  window.addKeyword = async function () {
    const kwEl = document.getElementById('kw-input');
    const kw = kwEl?.value?.trim();
    if (!kw) { showToast('Enter a keyword', true); return; }

    const vol = parseInt(document.getElementById('vol-input')?.value) || 0;
    const url = document.getElementById('url-input')?.value?.trim() || website;
    const loc = document.getElementById('loc-input')?.value?.trim() || 'Hyderabad, India';

    const btn = document.getElementById('save-kw-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    try {
      const docRef = await db
        .collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId)
        .collection('keywords').add({
          keyword: kw, volume: vol, url, location: loc,
          position: 0, prevPosition: 0,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastChecked: null
        });

      keywords.unshift({ id: docRef.id, keyword: kw, volume: vol, url, location: loc, position: 0, prevPosition: 0, lastChecked: null });
      updateStats();
      renderTable();
      closeModal();
      showToast('Keyword added! Checking rank...');
      await checkSingleRank(docRef.id);
    } catch (e) {
      showToast('Error: ' + e.message, true);
    }

    if (btn) { btn.disabled = false; btn.textContent = 'Save & Check Rank'; }
  };

  // ── Delete ─────────────────────────────────────────────
  window.deleteKeyword = async function (id) {
    if (!confirm('Delete this keyword?')) return;
    try {
      await db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId)
        .collection('keywords').doc(id).delete();
      keywords = keywords.filter(k => k.id !== id);
      updateStats();
      renderTable();
      showToast('Keyword deleted');
    } catch (e) { showToast('Error: ' + e.message, true); }
  };

  // ── Check Single Rank ──────────────────────────────────
  window.checkSingleRank = async function (id) {
    if (!serperKey) { showToast('No Serper API key — add in Settings', true); return; }
    const kw = keywords.find(k => k.id === id);
    if (!kw) return;

    const btn = document.getElementById('check-' + id);
    if (btn) { btn.textContent = '...'; btn.classList.add('checking'); btn.disabled = true; }

    const position = await fetchRank(kw.keyword, website, serperKey);

    try {
      const prevPos = kw.position || 0;
      await db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId)
        .collection('keywords').doc(id).update({
          prevPosition: prevPos, position,
          lastChecked: firebase.firestore.FieldValue.serverTimestamp()
        });
      const idx = keywords.findIndex(k => k.id === id);
      if (idx !== -1) {
        keywords[idx].prevPosition = keywords[idx].position;
        keywords[idx].position = position;
        keywords[idx].lastChecked = { toDate: () => new Date() };
      }
      updateStats();
      renderTable();
      showToast(position > 0 ? `"${kw.keyword}" ranked #${position} ✅` : `"${kw.keyword}" not in top 100`);
    } catch (e) { showToast('Error saving rank', true); }

    if (btn) { btn.textContent = 'Check'; btn.classList.remove('checking'); btn.disabled = false; }
  };

  // ── Check All ──────────────────────────────────────────
  window.checkAllRankings = async function () {
    if (!serperKey) { showToast('No Serper API key — add in Settings', true); return; }
    if (keywords.length === 0) { showToast('No keywords to check', true); return; }

    const btn = document.getElementById('check-all-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Checking...'; }

    const progress = document.getElementById('bulk-progress');
    const fill = document.getElementById('progress-fill');
    const text = document.getElementById('progress-text');
    if (progress) progress.classList.add('show');

    for (let i = 0; i < keywords.length; i++) {
      const kw = keywords[i];
      if (text) text.textContent = `${i + 1} / ${keywords.length} — ${kw.keyword}`;
      if (fill) fill.style.width = ((i / keywords.length) * 100) + '%';

      const position = await fetchRank(kw.keyword, website, serperKey);
      try {
        await db.collection('users').doc(currentUser.uid)
          .collection('companies').doc(currentCompanyId)
          .collection('keywords').doc(kw.id).update({
            prevPosition: kw.position || 0, position,
            lastChecked: firebase.firestore.FieldValue.serverTimestamp()
          });
        keywords[i].prevPosition = keywords[i].position;
        keywords[i].position = position;
        keywords[i].lastChecked = { toDate: () => new Date() };
      } catch (e) { console.error(e); }

      await sleep(1200);
    }

    if (fill) fill.style.width = '100%';
    if (text) text.textContent = '✅ Done!';
    setTimeout(() => { if(progress) progress.classList.remove('show'); }, 2000);

    updateStats();
    renderTable();
    showToast('All rankings updated! ✅');
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Check All'; }
  };

  // ── Fetch Rank ─────────────────────────────────────────
  async function fetchRank(keyword, siteUrl, apiKey) {
    if (!apiKey) return 0;
    try {
      const domain = siteUrl.replace(/https?:\/\//, '').replace(/\/.*/, '');
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: keyword, gl: 'in', hl: 'en', num: 100 })
      });
      const data = await res.json();
      const results = data.organic || [];
      for (let i = 0; i < results.length; i++) {
        if (results[i].link?.includes(domain)) return i + 1;
      }
      return 0;
    } catch (e) { console.error('fetchRank error:', e); return 0; }
  }

  // ── Helpers ────────────────────────────────────────────
  function timeAgo(date) {
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return Math.floor(s/60) + 'm ago';
    if (s < 86400) return Math.floor(s/3600) + 'h ago';
    return Math.floor(s/86400) + 'd ago';
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

})();
