# Plan: Phase 1 disruption copilot

Written 2026-11-06 by the `planner` agent. Source strategy: `docs/06-agentic-concierge-strategy.md` §3.2, §3.3, §5
Phase 1 (in the parent `flyrely/` folder). Scope approved by Sean on 2026-11-06: **suggest and link only, no ticket
sales, $0.**

This file is the canonical plan. `flyrely-api/docs/PLAN_DISRUPTION_COPILOT.md` (on the API's
`feat/disruption-copilot` branch) points here.

---

## 0. Ground rules

| Rule | How |
|---|---|
| Separate long-lived branches | `feat/disruption-copilot` in **both** repos (app from `main` 4db4533, API from `master` b2fbd10). Every step below is a PR **into that branch**, never into `main`/`master`. |
| Core app keeps deploying from `main`/`master` | No step edits core behaviour. Core-file edits are listed in §9 and are tiny, flag-guarded hooks. |
| Feature flag, default OFF | One master flag per repo (§5). With the flag unset, the API does not mount any `/copilot` route, and the app build does not include the copilot code at all (checked in CI by a bundle sentinel). |
| Minimise conflicts with `main` | New packages: `flyrely-api/copilot/`, `flyrely-app/src/copilot/`, `flyrely-app/src/components/copilot/`. **No new app routes** in Phase 1 (settings and disclosure are modals), so `app/routeTree.gen.ts` never changes. |
| Free-first | No paid APIs. No AeroAPI (see §3.4). Web push is free (VAPID, no Apple account). |
| Keep the branch fresh | Merge `main` → `feat/disruption-copilot` (and `master` → the API branch) at least weekly, and before each step PR. Never the other way round until Sean says so (§10, "Review and merge to main"). |

---

## 1. What the user sees

A **disruption card** on the flight details screen (`/flights/$flightId`), below the prediction card.

| Flight state | Trigger | Card |
|---|---|---|
| Normal | risk low/medium, no cancellation signal | Nothing (card hidden). |
| **At risk** | `risk_level == "high"` from the existing `/predict` (p ≥ 0.30) | Collapsed "Plan B" card: "If this flight is cancelled, here's what to do." Expands to the same content as Cancelled, written conditionally. Includes the "Alert me" push toggle. |
| **Cancelled** | (a) the user taps "My flight was cancelled", or (b) the status source reports `cancelled` (SWIM, later) | Expanded card, top of screen order after the hero: airline rebooking link + phone, refund-rights notice, alternatives, hotel/ride block, disclosure. Buttons: "I've been rebooked", "Not cancelled after all". |
| **Rebooked** | the user taps "I've been rebooked" and picks "today" or "tomorrow or later" | Rebooked today → no hotel, ride block hidden, "Add your new flight" link to `/flights/add`. Rebooked tomorrow + away → hotel + ride to hotel. At home → ride home. |

Card content (Cancelled state):

1. **Your airline** — "Rebook or manage your booking with {Airline}" (button → airline manage-trip page) and
   the airline's phone number (tel: link).
2. **Your refund rights (US flights)** — plain language, from DOT 14 CFR Part 260 (2024 rule):
   - "If your flight is cancelled and you **don't accept** the airline's alternative, you're owed a **cash refund**
     to your original payment, automatically. You don't have to accept a voucher."
   - ⚠️ "**Accepting the airline's rebooking (or flying on it) can mean giving up the cash refund.** Decide before
     you accept."
   - "Delay compensation in cash isn't required by US law." (DOT withdrew that plan in 2025.)
   - "This is general information, not legal advice." Link to the DOT refunds page (transportation.gov).
   - Shown only for flights touching a US airport. Non-US flights get "Check your airline's policy" (EU261 etc.
     out of scope).
3. **Other flights today on {ORIG}→{DEST}** — up to 8 flights, ranked lowest FlyRely delay risk first, each with
   the airline, times, risk pill ("18% chance of a 15+ min delay") and a "Check seats" hand-off button. Footer:
   "Usually scheduled on this day of the week (from US DOT data up to {month}). Check times, seats and prices on
   the partner site." Plus one row of search hand-offs: Google Flights, KAYAK, Skyscanner, Expedia.
4. **Away from home → Need a place to stay?** "Hotels near {ORIG}" (hand-off link, tonight → tomorrow), then
   "Ride to your hotel" (Uber / Lyft). An optional "Paste your hotel address" field fills the Uber drop-off on the
   device only.
   **At home → Get home**: Uber / Lyft deep link with pickup "my location" (the user picks their saved Home in the
   ride app; FlyRely never asks for a home address).
   **Unknown** (no home airport set) → inline prompt "What's your home airport?" (§7 UX decision).
5. **Disclosure** — "FlyRely may earn a commission from some of these links. It doesn't change the order or the
   price you pay." Shown only when at least one link on the card carries an affiliate ID. A static "How we choose
   these" line is always shown: "Flights are ranked by FlyRely's delay risk, never by commission."

All outbound links open in a new tab with `rel="noopener noreferrer sponsored"` (sponsored only when affiliate).

---

## 2. Architecture

```
flyrely-app (TanStack Start, client)                    flyrely-api (FastAPI)
────────────────────────────────────                    ─────────────────────────────────────────
/flights/$flightId  (core route)                         main.py  (core)
  └─ <DisruptionSlot flight onFlightChange/>   ──1 line    └─ if FLAG: copilot.mount(app, ...)  ──4 lines
       │ flag off → returns null, code tree-shaken
       └─ lazy(DisruptionPanel)  src/copilot/            copilot/  (new package)
            ├─ prefs.ts   localStorage: home airport,      ├─ config.py     flags + affiliate env
            │             per-flight user state            ├─ router.py     /copilot/* endpoints
            ├─ api.ts     POST /copilot/options  ───────►  ├─ links.py      link builder (affiliate or plain)
            │             POST /copilot/status   ───────►  ├─ partners.py   per-partner URL templates
            │             POST /copilot/push/*   ───────►  ├─ airlines.py + data/airlines.json  manage-trip, phone
            ├─ rides.ts   client-side ride links           ├─ schedule.py   ScheduleSource: BTS typical (now), SWIM (stub)
            │             (hotel address never leaves      ├─ status.py     StatusSource: none (now), swim (stub)
            │              the device)                     ├─ context.py    away / home / unknown
            ├─ push.ts    SW registration, subscribe       ├─ options.py    composes the /options response, ranks
            └─ content.ts refund-rights copy               ├─ push_store.py SQLite / Postgres (DATABASE_URL)
  src/components/copilot/  presentational components       ├─ push.py       pywebpush + VAPID
  public/sw.js, public/manifest.webmanifest                └─ watcher.py    in-process loop (FLAG + PUSH flag)
                                                         models/route_schedule.csv.gz  (built from BTS)
                                                         scripts/build_route_schedule.py, gen_vapid_keys.py
                                                         migrations/003_copilot_push.sql
```

Key decisions:

- **The API builds every partner link** (`copilot/links.py`). Affiliate IDs live in one place (API env), and the
  Phase 2 MCP server reuses the same builder. The app renders the URLs it is given. Exception: ride links that
  include a user-typed hotel address are built in the app (`src/copilot/rides.ts`) so the address never reaches
  the server.
- **The API stays stateless about users** for the card. Flights live in the browser's localStorage today, so the
  app sends the flight (and, optionally, the home airport) with each request; the API stores nothing for
  `/copilot/options`. The only server-side copilot state is push subscriptions (§6), which expire after the flight.
- **Ranking reuses the production booking model.** `copilot.mount(app, score=...)` receives a scoring function
  built from `main.model_service` and `main.build_features` (dependency injection, so `copilot/` never imports
  `main` and there is no import cycle). Alternative-flight scores are **not** written to the prediction log, so live
  accuracy tracking (R1) is not polluted.
- **Code split on the app side.** `src/copilot/flags.ts` reads `import.meta.env.VITE_FEATURE_DISRUPTION_COPILOT`;
  Vite replaces it at build time, so `ENABLED ? lazy(() => import('./DisruptionPanel')) : null` drops the panel from
  a flag-off build.

---

## 3. Data sources and their limits

### 3.1 Alternatives: "typical schedule" from BTS (available now, $0)

- **What:** `models/route_schedule.csv.gz`, built by `scripts/build_route_schedule.py` from the last 8 weeks of
  local BTS parquet (`data/bts/parquet_v2/`, Marketing Carrier data), same pattern as `models/codeshare_map.csv`.
  One row per (marketing airline, marketing flight number, origin, dest, CRS departure time) with operating airline
  and flight number, CRS arrival time, a day-of-week bitmask and `days_seen`. Keep rows seen on ≥ 2 dates.
- **Size (measured 2026-11-06 on Jul–Aug 2026):** ~107k rows, 6,503 routes; per route-day median 3 flights, max 40.
  Expect ~4–6 MB CSV, ~1 MB gzipped. Committed (like `codeshare_map.csv`); `data/` stays gitignored.
- **Limits (shown to the user):**
  - **Lag:** BTS publishes ~2–3 months late (latest local file is 2026-08). Seasonal schedule changes are missed.
    Label: "Usually scheduled on {weekday}s (US DOT data to {month})."
  - **No prices, no seat availability, no same-day cancellations of the alternatives.** Partners show those.
  - **US domestic, BTS-reporting carriers only.** Foreign carriers and international legs return
    `alternatives.items = []` with a warning plus the search hand-offs only.
  - Same airports only in v1. Metro alternatives (JFK/LGA/EWR, ORD/MDW, …) are a later step (S-A9).
- **Refresh:** monthly, when BTS lands (the same moment as the B5.1 holdout fetch). Re-run the script, commit the
  new artifact via a step PR. The response carries `schedule_as_of` so stale data is visible.
- **Later:** `SwimScheduleSource` (stub now) reads the day's filed flight plans from the SWIM live-state store
  (roadmap R3) to confirm that each alternative is actually planned today.

### 3.2 Risk for each alternative (available now, $0)

The production booking-time model (`bts18-gb-calib-v2`) via the injected scorer. Note: it uses only schedule
features, so a flight's risk **does not change during the day**. Run-up (T-3h/T-1h) models would improve
same-day ranking but are backtest-only (roadmap P0–P4).

### 3.3 "Cancelled" detection

| Source | Status | Notes |
|---|---|---|
| **User report** ("My flight was cancelled") | **Build now** | Instant, free, always correct for the user. Stored on-device only. |
| **Prediction risk** (`risk_level == "high"`) | **Build now** | Drives the "at risk" Plan B card and a one-time T-24h push. Not a cancellation signal. |
| **SWIM live state** (TFMS flight data carries cancellations nationwide) | **Stub now** (`SwimLiveStateSource`, raises `SourceNotConfigured`) | Depends on roadmap **R2** (always-on archiver, waiting on the spare Mac) and **R3** (live-state extractor into Postgres). When R3 exists, implement `status()` as a query on its table. Enabled by `FLYRELY_COPILOT_STATUS_SOURCE=swim`. |
| **FAA NAS status** (nasstatus.faa.gov ground stops / GDPs, free, no sign-up) | Optional later step (S-A10) | Airport-level, not per-flight. Could raise "at risk" and trigger a push when the origin has a ground stop. B5 found GS/GDP useful. |
| **FlightAware AeroAPI** | **Not used** | Checked 2026-11-06: **the app does not use AeroAPI.** There is no code calling it and no `AEROAPI_KEY` in `flyrely-api/.env` (strategy doc §2 and HANDOFF "already used" are wrong). Commercial use needs the Standard tier (**$100/month minimum**, per `backtest/PLAN_ROADMAP_2026-11.md`). Excluded by free-first; the `StatusSource` interface leaves room for it if Sean approves later. |

### 3.4 Airline manage-booking links and phones

A hand-curated `copilot/data/airlines.json` for the marketing (ticketing) airlines: AA, DL, UA, WN, AS, B6, NK,
F9, G4, HA, SY, plus `MX` (Breeze) and `XP` (Avelo) if present in BTS. Fields: name, manage-trip URL, phone, and
`verified_on` date. Regional operators (OO, YX, MQ…) are never shown as "your airline": the card uses the ticketing
airline from the user's flight. **Every URL and phone must be checked by hand** when the file is written
(acceptance criterion of S-A3); a quarterly re-check is a reminder, not code.

### 3.5 Airport coordinates

`models/airports_ref.csv` (already committed: lat, lon, tz) for hotel searches and ride links. `tz` is also used to
drop alternatives that have already departed when the date is today.

### 3.6 Partners (hand-offs)

| Partner | Use | Plain (no-ID) link | Affiliate mechanism once Sean signs up | Notes |
|---|---|---|---|---|
| Google Flights | flight search | `https://www.google.com/travel/flights?q=Flights+from+JFK+to+LAX+on+2026-11-15` | none (no program) | Always plain. |
| KAYAK | flight search | `https://www.kayak.com/flights/JFK-LAX/2026-11-15` | KAYAK affiliate network param | Rates unverified. |
| Skyscanner | flight search | `https://www.skyscanner.com/transport/flights/jfk/lax/261115/` | Impact tracking wrapper | Needs 5k monthly visitors; bans "booking on behalf" (fine for Phase 1). |
| Expedia | flight + hotel search | Expedia `Flights-Search` / `Hotel-Search` with lat/lon | Travel Creator Program wrapper/param | |
| Travelpayouts (Aviasales, Trip.com…) | flight + hotel | n/a (only used when configured) | `marker` / tp.media wrapper | Open signup, easiest approval. |
| Stay22 | hotel map near airport | n/a (only when configured) | `aid` | Easiest hotel approval. |
| Booking.com | hotel search | `https://www.booking.com/searchresults.html?latitude=..&longitude=..&checkin=..&checkout=..&group_adults=1` | `aid` (CJ/Awin wrapper if program moved) | Plain link is the default hotel fallback. |
| Google Maps | hotel fallback | `https://www.google.com/maps/search/hotels+near+JFK+airport` | none | Last resort. |
| Uber | ride | `https://m.uber.com/ul/?action=setPickup&pickup=my_location[&dropoff[formatted_address]=…]` | optional `client_id` | Documented, no key needed. |
| Lyft | ride | `https://lyft.com/ride?id=lyft` (+ destination lat/lng where known) | unknown | **Format unverified**; S-A2 must test on a phone. If it doesn't open the app, ship Uber only. |

Exact URL formats change; S-A2 verifies each by opening it, and the tests pin the format.

**Link-builder config (generic, so no code change is needed after sign-up):** for each partner `P`,
- `AFFILIATE_<P>_PARAMS` — a query string appended to the partner URL (e.g. `aid=123456`), or
- `AFFILIATE_<P>_WRAP` — a tracking-redirect template containing `{url}` (URL-encoded destination), e.g.
  `https://tp.media/r?marker=123&u={url}`.
If neither is set, the plain link is returned with `is_affiliate: false`. If both are set, `WRAP` wins and a startup
warning is logged. `P` ∈ `KAYAK, SKYSCANNER, EXPEDIA, TRAVELPAYOUTS, STAY22, BOOKING, UBER, LYFT`.
`FLYRELY_COPILOT_HOTEL_PARTNERS` / `FLYRELY_COPILOT_FLIGHT_PARTNERS` (comma lists) set the order; default flights
`google,kayak,skyscanner,expedia`, hotels `stay22,booking,expedia,google_maps` (unconfigured affiliate-only partners
like Stay22 are skipped).

---

## 4. API endpoints and contracts

All under `/copilot`, mounted only when `FLYRELY_FEATURE_DISRUPTION_COPILOT=1`. With the flag off, every path
returns FastAPI's normal 404. All are `GET`/`POST` with JSON, so the existing CORS config needs no change. Pydantic
models live in `copilot/schemas.py`; the app mirrors them in `src/copilot/types.ts`.

Shared object, `FlightRef` (same field meanings as `/predict`'s `FlightRequest`):

```json
{
  "airline": "DL",
  "flight_number": "DL1234",
  "origin": "JFK",
  "destination": "LAX",
  "departure_time": "2026-11-15T14:30:00"
}
```

### 4.1 `GET /copilot/config`

```json
{
  "enabled": true,
  "push": { "enabled": false, "vapid_public_key": null },
  "status_source": "none",
  "affiliate_partners_configured": [],
  "schedule_as_of": "2026-08"
}
```

### 4.2 `POST /copilot/options`

Request:

```json
{
  "flight": { "airline": "DL", "flight_number": "DL1234", "origin": "JFK", "destination": "LAX",
              "departure_time": "2026-11-15T14:30:00" },
  "state": "cancelled",
  "rebooked": null,
  "home_airport": "BOS",
  "max_alternatives": 8
}
```

- `state`: `"at_risk" | "cancelled" | "rebooked"` (the app decides it; the API doesn't second-guess).
- `rebooked`: `null | "today" | "later"` (only with `state: "rebooked"`).
- `home_airport`: optional IATA code. Used for this request only, never stored or logged.
- `max_alternatives`: 1–15, default 8.

Response 200:

```json
{
  "state": "cancelled",
  "context": { "location": "away", "reason": "origin_not_home", "home_airport": "BOS" },
  "airline": {
    "code": "DL", "name": "Delta Air Lines",
    "manage_booking_url": "https://www.delta.com/mytrips/",
    "phone": "+1-800-221-1212", "phone_display": "800-221-1212", "verified_on": "2026-11-10"
  },
  "refund_rights": { "applies": true, "jurisdiction": "US_DOT", "content_key": "us_dot_part260_v1" },
  "alternatives": {
    "source": "bts_typical_schedule",
    "schedule_as_of": "2026-08",
    "date": "2026-11-15",
    "items": [
      {
        "marketing_airline": "AA", "flight_number": "AA117",
        "operating_airline": "AA", "operating_airline_name": "American Airlines",
        "origin": "JFK", "destination": "LAX",
        "dep_local": "2026-11-15T16:00:00", "arr_local": "2026-11-15T19:25:00",
        "delay_probability": 0.17, "risk_level": "low",
        "days_seen": 8,
        "handoffs": [
          { "partner": "google_flights", "label": "Google Flights", "url": "https://www.google.com/travel/flights?q=...", "is_affiliate": false },
          { "partner": "kayak", "label": "KAYAK", "url": "https://www.kayak.com/flights/JFK-LAX/2026-11-15", "is_affiliate": false }
        ]
      }
    ],
    "search_handoffs": [
      { "partner": "google_flights", "label": "Google Flights", "url": "...", "is_affiliate": false },
      { "partner": "kayak", "label": "KAYAK", "url": "...", "is_affiliate": false },
      { "partner": "skyscanner", "label": "Skyscanner", "url": "...", "is_affiliate": false },
      { "partner": "expedia", "label": "Expedia", "url": "...", "is_affiliate": false }
    ],
    "warnings": []
  },
  "hotel": {
    "airport": "JFK", "check_in": "2026-11-15", "check_out": "2026-11-16",
    "links": [ { "partner": "booking", "label": "Booking.com", "url": "...", "is_affiliate": false } ]
  },
  "ride": {
    "purpose": "to_hotel",
    "links": [
      { "partner": "uber", "label": "Uber", "url": "https://m.uber.com/ul/?action=setPickup&pickup=my_location", "is_affiliate": false, "accepts_dropoff_address": true },
      { "partner": "lyft", "label": "Lyft", "url": "https://lyft.com/ride?id=lyft", "is_affiliate": false, "accepts_dropoff_address": false }
    ]
  },
  "disclosure": { "required": false },
  "warnings": []
}
```

Rules:
- `context.location`: `"home"` when origin is the home airport (or the same metro group); `"away"` when it isn't;
  `"unknown"` when `home_airport` is absent. `reason` ∈ `origin_is_home | origin_not_home | no_home_airport`.
- `hotel` is `null` unless `location == "away"` **and** (`state == "cancelled"` or (`state == "rebooked"` and
  `rebooked == "later"`)). `check_in` = the flight's local date; if the local time at the airport is after 03:00 and
  before the flight date (rare) use today.
- `ride.purpose`: `"to_hotel"` (away), `"home"` (home), `null` with empty links (unknown, or rebooked today).
- `alternatives.items` excludes the user's own flight (marketing or operating number match), flights already
  departed (airport-local now, from `airports_ref.tz`), and is sorted by `delay_probability` ascending, then
  departure time. For `state == "at_risk"` the same list is returned (the app labels it "If you need a backup").
- `refund_rights.applies` = origin or destination is a US airport in `airports_ref` (state column set).
- `disclosure.required` = any returned link has `is_affiliate: true`.
- The scorer failing (model not loaded) → items still returned with `delay_probability: null`,
  `risk_level: null`, sorted by time, and warning `"risk_unavailable"`. The endpoint never returns 503 for that.

Errors: 422 for validation (unknown airport codes → 422 with `detail.reason = "unknown_airport"`).

### 4.3 `POST /copilot/status`

Request: `{ "flight": FlightRef }`.
Response:

```json
{ "status": "unknown", "source": "none", "as_of": null, "detail": null }
```

`status` ∈ `unknown | scheduled | delayed | cancelled | departed | arrived`. With the stub source it is always
`unknown`. The app polls it at most every 10 minutes while the flight details screen is open and within 24 h of
departure, and only when `config.status_source != "none"`.

### 4.4 `POST /copilot/push/subscribe` (only when `FLYRELY_COPILOT_PUSH=1`)

Request:

```json
{
  "subscription": { "endpoint": "https://web.push.apple.com/...", "keys": { "p256dh": "...", "auth": "..." } },
  "flight": { "airline": "DL", "flight_number": "DL1234", "origin": "JFK", "destination": "LAX",
              "departure_time": "2026-11-15T14:30:00" },
  "client_flight_id": "flight-1730000000000"
}
```

Response 201: `{ "watch_id": "w_7f3c…", "expires_at": "2026-11-16T22:30:00Z" }`.
Idempotent on (endpoint, flight). Max 20 active watches per endpoint (429 above that). Rejects endpoints whose host
is not a known push service (`*.push.apple.com`, `fcm.googleapis.com`, `updates.push.services.mozilla.com`,
`*.notify.windows.com`) to prevent SSRF.

### 4.5 `POST /copilot/push/unsubscribe`

Request: `{ "endpoint": "...", "watch_id": "w_7f3c…" }` (omit `watch_id` to remove all watches for the endpoint).
Response 200: `{ "removed": 1 }`.

### 4.6 Push payload (server → service worker)

```json
{
  "v": 1,
  "kind": "at_risk_heads_up",
  "title": "DL1234 tomorrow: high delay risk",
  "body": "34% chance of a 15+ min delay. Tap for your Plan B.",
  "url": "/flights/flight-1730000000000",
  "client_flight_id": "flight-1730000000000"
}
```

`kind` ∈ `at_risk_heads_up | cancelled | test`. Content never includes the home airport or any partner link.

### 4.7 Watcher (no endpoint)

`copilot/watcher.py` runs as an asyncio task started in `mount()` when both flags are on (and
`FLYRELY_COPILOT_WATCHER=1`, so a second API replica can opt out). Every `FLYRELY_COPILOT_WATCH_INTERVAL_S` (default
900 s):
1. delete watches past `expires_at`;
2. for each watch within 24 h of departure that has not had `at_risk_heads_up`: score it; if `high`, send once;
3. for each watch, ask the status source; on a new `cancelled`, send once;
4. on HTTP 404/410 from the push service, delete the watch.
State per watch: `last_kind_sent`, `sent_at`. Sends are best-effort and logged without the endpoint URL.

---

## 5. Feature flags and config

| Name | Repo | Default | Effect |
|---|---|---|---|
| `FLYRELY_FEATURE_DISRUPTION_COPILOT` | API | unset (off) | `"1"` mounts `/copilot/*`. Off: no routes, no imports of `copilot/`, no watcher. |
| `FLYRELY_COPILOT_PUSH` | API | unset (off) | `"1"` enables the push endpoints and the watcher. Requires the VAPID vars. |
| `FLYRELY_COPILOT_WATCHER` | API | `"1"` when push is on | `"0"` disables the background loop on this instance. |
| `FLYRELY_COPILOT_WATCH_INTERVAL_S` | API | `900` | Watcher period. |
| `FLYRELY_COPILOT_STATUS_SOURCE` | API | `none` | `none` or `swim` (stub until roadmap R3). |
| `FLYRELY_COPILOT_VAPID_PUBLIC_KEY`, `FLYRELY_COPILOT_VAPID_PRIVATE_KEY`, `FLYRELY_COPILOT_VAPID_SUBJECT` | API | unset | Generated once by `scripts/gen_vapid_keys.py`. Subject is `mailto:` or the app's https URL (blocked on the domain, §12). Private key is a secret: `.env` / host secrets only. |
| `FLYRELY_COPILOT_FLIGHT_PARTNERS`, `FLYRELY_COPILOT_HOTEL_PARTNERS` | API | see §3.6 | Partner order. |
| `AFFILIATE_<P>_PARAMS`, `AFFILIATE_<P>_WRAP` | API | unset | Affiliate IDs (§3.6). Not secrets, but keep them in env so links change without a deploy of code. |
| `VITE_FEATURE_DISRUPTION_COPILOT` | app | unset (off) | `"true"` includes the copilot in the build and renders the slot. Build-time. |
| `VITE_FEATURE_COPILOT_PUSH` | app | unset (off) | `"true"` adds the manifest link, registers `/sw.js`, and shows the "Alert me" toggle. Requires the master flag. |

The app flags are **build-time** (Vite). Turning the copilot on in production means a rebuild with the variable set;
that's intended, because a flag-off build then contains none of the copilot code. The API also reports
`enabled` in `/copilot/config`; if the app flag is on but the API flag is off, the panel shows nothing (404 →
hidden, logged to console once).

---

## 6. Web push (does not exist yet; plan)

Checked 2026-11-06: the app has **no** web manifest, no service worker, no `public/` folder and no Notification code.
The product spec's FCM/SendGrid/Twilio plan was never built.

Plan ($0):
- `public/manifest.webmanifest` (`name`, `short_name`, `start_url: "/"`, `display: "standalone"`, theme colours from
  tailwind tokens, 192/512 icons). iOS only allows web push for **Home Screen web apps (iOS 16.4+)**, so this is
  required on iPhone.
- `public/sw.js`, hand-written, no Workbox: handles `push` (show notification from §4.6 payload) and
  `notificationclick` (focus/open `payload.url`). **No fetch handler and no caching**, so the service worker cannot
  change how the core app loads.
- `src/copilot/push.ts`: feature-detect (`'serviceWorker' in navigator && 'PushManager' in window`); on iOS, if not
  `navigator.standalone`, show "Add FlyRely to your Home Screen to get alerts" instructions instead of a broken
  toggle; request permission **only from the user's tap** on "Alert me" (Safari requires a user gesture); subscribe
  with the VAPID public key from `/copilot/config`; send to `/copilot/push/subscribe`.
- Server: `pywebpush` (MIT, free) + VAPID. Push services (Apple, Google, Mozilla) are free; no Apple developer
  account is needed for web push.
- Delivery depends on the API running somewhere always-on (Oracle Always Free per `ORACLE_SIGNUP.md`, or the spare
  Mac). Until hosting is back, push can only be tested locally (Chrome desktop works on `http://localhost`; iOS needs
  a real HTTPS domain).
- **Honest expectation for Phase 1:** with the static booking model and no live status, the only automatic push is
  the one-time T-24h "high risk" heads-up. Real "your flight was cancelled" pushes arrive with SWIM R3 (or the
  optional FAA NAS step).

---

## 7. UI components

Reuse the existing design system (`src/components/ui`: `Card`, `Alert`, `Pill`, `Button`, `IconButton`, `Modal`,
`SectionHeader`, `OptionTile`, `Divider`, `Input`/`FieldBox`, `Toast`; `src/components/flight`: `RiskPill`,
`PredictionPanel`). The flight details screen is dark (`Card tone="dark"`); new components need dark variants.

| Component (new, `src/components/copilot/`) | Built from | Tag |
|---|---|---|
| `DisruptionCard` — shell with collapsed/expanded, state header ("Cancelled", "Plan B") | `Card` dark, `SectionHeader onDark`, `Pill` | [designer] (no Figma frame exists in "Aviato"; designer drafts frames in Figma from existing tokens, then builds) |
| `AirlineActionRow` — "Rebook with Delta" button + phone | `Button`, `IconButton` | [designer] |
| `RefundRightsNotice` — explainer with the ⚠️ forfeit warning, expandable | `Alert status="warning"` + body text | [designer] |
| `AlternativeFlightRow` — airline, times, `RiskPill`, "Check seats" | `RiskPill`, `Button size="sm"` | [designer] |
| `HandoffLinkGroup` — row of partner buttons (`<a>`, external icon, `rel` rules) | `Button variant="secondary"` styles on `<a>` | [designer] |
| `StayAndRideBlock` — hotel link + Uber/Lyft + optional address input | `OptionTile`, `Input` | [designer] |
| `AffiliateDisclosure` — one-line disclosure + "How we choose these" modal | `Modal`, text | [executor] (copy is fixed in §1) |
| `HomeAirportModal` — airport picker reusing the add-flight autocomplete data | `Modal`, `Input`, `src/lib/airports.ts` | [implementer] |
| `PushToggle` — "Alert me" with iOS Add-to-Home-Screen help | `Button`, `Modal` | [implementer] (logic-heavy) |

Gallery: `src/components/copilot/CopilotGallery.tsx` (sample props, clearly labelled), rendered by one added line in
the dev-only `app/routes/design-system.tsx`.

Hard rules carried over from the designer agent: no invented flight data on real screens; risk is shown as a level
and a chance, never minutes.

---

## 8. Privacy notes

- **No GPS, no location permission.** "Away" is inferred from the flight's origin and a home airport the user types
  once.
- **Home airport is stored on the device only** (`localStorage` key `flyrely_copilot_v1`). It is sent with
  `/copilot/options` requests and used only to compute `context`; the API must not log or persist it (test asserts
  the usage log and prediction log contain no `home_airport`).
- **Hotel address** (optional, for the Uber drop-off) is typed into the card, used to build a link on the device,
  and never sent to FlyRely.
- **Ride home** never asks for a home address; the ride app's own saved Home is used.
- **Push subscriptions** are the only new server-side data: push endpoint + keys + the flight's public schedule
  identifiers + `client_flight_id`. No account id, email, IP or home airport. Rows are deleted at
  `expires_at` (scheduled departure + 24 h) or on 404/410, or when the user turns alerts off. Postgres table gets RLS
  on with no policies, like `predictions`/`outcomes`.
- **Logging:** never log push endpoints, keys, or the request body of `/copilot/options`; log counts only.
- **Affiliate links:** partners may set cookies once the user leaves FlyRely. FlyRely sends no user id to partners
  (no `subid` with personal data; a fixed `subid=copilot` is allowed).
- **Click tracking** (strategy step 1.8) is **not** in this plan's first pass; if added later it counts clicks per
  partner per day with no user or flight identifiers.
- **Privacy policy:** FlyRely has no privacy policy page yet (none found in `flyrely-app`). One is needed before the
  flag is turned on in production and before affiliate applications (they ask for it). Blocker for Sean (§12).
- **SWIM obligations:** any status shown from SWIM must honour the LADD list (airline flights are rarely affected)
  and the outage wording rule in HANDOFF.

---

## 9. Core-file edits (keep tiny; merge to main early behind the flag)

| Repo | File | Edit | Step |
|---|---|---|---|
| app | `app/routes/flights/$flightId/index.tsx` | +1 import, +1 line `<DisruptionSlot flight={flight} onFlightChange={setFlight} />` after the prediction `Card` | S-P1 |
| app | `src/vite-env.d.ts` | +2 optional env typings | S-P1 |
| app | `package.json`, `package-lock.json` | `vitest` dev dependency + `"test": "vitest run"` script | S-P1 |
| app | `.github/workflows/ci.yml` | add `npm test`; add a second build with `VITE_FEATURE_DISRUPTION_COPILOT=true`; sentinel check that the flag-off build has no `__flyrely_copilot__` string | S-P1 |
| app | `app/routes/__root.tsx` | +1 import, spread `copilotHeadLinks()` into `links` (returns `[]` when push flag off), +1 `<CopilotBootstrap />` (returns null when off) | S-P5 |
| app | `app/routes/design-system.tsx` (dev-only) | +1 import, +1 `<CopilotGallery />` | S-P3 |
| api | `main.py` | ~4 lines at the end: `if os.getenv("FLYRELY_FEATURE_DISRUPTION_COPILOT") == "1": from copilot import mount; mount(app, score=_copilot_scorer())` plus a ~10-line `_copilot_scorer()` helper that wraps `build_features` + `model_service` (no logging) | S-A1 |
| api | `requirements.txt` | `+pywebpush` (imported lazily inside `copilot/push.py`) | S-A8 |

No other core file changes are allowed without updating this table. `app/routeTree.gen.ts` must not change (no new
routes). `src/types/index.ts`, `src/lib/flightStore.ts` and `src/lib/api.ts` are **not** touched: copilot state lives
in its own localStorage key and its own client.

---

## 10. Build steps

Legend: **‖** = can run in parallel with the other ‖ steps of the same wave (disjoint files). Every step: branch from
`feat/disruption-copilot`, PR into `feat/disruption-copilot`, CI green (wait for real checks, CI runs Ubuntu), then
merge. Acceptance always includes: flag-off behaviour unchanged (API tests pass with the flag unset; app builds and
the sentinel check passes).

### Wave 1 — start immediately, all in parallel

| ID | Tag | Repo | Files | Acceptance criteria | Deps |
|---|---|---|---|---|---|
| **S-A1** ‖ | [implementer] | api | `copilot/__init__.py` (`mount`), `copilot/config.py`, `copilot/router.py` (`GET /copilot/config`), `copilot/schemas.py` (all §4 models), `main.py` (§9), `tests/test_copilot_flag.py` | Flag unset → `main.app` has no `/copilot` routes and `GET /copilot/config` is 404. Flag on (test builds a fresh app via `mount`) → §4.1 shape. `copilot/` never imports `main`. Existing tests pass. | — |
| **S-A2** ‖ | [executor] | api | `copilot/links.py`, `copilot/partners.py`, `tests/test_copilot_links.py` | Builders for every partner in §3.6 (flights by route+date, hotels by lat/lon+dates, rides). With no env → plain URLs, `is_affiliate=false`. `_PARAMS` appended correctly to URLs with/without existing query; `_WRAP` URL-encodes the destination; both set → WRAP wins. Unknown partner names in the order lists are ignored with a warning. Each format opened by hand once and noted in a comment with the date (Lyft result reported). | — |
| **S-A3** ‖ | [executor] | api | `copilot/data/airlines.json`, `copilot/airlines.py`, `tests/test_copilot_airlines.py` | All carriers in §3.4 with https manage-trip URL, phone, `verified_on`. Each URL and phone checked by hand on the airline's site (list sources in the PR). Lookup by marketing code; unknown code → `null` (card falls back to "Contact your airline"). | — |
| **S-A4** ‖ | [implementer] | api | `scripts/build_route_schedule.py`, `models/route_schedule.csv.gz`, `copilot/schedule.py` (`ScheduleSource`, `BtsTypicalSchedule`, `SwimScheduleSource` stub), `tests/test_copilot_schedule.py` (small fixture CSV, not the real artifact) | Artifact built from the latest 8 weeks of `data/bts/parquet_v2`; ≤ 2 MB gzipped; header documented; `schedule_as_of` = latest month. `flights_on(origin, dest, date)` returns that weekday's flights. Loader is lazy (first call), so API start-up time with the flag off is unchanged. Does **not** touch `backtest/` or `flyrely_features/` (holdout freeze). | — |
| **S-A5** ‖ | [executor] | api | `copilot/status.py`, `copilot/context.py`, `tests/test_copilot_status_context.py` | `StatusSource` protocol; `NullStatusSource` → `unknown`; `SwimLiveStateSource` raises `SourceNotConfigured` with a docstring naming roadmap R3; factory reads `FLYRELY_COPILOT_STATUS_SOURCE`. `context.location()` table-tested: home / away / unknown, metro groups (NYC JFK/LGA/EWR, CHI ORD/MDW, WAS DCA/IAD/BWI, BAY SFO/OAK/SJC, LA LAX/BUR/LGB/SNA/ONT, MIA/FLL, DFW/DAL, IAH/HOU). | — |
| **S-P1** ‖ | [implementer] | app | `src/copilot/flags.ts`, `src/copilot/DisruptionSlot.tsx`, `src/copilot/DisruptionPanel.tsx` (placeholder returning `null` with the `__flyrely_copilot__` sentinel), `vitest.config.ts`, `src/copilot/__tests__/flags.test.ts`, §9 core edits (flight route, vite-env, package.json, ci.yml) | Flag unset: flight details screen pixel-identical; `npm run build` output contains no `__flyrely_copilot__`. Flag `true`: build contains it; slot renders the placeholder. `npm test`, typecheck and both builds pass in CI. `routeTree.gen.ts` unchanged. | — |
| **S-P2** ‖ | [executor] | app | `src/copilot/types.ts` (mirror of §4), `src/copilot/api.ts`, `src/copilot/prefs.ts`, `src/copilot/rides.ts`, `src/copilot/__tests__/{prefs,rides}.test.ts` | Types match §4 exactly. `prefs`: get/set home airport, per-flight user state (`cancelled`/`rebooked_today`/`rebooked_later`/`not_cancelled`), clear on flight removal is a no-op-safe read; SSR-safe (`typeof window`). `rides.ts`: adds `dropoff[formatted_address]` to an Uber link, URL-encoded. Tests run once S-P1's vitest config is merged (files don't overlap, so write in parallel; merge after S-P1). | S-P1 (merge order only) |
| **S-P3** ‖ | [designer] | app | Figma: new "Disruption copilot" frames in file `RbpMcF4XXvs7mIP9FD8q2s`; code: `src/components/copilot/*` (presentational, props only, no fetching), `src/components/copilot/index.ts`, `CopilotGallery.tsx`, 1 line in `app/routes/design-system.tsx` | Components in §7 tagged [designer], dark variants, keyboard focus, labels, contrast AA. External links use `<a target="_blank" rel="noopener noreferrer[ sponsored]">`. Gallery shows every state (at risk collapsed, cancelled, rebooked today/later, away/home/unknown, no alternatives, affiliate vs plain). Screenshots at 393×852. **Sean (or his designer) approves the Figma frames before the code PR merges.** | — |

### Wave 2

| ID | Tag | Repo | Files | Acceptance criteria | Deps |
|---|---|---|---|---|---|
| **S-A6** | [implementer] | api | `copilot/options.py`, `copilot/router.py` (add `/options`, `/status`), `tests/test_copilot_options.py` | §4.2/§4.3 contracts exactly, incl. the rules list. Ranking uses the injected scorer; scorer failure path tested. Own flight excluded; departed flights excluded using airport tz (test with a frozen clock). Non-US route → `refund_rights.applies=false`, no items, search hand-offs only. `home_airport` absent from all logs (assert on caplog + usage log). p95 < 300 ms for a 40-flight route locally. | S-A1–S-A5 |
| **S-P4** | [implementer] | app | `src/copilot/DisruptionPanel.tsx` (real), `src/copilot/useCopilotOptions.ts` (react-query), `src/copilot/content.ts` (refund-rights copy, §1), `src/components/copilot/HomeAirportModal.tsx`, `AffiliateDisclosure.tsx`, tests | State machine §1 (normal / at risk / cancelled / rebooked) driven by `flight.riskLevel` + `prefs` + `/copilot/status`. Home-airport prompt per the UX decision (default: inline prompt on first disruption + "change" link opening the modal). Hotel address field builds the Uber link locally. 404 from `/copilot/*` → panel hidden. Refund copy reviewed word-for-word against §1 by `reviewer`. Works against a local API with the flag on (manual run, screenshots). | S-P1, S-P2, S-P3, S-A6 (can develop against §4 fixtures before S-A6 merges) |

### Wave 3 (push)

| ID | Tag | Repo | Files | Acceptance criteria | Deps |
|---|---|---|---|---|---|
| **S-A7** ‖ | [implementer] | api | `copilot/push_store.py`, `migrations/003_copilot_push.sql`, `copilot/router.py` (subscribe/unsubscribe), `scripts/gen_vapid_keys.py`, `tests/test_copilot_push_store.py` | SQLite default, Postgres when `DATABASE_URL` (same pattern as `prediction_log.PredictionStore`); RLS on, no policies. Idempotent subscribe, 20-watch cap, push-host allowlist (SSRF test), unsubscribe. Endpoints 404 unless `FLYRELY_COPILOT_PUSH=1`. | S-A1 |
| **S-A8** | [implementer] | api | `copilot/push.py`, `copilot/watcher.py`, `requirements.txt`, `tests/test_copilot_watcher.py` | pywebpush lazily imported; watcher with injected clock/sender/status source: sends `at_risk_heads_up` once within 24 h for high risk, `cancelled` once on status change, deletes on 404/410 and after expiry; never logs endpoints. Started only when master + push + watcher flags are on; cancelled cleanly on shutdown. | S-A5, S-A6, S-A7 |
| **S-P5** ‖ | [implementer] | app | `public/manifest.webmanifest`, `public/sw.js`, `public/icons/*`, `src/copilot/push.ts`, `src/copilot/CopilotHead.tsx` (`copilotHeadLinks`, `CopilotBootstrap`), `src/components/copilot/PushToggle.tsx`, `__root.tsx` (§9) | Push flag off: no manifest link, no SW registered (check `navigator.serviceWorker.getRegistrations()` empty), build sentinel check still passes. On: Chrome desktop localhost receives a `test` push end-to-end; iOS non-standalone shows Add-to-Home-Screen help; permission requested only on tap; SW has no fetch handler. Real-iPhone test deferred until an HTTPS domain exists (§12). | S-P1, S-P4 (toggle placement), S-A7 for e2e |

### Wave 4 (optional / later)

| ID | Tag | Repo | What | Deps |
|---|---|---|---|---|
| S-A9 | [implementer] | api | Metro alternatives (other airports in the same metro group, flagged "from LGA") | S-A6 |
| S-A10 | [implementer] | api | `FaaNasStatusSource`: origin ground stop / GDP → "at risk" + push (free nasstatus.faa.gov) | S-A5, S-A8 |
| S-A11 | [implementer] | api | `SwimLiveStateSource` real implementation | roadmap R2 + R3 |
| S-A12 | [executor] | api | Monthly `route_schedule` refresh (run script, commit artifact) | BTS release |
| S-P6 | [executor] | app | Privacy policy + affiliate disclosure page content (static), once Sean decides hosting/entity | Sean (§12) |
| S-X1 | [executor] | both | Partner-click counter (per partner per day, no ids) | privacy policy |

### Review and merge to main

- **S-R1 [reviewer]** after Wave 2 (first usable card), and **S-R2 [reviewer]** after Wave 3. Review the whole
  `feat/disruption-copilot` diff against `main`/`master`, with special attention to §9 (core edits), §8 (privacy)
  and the refund-rights copy.
- **Early "hooks" merge (recommended, not done now):** after S-A1 and S-P1 are reviewed, the hook lines plus the
  flag modules and placeholder panel can go to `main`/`master` in one small PR each, flag off. That shrinks future
  conflicts to zero in core files. Requires Sean's go-ahead; this plan does not open PRs to `main`/`master`.
- **Full merge to main** only when Sean asks, after S-R2, with the flag still off in production.

### Parallelism summary

Wave 1 has **eight** independent steps: S-A1, S-A2, S-A3, S-A4, S-A5 (API) and S-P1, S-P2, S-P3 (app). Their file
sets are disjoint. Only S-A1 touches `main.py`; only S-P1 touches the app's core files; S-P2 merges after S-P1
(shared test config). S-A7 and S-P5 can run in parallel with each other in Wave 3.

---

## 11. Test strategy

- **API unit tests (pytest, CI on Ubuntu):** link builder (plain/params/wrap, encoding), airlines lookup, schedule
  query on a fixture CSV, context table, status factory, options composer with a fake scorer and frozen clock,
  push store (SQLite; Postgres round-trip skipped unless `TEST_DATABASE_URL`), watcher with fakes.
- **Flag guard tests:** with the env unset, `main.app.routes` contains no `/copilot` path and no `copilot` module is
  imported (`"copilot" not in sys.modules` after `import main` in a subprocess).
- **Contract test:** a JSON fixture per §4 response lives in `flyrely-api/tests/fixtures/copilot/` and is copied into
  `flyrely-app/src/copilot/__tests__/fixtures/`; both sides validate against it (pydantic on the API, a zod schema
  in the app). Changing a contract means changing both fixtures in the same pair of PRs.
- **App unit tests (vitest, new):** flags, prefs, rides, state machine reducer, response parsing.
- **Build checks (CI):** typecheck; build flag-off + sentinel absent; build flag-on + sentinel present.
- **Manual QA checklist (in each UI PR):** 393×852 screenshots for each card state; every hand-off link opens the
  right search (route/date/airport prefilled); Uber/Lyft on a real phone; push on Chrome desktop; iOS Home Screen
  push once a domain exists.
- **No live network in tests.** Partner URLs are asserted as strings, never fetched.

---

## 12. Blocked on Sean

1. **Affiliate sign-ups** (free; he must do them, identity/tax details): Travelpayouts and Stay22 first (easiest),
   then Expedia Travel Creator, Booking.com (CJ/Awin), KAYAK. Skyscanner needs 5k monthly visitors, so later. Most
   ask for a live website and a privacy policy → depends on items 3 and 4. Until then, every link is plain
   (`is_affiliate: false`), which is fully functional. After sign-up, he sends the IDs/tracking templates and we set
   `AFFILIATE_<P>_*` env vars; no code change.
2. **Home-airport UX decision.** Options: (a) ask inline the first time a disruption card appears, plus a "change"
   link (**recommended**, zero friction for users who never see a disruption); (b) ask during onboarding/add-flight;
   (c) a setting on the Account screen (would edit a core file). The build defaults to (a); S-P4 waits for Sean only
   if he wants (b) or (c).
3. **Deep-link / app domain.** The production HTTPS origin of the app (the live app is down; Railway returns
   "Application not found"). Needed for: iOS web push (HTTPS + Home Screen), the manifest scope, the VAPID subject,
   push notification click URLs, `FLYRELY_ALLOWED_ORIGINS`, and affiliate applications. Also confirm whether he owns
   a domain (e.g. flyrely.app / flyrely.com) or will use the Oracle VM's hostname.
4. **Privacy policy / business details.** No privacy policy exists. Needed before turning the flag on in production
   and for affiliate sign-ups. Related open decision: whether to form an LLC (strategy §9.3).
5. **Hosting for the watcher.** Push alerts need the API running always-on (Oracle Always Free or the spare Mac),
   i.e. HANDOFF to-dos #1/#2/#5.
6. **(Dependency, not a decision)** Real cancellation pushes need SWIM R2 + R3. AeroAPI is **not** in use and would
   cost ≥ $100/month for commercial use; not planned unless Sean approves spend.
