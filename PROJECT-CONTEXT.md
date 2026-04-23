bash

cat > /mnt/skills/user/trip-planner-context/SKILL.md << 'SKILLEOF'
---
name: trip-planner-context
description: Full technical reference for Shane & Cheryl's Trip Planner app. Use this skill at the start of any conversation involving this app, or whenever asked to add features, fix bugs, or modify the trip planner codebase. Trigger on any mention of trip planner, split view, day panel, splitMap, selectSplitDay, kanban, itinerary view, float card, mob-day-pill, home view, home tiles, or any reference to the Thailand trip planner project.
version: 4.4
updated: 2026-04-23
---

# Shane & Cheryl's Trip Planner — Context Skill

## Auto-update instruction
At the end of every dev session, or when switching chats, generate a fresh version of this file reflecting the current codebase state. Save it to /mnt/skills/user/trip-planner-context/SKILL.md.

---

## Project overview
Single-file HTML trip planner for Shane & Cheryl's Thailand May 2026 trip.
- Local: VS Code + Live Server at http://127.0.0.1:5500/index.html
- GitHub: shanesongsataporn.github.io/trip-planner/index.html
- Firebase project: ss-cc-travel-planner (Firestore + Storage)
- Google Maps API key: AIzaSyDXFs5TVkOdKJciflCTQmX2vH9FwWTqfz8, mapId: DEMO_MAP_ID
- Libraries: Sortable.js 1.15.2 (CDN), Firebase 10.8.0 compat, Google Maps (places, marker libraries)
- Anthropic API key: loaded from Firestore at config/api_keys.anthropic via loadApiKeys() into var anthropicApiKey. NOT from config.js.

---

## Sandwich rule
Always use find/replace sandwiches for edits. Never rewrite the full file.

---

## CSS variables
--sand, --sand-dark, --ink, --ink-light, --ink-muted, --white, --accent, --accent-light, --warn (#E67E22), --danger (#E05555), --radius (14px), --radius-sm (8px), --card-shadow, --card-shadow-hover
Mobile breakpoint: max-width 640px / isMobile() function.

---

## HTML structure (body order)
1. Script tags (Sortable, Firebase x3)
2. #hdr — desktop header
3. #mob-hdr — mobile header (includes #mob-back-btn)
4. #custom-theme-panel
5. #hamburger-menu, #mob-view-menu, #mob-hamburger-menu
6. #modal-overlay + #modal (z-index 6000)
7. #map
8. #view-itinerary
9. #view-cards + #kanban-board
10. #mob-cards-view
11. #view-split
12. #view-home
13. #view-budget
14. #view-food
15. #view-calendar
16. #view-discovery
17. #de-add-sheet (z-index 5300) — Day Editor add item sheet
18. #disc-add-overlay + #disc-add-sheet (z-index 5400/5500)
19. #panel — sliding detail panel
20. #tl + #tl-inner — desktop timeline strip
21. #mob-day-strip — legacy (hidden)
22. Single script block — all JS
23. #mob-search-btn — FAB bottom-left (mobile map only)
24. #mob-day-pill — day nav pill bottom-centre (mobile map only)
25. #mob-day-summary — day summary card
26. #mob-pin-sheet — pin bottom sheet (mobile)
27. #map-float-card — pin float card
28. Google Maps API script tag

---

## Views
| View | Default | Notes |
|------|---------|-------|
| home | YES | Dashboard: tiles + today day card |
| map | | Full map + timeline (desktop) / pill (mobile) |
| calendar | | Month grid, inline editing |
| split | | Map top / Day Editor list bottom |
| itinerary | | Expandable days, sorted by date |
| cards | | Kanban (desktop) / swipeable (mobile), sorted by date |
| budget | | Multi-currency tracker |
| food | | Reservation tracker |
| discovery | | Place search + wishlist |

setView(view) handles all switching. Saves to localStorage.

---

## Home View (#view-home)
Default view on load. Sortable tile grid, countdown tile locked at top.
Long-press touch: only call e.preventDefault() after 400ms timer fires — not on every touchend.

### Tile IDs
dates, weather, flight, visa, stay, food, budget, map, calendar, split, itinerary, cards, discovery

### Key functions
getTripStatus() / getNextFlight() / getVisaStatus() / getBudgetTotal() / getStayHealth() / getFoodBookings()
showVisaSheet() / showNextFlightModal()
fetchHomeWeather(lat, lng, callback) — open-meteo API

---

## Split View / Day Editor

Map pane top, day list bottom (resizable). Selecting a day opens the Day Editor.

### Key globals
- splitSelectedIndex — which day row is selected
- deCurrentDay — reference to open day object (GLOBAL)
- deCurrentIndex — index of open day in currentTrip.days (GLOBAL)
- deExpandedCard — id of currently expanded card, or null
- deSuppressSync — prevents Firestore re-render during edits

### Day Editor card system
Three sections: Stay (#de-sort-accom), Activities (#de-sort-acts), Food (#de-sort-food).
Card IDs: de-card-act-{i}, de-card-accommodation-{i}, de-card-food-{i}
Tap to expand inline (.de-card--expanded) → edit name, category, note, link, move to day, delete.

### Day Editor functions
selectSplitDay(index) — renders day editor (has its OWN activity cards block, separate from renderDeCards)
renderDeCards() — lightweight card-only re-render (safe, doesn't touch map)
deToggleCard(section, i) — expand/collapse
deSaveCard(section, i) — save edits + move-to-day
deDeleteCard(section, i) — delete item
showDeAddSheet(section) — open add sheet (Places Autocomplete + manual mode)
closeDeAddSheet() / confirmDeAdd() / deAddPickCat(cat) / deToggleManualAdd()

### Add sheet (#de-add-sheet)
z-index 5300. Two modes: Places search (default) / manual text (toggle).
.pac-container { z-index: 5400 !important } — Google dropdown above sheet.
Location bias: deCurrentDay.lat/lng.

### Route button
.de-route-btn → openDayPanelOnTab(deCurrentDay, 'route')

---

## !! ACTIVITY DATA MODEL — uid-based photos !!
Activities are stored as objects with a stable uid:
  day.activities = [
    { name: "Wat Pak Nam", uid: "a3f9k2" },
    { name: "Thong Lor Area", uid: "b7x1m9" }
  ]
  day.activityCategories = ["temple", "default"]  ← still a parallel array
  day.activityLinks = []  ← parallel array, unused

Photo keys use uid: cardPhotos["act_" + uid]
NOT positional keys like "day5_act0" anymore.

Migration: migrateActivityUids() runs inside loadFromStorage() after data loads.
generateUid() — returns 6-char random string.

!! NEVER write day.activities[i] = "string" — always preserve the object !!
When saving a name edit: day.activities[i].name = newName (not reassignment)
When creating new activity: push { name: "...", uid: generateUid() }

### Places that read activity names — ALL updated to use a.name:
1. renderDeCards()
2. selectSplitDay() — has its OWN activity cards block
3. toggleMobDaySummary()
4. renderInlineActivities()
5. renderCalEditActs() (calendar view — may be dead code)
6. makeSortableActivities()
7. getRouteStops()
8. addActivityMarkers()
9. addSplitActivityMarkers()
10. renderMobCards()
11. buildKanbanCard()
12. callClaudeRouteReview() — prevDayText, nextDayText, actNotes
13. deToggleCard() — reads a.name for currentName
14. deSaveCard() — updates a.name, preserves uid

### Photo key pattern (uid-based):
renderDeCards: photoKey = 'act_' + uid
selectSplitDay: photoKey = 'act_' + uid
geocodeActivity: pk = 'act_' + actUid (reads from item.activities[task.index])
addSplitActivityMarkers: pk = 'act_' + actUid
renderMobCards: photoKey = 'act_' + uid
buildKanbanCard: photoKey = 'act_' + uid

---

## Mobile components

### Day Pill (#mob-day-pill)
display:none default, display:flex when .active. State: mobPillIndex.
Init: initMobPill() from loadFromStorage callback (guarded by mobPillInited flag).

### Day Summary (#mob-day-summary)
Chips: Stay / Transport / Activities / Food & Drinks.
Edit → openDayPanel(); Route → openDayPanelOnTab(...,'route').

### Search FAB (#mob-search-btn)
Fixed bottom-left, map view only.

### Map Float Card (#map-float-card)
showMapFloatCard(name, photoUrl, note, mapsUrl, dayIndex, actIndex, itemType, doneKey)

---

## Key JS functions

### Map
initMap() / addCityMarkers() / addActivityMarkers(item, callback)
addSplitActivityMarkers(item, callback) / clearSplitActivityMarkers()
geocodeActivity(task, item, callback) / resetMapView()

### Navigation
setView(view) / goBack()
initMobPill() / updateMobPill() / loadMobPillDay()
toggleMobDaySummary() / closeMobDaySummary()

### Panel
openDayPanel(item) / openDayPanelOnTab(item, tabName)
renderPanelHead(item) / refreshPanelTabs(item) / updateDayField(field, value)

### Structure view (Plan tab)
renderStructure() — groups days by consecutive city runs, sorted by DATE
Date sort uses monthMap {Jan:1...Dec:12}, splits day.date ('Sat May 9' format).
Same sort applied in renderItinerary() and renderMobCards().

### Route Optimiser
renderRouteTab(item) / suggestRoute(item) / runSegmentRoute(...)
buildRouteResultsHtml(item) / clearRoute(item) / buildGoogleMapsUrl(item)
callClaudeRouteReview(item, finalOrder, finalLegs) — spinner shown on first call only (_retries === undefined)
renderClaudeReview(...) / applyClaudeOrder(newOrder)
getRouteStops(item) — builds stop list, reads activity.name

### Discovery
renderDiscovery() / runDiscoverySearch() / initDiscAutocomplete()
showAddToTripSheet(idx, fromWishlist) / confirmAddToTrip()
openWishlistDrawer() / closeWishlistDrawer()
loadDiscWishlist() / saveDiscWishlist()

### Data & storage — CRITICAL RULES
saveToStorage() — Firestore .set() with { merge: true } + localStorage
!! ALWAYS keep { merge: true } — without it, cardPhotos and wishlist get wiped !!

loadFromStorage(callback) — calls migrateActivityUids() after data loads, before callback
setupRealtimeSync()
normaliseAccom(item) / normaliseFood(item) / normaliseDayTransport(item) / normaliseDayCurrency(day)
fetchExchangeRates(callback) / convertToBase(amount, fromCurrency)
loadApiKeys() — Anthropic key from Firestore into anthropicApiKey

### Activity uid system
generateUid() — 6-char random string
migrateActivityUids() — converts string activities to {name, uid} objects, saves if changed
Called inside loadFromStorage() after trip data is parsed (inside the if(doc.exists) block)

### Photo system (uid-based)
cardPhotos global — {photoKey: url}
photoKey format: 'act_{uid}' for activities, 'day{N}_food{index}' for food (food not yet migrated)
saveCardPhotos() / loadCardPhotos() / loadCardPhotosFromFirestore(callback)
triggerPhotoUpload(photoKey, dayIndex, actIndex, type)
uploadImageToFirebase(file, photoKey, ...)
fetchKanbanPhoto(name, item, photoId) — Places API auto-fetch, takes name string not object
fetchingPhotos global — prevents duplicate fetches

### Done system
toggleDone(dayIndex, doneKey, btnEl)
Done keys: act_N, food_N, accom_N

### Other views
renderItinerary() — sorted by date before render
renderKanban() / renderMobCards() — sorted by date before render
renderSplit() / selectSplitDay(index)
renderBudget() / renderFood() / renderCalendar()

---

## Data structures

### Day object
{
  day, date, city, lat, lng, note,
  currency, currencySymbol,
  accommodation: [{name, notes, price, link}],
  activities: [{name, uid}],             ← objects with stable uid
  activityCategories: [],                ← parallel array (still strings)
  activityLinks: [],                     ← parallel array, unused
  food: [{name, link, bookingUrl, reservationRequired, reservationBooked, notes, mustOrder}],
  transport: [{type, from, to, carrier, flightNum, depart, arrive, notes}],
  cardNotes: {"0": "note"},              ← keyed by index string, not yet migrated
  costs: {"accom_0_est": 120},
  done: {"act_0": true},
  routeOrder: [], routeLegs: [],
  routeStartTime, routeReturnToStart, routeDefaultMode
}

### citySettings
{ "Bangkok": {emoji, color:"#E67E22", code:"BKK"},
  "Chiang Rai": {emoji, color:"#9B59B6", code:"CEI"},
  "Koh Samui": {emoji, color:"#2D9E75", code:"USM"},
  "Sydney": {emoji, color:"#3498DB", code:"SYD", noMarker:true} }

### activityCategories
temple, food, beach, transport, nature, nightlife, shopping, default
Dwell times (min): temple:45, food:60, beach:180, shopping:120, nature:90, nightlife:120, transport:0, default:60

---

## Trip data
Trip: Thailand May 2026
Dates: Sat May 9 – Sun May 24 (16 days)
Route: Sydney > Bangkok (days 1-4) > Chiang Rai > Koh Samui > Bangkok (days 5-7 = May 21-23) > Sydney
Firestore: trips/thailand_2026

!! currentTrip.days array is NOT in chronological order !!
Days 5,6,7 (May 21-23, second Bangkok leg) appear before day 8 (May 13) in the array.
Always sort by parsed date string before rendering.
Never sort by day.day number — it matches array order, not chronological order.

---

## Storage — DANGER ZONES
Firestore fields: data, citySettings, cardPhotos, wishlist, updatedAt
!! CRITICAL: saveToStorage() uses .set() with { merge: true }. NEVER remove merge:true. !!

localStorage: current_trip_key, theme, custom-base, custom-hue, card_photos, disc_wishlist, home_tile_config, last_view
Firebase Storage: images/ path
Anthropic key: Firestore config/api_keys.anthropic

---

## Known issues
1. cardNotes still keyed by index position (not uid) — will break on reorder
2. activityCategories still a parallel array — will break on reorder
3. Food photos still use positional keys (day{N}_food{index})
4. Wishlist not synced to Firestore (Cheryl can't see Shane's wishlist)
5. Claude suggestRoute fires twice per tap
6. PlacesService deprecated March 2025 (still works)
7. Split view openSplitPin retry loop (potential infinite loop)

---

## Feature roadmap (priority order)
1. Migrate cardNotes and activityCategories to uid-based (completes the activity object refactor)
2. Migrate food photos to stable keys
3. Wishlist sync to Firestore
4. Swipe left on Day Editor cards (delete + move)
5. Today indicator on desktop timeline
6. Trip progress bar in header
7. Plan/Go/Remember mode
8. Weather on day panel
9. Currency converter
10. Packing list
11. Offline mode
12. React/PWA rebuild (post-trip)

---

## Session handoff
Start new chat: "Trip planner dev session. Read /mnt/skills/user/trip-planner-context/SKILL.md first. Tell me the version number — it should be 4.4. Don't write any code until I confirm."
End of session: regenerate this file AND update PROJECT-CONTEXT.md in VS Code with the same content, then commit and push.
SKILLEOF
echo "Done"
Output

Done
