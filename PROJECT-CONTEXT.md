---
name: trip-planner-context
description: Full technical reference for Shane & Cheryl's Trip Planner app. Use this skill at the start of any conversation involving this app, or whenever asked to add features, fix bugs, or modify the trip planner codebase. Trigger on any mention of trip planner, split view, day panel, splitMap, selectSplitDay, kanban, itinerary view, float card, mob-day-pill, home view, home tiles, or any reference to the Thailand trip planner project.
version: 4.9
updated: 2026-04-28
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
17. #disc-add-overlay + #disc-add-sheet (z-index 5400/5500)
18. #panel — sliding detail panel
19. #tl + #tl-inner — desktop timeline strip
20. #mob-day-strip — legacy (hidden)
21. Single script block — all JS
22. #mob-search-btn — FAB bottom-left (mobile map only)
23. #mob-day-pill — day nav pill bottom-centre (mobile map only)
24. #mob-day-summary — day summary card
25. #mob-pin-sheet — pin bottom sheet (mobile)
26. #map-float-card — pin float card
27. Google Maps API script tag

---

## Views
| View | Default | Notes |
|------|---------|-------|
| home | YES | Dashboard: tiles + today day card |
| map | | Full map + timeline (desktop) / pill (mobile) |
| calendar | | Month grid, inline editing |
| split | | 55% map / 45% list |
| itinerary | | Expandable days |
| cards | | Kanban (desktop) / swipeable (mobile) |
| budget | | Multi-currency tracker |
| food | | Reservation tracker |
| discovery | | Place search + wishlist |
| structure | | Plan page — city block + day row drag/drop editor |
| transport | | Chronological flight/transfer timeline |

setView(view) handles all switching, pill/FAB management, and calls render functions. Saves to localStorage.

---

## Home View (#view-home)

Default view on load. Structure:
- Locked countdown tile (row 1, always visible, not sortable)
- Sortable tile grid (#home-sortable-grid, 3-column)
- Hidden tile tray (#home-tile-tray, edit mode only)
- Today's day card (.home-day-card.is-today, only shown during trip)
- Edit button (#home-edit-btn, fixed top-right)
- Long-press on grid (400ms) also enters edit mode

### Long-press touch handling — IMPORTANT
The grid's touchend listener must NOT call e.preventDefault() unconditionally.
Only preventDefault after the 400ms pressTimer has fired (long-press confirmed).
If touchend calls preventDefault on every tap, tile onclick handlers are silently swallowed on mobile.

### Tile IDs and purpose
dates — trip dates, no onclick
weather — live weather via open-meteo API, no onclick
flight — next flight, onclick showNextFlightModal()
visa — visa status dots, onclick showVisaSheet()
stay — accommodation health, onclick setView('budget')
food — reservation health, onclick setView('food')
budget — estimated spend, onclick setView('budget')
map/calendar/split/itinerary/cards/discovery — nav tiles, onclick setView(id)

### Tile config
loadHomeTileConfig() / saveHomeTileConfig(order, hidden) — localStorage key home_tile_config
HOME_TILE_DEFAULTS array, HOME_TILE_META object {emoji, label} per ID

### Edit mode
enterHomeTileEdit() / exitHomeTileEdit() / toggleHomeTileEdit()
hideHomeTile(id) / restoreHomeTile(id) / renderHomeTileTray(hiddenIds)
homeTileSortable global — Sortable instance, destroyed on exit

### Status functions
getTripStatus() — {mode: pre/during/post, text, sub, dayIndex?}
getNextTripCity() — {day, index}
getNextFlight() — {flight, day} or null
getVisaStatus() — reads currentTrip.visaInfo.travellers
getBudgetTotal() — sums _est costs, returns {total, sym}
getStayHealth() — {booked, missing}
getFoodBookings() — {booked, unbooked}
getPlanningGaps() — array of gap strings

---

## Structure View (#view-structure) — Plan Page

!! CRITICAL — READ BEFORE TOUCHING THIS VIEW !!

This view has caused serious data corruption. Multiple bugs fixed this session. Understand all of them before making changes.

### HTML
- #struct-inner — inner container
- #struct-top-bar — contains 🕐 History button
- #struct-city-list — Sortable city blocks
- .struct-city-block[data-city][data-block-index] — one per city leg
- .struct-day-list[data-city] — Sortable day rows inside each block
- .struct-day-row[data-di] — one per day, data-di = index in currentTrip.days
- #struct-toast — undo toast (fixed position)
- #struct-history-overlay + #struct-history-sheet — changelog sheet

### Key functions
renderStructure() — groups currentTrip.days by CONSECUTIVE city runs in STORAGE ORDER. NEVER sorts by date.
structReorderCities() — reads day indices from DOM rows inside each block (NOT by city name match)
structReorderDays(evt) — rebuilds order from all DOM rows, updates moved day city if cross-block, recalculates ALL dates sequentially
structDeleteDay(di, e) — splices day, renumbers, saves
structAddDay(city, e) — inserts blank day after last day of that city, uses parseTripDate/formatTripDate
renumberDays() — sets day.day = i+1 for all days
initStructSortables() — creates Sortable for city list + each day list

### Undo / changelog system
structHistory — global array, max 20 entries, [{label, snapshot, time}]
structToastTimer — global, clearTimeout on each new toast
pushStructHistory(label) — deep copies currentTrip.days, unshifts to structHistory, shows toast
showStructToast(label) — shows #struct-toast with label + Undo button, auto-dismisses after 5s
undoStructAction() — restores last snapshot, saves, re-renders, hides toast
showStructHistory() / closeStructHistory() — opens/closes history sheet
restoreStructSnapshot(index) — restores any entry, trims history to entries after that point

pushStructHistory is called at the START of:
- structReorderCities() → 'City blocks reordered'
- structReorderDays() → '⚠️ Day N → City (was OldCity)' or 'Day N reordered in City'
- structDeleteDay() → 'Day N deleted from City'
- structAddDay() → 'Day added to City'

### CRITICAL BUGS FIXED — do not reintroduce
1. renderStructure was sorting days by date before grouping → duplication. FIXED: removed date sort.
2. structReorderCities matched days by city name → merged both Bangkok legs. FIXED: reads data-di from DOM rows.
3. showAutoShiftSheet called from city reorder, delete, add → removed from all except manual shift button.
4. structAddDay using new Date(str + 'T00:00:00') on "Sat May 9" format → RangeError. FIXED: uses parseTripDate/formatTripDate.
5. structReorderDays only updating moved day's date → gaps and duplicates. FIXED: recalculates ALL dates sequentially from day 1 anchor.

### Shared date utilities (ALWAYS use these)
parseTripDate(str) — handles "2026-05-09" ISO and "Sat May 9" formats, returns Date or null
formatTripDate(dateObj) — returns "Sat May 9" format string
Defined just above fmtShortDate(). Never inline date parsing anywhere.

---

## Mobile components

### Day Pill (#mob-day-pill)
State: mobPillIndex (global, 0-based)
Init: initMobPill() from loadFromStorage callback (guarded by mobPillInited flag)
Arrows -> loadMobPillDay(); centre tap -> toggleMobDaySummary()

### Day Summary (#mob-day-summary)
Chips: Stay / Transport / Activities / Food & Drinks
Edit btn -> openDayPanel(); Route btn -> openDayPanelOnTab(...,'route')
Swipe left/right to change days

### Search FAB (#mob-search-btn)
Fixed bottom-left, map view only. Tap -> setView('discovery') + focus input.

### Map Float Card (#map-float-card)
Desktop: fixed bottom-left 260px. Mobile: centred 280px z-index 2600.
showMapFloatCard(name, photoUrl, note, mapsUrl, dayIndex, actIndex, itemType, doneKey)

---

## Key JS functions

### Data & storage — CRITICAL RULES
saveToStorage() — Firestore .set() with { merge: true } + localStorage
!! ALWAYS keep { merge: true } — without it, cardPhotos and wishlist get wiped on every save !!
loadFromStorage(callback) / setupRealtimeSync()
normaliseAccom(item) / normaliseFood(item) / normaliseDayTransport(item) / normaliseDayCurrency(day)
loadApiKeys() — Anthropic key from Firestore into anthropicApiKey

## Known issues
1. activityLinks not surfaced in UI
2. Split view openSplitPin retry loop (potential infinite loop)
3. PlacesService deprecated March 2025 (still works — used for geocoding/discovery)
4. Claude suggestedOrder sometimes null — Apply button missing
5. suggestRoute fires twice per tap
6. cardNotes still keyed by index position (not uid)
7. activityCategories still a parallel array (not on activity object)

---

## Data structures

### Day object
{
  day, date, city, lat, lng, note,
  currency, currencySymbol,
  accommodation: [{name, notes, price, link}],
  activities: [],
  activityCategories: [],
  activityLinks: [],   // NOT YET SURFACED IN UI
  food: [{name, link, bookingUrl, reservationRequired, reservationBooked, notes, mustOrder}],
  transport: [{type, from, to, carrier, flightNum, depart, arrive, notes}],
  cardNotes: {}, costs: {}, done: {},
  routeOrder: [], routeLegs: [],
  routeStartTime, routeReturnToStart, routeDefaultMode
}

### citySettings
{
  "Bangkok":    {emoji, color: "#E67E22", code: "BKK"},
  "Chiang Rai": {emoji, color: "#9B59B6", code: "CEI"},
  "Koh Samui":  {emoji, color: "#2D9E75", code: "USM"},
  "Sydney":     {emoji, color: "#3498DB", code: "SYD", noMarker: true}
}

---

## Trip data
Trip: Thailand May 2026
Dates: Sat May 9 – Sun May 24 (16 days)
Route: Sydney > Bangkok (days 1-4) > Chiang Rai (days 5-7) > Koh Samui (days 8-11) > Bangkok (days 12-16) > Sydney
Firestore: trips/thailand_2026

---

## Storage — DANGER ZONES
!! CRITICAL: saveToStorage() uses .set() with { merge: true }. NEVER remove merge:true. !!
cardPhotos and wishlist saved separately — saveCardPhotos() / saveDiscWishlist() only.

## Emergency data recovery
If days get corrupted, recover via console:
1. Check: console.log(currentTrip.days.map(function(d) { return d.day + ': ' + d.city + ' - ' + d.date; }))
2. Deduplicate by city+date key if needed
3. Reorder using known correct sequence
4. Reset dates: anchor = new Date(2026,4,9), forEach d.date = formatTripDate(new Date offset by i days)
5. saveToStorage()
localStorage does NOT store trip data. Firestore is the only source of truth.

---

## Known issues
1. Google Places photo URLs expire → 403 in cards view. Will be replaced by photo picker (roadmap #4).
2. activityLinks not surfaced in UI
3. Split view openSplitPin retry loop (potential infinite loop)
4. PlacesService deprecated March 2025 (still works)
5. Claude suggestedOrder sometimes null — Apply button missing
6. suggestRoute fires twice per tap
7. ⚠️ warning triangles in structure view not tappable/explanatory
8. ~~Delete day X button requires hold-to-reveal~~ — FIXED this session

---

## Bugs fixed this session (2026-04-28)
- fetchKanbanPhoto removed entirely — was causing 403 errors from expired URLs
- Food items now have stable uids via normaliseFood — photo keys no longer positional
- Photo picker built: Places API suggestions (4 at a time, cycleable) + camera roll upload
- Cards view no longer resets to day 1 after photo upload (savedMobIndex pattern)
- Tapping existing photo reopens picker to change it
- Duplicate uploadImageToFirebase removed

## Feature roadmap (priority order)
1. Swipe between days in split view
2. Surface activityLinks in all views
3. cardNotes migration to uid-based keys
4. activityCategories onto activity object
5. Fix Claude suggestedOrder / Apply button
6. Today indicator on desktop timeline
7. Trip progress bar in header
8. Wishlist → Firestore sync
9. Plan/Go/Remember mode
10. Weather on day panel
11. Currency converter
12. Packing list
13. Offline mode

## Transport view — built this session
- #view-transport — chronological timeline of all transport entries
- normaliseDayTransport updated with terminal + confirmationCode fields
- Transport sheet: bottom sheet for add/edit (mirrors disc-add-sheet pattern)
  - Type selector: Flight/Train/Bus/Ferry/Car/Transfer
  - Single/Multi-leg toggle (flights only)
  - Multi-leg: per-leg from/to/carrier/flightNum/depart/arrive/confirmationCode/day selector
  - Flight day selector includes "✈️ Arrival day" option (one day past last trip day)
  - Notes field, Save/Cancel buttons
- Multi-leg data structure: { type, multiLeg:true, notes, legs:[{from,to,carrier,flightNum,depart,arrive,confirmationCode,dayIndex}] }
- Single-leg data: backward compatible, no multiLeg flag
- renderTransport() handles both single and multi-leg display
- showAddTransportModal / showEditTransportModal → now forward to openTransportSheet()
- Home tile: transport tile added, self-heals into saved localStorage config
- Hamburger menu: desktop + mobile both updated
- Mobile view menu: transport added
- ⚠️ popover: flight warnings tap to setView('transport')
- CSS: #view-transport, .transport-view-card, .transport-type-badge, ts-* sheet classes

## Split view note editing — built this session
- de-header-note is now tappable — opens inline input with Save/Cancel
- splitNoteInlineEdit() / splitNoteSave() / splitNoteCancel() functions
- Uses deCurrentDay (not currentDayItem) — important
- Save note button also added below the textarea in the Note section

## Feature roadmap (priority order)
1. Swipe between days in split view
2. Surface activityLinks in all views
3. cardNotes migration to uid-based keys
4. activityCategories onto activity object
5. Fix Claude suggestedOrder / Apply button
6. Today indicator on desktop timeline
7. Trip progress bar in header
8. Wishlist → Firestore sync
9. Plan/Go/Remember mode
10. Weather on day panel
11. Currency converter
12. Packing list
13. Offline mode

---

## Session handoff
Start new chat: "Trip planner dev session. Read /mnt/skills/user/trip-planner-context/SKILL.md first. Tell me the version number before we start."
End of session: regenerate skill file via bash_tool + give PROJECT-CONTEXT.md sandwiches + state chat name + confirm handoff phrase.