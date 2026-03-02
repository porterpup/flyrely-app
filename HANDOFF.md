# FlyRely Development Handoff Document

**Last Updated:** March 2, 2026
**Status:** Active Development

> **Claude Workflow Note:** All code changes are pushed directly to GitHub. Claude clones `flyrely-api` to a temp session directory and pushes changes via git. No local-only edits — Railway auto-deploys on every push.

---

## Project Overview

**FlyRely** is a flight delay prediction application that uses machine learning to help travelers understand and manage flight delay risk.

### Deployment Architecture

- **Frontend:** TanStack Start (React SSR)
  - Repository: `https://github.com/porterpup/flyrely-app`
  - Branch: `main`
  - Deployed URL: `https://flyrely-app-production.up.railway.app`
  - Hosting: Railway (auto-deploys on push to GitHub)

- **Backend:** FastAPI
  - Repository: `https://github.com/porterpup/flyrely-api`
  - Branch: `master`
  - Deployed URL: `https://web-production-ea1e9.up.railway.app`
  - Hosting: Railway (auto-deploys on push to GitHub)

- **Railway Project Name:** `hospitable-solace`

---

## Environment Variables

### API Environment Variables (in `/flyrely-api/.env`)

These are configured in Railway and your local `.env` file (never commit `.env` to the repo):

```env
RESEND_API_KEY=<get from Resend dashboard>
AVIATION_STACK_KEY=<get from AviationStack dashboard>
```

### Additional Variables (Set in Railway Dashboard)

These variables are configured in Railway environment settings but not stored in the repo:

| Variable | Value | Notes |
|----------|-------|-------|
| `WEATHER_API_KEY` | (value unknown) | Required for weather lookups via Tomorrow.io |
| `WEATHER_API_PROVIDER` | `tomorrow` | Options: `tomorrow` or `openweathermap` |
| `NOTIFY_FROM_EMAIL` | `alerts@flyrely.app` | Sender email for notifications (must match Resend verified domain) |
| `AEROAPI_KEY` | (NOT YET SET) | **PENDING:** User signup for FlightAware AeroAPI |
| `AEROAPI_MONTHLY_CAP` | `100` | Hard limit on AeroAPI calls per month |

### Important Notes

- **RESEND_API_KEY:** Email notification service. Free tier: 3000 emails/month. Currently using `alerts@flyrely.app` which is a Resend onboarding domain (temporary). Custom domain must be verified to use custom sender address.
- **AVIATION_STACK_KEY:** Legacy flight data API (kept for backward compatibility, but replaced by AeroAPI in flight lookups)
- **AEROAPI_KEY:** FlightAware's API for flight lookups. Requires user signup at https://flightaware.com/aeroapi/. Free tier: $5/month credit (~100 calls). Must have credit card on file.
- **WEATHER_API_KEY:** Tomorrow.io is preferred (supports hourly forecasts). Free tier: 500 calls/day. Paid overages: ~$0.001/call.

---

## What's Been Built

### Core Features Implemented

#### 1. Flight Delay Prediction Model
- **Multi-class Severity Model:** Classifies delays as Low/Medium/High risk
- **Features Used:** Origin/destination airports, time of day, season, day of week, weather conditions, distance, holiday proximity
- **Model Files:**
  - `flyrely-api/models/flight_delay_model.joblib` (primary predictor)
  - `flyrely-api/models/delay_severity_model.joblib` (severity classifier)
  - `flyrely-api/models/feature_names.joblib` (feature list)
  - `flyrely-api/models/model_metadata.json` (model info)
  - `flyrely-api/models/delay_severity_metadata.json` (severity model info)

#### 2. Frontend Components & Pages
- **DelaySeverityBar:** Visual bar chart showing Low/Medium/High delay probability
- **Add Flight Form:**
  - Time picker for departure time
  - Airport autocomplete (searchable list of 60+ airports)
  - Airline autocomplete
  - Flight number input
- **Flight Card:** Displays flight info, delay risk, and status
- **History Page:** Shows completed/past flights with real data (no mock data)
- **Explore Page:** Real airline rankings by delay rate
- **Flight Detail Pages:** `/flights/$flightId` with alternatives and edit options
- **Account Dashboard:** Usage tracking, settings, billing placeholder
- **Auth Pages:** Login, signup, forgot-password (auth scaffolding in place)

#### 3. Flight Lookup System
- **GET /flight-lookup:** Look up real flight data via AeroAPI
  - Accepts: `flight_number`, `origin`, `destination`, `departure_date`, `airline_code` (optional)
  - Returns: Scheduled departure/arrival times, aircraft type, status
  - **Caching:** Results cached in `lookup_cache.json` to avoid duplicate API calls
  - **Monthly Cap:** Hard cap via `AEROAPI_MONTHLY_CAP` (currently 100)
  - **AeroAPICallCounter:** Tracks usage in `aeroapi_counter.json`
- **GET /flight-lookup/status:** Returns current API quota usage and cache stats

#### 4. Email Notifications
- **POST /notify:** Send email alerts about flight delays
  - Requires: recipient email, flight info, delay prediction
  - Uses Resend API with free tier limits
  - Sender: `alerts@flyrely.app` (Resend onboarding domain)

#### 5. Usage Tracking & Analytics
- **UsageLogger Middleware:** Logs every API request to `usage_log.jsonl`
- **GET /usage:** Export usage stats (last 30 days, or custom range)
  - Returns: Per-endpoint call counts, errors, response times
- **GET /usage/export:** Stream usage data as CSV (streaming response for large datasets)
- **/account/usage:** Frontend dashboard showing API usage patterns

#### 6. Smart Auto-Refresh Logic
- **>48 hours from departure:** Check every 24 hours
- **2-48 hours from departure:** Check every 2 hours
- **<2 hours from departure:** Always refresh (every check)
- **Past flights:** Never auto-refresh

#### 7. Data Persistence
- **lookup_cache.json:** Flight lookup results (survives server restarts)
- **aeroapi_counter.json:** Monthly API call counter
- **usage_log.jsonl:** JSONL log of API requests

---

## Architecture — Key Files

### Backend (`/flyrely-api/`)

| File | Purpose |
|------|---------|
| `main.py` | FastAPI application with all endpoints, models, middleware |
| `models/` | ML model files and metadata |
| `models/flight_delay_model.joblib` | Trained delay prediction model |
| `models/delay_severity_model.joblib` | Trained multi-class severity classifier |
| `requirements.txt` | Python dependencies |
| `.env` | Environment variables (API keys) |
| `Dockerfile` | Container configuration for Railway |
| `DEPLOY.md` | Deployment instructions |
| `QUICKSTART.md` | Quick setup guide |
| `WEATHER_API_SETUP.md` | Weather API configuration |
| `example_client.py` | Example Python client for testing API |
| `railway.json` | Railway deployment config |

### Frontend (`/flyrely-app/`)

| Directory/File | Purpose |
|---|---|
| `app/routes/` | TanStack Router file-based routing |
| `app/routes/index.tsx` | Home page (main flight tracker) |
| `app/routes/flights/add.tsx` | Add new flight form |
| `app/routes/flights/history.tsx` | Flight history page |
| `app/routes/flights/$flightId/index.tsx` | Flight detail page |
| `app/routes/flights/$flightId/alternatives.tsx` | Alternative flights |
| `app/routes/flights/$flightId/edit.tsx` | Edit flight details |
| `app/routes/explore/index.tsx` | Explore airlines / delay rates |
| `app/routes/account/usage.tsx` | Usage dashboard |
| `app/routes/account/settings.tsx` | Account settings |
| `app/routes/auth/login.tsx` | Login page |
| `app/routes/auth/signup.tsx` | Sign up page |
| `src/components/flight/` | Flight card, severity bar, etc. |
| `src/components/ui/` | Reusable UI components (Button, Input, Modal, Toast) |
| `src/components/layout/` | AppShell, BottomNav, Header |
| `src/types/index.ts` | TypeScript types for flights, predictions, etc. |
| `package.json` | Node dependencies |
| `tailwind.config.ts` | Tailwind CSS theme |
| `tsconfig.json` | TypeScript configuration |
| `railway.json` | Railway deployment config |

---

## API Endpoints

### Prediction & Flight Data

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/` | API info and status |
| `GET` | `/health` | Health check |
| `POST` | `/predict` | Predict delay risk for a flight |
| `GET` | `/airports` | List supported airports (60+) |
| `GET` | `/flight-lookup` | Look up real flight data via AeroAPI |
| `GET` | `/flight-lookup/status` | Check API quota and cache stats |

### Notifications & Usage

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/notify` | Send email notification about a flight |
| `GET` | `/usage` | Get usage stats (by endpoint) |
| `GET` | `/usage/export` | Export usage data as CSV |

---

## What's Next (Pending Work)

### 1. AeroAPI Key Setup (HIGH PRIORITY)
- **Status:** Pending user action
- **What's Needed:** User must sign up for FlightAware AeroAPI at https://flightaware.com/aeroapi/
- **Steps:**
  1. Create FlightAware account
  2. Request AeroAPI access (free tier: $5/month credit, ~100 calls)
  3. Add credit card to account
  4. Generate API key
  5. Set `AEROAPI_KEY` in Railway environment
- **Impact:** Flight lookup will fail without this key

### 2. User Authentication (MEDIUM PRIORITY)
- **Status:** UI scaffolding in place, logic not implemented
- **What's Needed:**
  - Supabase project (auth backend)
  - Google OAuth credentials

- **Details to Gather:**
  - Supabase Project URL (from Supabase dashboard)
  - Supabase Anon Key (public key for client)
  - Google OAuth Client ID (from Google Cloud Console)
  - Google OAuth Client Secret (from Google Cloud Console)

- **Implementation Plan:**
  1. Set up Supabase project
  2. Configure Google OAuth provider in Supabase
  3. Add Supabase client to frontend
  4. Implement login/signup page logic
  5. Add session management
  6. Protect routes (redirect unauthenticated users)
  7. Move flights from localStorage to Supabase (user_flights table)
  8. Tie notifications/usage to user account

- **UI Already Built:** `/auth/login.tsx`, `/auth/signup.tsx`, `/auth/forgot-password.tsx`

### 3. Flight Validation (MEDIUM PRIORITY)
- **Status:** Not yet implemented
- **What's Needed:** Ensure flight number + route + departure time match a real scheduled flight
- **How:** Use AeroAPI's `/flights/search` endpoint to validate before adding to tracker
- **Benefit:** Prevent typos and invalid flight entries

### 4. Stretch Goals (LOW PRIORITY)
- Billing page (currently placeholder)
- Push notifications (in-app or browser)
- Integration with airline loyalty programs
- Multi-device sync (once auth is in place)

---

## How to Set Up on a New Machine

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+ and pip
- Git

### Clone & Install

```bash
# Clone both repos
git clone https://github.com/porterpup/flyrely-app.git
cd flyrely-app && npm install && cd ..

git clone https://github.com/porterpup/flyrely-api.git
cd flyrely-api && pip install -r requirements.txt && cd ..
```

### Configure Environment

#### Backend (flyrely-api/.env)
Get values from their respective dashboards and create a local `.env` (never commit this file):

```env
RESEND_API_KEY=<get from Resend dashboard>
AVIATION_STACK_KEY=<get from AviationStack dashboard>
WEATHER_API_KEY=<get from Tomorrow.io>
WEATHER_API_PROVIDER=tomorrow
NOTIFY_FROM_EMAIL=alerts@flyrely.app
AEROAPI_KEY=<pending user signup>
AEROAPI_MONTHLY_CAP=100
```

#### Frontend
No local environment variables needed for basic development. Railway handles deployment secrets.

### Run Locally

```bash
# Terminal 1: Start backend
cd flyrely-api
uvicorn main:app --reload

# Terminal 2: Start frontend
cd flyrely-app
npm run dev
```

Visit `http://localhost:5173` (or as shown in terminal output)

### Deploy to Railway

Both repos are set up to auto-deploy on push to GitHub:

```bash
# Backend
cd flyrely-api
git add . && git commit -m "your message" && git push origin master

# Frontend
cd flyrely-app
git add . && git commit -m "your message" && git push origin main
```

Monitor deployments at: https://railway.app (hospitable-solace project)

### Working with Claude (Cowork)

- Open Cowork and select the `flyrely-app` folder on your computer
- Upload `HANDOFF.md` at the start of each session to give Claude full context
- Claude will clone `flyrely-api` automatically to its temp session space
- Claude pushes all changes directly to GitHub — no local edits needed
- **Frontend `.gitignore`:** `app.config.timestamp_*.js` files should be ignored (build artifacts)

---

## Key Technical Decisions & Rationale

### Flight Data: AeroAPI (FlightAware) over AviationStack
- **Why:** AeroAPI's free tier supports future flight date lookups (required for prediction)
- **Alternative:** AviationStack (legacy, kept in code) requires paid plan for future flights
- **Cost:** AeroAPI $5/month credit (~100 calls), requires credit card on file
- **Status:** Pending user signup

### Email Service: Resend
- **Why:** Clean, simple API; 3000 free emails/month
- **Limitation:** Sender must be onboarding domain (`alerts@flyrely.app`) until custom domain verified
- **Next Step:** Verify custom domain or use branded Resend subdomain

### Weather API: Tomorrow.io
- **Why:** Better hourly forecast data than OpenWeatherMap free tier
- **Free Tier:** 500 calls/day
- **Cost:** ~$0.001 per call above free tier
- **Note:** Total weather calls = number of flights × 2 (origin + destination weather)

### Authentication: Supabase (Not Yet Implemented)
- **Why:** Built-in Google OAuth, PostgreSQL backend, generous free tier (50k users)
- **Cost:** Free for 50k users, $25/month after
- **Alternative Considered:** Firebase (similar, but less flexible auth)
- **Current State:** localStorage stores flights; will migrate to Supabase table

### Smart Refresh Logic
- **Rationale:** Balance API cost with prediction accuracy
- **>48hrs:** Delay status unlikely to change; daily checks sufficient
- **2-48hrs:** Active period; 2-hour checks balance cost and timeliness
- **<2hrs:** Imminent departure; always refresh for latest gate/terminal info
- **Past:** Already happened; no need to refresh

---

## Development Tips

### Testing the Backend
```bash
cd flyrely-api
# Run example client
python example_client.py

# Or use curl
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "flight_number": "AA100",
    "origin": "ATL",
    "destination": "LAX",
    "departure_time": "2026-03-15T08:00:00",
    "airline_code": "AA"
  }'
```

### Checking Usage Logs
```bash
# View raw usage log
cat flyrely-api/usage_log.jsonl | jq '.'

# Get stats via API
curl http://localhost:8000/usage?days=7
```

### Flight Lookup Cache
```bash
# View cached flights
cat flyrely-api/lookup_cache.json | jq '.'

# View AeroAPI call counter
cat flyrely-api/aeroapi_counter.json | jq '.'
```

### Common Issues
- **AEROAPI_KEY not set:** Flight lookup will return 401 error
- **WEATHER_API_KEY not set:** Predictions will fail (weather data is required)
- **CORS errors:** Check that backend is running and CORS middleware is enabled
- **Usage log growing large:** Use `/usage/export` to archive and clean up

---

## Important GitHub Branches

- **Frontend:** `main` (production) — main development branch
- **Backend:** `master` (production) — main development branch

Always work on feature branches and merge via pull request for code review.

---

## How to Give This Context to a New Claude Instance

Upload `HANDOFF.md` (this file) at the start of each new Cowork session and say "Get up to speed." Claude will read it and be ready to continue development immediately.

---

## Contact & Support

For questions about:
- **Deployment:** Check Railway dashboard (hospitable-solace project)
- **API Design:** See `/flyrely-api/README.md` and `/flyrely-api/QUICKSTART.md`
- **Frontend Routes:** Check `/flyrely-app/app/routes/` file-based routing
- **ML Model:** See `/flyrely-api/models/model_metadata.json`

---

**Last Session Date:** March 2, 2026
**Current Status:** Active development, awaiting AeroAPI key setup
**Next Steps:** Setup AeroAPI, implement Supabase auth, add flight validation
