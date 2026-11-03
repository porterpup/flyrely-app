# Running FlyRely locally

Requires Node 20.x.

1. Start the API (from the repo root's sibling directory):

   ```
   cd ../flyrely-api && venv/bin/uvicorn main:app --reload --env-file .env --port 8000
   ```

2. Create a free Supabase project (https://supabase.com):
   - Authentication -> Providers: make sure Email is enabled.
   - For testing, turn off "Confirm email" so sign-up signs you in immediately.
   - Authentication -> URL Configuration: Site URL `http://localhost:3000`, add redirect URL `http://localhost:3000/**`.
   - Settings -> API: copy the project URL and the anon key.

3. Configure the app. Copy `.env.example` to `.env.local` and fill in:

   ```
   VITE_API_URL=http://localhost:8000
   VITE_SUPABASE_URL=<project URL>
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```

   Without the Supabase values the app still runs; sign-in just reports that it isn't configured.

4. Install and run:

   ```
   npm ci
   npm run dev
   ```

5. Open http://localhost:3000

Optional: with the API running, `npm run smoke` checks `/health` and the `/predict` contract.
