(async function () {

  // ── Tab Switching ─────────────────────────────────────
  window.switchSettingsTab = function (tab, el) {
    document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.stab-content').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('stab-' + tab).classList.add('active');
    if (tab === 'locations') loadLocationsList();
    if (tab === 'apikeys') loadApiKeys();
    if (tab === 'profile') loadProfile();
  };

  // ── Company Tab ───────────────────────────────────────
  async function loadCompanyForm() {
    if (!currentCompanyId) return;
    try {
      const doc = await db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId).get();
      if (!doc.exists) return;
      const d = doc.data();
      document.getElementById('s-name').value = d.name || '';
      document.getElementById('s-website').value = d.website || '';
      document.getElementById('s-industry').value = d.industry || '';
      document.getElementById('s-city').value = d.city || '';
      document.getElementById('s-gmbname').value = d.gmbName || '';
      document.getElementById('s-placeid').value = d.gmbPlaceId || '';
      document.getElementById('s-lat').value = d.lat || '';
      document.getElementById('s-lng').value = d.lng || '';
    } catch (e) { showToast('Error loading company', true); }
  }

  window.saveCompanySettings = async function () {
    if (!currentCompanyId) return showToast('No company selected', true);
    const data = {
      name: document.getElementById('s-name').value.trim(),
      website: document.getElementById('s-website').value.trim(),
      industry: document.getElementById('s-industry').value.trim(),
      city: document.getElementById('s-city').value.trim(),
      gmbName: document.getElementById('s-gmbname').value.trim(),
      gmbPlaceId: document.getElementById('s-placeid').value.trim(),
      lat: parseFloat(document.getElementById('s-lat').value) || null,
      lng: parseFloat(document.getElementById('s-lng').value) || null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      await db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId).update(data);
      showToast('Company saved ✅');
      // Update topbar label
      if (data.name) document.getElementById('company-switcher-label').textContent = data.name;
    } catch (e) { showToast('Save failed: ' + e.message, true); }
  };

  window.addNewCompany = async function () {
    const name = prompt('New company name:');
    if (!name || !name.trim()) return;
    try {
      const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(id).set({
          name: name.trim(),
          website: '', industry: '', city: '',
          gmbName: '', gmbPlaceId: '', lat: null, lng: null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      await setActiveCompany(id, name.trim());
      await loadCompanyForm();
      showToast('Company added ✅');
    } catch (e) { showToast('Error: ' + e.message, true); }
  };

  window.confirmDeleteCompany = function () {
    if (!confirm('Delete this company and ALL its data? This cannot be undone.')) return;
    deleteCompany();
  };

  async function deleteCompany() {
    try {
      await db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId).delete();
      showToast('Company deleted');
      await loadCompanies();
      navigateTo('home');
    } catch (e) { showToast('Delete failed', true); }
  }

  // ── Locations Tab ─────────────────────────────────────
  async function loadLocationsList() {
    document.getElementById('loc-company-name').textContent = currentCompanyName || 'this company';
    const list = document.getElementById('locations-list');
    list.innerHTML = '<div style="color:#888;font-size:13px;">Loading...</div>';
    try {
      const snap = await db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId)
        .collection('locations').get();

      if (snap.empty) {
        list.innerHTML = '<div style="color:#888;font-size:13px;padding:12px 0;">No locations yet — add one below</div>';
        return;
      }

      list.innerHTML = snap.docs.map(d => {
        const loc = d.data();
        return `<div class="loc-item">
          <div>
            <div class="loc-item-name">📍 ${loc.name || 'Unnamed'}</div>
            <div class="loc-item-coords">${loc.lat ? loc.lat + ', ' + loc.lng : 'No coordinates'} ${loc.gmbPlaceId ? '· GMB linked' : ''}</div>
          </div>
          <div class="loc-item-actions">
            <button class="loc-btn" onclick="editLocation('${d.id}','${(loc.name||'').replace(/'/g,'')  }','${loc.gmbPlaceId||''}',${loc.lat||''},${loc.lng||''})">Edit</button>
            <button class="loc-btn" style="color:#e74c3c;" onclick="deleteLocation('${d.id}')">Delete</button>
          </div>
        </div>`;
      }).join('');
    } catch (e) { list.innerHTML = '<div style="color:#e74c3c;">Error loading locations</div>'; }
  }

  window.showAddLocationForm = function () {
    document.getElementById('loc-form-title').textContent = 'Add Location';
    document.getElementById('loc-edit-id').value = '';
    document.getElementById('loc-name').value = '';
    document.getElementById('loc-placeid').value = '';
    document.getElementById('loc-lat').value = '';
    document.getElementById('loc-lng').value = '';
    document.getElementById('location-form').style.display = 'block';
  };

  window.editLocation = function (id, name, placeId, lat, lng) {
    document.getElementById('loc-form-title').textContent = 'Edit Location';
    document.getElementById('loc-edit-id').value = id;
    document.getElementById('loc-name').value = name;
    document.getElementById('loc-placeid').value = placeId;
    document.getElementById('loc-lat').value = lat || '';
    document.getElementById('loc-lng').value = lng || '';
    document.getElementById('location-form').style.display = 'block';
    document.getElementById('location-form').scrollIntoView({ behavior: 'smooth' });
  };

  window.saveLocation = async function () {
    const id = document.getElementById('loc-edit-id').value;
    const data = {
      name: document.getElementById('loc-name').value.trim(),
      gmbPlaceId: document.getElementById('loc-placeid').value.trim(),
      lat: parseFloat(document.getElementById('loc-lat').value) || null,
      lng: parseFloat(document.getElementById('loc-lng').value) || null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (!data.name) return showToast('Location name required', true);
    try {
      const ref = db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId)
        .collection('locations');
      if (id) {
        await ref.doc(id).update(data);
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await ref.add(data);
      }
      document.getElementById('location-form').style.display = 'none';
      await loadLocationsList();
      await loadLocations(currentCompanyId);
      showToast('Location saved ✅');
    } catch (e) { showToast('Error: ' + e.message, true); }
  };

  window.deleteLocation = async function (id) {
    if (!confirm('Delete this location?')) return;
    try {
      await db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(currentCompanyId)
        .collection('locations').doc(id).delete();
      await loadLocationsList();
      await loadLocations(currentCompanyId);
      showToast('Location deleted');
    } catch (e) { showToast('Error', true); }
  };

  // ── API Keys Tab ──────────────────────────────────────
  async function loadApiKeys() {
    try {
      const doc = await db.collection('users').doc(currentUser.uid)
        .collection('settings').doc('apis').get();
      if (!doc.exists) return;
      const d = doc.data();
      if (d.serperKey) document.getElementById('key-serper').value = d.serperKey;
      if (d.googlePlacesKey) document.getElementById('key-places').value = d.googlePlacesKey;
      if (d.groqKey) document.getElementById('key-groq').value = d.groqKey;
    } catch (e) { }
  }

  window.saveApiKeys = async function () {
    const data = {};
    const s = document.getElementById('key-serper').value.trim();
    const p = document.getElementById('key-places').value.trim();
    const g = document.getElementById('key-groq').value.trim();
    if (s) data.serperKey = s;
    if (p) data.googlePlacesKey = p;
    if (g) data.groqKey = g;
    try {
      await db.collection('users').doc(currentUser.uid)
        .collection('settings').doc('apis').set(data, { merge: true });
      showToast('API Keys saved ✅');
    } catch (e) { showToast('Save failed', true); }
  };

  window.testApiKey = async function (type) {
    const resultEl = document.getElementById('test-' + type);
    resultEl.textContent = 'Testing...';
    resultEl.style.color = '#888';
    try {
      if (type === 'serper') {
        const key = document.getElementById('key-serper').value.trim();
        if (!key) return resultEl.textContent = '⚠️ Enter key first';
        const r = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: 'test', gl: 'in', num: 1 })
        });
        const d = await r.json();
        if (d.organic) { resultEl.textContent = '✅ Serper working'; resultEl.style.color = '#2ecc71'; }
        else { resultEl.textContent = '❌ Invalid key'; resultEl.style.color = '#e74c3c'; }
      } else if (type === 'groq') {
        const key = document.getElementById('key-groq').value.trim();
        if (!key) return resultEl.textContent = '⚠️ Enter key first';
        const r = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': 'Bearer ' + key }
        });
        if (r.ok) { resultEl.textContent = '✅ Groq working'; resultEl.style.color = '#2ecc71'; }
        else { resultEl.textContent = '❌ Invalid key'; resultEl.style.color = '#e74c3c'; }
      } else {
        resultEl.textContent = '— Test not available';
        resultEl.style.color = '#888';
      }
    } catch (e) { resultEl.textContent = '❌ Error: ' + e.message; resultEl.style.color = '#e74c3c'; }
  };

  // ── Profile Tab ───────────────────────────────────────
  function loadProfile() {
    if (!currentUser) return;
    document.getElementById('p-name').value = currentUser.displayName || '';
    document.getElementById('p-email').value = currentUser.email || '';
    document.getElementById('p-uid').value = currentUser.uid || '';
  }

  // ── Init ──────────────────────────────────────────────
  await loadCompanyForm();

})();
