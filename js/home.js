(function() {
    console.log("Home module loaded");
    
    const actionList = document.getElementById('action-list');
    const compName = document.getElementById('dash-company-name');

    function initHome() {
        const activeComp = localStorage.getItem('qr_active_company');
        if (!activeComp) return;
        
        compName.innerText = activeComp.replace(/-/g, ' ').toUpperCase();
        loadDashboardData(activeComp);
    }

    async function loadDashboardData(compId) {
        // In a real app, we fetch from Firebase. 
        // For Phase 2, we simulate the logic based on your existing profile.
        
        // Mocking the check (this will eventually use your actual Firestore queries)
        setTimeout(() => {
            renderActions([
                { 
                    type: 'warning', 
                    title: 'Google Business Profile', 
                    desc: 'No posts in the last 7 days. Recency affects local ranking.',
                    icon: '📍' 
                },
                { 
                    type: 'info', 
                    title: 'Review Management', 
                    desc: 'You have 17 reviews with 4.5 stars. 2 reviews haven\'t been replied to.',
                    icon: '⭐' 
                },
                { 
                    type: 'success', 
                    title: 'Ranking Update', 
                    desc: '"Interior Contractors Hyderabad" moved up 2 spots.',
                    icon: '📈' 
                }
            ]);
            
            // Fill stats
            document.getElementById('stat-avg-pos').innerText = '14.2';
            document.getElementById('stat-gmb-rating').innerText = '4.5';
            document.getElementById('stat-total-kw').innerText = '48';
            document.getElementById('stat-visibility').innerText = '62%';
        }, 800);
    }

    function renderActions(actions) {
        if (!actions.length) {
            actionList.innerHTML = '<div class="p-8 text-center text-gray-500">All clear! No urgent actions.</div>';
            return;
        }

        actionList.innerHTML = actions.map(act => `
            <div class="p-4 flex items-start space-x-4 hover:bg-gray-50 transition">
                <div class="text-2xl">${act.icon}</div>
                <div class="flex-1">
                    <h4 class="font-medium text-gray-900">${act.title}</h4>
                    <p class="text-sm text-gray-600">${act.desc}</p>
                </div>
                <button class="text-sm font-medium text-green-600 hover:text-green-700">Fix now →</button>
            </div>
        `).join('');
    }

    initHome();
})();
