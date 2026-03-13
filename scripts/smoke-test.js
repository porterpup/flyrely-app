const fetch = require('node-fetch');
const API = process.env.VITE_API_URL || 'https://web-production-ea1e9.up.railway.app';

async function run() {
  try {
    const h = await fetch(`${API}/health`);
    console.log('/health', await h.json());

    const payload = { origin: 'JFK', destination: 'LAX', departure_time: '2026-03-15T14:30:00', airline: 'AA' };
    const p = await fetch(`${API}/predict`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    console.log('/predict status', p.status);
    try { console.log(await p.json()); } catch (e) { console.log('non-json response'); }
  } catch (e) {
    console.error('smoke test failed', e);
    process.exit(2);
  }
}

run();
