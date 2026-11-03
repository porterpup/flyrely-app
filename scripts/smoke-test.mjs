// Smoke test for the FlyRely API contract. Usage: npm run smoke
// Needs Node 18+ (built-in fetch). Reads VITE_API_URL, default http://localhost:8000.
const API = (process.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

let failures = 0
function check(ok, msg) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`)
  if (!ok) failures++
}

async function run() {
  console.log(`API: ${API}`)

  const h = await fetch(`${API}/health`)
  const health = await h.json()
  check(h.status === 200, `/health status 200 (got ${h.status})`)
  check(['healthy', 'degraded'].includes(health.status), `/health status is healthy|degraded (got ${health.status})`)
  check(typeof health.model_loaded === 'boolean', '/health.model_loaded is boolean')

  // Departure a few days out, local time without offset (matches PredictRequest)
  const d = new Date(Date.now() + 3 * 86400000)
  const departure = `${d.toISOString().slice(0, 10)}T14:30:00`
  const flightId = `smoke-${Date.now()}`
  const p = await fetch(`${API}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      flight_id: flightId,
      origin: 'JFK',
      destination: 'LAX',
      departure_time: departure,
      airline: 'AA',
      flight_number: 'AA100',
    }),
  })

  if (p.status === 503) {
    console.log('/predict returned 503 (no-prediction state): model unavailable')
    check(false, '/predict produced a prediction')
  } else {
    const r = await p.json()
    check(p.status === 200, `/predict status 200 (got ${p.status})`)
    check(r.flight_id === flightId, `flight_id echoed (sent ${flightId}, got ${r.flight_id})`)
    check(typeof r.delay_probability === 'number' && r.delay_probability >= 0 && r.delay_probability <= 1, 'delay_probability is a number in [0,1]')
    check(['low', 'medium', 'high'].includes(r.risk_level), `risk_level is low|medium|high (got ${r.risk_level})`)
    check(typeof r.confidence === 'number', 'confidence is a number')
    check(r.delay_severity === null || ['minor_pct', 'moderate_pct', 'severe_pct'].every((k) => typeof r.delay_severity?.[k] === 'number'), 'delay_severity is null or has minor/moderate/severe pct')
    check(Array.isArray(r.risk_factors), 'risk_factors is an array')
    check(Array.isArray(r.recommendations), 'recommendations is an array')
    check(Array.isArray(r.warnings), 'warnings is an array')
    check(typeof r.weather_available === 'boolean', 'weather_available is boolean')
    check(typeof r.model_version === 'string', 'model_version is a string')
    check(r.origin === 'JFK' && r.destination === 'LAX', 'origin/destination echoed')
  }

  if (failures) {
    console.error(`\n${failures} check(s) failed`)
    process.exit(1)
  }
  console.log('\nAll checks passed')
}

run().catch((e) => {
  console.error('smoke test error:', e.message)
  process.exit(2)
})
