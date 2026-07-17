// ── rankings.js ───────────────────────────────────────────
(async function () {

  let keywords = [];
  let filteredKeywords = [];
  let activeFilter = 'all';
  let compSettings = null;

  // Load company settings
  compSettings = await loadCompSettings();
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

  document.getElementById('rankings-sub').textContent =
    website ? 'Tracking rankings for ' + website : 'Add your website in Settings';

  // Pre-fill URL input
  if (document.getElementById('url-input')) {
    document.getElementById('url-input').placeholder = website || 'https://yoursite.com';
  }

  await loadKeywords();

  // ── Load Keywords ────────────────────────────────────────
  async function loadKeywords() {
    try {
      const snap = await db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId)
        .collection('keywords').orderBy('createdAt', 'desc').get();
      keywords = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      // Try without orderBy if index missing
      try {
        const snap = await db.collection('users').doc(currentUser.uid)
          .collection('companies').doc(currentCompanyId)
          .collection('keywords').get();
        keywords = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e2) { console.error(e2); }
    }
    updateStats();
    renderTable();
  }

  // ── Stats ────────────────────────────────────────────────
  function updateStats() {
    const total = keywords.length;
    const ranked = keywords.filter(k => k.position > 0);
    const top3 = ranked.filter(k => k.position <= 3).length;
    const top10 = ranked.filter(k => k.position <= 10).length;
    const top20 = ranked.filter(k => k.position <= 20).length;
    const unranked = keywords.filter(k => !k.position || k.position === 0).length;
    const avg = ranked.length
      ? (ranked.reduce((a, b) => a + b.position, 0) / ranked.length).toFixed(1)
      : '--';

    document.getElementById('rs-total').textContent = total;
    document.getElementById('rs-top3').textContent = top3;
    document.getElementById('rs-top10').textContent = top10;
    document.getElementById('rs-top20').textContent = top20;
    document.getElementById('rs-unranked').textContent = unranked;
    document.getElementById('rs-avg').textContent = avg !== '--' ? '#' + avg : '--';
  }

  // ── Filter ───────────────────────────────────────────────
  window.setFilter = function (filter, btn) {
    activeFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTable();
  };

  // ── Render Table ─────────────────────────────────────────
  window.renderTable = function () {
    const search = document.getElementById('kw-search')?.value?.toLowerCase() || '';

    filteredKeywords = keywords.filter(k => {
      const matchSearch = !search || k.keyword?.toLowerCase().includes(search);
      let matchFilter = true;
      if (activeFilter === 'top3') matchFilter = k.position > 0 && k.position <= 3;
      else if (activeFilter === 'top10') matchFilter = k.position > 0 && k.position <= 10;
      else if (activeFilter === 'top20') matchFilter = k.position > 0 && k.position <= 20;
      else if (activeFilter === 'unranked') matchFilter = !k.position || k.position === 0;
      return matchSearch && matchFilter;
    });

    const tbody = document.getElementById('rankings-tbody');

    if (filteredKeywords.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="8">
          <div class="table-empty">
            <div class="table-empty-icon">🔑</div>
            <div class="table-empty-title">${keywords.length === 0 ? 'No keywords yet' : 'No results'}</div>
            <div class="table-empty-sub">${keywords.length === 0 ? 'Click "Add Keyword" to start tracking' : 'Try a different search or filter'}</div>
            ${keywords.length === 0 ? '<button class="btn btn-primary" onclick="showAddKeyword()">+ Add Keyword</button>' : ''}
          </div>
        </td></tr>`;
      return;
    }

    const maxVol = Math.max(...filteredKeywords.map(k => k.volume || 0), 1);

    tbody.innerHTML = filteredKeywords.map((k, i) => {
      const pos = k.position || 0;
      const posClass = pos === 0 ? 'pos-none' : pos <= 3 ? 'pos-top3' : pos <= 10 ? 'pos-top10' : pos <= 20 ? 'pos-top20' : 'pos-low';
      const posText = pos === 0 ? '--' : '#' + pos;

      const prev = k.prevPosition || 0;
      let changeHTML = '<span class="change change-flat">— —</span>';
      if (pos > 0 && prev > 0) {
        const diff = prev - pos;
        if (diff > 0) changeHTML = `<span class="change change-up">▲ ${diff}</span>`;
        else if (diff < 0) changeHTML = `<span class="change change-down">▼ ${Math.abs(diff)}</span>`;
        else changeHTML = '<span class="change change-flat">— 0</span>';
      }

      const vol = k.volume || 0;
      const volPct = Math.round((vol / maxVol) * 100);
      const volHTML = vol
        ? `<div class="vol-bar"><span class="vol-num">${vol >= 1000 ? (vol/1000).toFixed(1)+'k' : vol}</span>
           <div class="vol-bg"><div class="vol-fill" style="width:${volPct}%"></div></div></div>`
        : '<span style="color:#ccc">--</span>';

      const url = k.url || k.topPage || '';
      const urlShort = url.replace(/https?:\/\/[^/]+/, '') || '/';

      const lastChecked = k.lastChecked?.toDate
        ? timeAgo(k.lastChecked.toDate())
        : 'Never';

      return `
        <tr>
          <td style="color:#ccc;font-size:12px;">${i + 1}</td>
          <td>
            <div class="kw-cell">
              <div class="kw-main">${k.keyword}</div>
              ${url ? `<div class="kw-url">${urlShort}</div>` : ''}
            </div>
          </td>
          <td><span class="pos-badge ${posClass}">${posText}</span></td>
          <td>${changeHTML}</td>
          <td>${volHTML}</td>
          <td style="font-size:12px;color:#0a5c36;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${url ? `<a href="${url}" target="_blank" style="color:#0a5c36;text-decoration:none;">${urlShort}</a>` : '--'}
          </td>
          <td style="font-size:12px;color:#888;">${lastChecked}</td>
          <td>
            <div class="row-actions">
              <button class="check-btn" onclick="checkSingleRank('${k.id}')" id="check-${k.id}">Check</button>
              <button class="btn btn-sm btn-danger" onclick="deleteKeyword('${k.id}')">🗑</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  };

  // ── Add Keyword Modal ────────────────────────────────────
  window.showAddKeyword = function () {
    document.getElementById('add-modal').style.display = 'flex';
    document.getElementById('kw-input').focus();
  };

  window.closeModal = function () {
    document.getElementById('add-modal').style.display = 'none';
    document.getElementById('kw-input').value = '';
    document.getElementById('vol-input').value = '';
    document.getElementById('url-input').value = '';
    document.getElementById('loc-input').value = '';
  };

  window.addKeyword = async function () {
    const kw = document.getElementById('kw-input').value.trim();
    if (!kw) { showToast('Enter a keyword', true); return; }

    const vol = parseInt(document.getElementById('vol-input').value) || 0;
    const url = document.getElementById('url-input').value.trim() || website;
    const loc = document.getElementById('loc-input').value.trim() || 'Hyderabad, India';

    const btn = document.getElementById('save-kw-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const docRef = await db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId)
        .collection('keywords').add({
          keyword: kw,
          volume: vol,
          url: url,
          location: loc,
          position: 0,
          prevPosition: 0,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastChecked: null
        });

      keywords.unshift({ id: docRef.id, keyword: kw, volume: vol, url, location: loc, position: 0 });
      updateStats();
      renderTable();
      closeModal();
      showToast('Keyword added! Checking rank...');

      // Auto check rank
      await checkSingleRank(docRef.id);
    } catch (e) {
      showToast('Error: ' + e.message, true);
    }

    btn.disabled = false;
    btn.textContent = 'Save & Check Rank';
  };

  // ── Delete Keyword ───────────────────────────────────────
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
    } catch (e) {
      showToast('Error: ' + e.message, true);
    }
  };

  // ── Check Single Rank ────────────────────────────────────
  window.checkSingleRank = async function (id) {
    const kw = keywords.find(k => k.id === id);
    if (!kw) return;

    const btn = document.getElementById('check-' + id);
    if (btn) { btn.textContent = '...'; btn.classList.add('checking'); btn.disabled = true; }

    const position = await fetchRank(kw.keyword, website, serperKey);

    // Save to Firebase
    try {
      const prevPos = kw.position || 0;
      await db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId)
        .collection('keywords').doc(id).update({
          prevPosition: prevPos,
          position: position,
          lastChecked: firebase.firestore.FieldValue.serverTimestamp()
        });

      // Update local
      const idx = keywords.findIndex(k => k.id === id);
      if (idx !== -1) {
        keywords[idx].prevPosition = keywords[idx].position;
        keywords[idx].position = position;
        keywords[idx].lastChecked = { toDate: () => new Date() };
      }
      updateStats();
      renderTable();
      showToast(position > 0 ? `"${kw.keyword}" ranked #${position}` : `"${kw.keyword}" not in top 100`);
    } catch (e) {
      showToast('Error saving rank', true);
    }

    if (btn) { btn.textContent = 'Check'; btn.classList.remove('checking'); btn.disabled = false; }
  };

  // ── Check All Rankings ───────────────────────────────────
  window.checkAllRankings = async function () {
    if (!serperKey) {
      showToast('No Serper API key — add in Settings', true);
      return;
    }
    if (keywords.length === 0) {
      showToast('No keywords to check', true);
      return;
    }

    const btn = document.getElementById('check-all-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Checking...';

    const progress = document.getElementById('bulk-progress');
    const fill = document.getElementById('progress-fill');
    const text = document.getElementById('progress-text');
    progress.classList.add('show');

    for (let i = 0; i < keywords.length; i++) {
      const kw = keywords[i];
      text.textContent = `${i + 1} / ${keywords.length} — ${kw.keyword}`;
      fill.style.width = ((i / keywords.length) * 100) + '%';

      const position = await fetchRank(kw.keyword, website, serperKey);
      try {
        await db.collection('users').doc(currentUser.uid)
          .collection('companies').doc(currentCompanyId)
          .collection('keywords').doc(kw.id).update({
            prevPosition: kw.position || 0,
            position: position,
            lastChecked: firebase.firestore.FieldValue.serverTimestamp()
          });
        keywords[i].prevPosition = keywords[i].position;
        keywords[i].position = position;
        keywords[i].lastChecked = { toDate: () => new Date() };
      } catch (e) {}

      // Small delay between requests
      await sleep(1200);
    }

    fill.style.width = '100%';
    text.textContent = 'Done!';
    setTimeout(() => progress.classList.remove('show'), 2000);

    updateStats();
    renderTable();
    showToast('All rankings updated!');

    btn.disabled = false;
    btn.textContent = '🔄 Check All';
  };

  // ── Fetch Rank via Serper ────────────────────────────────
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
    } catch (e) {
      console.error('Rank fetch error:', e);
      return 0;
    }
  }

  // ── Utilities ────────────────────────────────────────────
  function timeAgo(date) {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

})();
