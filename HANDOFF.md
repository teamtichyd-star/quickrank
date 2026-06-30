# QuickRank — Handoff Note
Last Updated: 30 June 2026

## Quick Start For New Chat
Paste this entire file at the start of any new chat with Claude.

---

## Project
- **App:** QuickRank (Free SEO + GMB + AI Visibility Tracker)
- **Live URL:** https://teamtichyd-star.github.io/quickrank/
- **Repo:** https://github.com/teamtichyd-star/quickrank
- **Dev Path:** /Users/haritalla/Desktop/quickrank
- **Backups:** /Users/haritalla/Desktop/quickrank_backups/
- **Owner:** Hari Talla — Turnkey Interior Contractors, Hyderabad
- **Stack:** Single index.html, Firebase, GitHub Pages, Google Places API, GSC OAuth, AI APIs, Serper.dev

## Active User Data
- **UID:** aHpKtUM4ofRHQV0XXD04NeSKFyL2
- **Email:** teamtic.hyd@gmail.com
- **Company ID:** turnkey-interior-contractors
- **Website:** https://turnkeyinteriorcontractors.com
- **GMB Place ID:** ChIJxfKa-NuQyzsRZo3TiDBGjdw
- **17 reviews, 4.5 stars** (auto-fetched from Places API)
- **18 website keywords** (GSC synced + Serper enriched)
- **9 GMB location keywords**

## Key APIs Configured
- ✅ Google Places API key (in Settings)
- ✅ Serper.dev: `b957e064c924f6d647ce53b2dd73f400cfa7d32e` (working, returns real top 10)
- ✅ Groq AI key (working)
- ✅ Gemini AI key (working)
- ✅ Cohere AI key (working)
- ✅ GSC OAuth connected

## Completed Phases (all working)
- Phase 11.5 — GMB Local Rank Tracker
- Phase 11.6 — GMB Grid Fixes
- Phase 12 — Business Settings Upgrade
- Phase 13 — Dashboard
- Phase 14 — Rank Tracker upgrade (color badges, stats, opportunities, ⚡ WIN)
- Phase 14E — Multi-AI Provider Manager (7 providers + fallback chain)
- Phase 15 — GMB Health Checker (auto-fetch reviews + competitor table)
- Phase 20 — AI Engine Upgrade (dynamic prompts with company context)
- Phase 22 — Universal API Manager (6 providers: Places, Serper, DataForSEO, ValueSERP, ScrapingBee, OpenPageRank)
- Security cleanup, hardcoded sbis-tic removed, smart URL mapper added

## Where We Stopped (PICK UP HERE)

Just finished **Phase 22 — Serper Integration**. AI now uses real Google top 10 results.

**Test result:** AI references real competitors like "Justdial at #1" and suggests specific fixes based on actual ranking competitors.

### Choose Next Phase:
- **Option A** — Test more keywords with Serper-powered AI
- **Option B** — Build "Real Rank Check" button (use Serper to get actual position, not GSC average)
- **Option C** — Phase 23: User access control + admin approval system (requested fields: name, company, mobile, city, use case)
- **Option D** — Build admin panel (only admin sees pending users, can approve/reject, set limits)

### Already Planned For Option C/D (User Access Control)
Admin: teamtic.hyd@gmail.com (unlimited)
Free Approved Users: 200 Serper calls/month
Required fields on access request: name, company, mobile, city, use case
Email notification via EmailJS when new request comes

text


## Core Rules (NEVER break)
1. Single index.html only — no separate JS/CSS files
2. Green theme: #0a5c36, #2ecc71, #d4f5e2
3. Test on LIVE URL only (Firebase blocks file://)
4. Push via Mac terminal
5. ALWAYS backup before changes: `cp index.html /Users/haritalla/Desktop/quickrank_backups/index_backup_$(date +%Y%m%d)_desc.html`
6. Use data-* attributes for onclick — no inline string quotes
7. NO hardcoded business names/cities in AI prompts
8. AI keys in: users/{uid}/settings/aikeys
9. API keys in: users/{uid}/settings/apis
10. loadCompSettings() — only ONE instance (line ~3907)
11. Watch for syntax errors with backticks/quotes inside JS strings built via python

## Firebase Structure
users/{uid}/
settings/
aikeys → AI provider keys + chain order
apis → googlePlacesKey, serperKey, dataForSeoKey, etc
gsc → GSC OAuth token
companies/{id}/
(company fields: name, website, gmbPlaceId, gmbReviews, etc)
keywords/ → website keywords (position, change, clicks, impressions, url)
locationKeywords/ → GMB grid keywords
gridCache/, gridHistory/, aivisibility/
usage/{YYYY-MM}/
serperCalls (incremented per call)

text


## Key Functions
- `getApiKey(keyName)` — gets any API key from settings/apis
- `fetchSERP(keyword, location)` — Serper API call, returns top 10 + PAA + related + featured snippet
- `loadCompSettings()` — gets current company data
- `buildPrompt(kw, url, pageData, mode, compSettings, competitorData)` — builds AI prompt with all context
- `runAI()` — main AI call function, injects Serper data
- `renderUniversalApiCards()` — renders API manager in Settings
- `runGMBHealthCheck()` — GMB health tab analysis
- `loadDashboard()` — dashboard data load

## Terminal Commands
```bash
# Backup
cp /Users/haritalla/Desktop/quickrank/index.html /Users/haritalla/Desktop/quickrank_backups/index_backup_$(date +%Y%m%d)_desc.html

# Push to live
cd /Users/haritalla/Desktop/quickrank && git add -A && git commit -m "msg" && git push

# Line count
wc -l /Users/haritalla/Desktop/quickrank/index.html

# Find function
grep -n "functionName" /Users/haritalla/Desktop/quickrank/index.html
Current Status
File: 6100+ lines
Last commit: "Phase 22: force AI to use real Serper data in responses"
Everything working ✅
Ready for next phase
Multi-User SaaS Plan (For Later)
Admin = teamtic.hyd@gmail.com only
New users request access (name, company, mobile, city, use case)
Admin approves → user gets 200 Serper/month
Future: paid tiers via Stripe
Each user brings own API keys for free tier
