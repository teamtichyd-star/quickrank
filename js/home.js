// ── home.js ──────────────────────────────────────────────
(async function() {

  // Greeting
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = currentUser?.displayName?.split(' ')[0] || '';
  document.getElementById('home-greeting').textContent = greet + (name ? ', ' + name : '') + ' ⚡';

  if (!currentCompanyId) {
    document.getElementById('home-subtext').textContent = 'Add a company in Settings to get started';
    document.getElementById('action-list').innerHTML = noCompanyHTML();
    document.getElementById('review-body').innerHTML = '<p style="color:#888;font-size:13px;">No company selected</p>';
    document.getElementById('activity-body').innerHTML = '<p style="color:#888;font-size:13px;">No activity yet</p>';
    return;
  }

  // Load company data
  let comp = null;
  try {
    const doc = await db.collection('users').doc(currentUser.uid)
      .collection('companies').doc(currentCompanyId).get();
    comp = doc.exists ? { id: doc.id, ...doc.data() } : null;
  } catch(e) { console.error(e); }

  // Load keywords
  let keywords = [];
  try {
    const snap = await db.collection('users').doc(currentUser.uid)
      .collection('companies').doc(currentCompanyId)
      .collection('keywords').get();
    keywords = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {}

  // ── Stats ──────────────────────────────────────────────
  // Reviews
  const reviewCount = comp?.reviewCount || comp?.reviews || 0;
  const rating = comp?.rating || comp?.avgRating || 0;
  document.getElementById('stat-reviews').textContent = reviewCount || '--';
  document.getElementById('stat-reviews-sub').textContent = reviewCount ? '✅ Synced from GMB' : 'Not synced yet';
  document.getElementById('stat-reviews-sub').className = 'stat-sub ' + (reviewCount ? '' : 'gray');

  document.getElementById('stat-rating').textContent = rating ? rating.toFixed(1) + ' ★' : '--';
  document.getElementById('stat-rating-sub').textContent = rating >= 4.5 ? '🟢 Excellent' : rating >= 4 ? '🟡 Good' : rating ? '🔴 Needs work' : 'Not synced yet';

  // Keywords
  const kwCount = keywords.length;
  document.getElementById('stat-keywords').textContent = kwCount || '0';
  document.getElementById('stat-keywords-sub').textContent = kwCount ? kwCount + ' keywords tracked' : 'Add keywords in Rankings';
  document.getElementById('stat-keywords-sub').className = 'stat-sub ' + (kwCount ? '' : 'gray');

  // Avg position
  const positions = keywords.filter(k => k.position > 0).map(k => k.position);
  const avgPos = positions.length ? (positions.reduce((a,b) => a+b, 0) / positions.length).toFixed(1) : null;
  document.getElementById('stat-position').textContent = avgPos ? '#' + avgPos : '--';
  document.getElementById('stat-position-sub').textContent = avgPos
    ? (avgPos <= 10 ? '🟢 Top 10 avg' : avgPos <= 20 ? '🟡 Page 2 avg' : '🔴 Page 3+ avg')
    : 'No rank data yet';

  // ── Priority Actions ───────────────────────────────────
  const actions = [];

  if (!reviewCount || reviewCount < 10) {
    actions.push({
      priority: 'high',
      icon: '⭐',
      title: 'Get more Google reviews',
      desc: reviewCount ? `Only ${reviewCount} reviews — aim for 50+` : 'No review data found — sync your GMB',
      badge: 'High Priority'
    });
  }

  if (!kwCount) {
    actions.push({
      priority: 'high',
      icon: '🔑',
      title: 'Add keywords to track',
      desc: 'Go to Rankings → Add your target keywords',
      badge: 'High Priority'
    });
  }

  if (kwCount > 0 && !avgPos) {
    actions.push({
      priority: 'med',
      icon: '📊',
      title: 'Run your first rank check',
      desc: 'Go to Rankings → Check positions for all keywords',
      badge: 'Medium'
    });
  }

  if (avgPos && parseFloat(avgPos) > 20) {
    actions.push({
      priority: 'high',
      icon: '📉',
      title: 'Low average ranking detected',
      desc: `Average position #${avgPos} — check your content & backlinks`,
      badge: 'High Priority'
    });
  }

  if (!comp?.gmbPlaceId) {
    actions.push({
      priority: 'high',
      icon: '📍',
      title: 'Connect your Google Business Profile',
      desc: 'Add your GMB Place ID in Settings to unlock local tracking',
      badge: 'High Priority'
    });
  }

  if (!comp?.website) {
    actions.push({
      priority: 'med',
      icon: '🌐',
      title: 'Add your website URL',
      desc: 'Required for ranking checks — go to Settings',
      badge: 'Medium'
    });
  }

  // Check last GBP post (if tracked)
  if (comp?.lastGbpPost) {
    const days = Math.floor((Date.now() - comp.lastGbpPost.toMillis()) / 86400000);
    if (days > 7) {
      actions.push({
        priority: 'med',
        icon: '📝',
        title: 'Post on Google Business Profile',
        desc: `Last post was ${days} days ago — post weekly for best results`,
        badge: 'Medium'
      });
    }
  } else {
    actions.push({
      priority: 'low',
      icon: '📝',
      title: 'Post weekly on Google Business Profile',
      desc: 'Regular GBP posts help local rankings',
      badge: 'Tip'
    });
  }

  if (actions.length === 0) {
    actions.push({
      priority: 'low',
      icon: '🎉',
      title: 'All looking good!',
      desc: 'Keep tracking your keywords and posting on GBP',
      badge: 'Great'
    });
  }

  // Render actions
  document.getElementById('action-list').innerHTML = actions.map(a => `
    <div class="action-card">
      <div class="action-priority priority-${a.priority === 'high' ? 'high' : a.priority === 'med' ? 'med' : 'low'}">
        ${a.icon}
      </div>
      <div class="action-body">
        <div class="action-title">${a.title}</div>
        <div class="action-desc">${a.desc}</div>
      </div>
      <div class="action-badge badge-${a.priority === 'high' ? 'high' : a.priority === 'med' ? 'med' : 'low'}">
        ${a.badge}
      </div>
    </div>
  `).join('');

  // ── Reviews Panel ──────────────────────────────────────
  if (reviewCount && rating) {
    const stars = '⭐'.repeat(Math.round(rating));
    const bars = [5,4,3,2,1].map(n => {
      const pct = n === Math.round(rating) ? 70 : n === Math.round(rating)-1 ? 20 : 5;
      return `
        <div class="review-bar-row">
          <div class="review-bar-label">${n}★</div>
          <div class="review-bar-bg"><div class="review-bar-fill" style="width:${pct}%"></div></div>
        </div>`;
    }).join('');
    document.getElementById('review-body').innerHTML = `
      <div class="review-stars">${stars}</div>
      <div class="review-score">${rating.toFixed(1)}</div>
      <div class="review-count">${reviewCount} reviews on Google</div>
      ${bars}
    `;
  } else {
    document.getElementById('review-body').innerHTML = `
      <p style="color:#888;font-size:13px;margin-bottom:12px;">No review data yet</p>
      <div style="padding:12px;background:#f0fdf6;border-radius:8px;font-size:12px;color:#0a5c36;">
        💡 Add your GMB Place ID in Settings to sync reviews
      </div>
    `;
  }

  // ── Activity Feed ──────────────────────────────────────
  const activities = [];

  if (comp) activities.push({
    dot: 'green',
    text: `Company "${comp.name || currentCompanyId}" loaded`,
    time: 'Just now'
  });

  if (kwCount) activities.push({
    dot: 'green',
    text: `${kwCount} keywords tracked`,
    time: 'Active'
  });

  if (avgPos) activities.push({
    dot: avgPos <= 10 ? 'green' : 'orange',
    text: `Average rank position: #${avgPos}`,
    time: 'Latest data'
  });

  if (!comp?.gmbPlaceId) activities.push({
    dot: 'red',
    text: 'GMB not connected — add Place ID in Settings',
    time: 'Action needed'
  });

  activities.push({
    dot: 'green',
    text: 'QuickRank is active and monitoring',
    time: new Date().toLocaleDateString()
  });

  document.getElementById('activity-body').innerHTML = activities.map(a => `
    <div class="activity-item">
      <div class="activity-dot dot-${a.dot}"></div>
      <div>
        <div class="activity-text">${a.text}</div>
        <div class="activity-time">${a.time}</div>
      </div>
    </div>
  `).join('');

  function noCompanyHTML() {
    return `
      <div class="action-card">
        <div class="action-priority priority-high">🏢</div>
        <div class="action-body">
          <div class="action-title">Add your first company</div>
          <div class="action-desc">Go to Settings to add your business</div>
        </div>
        <div class="action-badge badge-high">Required</div>
      </div>`;
  }

})();
