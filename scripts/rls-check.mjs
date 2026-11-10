#!/usr/bin/env node
// Checks the cloud-flights security rules against the LIVE Supabase project (run after the SQL in
// flyrely-api/migrations/005_user_flights_trips.sql has been applied).
//
//   npm run rls-check
//
// Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from the environment, or from .env.local. Read-only: it never
// writes env files and never prints their values. It signs up two throwaway users (email confirmation must be off),
// so delete them afterwards in Supabase > Authentication > Users (rlscheck+...@example.com).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const env = { ...process.env };
  try {
    for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  } catch {
    // no .env.local: rely on the environment
  }
  return env;
}

const env = loadEnv();
const URL_ = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_ANON_KEY;
if (!URL_ || !KEY) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (set them or add them to .env.local).');
  process.exit(2);
}

const results = [];
function record(name, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : detail ? `  (${detail})` : ''}`);
}

const fresh = () => createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const stamp = Date.now();
const password = `Rls-${stamp}-${Math.random().toString(36).slice(2)}Aa1!`;

async function signUp(tag) {
  const c = fresh();
  const { data, error } = await c.auth.signUp({ email: `rlscheck+${stamp}-${tag}@example.com`, password });
  if (error) throw new Error(`sign-up failed for user ${tag}: ${error.message}`);
  if (!data.session) throw new Error('sign-up returned no session: email confirmation must be off for this check');
  return { client: c, id: data.user.id };
}

const flightRow = (userId, over = {}) => ({
  user_id: userId,
  id: `rls-${stamp}-1`,
  airline_code: 'UA',
  flight_number: 'UA648',
  origin: 'SFO',
  destination: 'DEN',
  scheduled_departure_local: '2030-01-15T08:00:00',
  data: { note: 'rls-check' },
  client_updated_at: '2025-01-01T10:00:00Z',
  ...over,
});

try {
  const A = await signUp('a');
  const B = await signUp('b');
  const anon = fresh();
  const id = `rls-${stamp}-1`;

  const ins = await A.client.from('user_flights').insert(flightRow(A.id));
  record('user A can insert their own flight', !ins.error, ins.error?.message);

  const own = await A.client.from('user_flights').select('id').eq('id', id);
  record('user A can read their own flight', !own.error && own.data?.length === 1, own.error?.message);

  const sel = await B.client.from('user_flights').select('id').eq('id', id);
  record("user B cannot select A's flight", !sel.error && sel.data?.length === 0, sel.error?.message ?? `got ${sel.data?.length} rows`);

  const upd = await B.client.from('user_flights').update({ data: { hacked: true } }).eq('id', id).select();
  const afterB = await A.client.from('user_flights').select('data').eq('id', id).single();
  record("user B cannot update A's flight", afterB.data?.data?.hacked === undefined && (upd.data?.length ?? 0) === 0);

  const forged = await B.client.from('user_flights').insert(flightRow(A.id, { id: `rls-${stamp}-forged`, flight_number: 'UA999' }));
  record("user B cannot insert a row with A's user_id", Boolean(forged.error), 'insert was accepted');

  const del = await A.client.from('user_flights').delete().eq('id', id).select();
  const stillThere = await A.client.from('user_flights').select('id').eq('id', id);
  record('DELETE is refused (rows survive)', stillThere.data?.length === 1 && (del.data?.length ?? 0) === 0, del.error?.message);

  const anonRead = await anon.from('user_flights').select('id');
  record('anon key with no session reads 0 rows', (anonRead.data?.length ?? 0) === 0, anonRead.error?.message);

  // Newest edit wins: an older client_updated_at must not overwrite a newer one.
  await A.client.from('user_flights').update({ data: { v: 'new' }, client_updated_at: '2025-01-02T10:00:00Z' }).eq('id', id);
  await A.client.from('user_flights').update({ data: { v: 'old' }, client_updated_at: '2025-01-01T12:00:00Z' }).eq('id', id);
  const v = await A.client.from('user_flights').select('data').eq('id', id).single();
  record('an older client_updated_at does not overwrite a newer one', v.data?.data?.v === 'new', `data.v = ${v.data?.data?.v}`);

  // Duplicate flight (same flight number + origin + departure, different id) -> 23505.
  const dup = await A.client.from('user_flights').insert(flightRow(A.id, { id: `rls-${stamp}-dup` }));
  record('duplicate flight number + origin + departure gives 23505', dup.error?.code === '23505', dup.error?.code ?? 'no error');

  // import_flights: first run inserts N, second run inserts 0.
  const rows = [1, 2, 3].map((n) => ({
    id: `rls-${stamp}-imp${n}`,
    airline_code: 'DL',
    flight_number: `DL${n}00`,
    origin: 'ATL',
    destination: 'JFK',
    scheduled_departure_local: `2030-02-0${n}T09:00:00`,
    data: {},
  }));
  const i1 = await A.client.rpc('import_flights', { p_rows: rows });
  const i2 = await A.client.rpc('import_flights', { p_rows: rows });
  record('import_flights inserts N, then 0 on a second run', i1.data === 3 && i2.data === 0, `first=${i1.data} second=${i2.data} ${i1.error?.message ?? ''}`);

  // A deleted flight stays deleted: soft-delete, then try to revive it with an update.
  await A.client.from('user_flights').update({ deleted_at: new Date().toISOString(), client_updated_at: '2025-01-03T10:00:00Z' }).eq('id', `rls-${stamp}-imp1`);
  await A.client.from('user_flights').update({ data: { revived: true }, client_updated_at: '2025-01-04T10:00:00Z' }).eq('id', `rls-${stamp}-imp1`);
  const gone = await A.client.from('user_flights').select('data').eq('id', `rls-${stamp}-imp1`).single();
  record('an update to a deleted flight is ignored', gone.data?.data?.revived === undefined, JSON.stringify(gone.data?.data));
} catch (e) {
  record('check ran to completion', false, e instanceof Error ? e.message : String(e));
}

const failed = results.filter((r) => !r).length;
console.log(failed === 0 ? `\nALL ${results.length} CHECKS PASSED` : `\n${failed} CHECK(S) FAILED`);
console.log('Clean up: delete the rlscheck+... users in Supabase > Authentication > Users.');
process.exit(failed === 0 ? 0 : 1);
