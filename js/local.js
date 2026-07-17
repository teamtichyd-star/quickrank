// ── local.js — Leaflet version ───────────────────────────
(async function () {

  let allKeywords = [];
  let selectedKeyword = null;
  let map = null;
  let mapMarkers = [];
  let compSettings = null;
  let serperKey = null;

  const DEFAULT_CENTER = { lat: 17.3850, lng: 78.4867 };

  compSettings = await loadCompSettings();
  serperKey = await getApiKey('serperKey');

  const centerLat = compSettings?.lat || DEFAULT_CENTER.lat;
  const centerLng = compSettings?.lng || DEFAULT_CENTER.lng;
  const website = compSettings?.website || '';

  await loadLocalKeywords();

  // Wait for Leaflet + DOM to be ready then init map
  waitForLeaflet();

  function waitForLeaflet(attempts) {
    attempts = attempts || 0;
    if (attempts > 30) { console.error('Leaflet never loaded'); return; }
    const mapEl = document.getElementById('geo-map');
    if (window.L && mapEl && mapEl.offsetWidth > 0) {
      initLeafletMap();
    } else {
      setTimeout(() => waitForLeaflet(attempts + 1), 200);
    }
  }

  // ── Load Keywords ────────────────────────────────────────
  async function loadLocalKeywords() {
    if (!currentCompanyId) return;
    try {
      const snap = await db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId)
        .collection('keywords').get();

      allKeywords = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          keyword: data.keyword || d.id,
          position: Number(data.position) || 0,
          volume: Number(data.volume) || 0
        };
      }).sort((a, b) => {
        if (a.position > 0 && b.position > 0) return a.position - b.position;
        if (a.position > 0) return -1;
        if (b.position > 0) return 1;
        return 0;
      });

      const countEl = document.getElementById('kw-count');
      if (countEl) countEl.textContent = allKeywords.length + ' keywords';
      renderKeywordList(allKeywords);
      if (allKeywords.length > 0) selectKeyword(allKeywords[0]);
    } catch (e) { console.error(e); }
  }

  function renderKeywordList(list) {
    const el = document.getElementById('local-kw-list');
    if (!el) return;
    if (list.length === 0) {
      el.innerHTML = '<div style="padding:20px;text-align:center;color:#888;font-size:13px;">No keywords</div>';
      return;
    }
    el.innerHTML = list.map(k => {
      const pos = k.position || 0;
      const pillClass = pos === 0 ? 'pill-none' : pos <= 3 ? 'pill-top3' : pos <= 10 ? 'pill-top10' : pos <= 20 ? 'pill-top20' : 'pill-low';
      const pillText = pos === 0 ? '--' : '#' + pos;
      const isActive = selectedKeyword?.id === k.id;
      return `
        <div class="kw-item ${isActive ? 'active' : ''}" onclick="selectKeywordById('${k.id}')" id="kwitem-${k.id}">
          <div class="kw-item-left">
            <div class="kw-item-text">${k.keyword}</div>
            <div class="kw-item-vol">${k.volume ? k.volume.toLocaleString() + ' /mo' : 'No volume'}</div>
          </div>
          <div class="kw-item-pos"><span class="pos-pill ${pillClass}">${pillText}</span></div>
        </div>`;
    }).join('');
  }

  window.filterLocalKeywords = function () {
    const q = (document.getElementById('local-kw-search')?.value || '').toLowerCase();
    renderKeywordList(allKeywords.filter(k => k.keyword.toLowerCase().includes(q)));
  };

  window.selectKeywordById = function (id) {
    const kw = allKeywords.find(k => k.id === id);
    if (kw) selectKeyword(kw);
  };

  function selectKeyword(kw) {
    selectedKeyword = kw;
    document.querySelectorAll('.kw-item').forEach(el => el.classList.remove('active'));
    const item = document.getElementById('kwitem-' + kw.id);
    if (item) item.classList.add('active');
    const label = document.getElementById('selected-kw-label');
    if (label) label.textContent = kw.keyword;
    const title = document.getElementById('grid-title');
    if (title) title.textContent = '"' + kw.keyword + '" — Geo-Grid';
    const sub = document.getElementById('grid-sub');
    if (sub) sub.textContent = 'Click "Run Geo-Grid" to scan';
    loadHistory(kw.id);
  }

  // ── Init Leaflet Map ─────────────────────────────────────
  function initLeafletMap() {
    const mapEl = document.getElementById('geo-map');
    if (!mapEl || !window.L) return;
    if (map) return; // already init

    try {
      map = L.map('geo-map', {
        center: [centerLat, centerLng],
        zoom: 12,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 18
      }).addTo(map);

      // Business location marker
      const html = `<div style="
        width:20px;height:20px;
        background:#0a5c36;
        border:3px solid #fff;
        border-radius:50%;
        box-shadow:0 0 0 3px #0a5c36,0 2px 8px rgba(0,0,0,0.4);
      "></div>`;

      const centerIcon = L.divIcon({
        className: '',
        html: html,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      L.marker([centerLat, centerLng], { icon: centerIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup('<strong>' + (compSettings?.name || 'Your Business') + '</strong><br>📍 Business Location');

      // Force re-render
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 500);
      setTimeout(() => map.invalidateSize(), 1000);

      console.log('Leaflet map initialized ✅');
    } catch (e) {
      console.error('Map init error:', e);
    }
  }

  // ── Run Geo Grid ─────────────────────────────────────────
  window.runGeoGrid = async function () {
    if (!selectedKeyword) { showToast('Select a keyword first', true); return; }
    if (!serperKey) { showToast('No Serper API key — add in Settings', true); return; }
    if (!map) { showToast('Map not loaded yet, please wait', true); return; }

    const gridSize = getGridSize();
    const radius = getRadius();
    const totalPoints = gridSize * gridSize;

    const btn = document.getElementById('run-grid-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Running...'; }

    const overlay = document.getElementById('running-overlay');
    const runText = document.getElementById('running-text');
    const runSub = document.getElementById('running-sub');
    if (overlay) overlay.style.display = 'flex';
    if (runSub) runSub.textContent = 'Checking ' + totalPoints + ' locations...';

    // Clear old markers
    mapMarkers.forEach(m => map.removeLayer(m));
    mapMarkers = [];

    const points = generateGridPoints(centerLat, centerLng, gridSize, radius);
    const results = [];

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (runText) runText.textContent = `Checking point ${i + 1} of ${totalPoints}...`;
      const position = await fetchLocalRank(selectedKeyword.keyword, pt.lat, pt.lng, website, serperKey);
      results.push({ ...pt, position });
      addResultMarker(pt, position);
      await sleep(800);
    }

    if (overlay) overlay.style.display = 'none';
    showGridStats(results);
    await saveHistory(selectedKeyword.id, selectedKeyword.keyword, results);
    await loadHistory(selectedKeyword.id);

    if (btn) { btn.disabled = false; btn.textContent = '🗺️ Run Geo-Grid'; }
    showToast('Geo-grid scan complete! ✅');
  };

  // ── Add Result Marker ────────────────────────────────────
  function addResultMarker(pt, position) {
    if (!map) return;

    const color = position === 0 ? '#757575'
      : position <= 3  ? '#1b5e20'
      : position <= 10 ? '#1565c0'
      : position <= 20 ? '#e65100'
      : '#b71c1c';

    const label = position === 0 ? '✕' : String(position);
    const size = pt.isCenter ? 44 : 36;
    const extraStyle = pt.isCenter
      ? 'border:3px solid #fff;box-shadow:0 0 0 3px #0a5c36,0 3px 10px rgba(0,0,0,0.4);'
      : 'border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 6px rgba(0,0,0,0.25);';

    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:${color};color:#fff;
        display:flex;align-items:center;justify-content:center;
        font-weight:800;font-size:${pt.isCenter ? 15 : 13}px;
        ${extraStyle}
      ">${label}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });

    const marker = L.marker([pt.lat, pt.lng], {
      icon,
      zIndexOffset: pt.isCenter ? 500 : 0
    }).addTo(map).bindPopup(`
      <div style="font-family:-apple-system,sans-serif;min-width:160px;">
        <div style="font-weight:800;font-size:13px;margin-bottom:4px;">${selectedKeyword?.keyword || ''}</div>
        <div style="font-size:13px;color:${color};font-weight:800;">
          ${position === 0 ? 'Not in top 100' : 'Position #' + position}
        </div>
        <div style="font-size:11px;color:#888;margin-top:4px;">
          ${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)}
        </div>
      </div>
    `);

    mapMarkers.push(marker);
  }

  // ── Generate Grid Points ─────────────────────────────────
  function generateGridPoints(cLat, cLng, gridSize, radiusKm) {
    const points = [];
    const half = Math.floor(gridSize / 2);
    const stepLat = (radiusKm / 111) / half;
    const stepLng = (radiusKm / (111 * Math.cos(cLat * Math.PI / 180))) / half;
    for (let row = -half; row <= half; row++) {
      for (let col = -half; col <= half; col++) {
        points.push({
          lat: cLat + (row * stepLat),
          lng: cLng + (col * stepLng),
          row: row + half,
          col: col + half,
          isCenter: row === 0 && col === 0
        });
      }
    }
    return points;
  }

  // ── Show Stats ───────────────────────────────────────────
  function showGridStats(results) {
    const ranked = results.filter(r => r.position > 0);
    const avg = ranked.length
      ? (ranked.reduce((a, b) => a + b.position, 0) / ranked.length).toFixed(1)
      : '--';
    const s = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    s('gs-avg', avg !== '--' ? '#' + avg : '--');
    s('gs-top3', results.filter(r => r.position > 0 && r.position <= 3).length);
    s('gs-top10', results.filter(r => r.position > 0 && r.position <= 10).length);
    s('gs-top20', results.filter(r => r.position > 10 && r.position <= 20).length);
    s('gs-none', results.filter(r => r.position === 0).length);
    const statsEl = document.getElementById('grid-stats');
    if (statsEl) statsEl.style.display = 'grid';
    const timeEl = document.getElementById('grid-time');
    if (timeEl) timeEl.textContent = 'Last scan: ' + new Date().toLocaleString();
  }

  // ── Fetch Local Rank ─────────────────────────────────────
  async function fetchLocalRank(keyword, lat, lng, siteUrl, apiKey) {
    if (!apiKey) return 0;
    try {
      const domain = siteUrl.replace(/https?:\/\//, '').replace(/\/.*/, '');
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: keyword, gl: 'in', hl: 'en', num: 20,
          location: lat.toFixed(4) + ',' + lng.toFixed(4)
        })
      });
      const data = await res.json();
      const results = data.organic || [];
      for (let i = 0; i < results.length; i++) {
        if (results[i].link?.includes(domain)) return i + 1;
      }
      return 0;
    } catch (e) { console.error('fetchLocalRank:', e); return 0; }
  }

  // ── Save History ─────────────────────────────────────────
  async function saveHistory(kwId, keyword, results) {
    if (!currentCompanyId) return;
    const ranked = results.filter(r => r.position > 0);
    const avg = ranked.length
      ? parseFloat((ranked.reduce((a, b) => a + b.position, 0) / ranked.length).toFixed(1))
      : 0;
    try {
      await db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId)
        .collection('localScans').add({
          keywordId: kwId, keyword,
          results: results.map(r => ({ lat: r.lat, lng: r.lng, position: r.position, isCenter: r.isCenter || false })),
          avgPosition: avg, gridSize: getGridSize(), radius: getRadius(),
          scannedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) { console.error('saveHistory:', e); }
  }

  // ── Load History ─────────────────────────────────────────
  async function loadHistory(kwId) {
    const el = document.getElementById('history-list');
    if (!el || !currentCompanyId) return;
    try {
      let snap;
      try {
        snap = await db.collection('users').doc(currentUser.uid)
          .collection('companies').doc(currentCompanyId)
          .collection('localScans')
          .where('keywordId', '==', kwId)
          .orderBy('scannedAt', 'desc')
          .limit(10).get();
      } catch (e) {
        snap = await db.collection('users').doc(currentUser.uid)
          .collection('companies').doc(currentCompanyId)
          .collection('localScans')
          .where('keywordId', '==', kwId)
          .limit(10).get();
      }

      if (snap.empty) {
        el.innerHTML = '<div class="history-empty">No scans yet for this keyword</div>';
        return;
      }

      el.innerHTML = snap.docs.map(doc => {
        const d = doc.data();
        const date = d.scannedAt?.toDate ? d.scannedAt.toDate().toLocaleDateString() : 'Unknown';
        const avg = d.avgPosition ? '#' + d.avgPosition : '--';
        const color = !d.avgPosition ? '#999'
          : d.avgPosition <= 3 ? '#1b5e20'
          : d.avgPosition <= 10 ? '#1565c0'
          : d.avgPosition <= 20 ? '#e65100'
          : '#b71c1c';
        return `
          <div class="history-item" onclick="replayHistoryScan('${doc.id}')">
            <div class="history-date">📅 ${date}</div>
            <div class="history-kw">${d.keyword} · ${d.gridSize}×${d.gridSize} · ${d.radius}km</div>
            <div class="history-avg" style="color:${color};">${avg}</div>
          </div>`;
      }).join('');
    } catch (e) {
      el.innerHTML = '<div class="history-empty">No scan history</div>';
    }
  }

  window.replayHistoryScan = async function (scanId) {
    try {
      const doc = await db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId)
        .collection('localScans').doc(scanId).get();
      if (!doc.exists) return;
      const d = doc.data();
      mapMarkers.forEach(m => map.removeLayer(m));
      mapMarkers = [];
      d.results.forEach(r => addResultMarker(r, r.position));
      showGridStats(d.results);
      showToast('Showing scan from ' + (d.scannedAt?.toDate()?.toLocaleDateString() || 'unknown'));
    } catch (e) { showToast('Error loading scan', true); }
  };

  // ── Add Keyword ──────────────────────────────────────────
  window.showAddKeywordModal = function () {
    const m = document.getElementById('local-add-modal');
    if (m) { m.style.display = 'flex'; setTimeout(() => document.getElementById('local-kw-input')?.focus(), 100); }
  };
  window.closeLocalModal = function () {
    const m = document.getElementById('local-add-modal');
    if (m) m.style.display = 'none';
  };
  window.addLocalKeyword = async function () {
    const kw = document.getElementById('local-kw-input')?.value?.trim();
    if (!kw) { showToast('Enter a keyword', true); return; }
    const vol = parseInt(document.getElementById('local-vol-input')?.value) || 0;
    const btn = document.getElementById('save-local-kw-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
    try {
      const docRef = await db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId)
        .collection('keywords').add({
          keyword: kw, volume: vol, position: 0, prevPosition: 0,
          url: website, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      allKeywords.unshift({ id: docRef.id, keyword: kw, volume: vol, position: 0 });
      renderKeywordList(allKeywords);
      closeLocalModal();
      showToast('Keyword added!');
      selectKeyword(allKeywords[0]);
    } catch (e) { showToast('Error: ' + e.message, true); }
    if (btn) { btn.disabled = false; btn.textContent = 'Add Keyword'; }
  };

  // ── Helpers ──────────────────────────────────────────────
  function getGridSize() { return parseInt(document.getElementById('grid-size')?.value) || 5; }
  function getRadius() { return parseInt(document.getElementById('grid-radius')?.value) || 5; }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

})();
