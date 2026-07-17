// ── local.js ──────────────────────────────────────────────
(async function () {

  let allKeywords = [];
  let selectedKeyword = null;
  let map = null;
  let markers = [];
  let currentScanResults = [];
  let compSettings = null;
  let serperKey = null;

  // Center: Hyderabad
  const DEFAULT_CENTER = { lat: 17.3850, lng: 78.4867 };

  compSettings = await loadCompSettings();
  serperKey = await getApiKey('serperKey');

  const centerLat = compSettings?.lat || DEFAULT_CENTER.lat;
  const centerLng = compSettings?.lng || DEFAULT_CENTER.lng;
  const website = compSettings?.website || '';

  // Load keywords
  await loadLocalKeywords();

  // Init map
  if (window.mapReady) {
    initGeoMap();
  } else {
    window.mapReadyCb = initGeoMap;
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
          volume: Number(data.volume) || 0,
          lastScan: data.lastLocalScan || null
        };
      }).sort((a, b) => {
        if (a.position > 0 && b.position > 0) return a.position - b.position;
        if (a.position > 0) return -1;
        if (b.position > 0) return 1;
        return a.keyword.localeCompare(b.keyword);
      });

      document.getElementById('kw-count').textContent = allKeywords.length + ' keywords';
      renderKeywordList(allKeywords);

      // Auto-select first
      if (allKeywords.length > 0) selectKeyword(allKeywords[0]);
    } catch (e) {
      console.error(e);
    }
  }

  // ── Render Keyword List ──────────────────────────────────
  function renderKeywordList(list) {
    const el = document.getElementById('local-kw-list');
    if (!el) return;
    if (list.length === 0) {
      el.innerHTML = '<div style="padding:20px;text-align:center;color:#888;font-size:13px;">No keywords found</div>';
      return;
    }
    el.innerHTML = list.map(k => {
      const pos = k.position || 0;
      const pillClass = pos === 0 ? 'pill-none' : pos <= 3 ? 'pill-top3' : pos <= 10 ? 'pill-top10' : pos <= 20 ? 'pill-top20' : 'pill-low';
      const pillText = pos === 0 ? '--' : '#' + pos;
      const isActive = selectedKeyword?.id === k.id;
      return `
        <div class="kw-item ${isActive ? 'active' : ''}" onclick="selectKeyword(${JSON.stringify(k).replace(/"/g,'&quot;')}, this)" id="kwitem-${k.id}">
          <div class="kw-item-left">
            <div class="kw-item-text">${k.keyword}</div>
            <div class="kw-item-vol">${k.volume ? k.volume.toLocaleString() + ' searches/mo' : 'No volume data'}</div>
          </div>
          <div class="kw-item-pos">
            <span class="pos-pill ${pillClass}">${pillText}</span>
          </div>
        </div>`;
    }).join('');
  }

  // ── Filter Keywords ──────────────────────────────────────
  window.filterLocalKeywords = function () {
    const q = document.getElementById('local-kw-search')?.value?.toLowerCase() || '';
    const filtered = allKeywords.filter(k => k.keyword.toLowerCase().includes(q));
    renderKeywordList(filtered);
  };

  // ── Select Keyword ───────────────────────────────────────
  window.selectKeyword = function (kw) {
    selectedKeyword = typeof kw === 'string' ? JSON.parse(kw) : kw;

    // Update active state
    document.querySelectorAll('.kw-item').forEach(el => el.classList.remove('active'));
    const item = document.getElementById('kwitem-' + selectedKeyword.id);
    if (item) item.classList.add('active');

    // Update label
    const label = document.getElementById('selected-kw-label');
    if (label) label.textContent = selectedKeyword.keyword;

    // Update grid title
    const title = document.getElementById('grid-title');
    if (title) title.textContent = '"' + selectedKeyword.keyword + '" — Geo-Grid';

    const sub = document.getElementById('grid-sub');
    if (sub) sub.textContent = 'Click "Run Geo-Grid" to scan ' + getGridSize() + '×' + getGridSize() + ' locations';

    // Load history for this keyword
    loadHistory(selectedKeyword.id);
  };

  // ── Init Google Map ──────────────────────────────────────
  function initGeoMap() {
    const mapEl = document.getElementById('geo-map');
    if (!mapEl || !window.google) return;

    map = new google.maps.Map(mapEl, {
      center: { lat: centerLat, lng: centerLng },
      zoom: 12,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
      ],
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    });

    // Center marker
    new google.maps.Marker({
      position: { lat: centerLat, lng: centerLng },
      map: map,
      title: compSettings?.name || 'Your Business',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#0a5c36',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 3
      }
    });
  }

  // ── Run Geo Grid ─────────────────────────────────────────
  window.runGeoGrid = async function () {
    if (!selectedKeyword) { showToast('Select a keyword first', true); return; }
    if (!serperKey) { showToast('No Serper API key — add in Settings', true); return; }

    const gridSize = getGridSize();
    const radius = getRadius();
    const totalPoints = gridSize * gridSize;

    const btn = document.getElementById('run-grid-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Running...'; }

    // Show overlay
    const overlay = document.getElementById('running-overlay');
    const runText = document.getElementById('running-text');
    const runSub = document.getElementById('running-sub');
    if (overlay) overlay.style.display = 'flex';
    if (runSub) runSub.textContent = 'Checking ' + totalPoints + ' locations...';

    // Clear old markers from overlay
    document.getElementById('grid-overlay').innerHTML = '';
    currentScanResults = [];

    // Generate grid points
    const points = generateGridPoints(centerLat, centerLng, gridSize, radius);

    // Check each point
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (runText) runText.textContent = `Checking point ${i + 1} of ${totalPoints}...`;

      const position = await fetchLocalRank(selectedKeyword.keyword, pt.lat, pt.lng, website, serperKey);
      currentScanResults.push({ ...pt, position, keyword: selectedKeyword.keyword });

      // Draw marker immediately
      drawGridMarker(pt, position, gridSize, radius, i);

      await sleep(800);
    }

    if (overlay) overlay.style.display = 'none';

    // Show stats
    showGridStats(currentScanResults);

    // Save to history
    await saveHistory(selectedKeyword.id, selectedKeyword.keyword, currentScanResults);
    await loadHistory(selectedKeyword.id);

    if (btn) { btn.disabled = false; btn.textContent = '🗺️ Run Geo-Grid'; }
    showToast('Geo-grid scan complete! ✅');
  };

  // ── Generate Grid Points ─────────────────────────────────
  function generateGridPoints(centerLat, centerLng, gridSize, radiusKm) {
    const points = [];
    const half = Math.floor(gridSize / 2);
    const stepLat = (radiusKm / 111) / half;
    const stepLng = (radiusKm / (111 * Math.cos(centerLat * Math.PI / 180))) / half;

    for (let row = -half; row <= half; row++) {
      for (let col = -half; col <= half; col++) {
        points.push({
          lat: centerLat + (row * stepLat),
          lng: centerLng + (col * stepLng),
          row: row + half,
          col: col + half,
          isCenter: row === 0 && col === 0
        });
      }
    }
    return points;
  }

  // ── Draw Grid Marker on Map ──────────────────────────────
  function drawGridMarker(pt, position, gridSize, radius, index) {
    if (!map || !window.google) return;

    const color = position === 0 ? '#757575'
      : position <= 3  ? '#1b5e20'
      : position <= 10 ? '#1565c0'
      : position <= 20 ? '#e65100'
      : '#b71c1c';

    const label = position === 0 ? '✕' : String(position);

    const marker = new google.maps.Marker({
      position: { lat: pt.lat, lng: pt.lng },
      map: map,
      label: {
        text: label,
        color: '#fff',
        fontWeight: 'bold',
        fontSize: pt.isCenter ? '14px' : '12px'
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: pt.isCenter ? 22 : 18,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: pt.isCenter ? '#0a5c36' : 'rgba(255,255,255,0.8)',
        strokeWeight: pt.isCenter ? 4 : 2
      },
      title: `Position: ${position === 0 ? 'Not ranked' : '#' + position}\nLat: ${pt.lat.toFixed(4)}, Lng: ${pt.lng.toFixed(4)}`,
      zIndex: pt.isCenter ? 100 : index
    });

    // Info window on click
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="font-family:-apple-system,sans-serif;padding:4px;">
          <div style="font-weight:800;font-size:13px;margin-bottom:4px;">${selectedKeyword?.keyword || ''}</div>
          <div style="font-size:12px;color:#555;">Position: <strong style="color:${color}">${position === 0 ? 'Not in top 100' : '#' + position}</strong></div>
          <div style="font-size:11px;color:#888;margin-top:4px;">${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)}</div>
        </div>`
    });

    marker.addListener('click', () => {
      infoWindow.open(map, marker);
    });

    markers.push(marker);
  }

  // ── Show Grid Stats ──────────────────────────────────────
  function showGridStats(results) {
    const ranked = results.filter(r => r.position > 0);
    const avg = ranked.length
      ? (ranked.reduce((a, b) => a + b.position, 0) / ranked.length).toFixed(1)
      : '--';

    const s = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
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
          q: keyword,
          gl: 'in',
          hl: 'en',
          num: 100,
          location: `${lat},${lng}`
        })
      });
      const data = await res.json();
      const results = data.organic || [];
      for (let i = 0; i < results.length; i++) {
        if (results[i].link?.includes(domain)) return i + 1;
      }
      return 0;
    } catch (e) {
      console.error('fetchLocalRank error:', e);
      return 0;
    }
  }

  // ── Save History ─────────────────────────────────────────
  async function saveHistory(kwId, keyword, results) {
    if (!currentCompanyId) return;
    const ranked = results.filter(r => r.position > 0);
    const avg = ranked.length
      ? (ranked.reduce((a, b) => a + b.position, 0) / ranked.length).toFixed(1)
      : 0;

    try {
      await db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId)
        .collection('localScans').add({
          keywordId: kwId,
          keyword: keyword,
          results: results.map(r => ({ lat: r.lat, lng: r.lng, position: r.position, isCenter: r.isCenter || false })),
          avgPosition: parseFloat(avg),
          gridSize: getGridSize(),
          radius: getRadius(),
          scannedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      // Update keyword's last scan
      await db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId)
        .collection('keywords').doc(kwId).update({
          lastLocalScan: firebase.firestore.FieldValue.serverTimestamp(),
          localAvgPosition: parseFloat(avg)
        });
    } catch (e) { console.error('saveHistory error:', e); }
  }

  // ── Load History ─────────────────────────────────────────
  async function loadHistory(kwId) {
    const el = document.getElementById('history-list');
    if (!el || !currentCompanyId) return;

    try {
      const snap = await db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId)
        .collection('localScans')
        .where('keywordId', '==', kwId)
        .orderBy('scannedAt', 'desc')
        .limit(10)
        .get();

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
          <div class="history-item" onclick="replayHistory('${doc.id}')">
            <div class="history-date">📅 ${date}</div>
            <div class="history-kw">${d.keyword} · ${d.gridSize}×${d.gridSize} · ${d.radius}km</div>
            <div class="history-avg" style="color:${color};">${avg}</div>
          </div>`;
      }).join('');
    } catch (e) {
      // Index might not exist yet — show empty
      el.innerHTML = '<div class="history-empty">No scan history yet</div>';
    }
  }

  // ── Replay History ───────────────────────────────────────
  window.replayHistory = async function (scanId) {
    try {
      const doc = await db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId)
        .collection('localScans').doc(scanId).get();

      if (!doc.exists) return;
      const d = doc.data();

      // Clear old markers
      markers.forEach(m => m.setMap(null));
      markers = [];

      // Replay markers
      d.results.forEach((r, i) => {
        drawGridMarker(r, r.position, d.gridSize, d.radius, i);
      });

      showGridStats(d.results);
      showToast('Showing scan from ' + d.scannedAt?.toDate()?.toLocaleDateString());
    } catch (e) { showToast('Error loading scan', true); }
  };

  // ── Add Keyword Modal ────────────────────────────────────
  window.showAddKeywordModal = function () {
    const m = document.getElementById('local-add-modal');
    if (m) { m.style.display = 'flex'; setTimeout(() => document.getElementById('local-kw-input')?.focus(), 100); }
  };

  window.closeLocalModal = function () {
    const m = document.getElementById('local-add-modal');
    if (m) m.style.display = 'none';
    ['local-kw-input','local-vol-input'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
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
          url: website,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
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
