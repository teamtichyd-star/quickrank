# QuickRank — Phase 1 Handoff Note
# Paste this entire file at the start of any new chat

## Project
App: QuickRank (Free SEO + GMB + AI Rank Tracker)
Live URL: https://teamtichyd-star.github.io/quickrank/
Repo: https://github.com/teamtichyd-star/quickrank
Dev Path: /Users/haritalla/Desktop/quickrank
Backups: /Users/haritalla/Desktop/quickrank_backups/
Owner: Hari Talla — Turnkey Interior Contractors, Hyderabad
Stack: Multi-file Firebase app, GitHub Pages

## Firebase Config
Project: quickrank-10647
apiKey: AIzaSyCzA50bHzBaIuI2OJINFHMQyFG62wiSp48
authDomain: quickrank-10647.firebaseapp.com
projectId: quickrank-10647
storageBucket: quickrank-10647.firebasestorage.app
messagingSenderId: 391145481120
appId: 1:391145481120:web:92615a12d1371cb47d3ac5

## Active User Data
UID: aHpKtUM4ofRHQV0XXD04NeSKFyL2
Email: teamtic.hyd@gmail.com
Company ID: turnkey-interior-contractors
Website: https://turnkeyinteriorcontractors.com
GMB Place ID: ChIJxfKa-NuQyzsRZo3TiDBGjdw
17 reviews, 4.5 stars
Serper Key: b957e064c924f6d647ce53b2dd73f400cfa7d32e

## What Has Been Decided (DO NOT CHANGE)
1. Rebuilding QuickRank from scratch — Wincher-style layout
2. Option B — multi-file structure (not single index.html)
3. Dark sidebar (#0f1117) with green accent (#2ecc71)
4. 5 sidebar items: Home, Rankings, Local, AI Tools, Settings
5. Competitors page — added later
6. Multi-company + multi-location support
7. Top bar has company switcher + location switcher
8. Each page is separate html + js file
9. index-old.html = full backup of old app (keep working)

## Current Folder Structure
quickrank/
├── index.html          ← NEW shell (408 lines) — dark sidebar + topbar + auth
├── index-old.html      ← OLD full app backup (7900 lines) — keep working
├── js/
│   └── core.js         ← Shared Firebase, auth, switchers, navigation (271 lines)
├── HANDOFF_PHASE1.md   ← This file
└── [old backup files]

## What index.html Contains
- Login screen (Google auth)
- Dark sidebar (#0f1117) with 5 nav items
- Collapsible sidebar (toggle button, saves state to localStorage)
- Top bar with company switcher + location switcher dropdowns
- Bell icon (notifications — coming later)
- User avatar + sign out button
- Empty content area (#content-area) where pages load
- Mobile responsive (hamburger menu)

## What core.js Contains
- Firebase init (checks if already initialized)
- Auth: signInWithGoogle(), signOut(), onAuthStateChanged()
- Company: loadCompanies(), setActiveCompany(), renderCompanySwitcher()
- Location: loadLocations(), setActiveLocation(), renderLocationSwitcher()
- Navigation: navigateTo(page) — fetches page html, loads page js
- Sidebar: toggleSidebar(), initSidebar()
- Utilities: showToast(), getApiKey(), loadCompSettings()
- URL hash routing (back/forward buttons work)

## How Navigation Works
navigateTo('rankings') does this:
1. Fetches rankings.html
2. Injects into #content-area
3. Loads js/rankings.js as a script tag
4. Updates URL hash to #rankings
5. Updates sidebar active state

## Color Scheme (DO NOT CHANGE)
Sidebar bg:     #0f1117
Sidebar active: #0a5c3620 with #2ecc71 left border
Sidebar text:   #8892a4
Sidebar hover:  #1a1f2e
Content bg:     #f8fafb
Cards:          #ffffff
Primary green:  #0a5c36
Accent green:   #2ecc71
Border:         #e8f0e9
Top bar bg:     #ffffff

## WHERE WE STOPPED
Phase 1 complete in code — NOT yet pushed to GitHub.

## NEXT STEP — DO THIS FIRST
Push Phase 1 to GitHub:
cd /Users/haritalla/Desktop/quickrank && git add -A && git commit -m "Phase 1 - new shell with dark sidebar and multi-company topbar" && git push

Then test live URL: https://teamtichyd-star.github.io/quickrank/

Expected result after push:
- Login screen appears (dark gradient background, white card)
- After Google login — dark sidebar visible
- Company switcher shows TIC in topbar
- Location switcher shows main location
- Content area shows spinner (no pages built yet)
- Old app still works at /index-old.html

## Phase 2 — AFTER PUSH IS CONFIRMED WORKING
Build home.html + js/home.js
Priority Action List page
Auto-generates from existing Firebase data:
- Review count vs competitor
- GBP post recency alert
- Keywords with no dedicated page
- CTR gap alerts
- Rank drop alerts

## Phase 3 — Rankings page
rankings.html + js/rankings.js
Clean Wincher-style keyword table
Columns: Keyword | Position | Volume | Clicks | CTR | Top Page | Actions
GSC sync button
Live rank check per keyword

## Phase 4 — Local page (MOST IMPORTANT)
local.html + js/local.js
Left: keyword list with avg position + trend
Right: Geo-grid on Google Maps (5x5 grid)
Bottom: Historical timeline snapshots
Free version of Local Falcon ($24/month)

## Phase 5 — AI Tools page
ai-tools.html + js/ai-tools.js
AI Visibility checker (ChatGPT/Gemini/Perplexity)
On-page SEO checker
Keyword suggestions

## Phase 6 — Settings page
settings.html + js/settings.js
Company management (add/edit/delete)
Location management
API keys
Profile

## Phase 7 — Notifications
Bell icon in topbar
Smart alerts: rank changes, competitor movements
Stored in Firebase

## Phase 8 — Competitors page
competitors.html + js/competitors.js
Track competitor positions over time

## Critical Rules (NEVER BREAK)
- NEVER edit index-old.html — it is the safety backup
- ALWAYS backup before major changes
- Test on LIVE URL only — Firebase blocks file://
- Terminal-safe commands only
- One phase fully working before starting next
- No code written without Hari approval
- Green theme: #0a5c36, #2ecc71
- Dark sidebar: #0f1117
