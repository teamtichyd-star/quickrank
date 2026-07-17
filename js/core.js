// ============================================================
// QuickRank — core.js
// Shared: Firebase, Auth, Company Switcher, Location Switcher
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCzA50bHzBaIuI2OJINFHMQyFG62wiSp48",
  authDomain: "quickrank-10647.firebaseapp.com",
  projectId: "quickrank-10647",
  storageBucket: "quickrank-10647.firebasestorage.app",
  messagingSenderId: "391145481120",
  appId: "1:391145481120:web:92615a12d1371cb47d3ac5"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// ── State ──────────────────────────────────────────────────
let currentUser = null;
let currentCompanyId = null;
let currentCompanyName = null;
let currentLocationId = null;
let currentLocationName = null;
let allCompanies = [];
let allLocations = [];

// ── Auth ───────────────────────────────────────────────────
function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(e => showToast(e.message, true));
}

function signOut() {
  auth.signOut().then(() => {
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
  });
}

auth.onAuthStateChanged(async user => {
  if (user) {
    currentUser = user;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    initSidebar();
    document.getElementById('user-avatar').textContent = user.displayName ? user.displayName[0].toUpperCase() : 'U';
    await loadCompanies();
    navigateTo('home');
  } else {
    currentUser = null;
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }
});

// ── Companies ──────────────────────────────────────────────
async function loadCompanies() {
  try {
    const snap = await db.collection('users').doc(currentUser.uid)
      .collection('companies').get();
    allCompanies = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (allCompanies.length > 0) {
      await setActiveCompany(allCompanies[0].id, allCompanies[0].name);
    }
    renderCompanySwitcher();
  } catch (e) {
    console.error('loadCompanies error:', e);
  }
}

async function setActiveCompany(id, name) {
  currentCompanyId = id;
  currentCompanyName = name;
  document.getElementById('company-switcher-label').textContent = name || 'Select Company';
  await loadLocations(id);
}

function renderCompanySwitcher() {
  const list = document.getElementById('company-list');
  if (!list) return;
  list.innerHTML = allCompanies.map(c => `
    <div class="switcher-item ${c.id === currentCompanyId ? 'active' : ''}"
         onclick="setActiveCompany('${c.id}','${c.name}');toggleCompanyDropdown();reloadCurrentPage();">
      <span class="switcher-item-icon">🏢</span>
      <span>${c.name}</span>
    </div>
  `).join('') + `
    <div class="switcher-item add-new" onclick="showAddCompany()">
      <span class="switcher-item-icon">＋</span>
      <span>Add Company</span>
    </div>
  `;
}

function toggleCompanyDropdown() {
  const dd = document.getElementById('company-dropdown');
  const locDd = document.getElementById('location-dropdown');
  if (locDd) locDd.classList.remove('open');
  dd.classList.toggle('open');
}

// ── Locations ──────────────────────────────────────────────
async function loadLocations(companyId) {
  try {
    const snap = await db.collection('users').doc(currentUser.uid)
      .collection('companies').doc(companyId)
      .collection('locations').get();
    allLocations = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Fallback — use company itself as location if none exist
    if (allLocations.length === 0) {
      const compDoc = await db.collection('users').doc(currentUser.uid)
        .collection('companies').doc(companyId).get();
      const comp = compDoc.data();
      if (comp && comp.gmbPlaceId) {
        allLocations = [{ id: companyId, name: comp.name || 'Main Location', ...comp }];
      }
    }

    if (allLocations.length > 0) {
      setActiveLocation(allLocations[0].id, allLocations[0].name);
    }
    renderLocationSwitcher();
  } catch (e) {
    console.error('loadLocations error:', e);
  }
}

function setActiveLocation(id, name) {
  currentLocationId = id;
  currentLocationName = name;
  const label = document.getElementById('location-switcher-label');
  if (label) label.textContent = name || 'Select Location';
}

function renderLocationSwitcher() {
  const list = document.getElementById('location-list');
  if (!list) return;
  list.innerHTML = allLocations.map(l => `
    <div class="switcher-item ${l.id === currentLocationId ? 'active' : ''}"
         onclick="setActiveLocation('${l.id}','${l.name || l.gmbName || 'Location'}');toggleLocationDropdown();reloadCurrentPage();">
      <span class="switcher-item-icon">📍</span>
      <span>${l.name || l.gmbName || 'Location'}</span>
    </div>
  `).join('') + `
    <div class="switcher-item add-new" onclick="showAddLocation()">
      <span class="switcher-item-icon">＋</span>
      <span>Add Location</span>
    </div>
  `;
}

function toggleLocationDropdown() {
  const dd = document.getElementById('location-dropdown');
  const compDd = document.getElementById('company-dropdown');
  if (compDd) compDd.classList.remove('open');
  dd.classList.toggle('open');
}

// ── Navigation ─────────────────────────────────────────────
let currentPage = 'home';

function navigateTo(page) {
  currentPage = page;

  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Load page content
  const contentArea = document.getElementById('content-area');
  contentArea.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  fetch(page + '.html')
    .then(r => {
      if (!r.ok) throw new Error('Page not found');
      return r.text();
    })
    .then(html => {
      contentArea.innerHTML = html;
      // Load page script
      const existing = document.getElementById('page-script');
      if (existing) existing.remove();
      const script = document.createElement('script');
      script.id = 'page-script';
      script.src = 'js/' + page + '.js?v=' + Date.now();
      document.body.appendChild(script);
    })
    .catch(() => {
      contentArea.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🚧</div>
          <div class="empty-title">Coming Soon</div>
          <div class="empty-sub">This page is under construction</div>
        </div>`;
    });

  // Close sidebar on mobile
  if (window.innerWidth < 768) {
    document.getElementById('sidebar').classList.remove('expanded');
  }

  // Update URL hash
  window.location.hash = page;
}

function reloadCurrentPage() {
  navigateTo(currentPage);
}

// Handle back/forward browser buttons
window.addEventListener('hashchange', () => {
  const page = window.location.hash.replace('#', '') || 'home';
  navigateTo(page);
});

// ── Sidebar Toggle ─────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');
  localStorage.setItem('qr_sidebar_collapsed', sidebar.classList.contains('collapsed'));
}

function initSidebar() {
  const collapsed = localStorage.getItem('qr_sidebar_collapsed') === 'true';
  if (collapsed) {
    document.getElementById('sidebar').classList.add('collapsed');
  }
}

// ── Utilities ──────────────────────────────────────────────
function showToast(msg, isError = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (isError ? ' toast-error' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

async function getApiKey(keyName) {
  if (!currentUser) return null;
  try {
    const doc = await db.collection('users').doc(currentUser.uid)
      .collection('settings').doc('apis').get();
    return doc.exists ? (doc.data()[keyName] || null) : null;
  } catch (e) { return null; }
}

async function loadCompSettings() {
  if (!currentUser || !currentCompanyId) return null;
  try {
    const doc = await db.collection('users').doc(currentUser.uid)
      .collection('companies').doc(currentCompanyId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  } catch (e) { return null; }
}

function showAddCompany() {
  document.getElementById('company-dropdown').classList.remove('open');
  showToast('Add company — go to Settings');
}

function showAddLocation() {
  document.getElementById('location-dropdown').classList.remove('open');
  showToast('Add location — go to Settings');
}
