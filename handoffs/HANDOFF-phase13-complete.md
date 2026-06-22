7.QuickRank
PROJECT: QuickRank - Free SEO + GMB Tracker + Local Keyword Tracker
LIVE URL: https://teamtichyd-star.github.io/quickrank/
REPO: https://github.com/teamtichyd-star/quickrank
DEV PATH: /Users/haritalla/Desktop/quickrank
OWNER: Hari Talla (Hyderabad)
BUSINESS: TIC (TURNKEY INTERIOR CONTRACTORS) - Interior Contractors, Hyderabad

═══════════════════════════════════════════════
CURRENT STATUS - Phase 13 + Bonus Features COMPLETE
═══════════════════════════════════════════════

Working Features:
- Rank Tracker (GSC integration with page URLs)
- Search Console sync (now fetches page dimension)
- Rank History with charts
- AI Optimize (7 AI providers: Groq, OpenAI, Claude, Gemini, Mistral, Cohere, Together)
- Bulk AI Audit
- Sidebar restructure (Wincher-style)
   - Rank Tracker (collapsible parent)
     - Websites
     - Locations
- Edit Company Profile in Settings
- Migrate Company ID feature
- Watchdog Tab (24/7 SEO alerts with real GSC data)
- Beautiful AI output (formatted cards with score badges)
- Jina.ai page fetching (NO CORS issues, fetches H1, H2, word count, links)
- AI uses real page data + GSC context (specific advice, not generic)
- Local GMB Tab with 7 sub-tabs:
   1. Overview (NEW - Wincher-style)
      - Business NAP card
      - All Keywords Top 3 percent card with breakdown
      - Best Performing Keyword card
      - Google Reviews card (live from Place ID)
      - Tracked Location Keywords list (add/delete/refresh)
      - Auto-rank check (>24h triggers refresh)
      - Click keyword - rank history chart
   2. Rank Checker
   3. Competitor Grid
   4. Optimization Score (uses Place ID direct lookup)
   5. AI Push Strategy
   6. Rank History
   7. Competitors
- Settings (Firebase backend with company profile editing)
- Place ID matching (100% accuracy)
- Favicon added
- GSC token expiry detection

═══════════════════════════════════════════════
CRITICAL CONFIG VALUES
═══════════════════════════════════════════════

TIC Business Data:
- GMB Name: TIC (TURNKEY INTERIOR CONTRACTORS)
- Place ID: ChIJxfKa-NuQyzsRZo3TiDBGjdw
- Latitude: 17.4506074
- Longitude: 78.3624082
- Address: 4, Jayabheri Enclave, Gachibowli, Hyderabad
- Website: turnkeyinteriorcontractors.com
- Company Doc ID: turnkey-interior-contractors (migrated from sb-interior-solutions)

Firebase Paths:
- API Keys: users/{uid}/settings/aikeys
- Company: users/{uid}/companies/{companyId}
- Keywords: users/{uid}/companies/{companyId}/keywords/{kwId}
- Keyword History: users/{uid}/companies/{companyId}/keywords/{kwId}/history/{date}
- Location Keywords: users/{uid}/companies/{companyId}/locationKeywords/{kwId} (NEW)
- Location Keyword History: users/{uid}/companies/{companyId}/locationKeywords/{kwId}/history/{date}
- GSC Token: users/{uid}/settings/gsc (with expiresAt timestamp)
- Competitor Snapshots: users/{uid}/companies/{companyId}/competitorSnapshots/{date}
- GMB History (old): users/{uid}/companies/{companyId}/gmbHistory/{docId}

═══════════════════════════════════════════════
NEXT TASK - Phase 14: Smart Keyword Discovery
═══════════════════════════════════════════════

USER DECISION: Build multi-source keyword discovery for Local Keywords tab

WHAT TO BUILD:

1. Add "Suggest Keywords" button in Locations - Overview tab
   - Location: next to "+ Add Keyword" button

2. Click opens modal with 4 tabs:
   a. From GSC (pull keywords user already ranks for from gscDataFull)
   b. From AI (call AI to suggest variations based on business)
   c. From Google Ads CSV Upload
      - Upload Search Terms Report button
      - Parse CSV columns: Search term, Impressions, Clicks, CPC, Conversions
      - Show all keywords in table with checkboxes
   d. From Keyword Planner CSV Upload
      - Upload Keyword Planner Report button
      - Parse columns: Keyword, Avg monthly searches, Competition, Top of page bid

3. Each tab shows:
   - Checkbox column
   - Keyword
   - Volume/Impressions
   - Competition/CPC (color coded: green=easy, red=hard)
   - Already tracking indicator if keyword exists

4. Bottom of modal:
   - Add Selected Keywords button
   - Bulk adds to locationKeywords collection
   - Auto-checks ranks after adding

FUTURE: Once Google Ads Developer Token approved (1-3 days),
        replace CSV upload with OAuth API integration

═══════════════════════════════════════════════
FUTURE PHASES ROADMAP
═══════════════════════════════════════════════

Phase 14 - Smart Keyword Discovery (NEXT)
Phase 15 - AI Intelligence Layer (Weekly suggestions dashboard)
Phase 16 - Rank Change Detection (Auto compare daily)
Phase 17 - Email Alerts (EmailJS Monday summary)
Phase 18 - GMB Content Planner (30-day calendar)
Phase 19 - Push Notifications (OneSignal)
Phase 20 - Google Ads OAuth API integration (when developer token approved)

LATER:
- Multi-tenant cleanup (remove TIC hardcoding from 12 places)
- Stripe payments
- Pricing tiers (Free/Pro/Agency)
- Landing page
- Launch on ProductHunt

═══════════════════════════════════════════════
PROJECT RULES (STRICT)
═══════════════════════════════════════════════

1. Single index.html file only (no separate JS/CSS files)
2. Green theme: #0a5c36 (dark), #2ecc71 (light), #d4f5e2 (pale)
3. Test on LIVE URL (Firebase blocks file://)
4. Push via Mac terminal commands ONLY
5. ALWAYS give complete terminal commands to paste (no manual coding)
6. Show diagnostics first (grep) before making changes
7. AI keys in: users/{uid}/settings/aikeys
8. googlePlacesKey in: users/{uid}/companies/{companyId}
9. Use heredoc with SCRIPT_END terminator (NOT PYEOF) - avoids dquote stuck issue
10. For complex scripts use: cat > /tmp/script.py << SCRIPT_END then python3 /tmp/script.py
11. Always backup before changes: cp index.html index.html.backup-phaseXX
12. Verify with grep after every change
13. Avoid emojis in Python heredoc strings (causes terminal issues sometimes)
14. NEVER use !currentUser in grep (zsh history expansion error - use without !)
15. For inline HTML with onclick passing strings, use data attributes (data-kw, data-kwid)
    instead of inline string passing to avoid quote escaping issues

═══════════════════════════════════════════════
PHASE 13 LEARNINGS (DON'T REPEAT MISTAKES)
═══════════════════════════════════════════════

1. Jina.ai (r.jina.ai/URL) gets full page content with NO CORS issues
   - No API key needed
   - Returns markdown format
   - Free service

2. Google PageSpeed API requires API key (free tier returns 429 without key)
   - REMOVED from app to keep things simple
   - Jina.ai alone gives enough data for AI analysis

3. Place ID direct lookup via Place Details API (with CORS proxy)
   - Use for Optimization Score, location keyword rank check
   - 100% accurate vs name fuzzy matching

4. findMyBusiness function exists - use it for keyword search rank
   - Priority: Place ID exact match - GPS proximity - name fuzzy

5. Don't use Promise.allSettled with destructuring if unsure of structure
   - Simple await pattern is more reliable

6. Inline onclick="func('kw')" breaks with special chars in keyword
   - Use data attributes: data-kw="encoded" + onclick="func(this.dataset.kw)"

7. getCompanyData was never defined - had to add it
   - It fetches full company doc with gmbPlaceId, gmbLat, gmbLng

8. orderBy with where clause needs composite index in Firestore
   - Remove orderBy, sort client-side instead

═══════════════════════════════════════════════
FILE STATUS
═══════════════════════════════════════════════

CURRENT FILE SIZE: ~3,260 lines (as of Phase 13 complete + Overview tab)
BACKUP FILES:
- index.html.backup-phase12-WORKING
- index.html.backup-phase12.1
- index.html.backup-phase13
- index.html.backup-phase13-aifix
- index.html.backup-overview

LAST COMMIT: Fix: location keyword rank check uses Place ID for accurate matching
LAST PUSH: Successful

═══════════════════════════════════════════════
START COMMAND FOR NEW CHAT
═══════════════════════════════════════════════

Start by:
1. Confirm you understand everything above
2. Ask Hari to run these diagnostics:

   grep -n "addLocationKeyword\|loadLocationKeywords\|locationKeywords\|gscDataFull" /Users/haritalla/Desktop/quickrank/index.html | head -15

   grep -n "function showKeywordDetail\|overview-new-kw\|overview-kw-list" /Users/haritalla/Desktop/quickrank/index.html | head -10

3. Wait for output BEFORE making any changes
4. Build Phase 14: Smart Keyword Discovery
   - Add Suggest Keywords button next to + Add Keyword
   - Build modal with 4 tabs (GSC / AI / Ads CSV / Keyword Planner CSV)
   - CSV parser using FileReader API
   - Bulk add to locationKeywords collection
5. Test on live after each step
6. Use heredoc with SCRIPT_END terminator OR file approach
