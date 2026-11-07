import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Flight } from '~/types';
import type { OptionsRequest, OptionsResponse, FlightRef } from '../types';
import {
  CopilotApiError,
  getCopilotConfig,
  getCopilotOptions,
  getCopilotStatus,
  subscribePush,
  toFlightRef,
  unsubscribePush,
} from '../api';

const BASE = 'http://localhost:8000';

const flight: FlightRef = {
  airline: 'DL',
  flight_number: 'DL1234',
  origin: 'JFK',
  destination: 'LAX',
  departure_time: '2026-11-15T14:30:00',
};

// Trimmed copy of the plan §4.2 example response.
const optionsResponse: OptionsResponse = {
  state: 'cancelled',
  context: { location: 'away', reason: 'origin_not_home', home_airport: 'BOS' },
  airline: {
    code: 'DL',
    name: 'Delta Air Lines',
    manage_booking_url: 'https://www.delta.com/mytrips/',
    phone: '+1-800-221-1212',
    phone_display: '800-221-1212',
    verified_on: '2026-11-10',
  },
  refund_rights: { applies: true, jurisdiction: 'US_DOT', content_key: 'us_dot_part260_v1' },
  alternatives: {
    source: 'bts_typical_schedule',
    schedule_as_of: '2026-08',
    date: '2026-11-15',
    items: [],
    search_handoffs: [],
    warnings: [],
  },
  hotel: null,
  ride: { purpose: null, links: [] },
  disclosure: { required: false },
  warnings: [],
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('copilot api client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GET /copilot/config returns the parsed body', async () => {
    const config = {
      enabled: true,
      push: { enabled: false, vapid_public_key: null },
      status_source: 'none',
      affiliate_partners_configured: [],
      schedule_as_of: '2026-08',
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, config));

    await expect(getCopilotConfig()).resolves.toEqual(config);
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/copilot/config`, { method: 'GET' });
  });

  it('POST /copilot/options sends the request as JSON and returns the response', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, optionsResponse));
    const body: OptionsRequest = {
      flight,
      state: 'cancelled',
      rebooked: null,
      home_airport: 'BOS',
      max_alternatives: 8,
    };

    await expect(getCopilotOptions(body)).resolves.toEqual(optionsResponse);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/copilot/options`);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual(body);
  });

  it('POST /copilot/status sends the flight and returns the status', async () => {
    const status = { status: 'unknown', source: 'none', as_of: null, detail: null };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, status));

    await expect(getCopilotStatus({ flight })).resolves.toEqual(status);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/copilot/status`);
    expect(JSON.parse(init.body as string)).toEqual({ flight });
  });

  it('POST /copilot/push/subscribe returns 201 body', async () => {
    const reply = { watch_id: 'w_7f3c', expires_at: '2026-11-16T22:30:00Z' };
    fetchMock.mockResolvedValueOnce(jsonResponse(201, reply));
    const req = {
      subscription: { endpoint: 'https://web.push.apple.com/abc', keys: { p256dh: 'p', auth: 'a' } },
      flight,
      client_flight_id: 'flight-1730000000000',
    };

    await expect(subscribePush(req)).resolves.toEqual(reply);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/copilot/push/subscribe`);
    expect(JSON.parse(init.body as string)).toEqual(req);
  });

  it('POST /copilot/push/unsubscribe returns the removed count', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { removed: 1 }));

    await expect(
      unsubscribePush({ endpoint: 'https://web.push.apple.com/abc', watch_id: 'w_7f3c' }),
    ).resolves.toEqual({ removed: 1 });
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/copilot/push/unsubscribe`);
  });

  it('throws CopilotApiError with the status on 404 (flag off)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404, { detail: 'Not Found' }));

    const err = await getCopilotConfig().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CopilotApiError);
    expect((err as CopilotApiError).status).toBe(404);
    expect((err as CopilotApiError).body).toEqual({ detail: 'Not Found' });
  });

  it('keeps the 422 detail body (unknown airport)', async () => {
    const detail = { detail: { reason: 'unknown_airport' } };
    fetchMock.mockResolvedValueOnce(jsonResponse(422, detail));

    const err = (await getCopilotOptions({
      flight: { ...flight, origin: 'ZZZ' },
      state: 'cancelled',
      rebooked: null,
    }).catch((e: unknown) => e)) as CopilotApiError;
    expect(err.status).toBe(422);
    expect(err.body).toEqual(detail);
  });

  it('still reports the status when the error body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>bad gateway</html>', { status: 502 }));

    const err = (await getCopilotStatus({ flight }).catch((e: unknown) => e)) as CopilotApiError;
    expect(err).toBeInstanceOf(CopilotApiError);
    expect(err.status).toBe(502);
    expect(err.body).toBeNull();
  });

  it('propagates network failures as-is', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(getCopilotConfig()).rejects.toThrow('Failed to fetch');
  });
});

describe('toFlightRef', () => {
  it('maps the app Flight to the API FlightRef', () => {
    const f = {
      id: 'flight-1',
      flightNumber: 'DL1234',
      airline: { code: 'DL', name: 'Delta' },
      origin: { code: 'jfk', name: 'JFK', city: 'New York' },
      destination: { code: 'LAX', name: 'LAX', city: 'Los Angeles' },
      scheduledDeparture: '2026-11-15T14:30:00',
      status: 'scheduled',
      riskLevel: 'low',
    } as unknown as Flight;

    expect(toFlightRef(f)).toEqual(flight);
  });
});

describe('toFlightRef departure_time', () => {
  const base = {
    id: 'f',
    flightNumber: 'DL1234',
    airline: { code: 'DL', name: 'Delta' },
    origin: { code: 'JFK', name: 'JFK', city: 'New York' },
    destination: { code: 'LAX', name: 'LAX', city: 'Los Angeles' },
    status: 'scheduled',
    riskLevel: 'low',
  };
  const ref = (scheduledDeparture: string) => toFlightRef({ ...base, scheduledDeparture } as unknown as Flight).departure_time;

  it('passes the local ISO the app stores (add.tsx builds `${date}T${time}:00`) through unchanged', () => {
    expect(ref('2026-11-15T14:30:00')).toBe('2026-11-15T14:30:00');
  });

  it('pads minute-precision values and drops any offset or fractional seconds', () => {
    expect(ref('2026-11-15T14:30')).toBe('2026-11-15T14:30:00');
    expect(ref('2026-11-15T14:30:00Z')).toBe('2026-11-15T14:30:00');
    expect(ref('2026-11-15T14:30:00.000-05:00')).toBe('2026-11-15T14:30:00');
  });
});
