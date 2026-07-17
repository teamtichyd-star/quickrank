// ── local.js — Leaflet version ───────────────────────────
(async function () {

  let allKeywords = [];
  let selectedKeyword = null;
  let map = null;
  let mapMarkers = [];
  let compSettings = null;
  let serperKey = null;

  const DEFAULT_CENTER = { lat: 17.4401, lng: 78.3489 }; // Gachibowli TIC office

  compSettings = await loadCompSettings();
  serperKey = await getApiKey('serperKey');

  const centerLat = compSettings?.lat || DEFAULT_CENTER.lat;
  const centerLng = compSettings?.lng || DEFAULT_CENTER.lng;
  const website = compSettings?.website || '';

  // Init map first, then load keywords
  initLeafletMap();
  await loadLocalKeywords();

  // ── Init Leaflet Map ─────────────────────────────────────
  function initLeafletMap() {
    const mapEl = document.getElementById('geo-map');
    if (!mapEl || !window.L || map) return;

    map = L.map('geo-map', {
      center: [centerLat, centerLng],
      zoom: 12,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 18
    }).addTo(map);

    // Business center marker
    const centerIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:16px;height:16px;
        background:#0a5c36;
        border:3px solid #fff;
        border-radius:50%;
        box-shadow:0 0 0 3px #0a5c36,0 2px 8px rgba(0,0,0,0.4);
      "></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    L.marker([centerLat, centerLng], { icon: centerIcon, zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup('<strong>' + (compSettings?.name || 'Your Business') + '</strong><br>📍 Business Location');

    setTimeout(() => { if(map) map.invalidateSize(); }, 300);
    console.log('✅ Map initialized');
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

      // Auto-select first keyword AND load its last scan
      if (allKeywords.length > 0) {
        await selectKeyword(allKeywords[0]);
      }
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

  window.selectKeywordById = async function (id) {
    const kw = allKeywords.find(k => k.id === id);
    if (kw) await selectKeyword(kw);
  };

  async function selectKeyword(kw) {
    selectedKeyword = kw;
    document.querySelectorAll('.kw-item').forEach(el => el.classList.remove('active'));
    const item = document.getElementById('kwitem-' + kw.id);
    if (item) item.classList.add('active');
    const label = document.getElementById('selected-kw-label');
    if (label) label.textContent = kw.keyword;
    const title = document.getElementById('grid-title');
    if (title) title.textContent = '"' + kw.keyword + '" — Geo-Grid';

    // Load history and auto-replay latest scan
    await loadHistory(kw.id, true);
  }

  // ── Load History + Auto Replay Latest ───────────────────
  async function loadHistory(kwId, autoReplay) {
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
        el.innerHTML = '<div class="history-empty">No scans yet — click "Run Geo-Grid"</div>';
        const sub = document.getElementById('grid-sub');
        if (sub) sub.textContent = 'No scans yet — click "Run Geo-Grid"';
        // Clear map markers
        mapMarkers.forEach(m => map && map.removeLayer(m));
        mapMarkers = [];
        return;
      }

      // Render history list
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

      // Auto replay latest scan on map
      if (autoReplay && snap.docs.length > 0) {
        const latest = snap.docs[0].data();
        clearMarkers();
        if (latest.results && latest.results.length > 0) {
          latest.results.forEach(r => addResultMarker(r, r.position));
          showGridStats(latest.results);
          const timeEl = document.getElementById('grid-time');
          if (timeEl && latest.scannedAt?.toDate) {
            timeEl.textContent = 'Last scan: ' + latest.scannedAt.toDate().toLocaleString();
          }
          const sub = document.getElementById('grid-sub');
          if (sub) sub.textContent = `Showing last scan — ${latest.gridSize}×${latest.gridSize} grid, ${latest.radius}km radius`;
        }
      }
    } catch (e) {
      console.error('loadHistory error:', e);
      el.innerHTML = '<div class="history-empty">No scan history</div>';
    }
  }

  // ── Replay Scan ──────────────────────────────────────────
  window.replayHistoryScan = async function (scanId) {
    try {
      const doc = await db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId)
        .collection('localScans').doc(scanId).get();
      if (!doc.exists) return;
      const d = doc.data();
      clearMarkers();
      d.results.forEach(r => addResultMarker(r, r.position));
      showGridStats(d.results);
      showToast('Showing scan from ' + (d.scannedAt?.toDate()?.toLocaleDateString() || 'unknown'));
    } catch (e) { showToast('Error loading scan', true); }
  };

  // ── Run Geo Grid ─────────────────────────────────────────
  window.runGeoGrid = async function () {
    if (!selectedKeyword) { showToast('Select a keyword first', true); return; }
    if (!serperKey) { showToast('No Serper API key — add in Settings', true); return; }
    if (!map) { showToast('Map not loaded yet', true); return; }

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

    clearMarkers();

    const points = generateGridPoints(centerLat, centerLng, gridSize, radius);
    const results = [];

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (runText) runText.textContent = `Checking point ${i + 1} of ${totalPoints}...`;
      const rankResult = await fetchLocalRank(selectedKeyword.keyword, pt.lat, pt.lng, website, serperKey);
      const position = typeof rankResult === "object" ? (rankResult.rank || 21) : (rankResult || 21);
      results.push({ ...pt, position, area: rankResult.area || "" });
      addResultMarker(pt, position);
      await sleep(800);
    }

    if (overlay) overlay.style.display = 'none';
    showGridStats(results);
    await saveHistory(selectedKeyword.id, selectedKeyword.keyword, results);
    await loadHistory(selectedKeyword.id, false);

    if (btn) { btn.disabled = false; btn.textContent = '🗺️ Run Geo-Grid'; }
    showToast('Geo-grid scan complete! ✅');
  };

  // ── Clear Markers ────────────────────────────────────────
  function clearMarkers() {
    mapMarkers.forEach(m => { if(map) map.removeLayer(m); });
    mapMarkers = [];
  }

  // ── Add Result Marker ────────────────────────────────────
  function addResultMarker(pt, position) {
    if (!map || !window.L) return;

    const color = position === 0 ? '#757575'
      : position <= 3  ? '#1b5e20'
      : position <= 10 ? '#1565c0'
      : position <= 20 ? '#e65100'
      : '#b71c1c';

    const label = position === 0 ? '✕' : String(position);
    const size = pt.isCenter ? 44 : 36;
    const border = pt.isCenter
      ? 'border:3px solid #fff;box-shadow:0 0 0 3px #0a5c36,0 3px 10px rgba(0,0,0,0.4);'
      : 'border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 6px rgba(0,0,0,0.25);';

    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:${color};color:#fff;
        display:flex;align-items:center;justify-content:center;
        font-weight:800;font-size:${pt.isCenter ? 15 : 13}px;
        ${border}
      ">${label}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });

    const marker = L.marker([pt.lat, pt.lng], {
      icon,
      zIndexOffset: pt.isCenter ? 500 : 0
    }).addTo(map).bindPopup(`
      <div style="font-family:-apple-system,sans-serif;min-width:160px;">
        <div style="font-weight:800;font-size:13px;margin-bottom:4px;">${selectedKeyword?.keyword || pt.keyword || ''}</div>
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
  }

  // ── Fetch Local Rank ─────────────────────────────────────
  async function fetchLocalRank(keyword, lat, lng, siteUrl, apiKey) {
  const areas = [
    { lat: 17.4401, lng: 78.3489, name: 'Gachibowli' },
    { lat: 17.4504, lng: 78.3812, name: 'HITEC City' },
    { lat: 17.4487, lng: 78.3694, name: 'Madhapur' },
    { lat: 17.4616, lng: 78.3674, name: 'Kondapur' },
    { lat: 17.4250, lng: 78.4096, name: 'Jubilee Hills' },
    { lat: 17.4156, lng: 78.4347, name: 'Banjara Hills' },
    { lat: 17.3850, lng: 78.4867, name: 'Hyderabad' },
    { lat: 17.4399, lng: 78.3520, name: 'Nanakramguda' },
    { lat: 17.4720, lng: 78.3800, name: 'Raidurgam' },
    { lat: 17.4350, lng: 78.3600, name: 'Puppalguda' },
    { lat: 17.4600, lng: 78.3500, name: 'Gopanpalle' },
    { lat: 17.4100, lng: 78.3700, name: 'Narsingi' },
    { lat: 17.4300, lng: 78.4200, name: 'Panjagutta' },
    { lat: 17.4650, lng: 78.4100, name: 'Ameerpet' },
    { lat: 17.4000, lng: 78.4600, name: 'Masab Tank' },
    { lat: 17.4900, lng: 78.3900, name: 'Kukatpally' },
    { lat: 17.4550, lng: 78.4300, name: 'SR Nagar' },
    { lat: 17.4200, lng: 78.3400, name: 'Financial District' },
    { lat: 17.4750, lng: 78.3600, name: 'Tellapur' },
    { lat: 17.4100, lng: 78.4000, name: 'Manikonda' },
    { lat: 17.4450, lng: 78.3350, name: 'Kokapet' },
    { lat: 17.4650, lng: 78.3300, name: 'Nallagandla' },
    { lat: 17.4300, lng: 78.3800, name: 'Serilingampally' },
    { lat: 17.4800, lng: 78.4000, name: 'JNTU' },
    { lat: 17.4050, lng: 78.3900, name: 'Attapur' }
  ];
  let closest = areas[0];
  let minDist = 999;
  areas.forEach(a => {
    const d = Math.sqrt(Math.pow(a.lat-lat,2)+Math.pow(a.lng-lng,2));
    if(d<minDist){minDist=d;closest=a;}
  });
  const areaName = closest.name;
  const query = keyword + ' in ' + areaName + ' Hyderabad';
  try {
    const resp = await fetch('https://google.serper.dev/maps', {
      method:'POST',
      headers:{'X-API-KEY':apiKey,'Content-Type':'application/json'},
      body:JSON.stringify({q:query,gl:'in',hl:'en'})
    });
    const data = await resp.json();
    const places = data.places || [];
    const domain = siteUrl.replace(/https?:\/\//, '').replace(/www\./, '').split('/')[0].toLowerCase();
    let rank = null;
    console.log('Searching for domain:', domain, 'in', places.length, 'places');
    places.forEach((p,i) => {
      const title = (p.title||'').toLowerCase();
      const website = (p.website||'').toLowerCase();
      const address = (p.address||'').toLowerCase();
      if(i<5) console.log('Place', i+1, ':', p.title, '|', p.website);
      const domainMatch = domain && website.includes(domain);
      const titleMatch = title.includes('turnkey interior') || title.includes('tic (turnkey') || title.includes('sb interior');
      const addressMatch = address.includes('jayabheri') || address.includes('gachibowli');
      if(!rank && (domainMatch || titleMatch || addressMatch)) {
        rank = i+1;
        console.log('FOUND at position', rank, ':', p.title);
      }
    });
    if(!rank) console.log('Not found in results for area:', areaName);
    return {rank:rank||21,total:places.length,area:areaName,places:places.slice(0,3)};
  } catch(e) {
    return {rank:21,total:0,area:areaName,places:[]};
  }
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
          results: results.map(r => ({
            lat: r.lat, lng: r.lng,
            position: r.position,
            isCenter: r.isCenter || false
          })),
          avgPosition: avg,
          gridSize: getGridSize(),
          radius: getRadius(),
          scannedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) { console.error('saveHistory:', e); }
  }

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
      await selectKeyword(allKeywords[0]);
    } catch (e) { showToast('Error: ' + e.message, true); }
    if (btn) { btn.disabled = false; btn.textContent = 'Add Keyword'; }
  };

  // ── Helpers ──────────────────────────────────────────────
  function getGridSize() { return parseInt(document.getElementById('grid-size')?.value) || 5; }
  function getRadius() { return parseInt(document.getElementById('grid-radius')?.value) || 5; }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

})();
