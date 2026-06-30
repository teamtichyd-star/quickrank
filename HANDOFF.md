# QuickRank — Complete Handoff Document
Last Updated: 29 June 2026

## Project Overview
App Name: QuickRank (Free SEO + GMB + AI Visibility Tracker)
Live URL: https://teamtichyd-star.github.io/quickrank/
Repo: https://github.com/teamtichyd-star/quickrank
Dev Path: /Users/haritalla/Desktop/quickrank
Owner: Hari Talla — Turnkey Interior Contractors, Hyderabad
Stack: Single index.html, Firebase Firestore, GitHub Pages, Google Places API, GSC OAuth, AI APIs

---

## Core Rules (NEVER break these)
1. Single index.html file ONLY — no separate JS/CSS files
2. Green theme: #0a5c36, #2ecc71, #d4f5e2
3. Always test on LIVE URL — Firebase blocks file://
4. Push via Mac terminal only
5. ALWAYS run grep diagnostics before making changes
6. ALWAYS backup before major changes: cp index.html index_backup_$(date +%Y%m%d).html
7. Use data-* attributes for onclick handlers — no inline string quotes
8. NO hardcoded business names, cities or keywords in AI prompts
9. All AI prompts must use dynamic company settings
10. Never use template literals with real newlines in python replacements
11. Never use spread operator inside JS strings built via python
12. AI keys stored in: users/{uid}/settings/aikeys

---

## Tech Stack
- Firebase Auth — Google Sign-in
- Firebase Firestore — database
- GitHub Pages — hosting
- Google Places API — GMB and Maps data
- GSC OAuth2 — Google Search Console
- Jina.ai — website content fetch via https://r.jina.ai/URL
- AI providers: Groq (free/fastest), OpenAI, Anthropic Claude, Gemini, Mistral, Cohere, Together
- Chart.js — charts
- jsPDF — PDF export

---

## Firebase Structure
users/{uid}/
  settings/
    aikeys     -> groq, openai, anthropic, gemini, mistral, cohere, together, aiChain
    gsc        -> accessToken, expiresAt, connectedAt, property
  companies/{companyId}/
    fields     -> name, website, industry, city, targetAreas, services,
                  gmbName, gmbAddress, gmbDescription, gmbPlaceId,
                  gmbLat, gmbLng, googlePlacesKey, gscProperty
    keywords/  -> keyword, url, currentRank, previousRank, bestPosition,
                  clicks, impressions, ctr, gscSynced
    locationKeywords/ -> keyword, currentRank, previousRank, lastUpdated
    gridCache/        -> keyword, size, label, results, cachedAt, top3, top10, found
    gridHistory/      -> same as gridCache, one entry per day per keyword
    aivisibility/     -> score, checkedAt, results

---

## Active Firebase Data
Active UID: aHpKtUM4ofRHQV0XXD04NeSKFyL2
Active Company ID: turnkey-interior-contractors
Company Name: Turnkey Interior Contractors
Website: https://turnkeyinteriorcontractors.com
GMB Name: TIC (TURNKEY INTERIOR CONTRACTORS)
GMB Place ID: ChIJxfKa-NuQyzsRZo3TiDBGjdw
GMB Lat: 17.4506074
GMB Lng: 78.3624082
GMB Rating: 4.5 stars, 17 reviews
Website Keywords: 18 keywords in Rank Tracker (5 duplicates removed 30 June)
GMB Location Keywords: 10 keywords
Other UIDs exist in Firebase but are empty test accounts — ignore them

---

## Current Sidebar Navigation
MAIN
  Rank Tracker (ranktracker) — website keyword positions
  Locations (local) — GMB grid rank checker and overview
  Search Console (gsc) — GSC connected data
  Rank History (charts) — position history charts
TOOLS
  AI Visibility (aivisibility) — ChatGPT/Gemini/Perplexity checker
  Watchdog (watchdog) — daily action checklist
ACCOUNT
  Settings (settings) — company details, GSC, AI keys

Removed tabs (intentionally deleted):
  AI Optimize — was duplicate of per-keyword AI button
  Bulk AI Audit — was just redirect to Rank Tracker

---

## Key Functions Reference
callAI(provider, prompt, keys)       — calls any AI with fallback chain
loadAIKeys()                         — loads keys from Firestore aikeys doc
loadCompSettings()                   — loads current company settings
getCurrentCompany()                  — returns active company object from companies array
getCurrentCompanyId()                — returns active company ID
switchCompany(id, name, event)       — switches active company
runAIVisibilityCheck()               — AI Visibility tab main function
analyzeGMBDescription()              — analyzes GMB description with AI
showPage(pageId, navEl)              — switches active page
connectGSC() / syncGSC()            — GSC OAuth and data sync
loadKeywords() / renderKeywords()    — website keyword management
openAiPanel(keyword, url)            — per-keyword AI analysis panel
buildGridResults(keyword, gridSize)  — builds GMB rank grid
renderGrid(results, size, kw, label) — renders grid on screen
saveGridCache() / loadGridCache()    — grid result caching
saveGridHistory() / loadGridHistory()— week-on-week grid comparison
renderGridComparison()               — shows improvement vs last check
findMyBusiness(results, name, co)    — matches business in Places API results
startBulkAudit()                     — bulk AI audit all keywords

---

## App Vision
QuickRank = Wincher + AI, unlimited, free

Wincher tracks your ranks.
QuickRank tells you HOW to rank higher — free, with AI.

QuickRank beats Wincher by:
- AI suggestions per keyword with exact copy-paste fixes
- GMB health checker with competitor comparison
- AI Visibility checker for ChatGPT/Gemini/Perplexity
- Content planner with ready-to-use posts
- Watchdog daily action list
- Completely free, unlimited keywords
- India local market focus

QuickRank does NOT replace:
- Wincher rank tracking — use Wincher for daily automated rank data
- Ahrefs/SEMrush backlink data — needs paid API
- Automated daily rank crawling — costs money

Multi-business architecture:
One login -> Multiple businesses (add/delete anytime)
  Each business -> own keywords, GSC, settings
  Each business -> multiple GMB locations (to build)

---

## Completed Phases

Phase 11.5 — GMB Local Rank Tracker
  5 tabs: Overview, Rank Grid, AI Push Strategy, Action Plan, History
  Google Places API connected
  AI Strategy using real Places API data
  Firebase storage working

Phase 14E — Multi-AI Provider Manager
  7 providers: Groq, OpenAI, Anthropic, Gemini, Mistral, Cohere, Together
  Fallback chain — tries next provider if one fails
  Test button per provider
  Chain order saved to Firebase

Phase 11.6 — GMB Grid Fixes
  Fixed duplicate grid overlay — single grid now shows correctly
  Fixed business matching — removed all hardcoded TIC fallbacks
  Fixed getCurrentCompany() duplicate — now pulls from companies array
  Grid shows real ranks (4, 10, 20+) instead of hardcoded 20
  20+ shown correctly when business not in top 20 Places API results
  Grid history tracking — saves each run to gridHistory collection with date key
  Week-on-week comparison panel shows below grid after second run
  Zones improved / worsened / new found tracked automatically

Phase 12 — Business Settings Upgrade
  Added fields: Industry, City, Target Areas, Services
  Added: GMB Description textarea
  Added: AI Analyze Description button
  analyzeGMBDescription() — scores 0-10, shows missing keywords, 3 improved versions with copy buttons
  All new fields saved to Firebase and loaded back correctly
  All AI prompts now dynamic — no hardcoded city or business names

Firebase Cleanup
  Deleted duplicate companies: default, sb-interior-solutions, sbis, sbis-tic
  Only turnkey-interior-contractors remains — all 23 keywords confirmed
  App loads correct company on startup

AI Visibility Tab
  Checks business presence in ChatGPT/Gemini/Perplexity (AI simulated)
  Fetches real website content via Jina.ai
  Uses tracked keywords and company settings dynamically
  Score 0-100 with specific copy-paste fixes and direct action links
  Results saved to Firebase aivisibility collection

---

## Current Rankings Data (29 June 2026)
GMB Grid — interior contractors in hyderabad:
  Rank 4 in 1 zone, Rank 10 in 1 zone, 20+ in 23 zones
  Baseline set — compare weekly to track improvement

Website Keywords — key ones:
  turnkey interior contractors — #1
  turnkey interior design companies in hyderabad — #1
  home interior contractors in hyderabad — #8
  commercial interior contractors in hyderabad — #7
  office interior designers in hyderabad — #13
  interior contractors in hyderabad — #99 (CRITICAL — highest volume)
  interior fit out companies in hyderabad — #18

---

## Pending Phases

Phase 13 — Dashboard
  Overall health score combining Website + GMB + AI scores
  Today top 3 priority actions
  Rank summary cards from GSC
  Position distribution chart like Wincher (Top3 / 4-10 / 11-30 / 30+)
  Opportunities section — keywords in pos 4-20 that can reach top 3
  GMB health score card
  AI Visibility score card

Phase 14 — Rank Tracker Upgrade ✅ DONE 30 June 2026
  5 stat cards: Top 3 / Pos 4-10 / Pos 11-30 / Pos 30+ / Est Traffic
  Color coded position badges — green/yellow/orange/red
  ⚡ WIN badge on all pos 4-20 keywords
  Easy Win Opportunities banner at top
  Best position column — shows only if different from current
  Auto-loads when switching to Websites tab
  updateRankTrackerStats() — new helper function
  getPosColor() — new helper function

Phase 15 — GMB Health Checker ✅ DONE 30 June 2026
  GMB Health Score 0-100 (Reviews 40pts + Profile 35pts + Activity 25pts)
  Reviews + rating auto-fetched from Google Places API and saved to Firestore
  Profile completeness 7-point checklist
  Activity recommendations (photos, posts, review responses)
  Competitor comparison table from Places API (top 5 nearby businesses)
  AI Fix Recommendations — 3 copy-paste actions
  Tab inside Locations page — 🏥 GMB Health
  Auto-runs when tab is opened
  runGMBHealthCheck() — main function

Phase 16 — Content Planner
  Weekly blog topic suggestions based on keywords and rank gaps
  GMB post ideas copy-paste ready
  Best time to publish
  Done/pending tracker

Phase 17 — Watchdog Upgrade
  Pull data from all tabs automatically
  Rank movement since last check
  Competitor activity this week
  Today 3 specific actions not generic
  Weekly email via EmailJS

Phase 18 — AI Visibility Upgrade
  Use GSC top keywords instead of tracked keywords
  Per keyword AI appearance check
  Track score history week by week
  Show what changed since last check

Phase 19 — Keyword Research (when Google Ads API approved)
  Real search volume from Google Ads API
  Competition level low/medium/high
  CPC data
  Keyword suggestions from Google
  Ads vs organic comparison

---

## Known Issues and Watch Out For
1. JS string corruption — never use template literals with real newlines in python
2. Spread operator — avoid inside regular arrays in JS strings built via python
3. Onclick handlers — always use data-* attributes not inline string quotes
4. Dark theme — individual CSS replacements broke JS strings in previous attempt
   Correct approach: inject single CSS override block before closing style tag
5. loadCompSettings() — only one instance must exist
6. getCurrentCompany() — only one instance must exist, pulls from companies array
7. Grid renders two layers by design (visual + clickable) — this is intentional
8. Firebase QUIC errors in console — harmless, Firebase auto-reconnects
9. Password field not in form warnings — harmless DOM warning, ignore

---

## API Keys Info
Google Places API key — hardcoded in index.html (search: googlePlacesKey or PLACES_API_KEY)
GSC Client ID — hardcoded in index.html (search: GSC_CLIENT_ID)
GSC Redirect URI — https://teamtichyd-star.github.io/quickrank/
AI keys — stored per user in Firebase NOT hardcoded
Google Ads developer token — obtained, MCC created, OAuth2 architecture planned

---

## Terminal Commands Reference

Backup before any changes:
cp /Users/haritalla/Desktop/quickrank/index.html /Users/haritalla/Desktop/quickrank/index_backup_$(date +%Y%m%d).html

Push to live:
cd /Users/haritalla/Desktop/quickrank && git add -A && git commit -m "description" && git push

Check line count:
wc -l /Users/haritalla/Desktop/quickrank/index.html

Find function:
grep -n "functionName" /Users/haritalla/Desktop/quickrank/index.html

View lines:
sed -n '100,120p' /Users/haritalla/Desktop/quickrank/index.html

Check for duplicate vars:
grep -n "let progress\|var progress" /Users/haritalla/Desktop/quickrank/index.html

Check all async functions:
grep -n "async function" /Users/haritalla/Desktop/quickrank/index.html | head -30

---

## Next Session — Start With Phase 13 Dashboard
Build one screen showing:
- Overall health score
- Today top 3 actions
- Rank summary from GSC
- GMB health score
- AI Visibility score
- Position distribution chart
