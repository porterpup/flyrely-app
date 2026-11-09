# Plan: cloud-saved flights and real trips for FlyRely

*Written by the read-only planner on 2026-11-09. Nothing was changed. For the main session to save, for example as `flyrely-app/docs/PLAN_CLOUD_FLIGHTS_AND_TRIPS.md`.*

## 0. Summary for Sean

- **Your flights will follow your account.** Sign in on the home-screen app, Safari or another phone and you'll see the same flights.
- **The app keeps working offline.** Changes save on the device straight away and upload when you're back online.
- **Old flights carry over.** Flights already saved on a device are offered to your account once, the first time you sign in on the new version. Nothing is lost and nothing is added twice.
- **Signing out still wipes the device.** Your flights come back when you sign in again because they're in your account. If you have changes that haven't uploaded yet, the app asks before signing you out.
- **A "trip" is one journey from where you start to where you end up**, with its flights in order and the connections between them. Two ways to make one:
  1. Tap **"Add connecting flight"** after adding a flight. This always works.
  2. Accept a **suggestion** on the Trips page ("These look like one trip: SFO → DEN → BNA").
  
  The app never groups flights on its own, because a wrong grouping would later show a wrong missed-connection chance. A return flight is its own trip.
- **Cost: $0.** Supabase free tier, two small tables. Two app releases. No API restart.
- **What you do:** paste one SQL script into Supabase, run one check query, and answer the 3 decisions in section 9. No service-role key is needed anywhere.

## 1. What I checked (read-only)

- **The flight store** is `flyrely-app/src/lib/flightStore.ts`.
  - It uses one localStorage key, `flyrely_flights`, and every function is synchronous: `getFlights`, `saveFlight`, `removeFlight`, `getFlightById`, `getUpcomingFlights`, `getCompletedFlights`, `autoCompleteOldFlights`, `clearAllFlights`, `clearCompletedFlights`, `stampFlightChecked` and `stripLegacyFields`. It also has an unused stub, `attachUserIdToFlight`.
  - Callers: `app/routes/index.tsx`, `trips/index.tsx`, `flights/history.tsx`, `explore/index.tsx`, `flights/$flightId/index.tsx`, `flights/$flightId/edit.tsx`, `flights/add.tsx`, `src/lib/feedback.ts`, and `src/context/AuthContext.tsx` (sign-out calls `clearAllFlights`).
  - Every page loads flights once in a `useEffect`. Nothing re-renders when the data changes.
- **Flight IDs** are `flight-${Date.now()}` (`add.tsx:366`).
  - `flightNumber` holds the full code, e.g. `UA648`.
  - `scheduledDeparture` is local time with no offset: `YYYY-MM-DDTHH:MM:00`.
  - The app stores no arrival time. The lookup already returns `arr_time` and `arr_next_day` (`src/lib/flightLookup.ts`).
- **Supabase in the app:** `src/lib/supabaseAuth.ts` (lazy `getSupabase()`, anon key). `AuthContext.tsx` exposes `user.id`.
- **Supabase in the API:** it already writes to Supabase Postgres through `DATABASE_URL` with psycopg. That covers `prediction_log.py`, `outcomes.py`, `copilot/push_store.py` and migrations 001–003.
  - Those tables use "RLS on, no policies, server connects as postgres, which bypasses RLS".
  - `DATABASE_URL` does not appear in the API env file's key names today, so production probably uses SQLite. I checked key names only, not values.
- **API auth:** `admin_auth._lookup_email` and `feedback.require_user` check the token by calling `/auth/v1/user`. They return an email, not a user id.
- **Section 2.3 of `backtest/PLAN_ARRIVAL_AND_CONNECTIONS.md` constrains the data model:**
  - legs ordered, 1–4;
  - leg *i*'s destination must equal leg *i+1*'s origin;
  - one connection per gap, each with an optional `min_connect_minutes` (MCT = minimum connect time);
  - per leg: `flight_id`, `flight_number`, `airline`, `origin`, `destination`, `departure_time` and `arrival_time`, both local with no offset;
  - `itinerary_id`;
  - the field name **must not be `scheduledArrival`**, because `stripLegacyFields` deletes it. Use `scheduledArrivalLocal`;
  - planned new `Flight` fields: `scheduledArrivalLocal`, `arrivalSource`, `tripId`, `legIndex`.
  
  This plan uses those exact names, so 2.3 can build on it unchanged.
- **Migration numbering:** 2.3 reserves `migrations/004_arrival_itinerary.sql`. This plan uses **`005_user_flights_trips.sql`**. The two don't depend on each other.
- **`public/sw.js`** only handles push. It has no fetch handler or cache, so Supabase calls are never served stale.
- **Deploy** is `flyrely-api/deploy/macmini/build-web.sh` followed by a restart of the web launchd job. `HANDOFF.md` and `AGENT_HANDOVER.md` still describe Railway and are out of date.

## 2. Decision 1: storage path

**Recommendation: the app talks to Supabase (PostgREST) directly, protected by Row Level Security. The FastAPI is not in the save path.**

Reasons:

1. **It works when the Mac mini is down.** Saving and reading flights doesn't depend on the Mac mini, launchd or the Tailscale Funnel. Only predictions do. Going through FastAPI would make the API a second point of failure for basic app use.
2. **Less to build.** The app already has the supabase-js client and the user's session. Going through FastAPI would mean new CRUD endpoints, request validation, a `/auth/v1/user` round trip on every call (or JWT verification), and a connection pool on the Mac mini.
3. **The database enforces privacy.** The RLS rule `auth.uid() = user_id` holds even if app code has a bug. Format CHECK constraints and triggers handle validation and conflicts, so the database doesn't trust the client.
4. **Later server-side alerts still work.** The API already connects to the same Postgres through `DATABASE_URL` and reads tables directly, as it does for `predictions` and `outcomes`. An alerts job can read `public.user_flights` with no app change. Even better, when alerts are built, Sean creates a read-only role with a select-all policy on just these two tables, so the alerts job doesn't need the all-powerful postgres URL. That SQL is in section 3 as "later, not now". Neither path needs the service-role key.
5. **$0.** About 1 KB per flight is far below the free tier's 500 MB.

Downside: business rules live partly in the client. Mitigations: CHECK constraints, a trigger that enforces the conflict rule and protects `user_id`, no DELETE permission for the app, and two RPCs (`import_flights`, `set_trip_legs`) for the operations that must be all-or-nothing.

## 3. Decision 2: schema (SQL ready to paste)

**Design:**
- **`user_flights`** has one row per tracked flight.
  - Key columns that the server will need for alerts are real columns.
  - The full app `Flight` object is stored in `data jsonb`, for quick offline display.
  - Trip membership lives on the flight (`trip_id`, `leg_index`), so leg order is a database fact.
  - The connection override sits on the later leg of each connection (`connect_mct_override` means "minimum connect time before this leg"), so the number of connections always equals legs − 1.
- **`user_trips`** holds the trip header. Trip IDs are generated on the device so trips can be created offline.
- **Deletes are soft** (`deleted_at`). A deleted flight never comes back, even if an older offline edit arrives later.

Commit this file verbatim as `flyrely-api/migrations/005_user_flights_trips.sql`; it is also the text Sean pastes.

```sql
-- 005_user_flights_trips.sql : FlyRely cloud-saved flights and trips.
-- Paste into Supabase > SQL Editor > New query > Run. Safe to run twice.
-- Unlike 001-003, these tables ARE read/written by the app (role `authenticated`) under RLS: each user sees only
-- their own rows. Server jobs (later alerts) read via DATABASE_URL or a dedicated read-only role (see bottom).

-- ---------- tables ----------
create table if not exists public.user_trips (
    user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
    id                uuid not null,                                -- generated on the device (crypto.randomUUID)
    name              text check (name is null or char_length(name) between 1 and 80),
    client_updated_at timestamptz not null default now(),           -- device edit time: newest edit wins
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),           -- server receive time (trigger)
    deleted_at        timestamptz,
    primary key (user_id, id)
);

create table if not exists public.user_flights (
    user_id                   uuid not null default auth.uid() references auth.users(id) on delete cascade,
    id                        text not null check (char_length(id) between 1 and 64),  -- app Flight.id
    airline_code              text not null check (airline_code ~ '^[A-Z0-9]{2,3}$'),
    flight_number             text not null check (char_length(flight_number) between 2 and 10
                                                   and flight_number = upper(flight_number)),  -- e.g. UA648
    origin                    text not null check (origin ~ '^[A-Z0-9]{3,4}$'),
    destination               text not null check (destination ~ '^[A-Z0-9]{3,4}$'),
    scheduled_departure_local timestamp not null,                   -- local wall clock at origin
    scheduled_arrival_local   timestamp,                            -- local wall clock at destination
    trip_id                   uuid,
    leg_index                 smallint check (leg_index between 0 and 3),          -- 4 legs max (plan 2.3)
    connect_mct_override      smallint check (connect_mct_override between 10 and 240), -- min connect before THIS leg
    data                      jsonb not null default '{}'::jsonb
                              check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 32768),
    client_updated_at         timestamptz not null default now(),
    created_at                timestamptz not null default now(),
    updated_at                timestamptz not null default now(),
    deleted_at                timestamptz,
    primary key (user_id, id),
    foreign key (user_id, trip_id) references public.user_trips (user_id, id),
    check ((trip_id is null) = (leg_index is null)),
    check (connect_mct_override is null or (trip_id is not null and leg_index > 0)),
    check (origin <> destination)
);

-- ---------- indexes ----------
-- No duplicates: one live row per user + flight + origin + departure (catches the same flight added on two devices).
create unique index if not exists ux_user_flights_natural
    on public.user_flights (user_id, flight_number, origin, scheduled_departure_local) where deleted_at is null;
-- One flight per leg position in a trip.
create unique index if not exists ux_user_flights_trip_leg
    on public.user_flights (user_id, trip_id, leg_index) where trip_id is not null and deleted_at is null;
-- Server-side alert scans ("flights departing in the next N hours").
create index if not exists ix_user_flights_upcoming
    on public.user_flights (scheduled_departure_local) where deleted_at is null;
create index if not exists ix_user_flights_trip on public.user_flights (user_id, trip_id) where trip_id is not null;

-- ---------- sync guard trigger (conflict rule lives in the database) ----------
create or replace function public.flyrely_sync_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
    -- A device with a wrong clock can't lock out future edits.
    if new.client_updated_at > now() + interval '5 minutes' then
        new.client_updated_at := now();
    end if;
    if tg_op = 'UPDATE' then
        if old.deleted_at is not null then
            return null;                               -- deleted rows stay deleted (skip the update)
        end if;
        if new.deleted_at is null and new.client_updated_at < old.client_updated_at then
            return null;                               -- an older edit never overwrites a newer one
        end if;                                        -- (a delete always wins)
        new.user_id := old.user_id;
        new.created_at := old.created_at;
    else
        new.created_at := now();
    end if;
    new.updated_at := now();
    return new;
end $$;

drop trigger if exists trg_user_flights_guard on public.user_flights;
create trigger trg_user_flights_guard before insert or update on public.user_flights
    for each row execute function public.flyrely_sync_guard();
drop trigger if exists trg_user_trips_guard on public.user_trips;
create trigger trg_user_trips_guard before insert or update on public.user_trips
    for each row execute function public.flyrely_sync_guard();

-- ---------- row level security ----------
alter table public.user_flights enable row level security;
alter table public.user_trips   enable row level security;

drop policy if exists "own flights select" on public.user_flights;
drop policy if exists "own flights insert" on public.user_flights;
drop policy if exists "own flights update" on public.user_flights;
create policy "own flights select" on public.user_flights for select to authenticated
    using ((select auth.uid()) = user_id);
create policy "own flights insert" on public.user_flights for insert to authenticated
    with check ((select auth.uid()) = user_id);
create policy "own flights update" on public.user_flights for update to authenticated
    using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own trips select" on public.user_trips;
drop policy if exists "own trips insert" on public.user_trips;
drop policy if exists "own trips update" on public.user_trips;
create policy "own trips select" on public.user_trips for select to authenticated
    using ((select auth.uid()) = user_id);
create policy "own trips insert" on public.user_trips for insert to authenticated
    with check ((select auth.uid()) = user_id);
create policy "own trips update" on public.user_trips for update to authenticated
    using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- No DELETE policy: the app soft-deletes. Rows go away only when the auth user is deleted (cascade).

revoke all on public.user_flights, public.user_trips from anon;
revoke all on public.user_flights, public.user_trips from authenticated;
grant select, insert, update on public.user_flights, public.user_trips to authenticated;

-- ---------- RPC: one-time import of a device's old localStorage flights (idempotent, no duplicates) ----------
create or replace function public.import_flights(p_rows jsonb) returns integer
language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
    if auth.uid() is null then raise exception 'not signed in'; end if;
    if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 500 then
        raise exception 'expected an array of at most 500 flights';
    end if;
    insert into public.user_flights (user_id, id, airline_code, flight_number, origin, destination,
                                     scheduled_departure_local, scheduled_arrival_local, data, client_updated_at)
    select auth.uid(), r.id, r.airline_code, r.flight_number, r.origin, r.destination,
           r.scheduled_departure_local, r.scheduled_arrival_local, coalesce(r.data, '{}'::jsonb),
           coalesce(r.client_updated_at, now())
    from jsonb_to_recordset(p_rows) as r(id text, airline_code text, flight_number text, origin text,
         destination text, scheduled_departure_local timestamp, scheduled_arrival_local timestamp,
         data jsonb, client_updated_at timestamptz)
    on conflict do nothing;          -- same id OR same flight already in the account: skip it
    get diagnostics n = row_count;
    return n;
end $$;

-- ---------- RPC: set a trip's legs in order, all at once (also dissolves a trip when given < 2 legs) ----------
create or replace function public.set_trip_legs(p_trip_id uuid, p_flight_ids text[], p_client_updated_at timestamptz)
returns void
language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); i int; n int := coalesce(array_length(p_flight_ids, 1), 0);
begin
    if uid is null then raise exception 'not signed in'; end if;
    if n > 4 then raise exception 'a trip has at most 4 flights'; end if;
    if not exists (select 1 from public.user_trips where user_id = uid and id = p_trip_id and deleted_at is null) then
        raise exception 'trip not found';
    end if;
    if n >= 2 and (select count(*) from public.user_flights
                   where user_id = uid and id = any(p_flight_ids) and deleted_at is null) <> n then
        raise exception 'flight not found';
    end if;
    -- Detach current legs of this trip, and the requested flights from any other trip.
    update public.user_flights
       set trip_id = null, leg_index = null, connect_mct_override = null,
           client_updated_at = greatest(client_updated_at, p_client_updated_at)
     where user_id = uid and deleted_at is null and (trip_id = p_trip_id or id = any(p_flight_ids));
    if n < 2 then
        update public.user_trips set deleted_at = now(),
               client_updated_at = greatest(client_updated_at, p_client_updated_at)
         where user_id = uid and id = p_trip_id;
        return;
    end if;
    for i in 1..n loop
        update public.user_flights
           set trip_id = p_trip_id, leg_index = i - 1,
               client_updated_at = greatest(client_updated_at, p_client_updated_at)
         where user_id = uid and id = p_flight_ids[i];
    end loop;
end $$;

revoke all on function public.import_flights(jsonb) from public, anon;
revoke all on function public.set_trip_legs(uuid, text[], timestamptz) from public, anon;
grant execute on function public.import_flights(jsonb) to authenticated;
grant execute on function public.set_trip_legs(uuid, text[], timestamptz) to authenticated;

-- ---------- LATER (alerts plan), do NOT run now ----------
-- create role flyrely_alerts login password '<Sean picks>';     -- read-only, for the Mac mini alerts job
-- grant usage on schema public to flyrely_alerts;
-- grant select on public.user_flights, public.user_trips to flyrely_alerts;
-- create policy "alerts read" on public.user_flights for select to flyrely_alerts using (true);
-- create policy "alerts read" on public.user_trips   for select to flyrely_alerts using (true);
```

**Notes on the SQL:**
- **`set_trip_legs` detaches before it reattaches.** That keeps the leg-order unique index and the `trip_id`/`leg_index` pairing check valid at every step. It also raises `client_updated_at` with `greatest(...)`, so the sync trigger can never skip part of a reorder.
- **`on conflict do nothing` with no target** ignores both the primary-key clash and the "same flight already saved" clash. A flight deleted in the cloud is not brought back by a later import, because the ID clash is still caught.
- **Leg order is not checked in SQL** (for example, that each leg's destination is the next leg's origin). The app checks it before saving, and the itinerary endpoint in 2.3 rejects bad orders with a 422. The database only enforces ownership, the 4-leg limit and positions.

**Check query for Sean**, run after the script. The expected result is 6 policies, 2 tables with RLS on, and `authenticated` holding only SELECT, INSERT and UPDATE:

```sql
select tablename, policyname, cmd, roles from pg_policies where tablename in ('user_flights','user_trips') order by 1,2;
select relname, relrowsecurity from pg_class where relname in ('user_flights','user_trips');
select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) from information_schema.role_table_grants
 where table_name in ('user_flights','user_trips') and grantee in ('anon','authenticated') group by 1,2;
```

## 4. Decision 3: sync model

**Architecture.** Pages stay synchronous. `flightStore.ts` keeps its current function names, but they read from a per-user local cache. A new sync engine moves changes between that cache and Supabase. That way the existing routes change only slightly.

- **Local keys, all per user:**
  - `flyrely_cache:<userId>`: `{flights, trips, pulledAt}`;
  - `flyrely_outbox:<userId>`: the queue of changes waiting to upload;
  - `flyrely_tripdismiss:<userId>`: dismissed trip suggestions.
  
  The old `flyrely_flights` key is only read by the import step.
- **The active user.** `AuthContext` calls `setActiveUser(userId | null)`. While the user is null, `getFlights()` returns `[]` and writes throw. The routes are behind the sign-in gate, so this doesn't happen in normal use.
- **Change notifications.** A small subscription (`subscribe(cb)`) plus a `useFlights()` hook built on `useSyncExternalStore`. Its server-side snapshot is empty, which keeps SSR safe. Pages re-render when a download finishes. The store also exposes `ready`: false until the first download for this user completes, or until it fails.

**Writes (optimistic).**
- `saveFlight`, `removeFlight`, `clearCompletedFlights` and the trip operations update the cache at once, notify listeners, and add a change to the queue.
- Each change has a timestamp (`clientUpdatedAt = new Date().toISOString()`).
- Queued changes are merged per record: the latest upsert for a flight replaces any earlier queued upsert for it, and a delete replaces both.
- Change types:
  - `upsertFlight` → PostgREST `upsert` with `onConflict: 'user_id,id'`;
  - `deleteFlight` → `update {deleted_at: now, client_updated_at}`;
  - `upsertTrip`;
  - `setTripLegs` → RPC;
  - `importFlights` → RPC.
- The queue uploads first-in, first-out, so a trip is created before its legs are set.

**Uploading the queue** happens after each write (short delay), on app start, on `online`, on `visibilitychange` to visible, and before sign-out.
- **Network error, 5xx or 401:** keep the change and stop. On a 401, try again after supabase-js refreshes the session.
- **Unique violation (Postgres 23505):** "you already track this flight". Drop the change, show a Toast, then download again. The cloud copy wins.
- **Other 4xx (CHECK or format errors):** drop the change, log it to the console with the change type only, show a generic "Couldn't save one change" Toast, then download again. The queue can never get permanently stuck.

**Downloading.** Two selects for the user's live flights and trips (`deleted_at is null`, limit 1000). The data is tiny, so it fetches everything rather than only what changed.
- It runs on sign-in, on app start, after the queue empties, and on focus or `online`, at most once every 15 seconds.
- **Merge (a pure, tested function):** the cloud rows become the new cache, then every change still in the queue is applied on top. A flight that is missing from the cloud and not in the queue is removed locally, because another device deleted it.
- No Supabase Realtime. Re-downloading on focus is enough and has fewer parts that can break.

**Conflict rule: the newest edit wins, judged by when it was made on the device, and a delete always wins.** The database trigger enforces this. An offline edit that arrives late can't overwrite a newer edit from another device, and it can't bring back a deleted flight.
- A device clock more than 5 minutes ahead is clamped to the server time.
- The only realistic conflict is two devices refreshing a prediction (the `data` field). Either result is fine.
- Prediction refreshes (`stampFlightChecked`) upload too. That way a refresh on one device stops the other device refreshing again. It's at most one write per flight every 2 hours.

**Mapping between rows and `Flight`** (pure functions in `cloudFlights.ts`).
- **To a row:** columns come from the `Flight`, with `flight_number` and `airline_code` uppercased. `data` is the whole `Flight` after `stripLegacyFields`.
- **From a row:** `{...data}` with the column values on top: `id`, `flightNumber`, `airline.code`, `origin.code`, `destination.code`, `scheduledDeparture` (formatted `YYYY-MM-DDTHH:MM:SS`), `scheduledArrivalLocal`, `tripId`, `legIndex` and `connectMctOverride`.

**New flight IDs.** `flight-${crypto.randomUUID()}`, so two devices can't produce the same ID in the same millisecond. Old IDs stay valid because the column is text.

**One-time import of old local flights (nothing lost, nothing doubled).**
1. On sign-in, once the first download has finished, read the old `flyrely_flights` key. Each storage container has its own copy: the home-screen app and Safari import separately into the same account, which is fine.
2. If it holds flights that aren't already in the account (same ID, or same flight number + origin + departure), show a Modal: "We found N flights saved on this device. Add them to your account?" with **Add to my account** (the main button) and **Don't add**.
   - This guards one real case: someone who used the app before sign-in existed, on a shared browser, and never signed out. Their flights should not silently join someone else's account.
3. **Add:** queue an `importFlights` change. Before sending, drop rows that fail the app-side format checks and say how many were skipped and why.
   - Delete the old key **only after the RPC succeeds**.
   - If the device is offline, the change waits in the queue and the old key stays in place.
   - Running it again is harmless (`on conflict do nothing`).
4. **Don't add:** delete the old key.
5. An old open tab running the previous build may write the old key again. The import simply prompts again next time. No "already imported" flag is used, so nothing is ever skipped.

**Sign-out.**
1. Try to upload the queue, waiting at most 5 seconds.
2. If changes are still waiting, show a Modal: "1 change hasn't been saved to your account yet (you're offline). Sign out anyway and lose it?" with Cancel and Sign out.
3. Then `supabase.auth.signOut()`, then clear every key starting `flyrely_cache:`, `flyrely_outbox:` or `flyrely_tripdismiss:`, plus the old `flyrely_flights`. This keeps the existing privacy fix, and `clearAllFlights` keeps its name.
4. **Different user on the same device:** if `AuthContext` sees a different `user.id` than the previous one (for example a session expired and someone else signed in), clear any cache or queue keys that don't belong to the new user before `setActiveUser`. One user's data can never show for another.

**Offline sign-in limits.** A new sign-in needs the network. An existing session keeps working offline from the cache, because supabase-js keeps the session in localStorage.

## 5. Decision 4: trips UX

**What a trip is.** An ordered list of 2–4 connected flights: leg *i*'s destination equals leg *i+1*'s origin, and each layover is more than 0 and at most 24 hours. Those are the same rules as the 2.3 itinerary endpoint. Single flights stay ungrouped. A return journey is a separate trip.

**How trips are created. Explicit, with suggestions; never automatic.**
1. **"Add connecting flight"** sits on the flight detail page for an upcoming flight, and appears again after a flight is saved.
   - It opens `/flights/add?after=<flightId>`, with the date set to the arrival date (or the departure date if no arrival is known) and the origin set to the previous flight's destination. That's the 2.3 hand-off contract.
   - On save, if the previous flight already has a trip, the new flight is added as the next leg. Otherwise a trip is created (ID from `crypto.randomUUID()`) with both flights, using `upsertTrip` then `setTripLegs`.
   - The 4-leg limit is checked, and the button is hidden at 4 legs.
2. **Suggestions on the Trips page.** A pure function, `suggestTrips(upcomingUngroupedFlights, dismissedKeys)`, chains flight A to flight B when all of these hold:
   - A's destination is B's origin;
   - B doesn't simply fly back to A's origin;
   - if A has an arrival time, B leaves more than 0 and at most 6 hours after A lands; otherwise B leaves more than 0 and at most 12 hours after A leaves.
   
   Chains are capped at 4 legs. Each suggestion card says "These look like one trip: SFO → DEN → BNA" with **Make it a trip** and **Not a trip**. "Not a trip" saves the pair's key in the per-user dismissed list.
3. **Ungrouping.**
   - On the trip page: "Remove from trip" on any leg, which calls `setTripLegs` with the rest, or "Ungroup trip", which calls it with an empty list.
   - Deleting a flight that belongs to a trip calls `setTripLegs` with the remaining legs. Fewer than 2 left dissolves the trip.
   - Removing a middle leg would break the chain. In that case, ungroup the trip and show a Toast: "Trip ungrouped because the flights no longer connect."

**Screens. Only existing components: AppShell, Header, Card, FlightCard (compact), Button, Modal, Input, Pill, Toast, SectionHeader.**
- **`/trips`** (rewrite of `app/routes/trips/index.tsx`), top to bottom:
  1. An "Upcoming trips" section with one Card per trip. The card shows the chain "SFO → DEN → BNA", the date range, the leg FlightCards in order and a ConnectionRow between them, and opens the trip page when tapped.
  2. Suggestion cards.
  3. "Flights" for single flights grouped by date (today's behaviour).
  4. The empty state and "Add flight" button stay as they are.
- **`/trips/$tripId`** (new `app/routes/trips/$tripId.tsx`):
  - Header with a back button. Title: the trip name, or the auto title "SFO → BNA".
  - The legs as compact FlightCards (tap opens the flight detail), with a ConnectionRow between each pair.
  - Footer actions: "Add connecting flight" (adds a leg after the last one), "Ungroup trip" (with a confirm Modal), and "Rename" (a Modal with an Input, at most 80 characters).
- **ConnectionRow** (new `src/components/flight/ConnectionRow.tsx`): "Connection in Denver · 53 min", calculated as next departure minus previous arrival, both in the hub's local time.
  - When the arrival time is unknown: "Connection time unknown · Add arrival time", which links to the edit page.
  - It accepts `missProbability` and `minConnectMinutes` but shows nothing for them yet. The 2.3 work fills them in behind its feature flag.
  - Copy follows the 2.3 rules ("chance", never "will").
- **Flight detail:** if the flight is in a trip, a link "Part of trip SFO → BNA (leg 1 of 2)", plus the "Add connecting flight" button.
- **Edit flight:** an optional "Arrival time" field (local time at the destination). It saves `scheduledArrivalLocal` and sets `arrivalSource: 'manual'`.
- **Add flight, lookup mode:** sets `scheduledArrivalLocal = date + arr_time (+1 day if arr_next_day)` and `arrivalSource: 'lookup'`.

**2.3 hand-off (pure function, tested now).** `tripToItineraryRequest(trip, legs)` produces:

```
{ itinerary_id: trip.id,
  legs: legs sorted by legIndex, each mapped to
    { flight_id: id, flight_number, airline: airline.code, origin, destination,
      departure_time: scheduledDeparture, arrival_time: scheduledArrivalLocal },
  connections: legs[1..], each mapped to
    connectMctOverride ? { min_connect_minutes: connectMctOverride } : {} }
```

The "change minimum connect time" control on ConnectionRow is part of the 2.3 app work. The `connect_mct_override` column is ready for it now.

## 6. Decision 5: ordered tasks

**Build cycles: 2 app releases. 0 API restarts; the API only gets a SQL file committed.**

### S1. Sean: create the tables. Do this before T2 is deployed (it can be done right away)

1. Open https://supabase.com/dashboard and click the FlyRely project.
2. In the left sidebar, open **SQL Editor**, then **+ New query**.
3. Paste the whole SQL block from section 3, everything above the "LATER" comment (pasting the commented lines too is harmless). Click **Run**. Expected result: "Success. No rows returned".
4. Open a new query, paste the check query from section 3 and click **Run**. You should see 6 policy rows, `relrowsecurity = true` for both tables, `authenticated` with `INSERT,SELECT,UPDATE`, and no `anon` rows.
5. In the left sidebar, open **Table Editor**. Both `user_flights` and `user_trips` should be listed, with no "RLS disabled" or "Unrestricted" warning.
6. Open **Project Settings → Data API**, or **Settings → API** in older layouts. Check that the Data API is enabled and that **Exposed schemas** includes `public`. It's on by default. The SQL grants table access explicitly, so it doesn't matter whether new tables are exposed automatically.
7. Nothing else is needed: no new keys and no `.env` changes. The app already has `VITE_SUPABASE_URL` and the anon key in `.env.local`.
8. Free-tier note: Supabase pauses a project after about 7 days with no activity. Normal use prevents this. If it ever pauses, click **Restore project** on the dashboard.

### T1. [executor] Commit the migration file (API repo, `master`)

- Branch `docs/migration-005-user-flights`. Add `flyrely-api/migrations/005_user_flights_trips.sql` with exactly the SQL from section 3.
- Open a PR and merge it. No API restart.
- **Acceptance:**
  - the file matches the plan's text;
  - `grep -c "create policy" migrations/005_user_flights_trips.sql` gives 6, plus 2 in comments;
  - `venv/bin/pytest -q` still passes. The file isn't loaded by any code.

### T2. [implementer] PR A, app branch `feat/cloud-flights`: cloud sync for flights, no trip screens yet

**Files:**

- `src/types/index.ts`. Add to `Flight`: `scheduledArrivalLocal?`, `arrivalSource?: 'lookup' | 'manual'`, `tripId?`, `legIndex?`, `connectMctOverride?`. Add a `Trip {id, name?, clientUpdatedAt}` type. Do not use the field name `scheduledArrival`.
- **New `src/lib/cloudFlights.ts`.** The Supabase calls (`fetchAll`, `upsertFlight`, `softDeleteFlight`, `upsertTrip`, `setTripLegs`, `importFlights`), plus the pure mappers `flightToRow` and `rowToFlight` and the app-side format checks, which mirror the SQL CHECKs.
- **New `src/lib/syncEngine.ts`.** The change queue (stored per user, merged per record), the upload loop with the error handling in section 4, download plus the pure `mergeCloudWithOutbox`, the 15-second throttle, and the `online`/`visibilitychange` listeners. It exports `flushOutbox(timeoutMs)`, `pendingCount()` and `status`.
- **`src/lib/flightStore.ts`.**
  - Keep every existing export name and signature, backed by the per-user cache.
  - Add `setActiveUser`, `subscribe`, `isReady` and `getTrips`/`getTripById`.
  - Writes go through the sync engine.
  - `clearAllFlights` clears all `flyrely_cache:`, `flyrely_outbox:` and `flyrely_tripdismiss:` keys and the old key.
  - Remove the unused `attachUserIdToFlight`.
  - Add `readLegacyFlights()` and `clearLegacyFlights()`.
- **New `src/hooks/useFlights.ts`.** `useSyncExternalStore` wrapper returning `{flights, trips, ready}`.
- **`src/context/AuthContext.tsx`.**
  - On user change: clear other users' keys, call `setActiveUser`, start a download.
  - `signOut`: upload the queue (5 s), return `{pending}` so the caller can confirm, then sign out and clear.
  - Expose `syncStatus`.
- **`app/routes/account/index.tsx`.** Sign-out confirm Modal when changes are waiting. A one-line sync status: "Flights saved to your account" / "N changes waiting to upload" / "Offline: changes will upload when you reconnect".
- **New `src/components/LegacyImportModal.tsx`**, mounted in `app/routes/__root.tsx` inside the auth gate. The Modal from section 4.
- **Routes switched to `useFlights()`:** `app/routes/index.tsx`, `app/routes/trips/index.tsx` (no grouping change yet), `app/routes/flights/history.tsx`, `app/routes/explore/index.tsx`.
- **`app/routes/flights/$flightId/index.tsx` and `edit.tsx`.** Show "not found" only when `ready && !flight`; before that, show the loading state. Otherwise a fresh device shows "not found" before the first download finishes.
- **`app/routes/flights/add.tsx`.** New IDs `flight-${crypto.randomUUID()}`. In lookup mode, set `scheduledArrivalLocal` and `arrivalSource`. Add `?after=` support and the "Add connecting flight" button on the flight detail page. Creating the trip is stubbed until T4, or done in T4 if PRs A and B are merged into one.
- **Tests (vitest, `src/lib/__tests__/`):**
  - `cloudMappers.test.ts`: round trip; legacy fields stripped; column values beat `data`; time formatting.
  - `syncMerge.test.ts`:
    - a queued upsert survives a download that doesn't have it yet;
    - a flight deleted remotely disappears;
    - a queued delete hides a cloud row;
    - queued changes merge per record.
  - `outboxFlush.test.ts`, with a mocked client:
    - network error keeps the change;
    - 23505 drops the change, raises a Toast event and triggers a download;
    - a CHECK error drops the change;
    - first-in, first-out order.
  - `legacyImport.test.ts`: chooses only flights missing by ID or by flight number + origin + departure; removes the old key only after success; offline leaves it.
  - Update `clearFlights.test.ts`: all per-user keys and the old key are cleared.
  - `userSwitch.test.ts`: the previous user's cache is gone after a switch.
- **New optional script `scripts/rls-check.mjs`** (`npm run rls-check`).
  - Reads `VITE_SUPABASE_URL` and the anon key from `.env.local`. It reads only; it never writes env files.
  - Signs up two throwaway users (`rlscheck+<ts>-a@example.com` and `-b`); email confirmation is off.
  - User A inserts a flight. Then it checks:
    - user B can't select A's flight;
    - user B can't update it;
    - user B can't insert a row with A's `user_id`;
    - a DELETE is refused;
    - the anon key with no session reads 0 rows;
    - an older `client_updated_at` doesn't overwrite a newer one;
    - an update to a deleted flight is ignored;
    - a duplicate by flight number + origin + departure gives 23505;
    - `import_flights` run twice inserts N, then 0.
  - Prints PASS/FAIL. Sean deletes the two test users afterwards in Authentication → Users.
- **Acceptance:**
  - `npm run typecheck && npm run lint && npm test` pass;
  - `npm run rls-check` prints all PASS against the live project, after S1;
  - `grep -rn "localStorage.getItem('flyrely_flights')" app src` matches only the old-key reader;
  - no new env vars; `.env*` untouched.

### T3. [executor] Merge PR A and deploy, then run the core test matrix (section 7, items 1–9)

- Run `flyrely-api/deploy/macmini/build-web.sh`, then restart the web launchd job as usual.
- **Acceptance:**
  - the app loads at the public URL;
  - in the Supabase Table Editor, `user_flights` shows the test flights for the test account only;
  - every section 7 item from 1 to 9 is marked pass, using two test accounts.
- If anything fails, stop and report. The old `flyrely_flights` key is not deleted until an import succeeds, so rolling back to the previous build loses nothing.

### T4. [implementer] PR B, app branch `feat/trips`: trip screens

**Files:**
- **New `src/lib/tripGrouping.ts`** (pure functions): `layoverMinutes`, `validateTripLegs` (chain; 0 < layover ≤ 24 h; 2–4 legs; the same rules as the 2.3 errors `not_connected` and `invalid_layover`), `suggestTrips`, `tripTitle`, `tripToItineraryRequest`.
- **`src/lib/flightStore.ts`.** Trip operations: `createTrip(flightIds)`, `appendLeg(tripId, flightId)`, `removeLeg`, `ungroupTrip`, `renameTrip`, `dismissSuggestion`. `removeFlight` re-links or dissolves the trip.
- **New `src/components/flight/ConnectionRow.tsx` and `TripCard.tsx`**, exported from `src/components/flight/index.ts`.
- **Rewrite `app/routes/trips/index.tsx`. New `app/routes/trips/$tripId.tsx`**, and regenerate `app/routeTree.gen.ts` with the normal build.
- **`app/routes/flights/$flightId/index.tsx`:** the trip link and "Add connecting flight".
- **`app/routes/flights/add.tsx`:** `?after=` attaches the new flight to a trip, or creates one.
- **`app/routes/flights/$flightId/edit.tsx`:** the optional arrival-time field.
- **Tests:**
  - `tripGrouping.test.ts`: chain/no-chain; a return flight is not suggested; the 6 h / 12 h windows; max 4 legs; an overnight arrival (`arr_next_day`); dismissed keys respected; the `tripToItineraryRequest` output shape matches the 2.3 JSON exactly.
  - Store tests: deleting a middle leg dissolves the trip; deleting the last leg of a 2-leg trip dissolves it; adding a 5th leg is refused.
- **Acceptance:** typecheck, lint and tests pass; `npm run rls-check` still passes; section 7 items 10–13 pass.

### T5. [executor] Merge PR B, deploy as in T3, run section 7 items 10–13 on two devices

**Option to save a cycle:** T2 and T4 can ship as one PR and one deploy. I recommend two, because sync is the risky part. If it misbehaves, it's easier to diagnose without the trip screens on top.

### Not in this plan

Server-side alerts reading `user_flights` and the read-only `flyrely_alerts` role belong to the alerts plan. When that work starts, Sean creates the role with the commented SQL, choosing the password himself, and puts the connection string in the API's `.env`.
- On the free tier, use the Supavisor **session pooler** connection string from Connect → Session pooler. Direct connections are IPv6-only.

## 7. Decision 6: risks and what to test

**Test matrix.** Run it on an iPhone (home-screen app and Safari, separately) plus a Mac browser. Use test accounts A and B.

1. **Import, old data.** Load the old build in Safari and add 2 flights. Deploy the new build and sign in as A. The import prompt appears; tap Add. In the Supabase Table Editor, 2 rows exist for A. Reload: no prompt, still 2 flights.
2. **Import, no duplicates.** In the home-screen app, using the old build with the same 2 flights plus 1 different one, sign in as A. The prompt says "1 flight", and A ends with 3 rows.
3. **Cross-device.** Add a flight on the Mac. Bring the iPhone app to the foreground: it appears within about 15 seconds. Delete it on the iPhone: it disappears on the Mac after the window regains focus.
4. **Offline write.** Put the iPhone in airplane mode and add a flight. It shows at once, and Account shows "1 change waiting". Reconnect: it uploads and appears on the Mac.
5. **Offline conflict.** Take the iPhone offline and edit flight X's gate. On the Mac, delete X. Bring the iPhone back online: X stays deleted everywhere.
6. **Newest edit wins.** Take the iPhone offline and edit X at 10:00. Edit X on the Mac at 10:05. Reconnect the iPhone: the Mac's edit stays.
7. **Sign-out.** Sign out on the Mac: the flights disappear from that browser's storage (check DevTools; no `flyrely_cache:` keys remain). Sign in again as A: all flights return. Sign out while offline with a waiting change: the confirm Modal appears.
8. **Different users.** Sign in as A, sign out, sign in as B on the same browser. B sees none of A's flights and no import prompt. In the Table Editor, B's rows are separate. Also check that `rls-check` passes.
9. **Fresh device.** Open a deep link `/flights/<id>` on a newly signed-in device: it shows loading, then the flight, never "not found" first. Also check the Explore, History and "Clear completed" pages, and that clearing completed flights soft-deletes them in the cloud.
10. **Trips.** Add SFO→DEN through lookup (arrival is captured), then "Add connecting flight" DEN→BNA. A trip card appears with "Connection in Denver · N min" and the same trip shows on the second device.
11. **Suggestion.** Add two chained flights manually. The suggestion appears; "Make it a trip" groups them; "Not a trip" on another pair hides it. A same-day return (SFO→DEN, DEN→SFO) is not suggested.
12. **Trip editing.** Delete a middle leg of a 3-leg trip: the trip is ungrouped and a Toast explains why. Remove a leg from a 2-leg trip: the trip is dissolved. Rename a trip: the new name shows on the other device.
13. **Trips across devices offline.** Create a trip offline, reconnect: the trip and its leg order arrive correctly. In Supabase, `leg_index` is 0..n-1 with no gaps.

**Risks and mitigations:**

| Risk | Mitigation |
|---|---|
| RLS mistake exposes other users' flights | Policies only `to authenticated` with `auth.uid() = user_id`; anon access revoked; no DELETE; `rls-check` script plus test 8 before release. |
| Fresh device briefly shows "no flights" or "not found" | The `ready` flag; empty and "not found" states only after the first download. |
| Flights on a shared browser from before sign-in existed join the wrong account | Import requires an explicit tap and shows the count; "Don't add" discards them. |
| Unsynced change lost at sign-out | Upload with a 5-second limit, then a confirm Modal. |
| Device clock wrong | The trigger clamps future times. A slow clock only loses to newer edits, which are rare for a single user. |
| A bad record blocks the queue | Permanent 4xx errors drop the change and show a Toast; only network errors and 5xx keep it. |
| Old open tabs write the old key after the deploy | The import is safe to repeat (no "already imported" flag; duplicates are ignored). |
| Home-screen app and Safari have separate storage and sessions | Expected. Each signs in, imports its own old data, and downloads from the cloud. Covered by tests 1–2. |
| Push watches (copilot) are per device: deleting a flight on device B doesn't cancel a watch registered on device A | Watches expire at departure + 36 h. Accept for now; the alerts plan should key watches to the account. |
| Supabase free-tier pause or outage | The app keeps working from the cache with queued writes; pauses are restored on the dashboard. |
| Supabase layout or setting names differ from the steps | The SQL grants explicitly. The check query confirms the result whatever the dashboard looks like. |

## 8. Fit with section 2.3 (checked)

- **Field names:** `scheduledArrivalLocal`, `arrivalSource`, `tripId` and `legIndex` are exactly 2.3's names. `connectMctOverride` maps to `connections[i-1].min_connect_minutes`.
- **Limits:** at most 4 legs, enforced in SQL and the app. Chain and layover checks match 2.3's 422 reasons.
- **Through flights** (same flight number continuing) are allowed as consecutive legs. The API marks them `through_flight`.
- **2.3's planned `Trip.lastResult` and `checkedAt`** are calculated values. They stay in the local cache only, not in the cloud tables, and `Trip` is now cloud-backed. 2.3's `flyrely_trips` localStorage key is replaced by the per-user cache in this plan; tell the 2.3 implementer.
- **Arrival forecasts** (`arrival?: ArrivalForecast`) ride inside `data jsonb`. No schema change is needed.

## 9. Decisions for Sean

1. **What a trip means.** OK that a trip is one direction only (connecting flights), with the return as a separate trip? *Default: yes.*
2. **Suggestion window.** Up to 6 hours between landing and the next take-off (12 hours from departure when the arrival time is unknown). *Default: yes.*
3. **Releases.** Two releases (sync first, then trips) or one combined? *Default: two.*

### Critical Files for Implementation
- /Users/seanbutton/Projects/flyrely/flyrely-app/src/lib/flightStore.ts
- /Users/seanbutton/Projects/flyrely/flyrely-app/src/context/AuthContext.tsx
- /Users/seanbutton/Projects/flyrely/flyrely-app/app/routes/trips/index.tsx
- /Users/seanbutton/Projects/flyrely/flyrely-app/app/routes/flights/add.tsx
- /Users/seanbutton/Projects/flyrely/flyrely-api/migrations/005_user_flights_trips.sql (new)

The other files that change are listed under T2 and T4: new `src/lib/syncEngine.ts`, `src/lib/cloudFlights.ts`, `src/lib/tripGrouping.ts`, `src/hooks/useFlights.ts`; `src/types/index.ts`; and the `app/routes/trips/$tripId.tsx` route.