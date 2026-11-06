// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DisruptionPanel, derivePanelState } from '../DisruptionPanel';
import { PREFS_KEY } from '../prefs';
import type { OptionsResponse } from '../types';
import {
  configOn,
  highRiskFlight,
  lowRiskFlight,
  optionsAffiliate,
  optionsAway,
  optionsHome,
  optionsNoAlternatives,
  optionsNotice,
  optionsSparse,
  optionsRebookedToday,
  optionsUnknown,
  statusUnknown,
} from './fixtures';

type Handler = (body: any) => { status?: number; json?: unknown } | Promise<{ status?: number; json?: unknown }>;

interface Routes {
  config?: Handler;
  options?: Handler;
  status?: Handler;
}

let calls: { path: string; body: any }[] = [];

function mockApi(routes: Routes) {
  calls = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input).replace(/^.*\/copilot/, '');
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ path, body });
    const handler =
      path === '/config' ? routes.config : path === '/options' ? routes.options : path === '/status' ? routes.status : undefined;
    const out = handler ? await handler(body) : { status: 404, json: { detail: 'Not Found' } };
    const status = out.status ?? 200;
    return new Response(JSON.stringify(out.json ?? {}), { status, headers: { 'Content-Type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fetchMock);
}

const optionsCalls = () => calls.filter((c) => c.path === '/options');

function renderPanel(flight = highRiskFlight) {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <DisruptionPanel flight={flight} onFlightChange={() => {}} />
    </QueryClientProvider>
  );
}

const ok = (json: unknown) => () => ({ json });

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const savedPrefs = () => JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? '{}');

describe('derivePanelState', () => {
  it('prefers the user report, then status, then risk', () => {
    expect(derivePanelState('cancelled', 'low', false)).toBe('cancelled');
    expect(derivePanelState('rebooked_today', 'high', false)).toBe('rebooked');
    expect(derivePanelState('rebooked_later', 'low', false)).toBe('rebooked');
    expect(derivePanelState(null, 'low', true)).toBe('cancelled');
    expect(derivePanelState('not_cancelled', 'low', true)).toBeNull();
    expect(derivePanelState('not_cancelled', 'high', false)).toBe('at_risk');
    expect(derivePanelState(null, 'high', false)).toBe('at_risk');
    expect(derivePanelState(null, 'medium', false)).toBeNull();
  });
});

describe('DisruptionPanel visibility', () => {
  it('renders nothing for a low-risk flight and never asks for options', async () => {
    mockApi({ config: ok(configOn), options: ok(optionsAway) });
    const { container } = renderPanel(lowRiskFlight);
    await waitFor(() => expect(calls.some((c) => c.path === '/config')).toBe(true));
    await new Promise((r) => setTimeout(r, 30));
    expect(container.innerHTML).toBe('');
    expect(optionsCalls()).toHaveLength(0);
  });

  it('hides when the API has the copilot flag off (404 on config)', async () => {
    mockApi({});
    const { container } = renderPanel();
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    await new Promise((r) => setTimeout(r, 30));
    expect(container.innerHTML).toBe('');
  });

  it('hides when config says enabled: false', async () => {
    mockApi({ config: ok({ ...configOn, enabled: false }) });
    const { container } = renderPanel();
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    await new Promise((r) => setTimeout(r, 30));
    expect(container.innerHTML).toBe('');
  });

  it('hides when options returns 404', async () => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ homeAirport: null, flights: { 'flight-1': 'cancelled' } }));
    mockApi({ config: ok(configOn), options: () => ({ status: 404, json: { detail: 'Not Found' } }) });
    const { container } = renderPanel();
    await waitFor(() => expect(optionsCalls()).toHaveLength(1));
    await waitFor(() => expect(container.innerHTML).toBe(''));
  });
});

describe('Plan B (high risk)', () => {
  it('is collapsed by default and fetches options only when expanded', async () => {
    mockApi({ config: ok(configOn), options: ok({ ...optionsAway, state: 'at_risk' }) });
    renderPanel();
    const toggle = await screen.findByRole('button', { name: /Plan B/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByText(/34% chance of a 15\+ min delay/)).toBeTruthy();
    expect(optionsCalls()).toHaveLength(0);
    expect(screen.queryByText('Your airline')).toBeNull();

    fireEvent.click(toggle);
    expect(await screen.findByRole('heading', { name: 'Your refund rights' })).toBeTruthy();
    expect(optionsCalls()).toHaveLength(1);
    expect(optionsCalls()[0].body).toEqual({
      flight: {
        airline: 'DL',
        flight_number: 'DL1234',
        origin: 'JFK',
        destination: 'LAX',
        departure_time: '2026-11-15T14:30:00',
      },
      state: 'at_risk',
      rebooked: null,
    });
    expect(screen.getByRole('button', { name: 'My flight was cancelled' })).toBeTruthy();
  });

  it('shows a loading state while options load', async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((r) => (release = r));
    mockApi({
      config: ok(configOn),
      options: async () => {
        await gate;
        return { json: optionsAway };
      },
    });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /Plan B/ }));
    expect(await screen.findByRole('status', { name: 'Loading your options' })).toBeTruthy();
    release?.();
    expect(await screen.findByRole('heading', { name: 'Your refund rights' })).toBeTruthy();
    expect(screen.queryByRole('status', { name: 'Loading your options' })).toBeNull();
  });

  it('shows an error state with retry when options fail', async () => {
    let attempts = 0;
    mockApi({
      config: ok(configOn),
      options: () => {
        attempts += 1;
        return attempts <= 2 ? { status: 500, json: { detail: 'boom' } } : { json: optionsAway };
      },
    });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /Plan B/ }));
    const alert = await screen.findByRole('alert', undefined, { timeout: 4000 });
    expect(within(alert).getByText(/couldn't load your options/)).toBeTruthy();
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Your refund rights' })).toBeTruthy();
  });
});

describe('user states', () => {
  it('"My flight was cancelled" stores the state and loads the cancelled card', async () => {
    mockApi({ config: ok(configOn), options: ok(optionsAway) });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /Plan B/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'My flight was cancelled' }));

    expect(await screen.findByText('Your flight was cancelled')).toBeTruthy();
    expect(savedPrefs().flights['flight-1']).toBe('cancelled');
    await waitFor(() => expect(optionsCalls().some((c) => c.body.state === 'cancelled')).toBe(true));
    expect(screen.getByRole('button', { name: "I've been rebooked" })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Not cancelled after all' })).toBeTruthy();
  });

  it('restores a saved cancelled state on load, even for a low-risk flight', async () => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ homeAirport: null, flights: { 'flight-2': 'cancelled' } }));
    mockApi({ config: ok(configOn), options: ok(optionsAway) });
    renderPanel(lowRiskFlight);
    expect(await screen.findByText('Your flight was cancelled')).toBeTruthy();
    expect(await screen.findByRole('heading', { name: 'Your refund rights' })).toBeTruthy();
  });

  it('"I\'ve been rebooked" > Today: no hotel or ride, offers "Add your new flight"', async () => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ homeAirport: 'BOS', flights: { 'flight-1': 'cancelled' } }));
    mockApi({
      config: ok(configOn),
      options: (body) => ({ json: body.state === 'rebooked' ? { ...optionsRebookedToday, hotel: null } : optionsAway }),
    });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: "I've been rebooked" }));
    fireEvent.click(await screen.findByRole('button', { name: 'Today' }));

    expect(await screen.findByText("You've been rebooked")).toBeTruthy();
    expect(savedPrefs().flights['flight-1']).toBe('rebooked_today');
    await waitFor(() =>
      expect(optionsCalls().some((c) => c.body.state === 'rebooked' && c.body.rebooked === 'today')).toBe(true)
    );
    const add = screen.getByRole('link', { name: 'Add your new flight' });
    expect(add.getAttribute('href')).toBe('/flights/add');
    expect(screen.queryByText('Need help tonight?')).toBeNull();
  });

  it('"I\'ve been rebooked" > Tomorrow or later requests rebooked: "later" and shows the help block', async () => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ homeAirport: 'BOS', flights: { 'flight-1': 'cancelled' } }));
    mockApi({
      config: ok(configOn),
      options: (body) => ({ json: { ...optionsAway, state: body.state } }),
    });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: "I've been rebooked" }));
    fireEvent.click(await screen.findByRole('button', { name: 'Tomorrow or later' }));
    expect(await screen.findByText("You've been rebooked")).toBeTruthy();
    expect(savedPrefs().flights['flight-1']).toBe('rebooked_later');
    await waitFor(() =>
      expect(optionsCalls().some((c) => c.body.state === 'rebooked' && c.body.rebooked === 'later')).toBe(true)
    );
    expect(await screen.findByText('Need help tonight?')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Add your new flight' })).toBeNull();
  });

  it('the rebooked question can be backed out of', async () => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ homeAirport: 'BOS', flights: { 'flight-1': 'cancelled' } }));
    mockApi({ config: ok(configOn), options: ok(optionsAway) });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: "I've been rebooked" }));
    fireEvent.click(await screen.findByRole('button', { name: 'Back' }));
    expect(screen.getByRole('button', { name: "I've been rebooked" })).toBeTruthy();
    expect(savedPrefs().flights['flight-1']).toBe('cancelled');
  });

  it('"Not cancelled after all" returns a high-risk flight to collapsed Plan B', async () => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ homeAirport: 'BOS', flights: { 'flight-1': 'cancelled' } }));
    mockApi({ config: ok(configOn), options: ok(optionsAway) });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Not cancelled after all' }));
    const toggle = await screen.findByRole('button', { name: /Plan B/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(savedPrefs().flights['flight-1']).toBe('not_cancelled');
  });

  it('"Not cancelled after all" hides the card for a low-risk flight', async () => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ homeAirport: 'BOS', flights: { 'flight-2': 'cancelled' } }));
    mockApi({ config: ok(configOn), options: ok(optionsAway) });
    const { container } = renderPanel(lowRiskFlight);
    fireEvent.click(await screen.findByRole('button', { name: 'Not cancelled after all' }));
    await waitFor(() => expect(container.innerHTML).toBe(''));
  });

  it('works when localStorage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    mockApi({ config: ok(configOn), options: ok(optionsAway) });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /Plan B/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'My flight was cancelled' }));
    expect(await screen.findByText('Your flight was cancelled')).toBeTruthy();
  });

  it('treats a "cancelled" status from the API as cancelled when the user has not said otherwise', async () => {
    mockApi({
      config: ok({ ...configOn, status_source: 'swim' }),
      status: ok({ status: 'cancelled', source: 'swim', as_of: '2026-11-15T10:00:00Z', detail: null }),
      options: ok(optionsAway),
    });
    // Depart within 24h so the status poll runs.
    const soon = new Date(Date.now() + 3 * 3600 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const local = `${soon.getFullYear()}-${pad(soon.getMonth() + 1)}-${pad(soon.getDate())}T${pad(soon.getHours())}:${pad(soon.getMinutes())}:00`;
    renderPanel({ ...lowRiskFlight, scheduledDeparture: local });
    expect(await screen.findByText('Your flight was cancelled')).toBeTruthy();
  });

  it('does not poll status when status_source is none', async () => {
    mockApi({ config: ok(configOn), status: ok(statusUnknown) });
    renderPanel(lowRiskFlight);
    await waitFor(() => expect(calls.some((c) => c.path === '/config')).toBe(true));
    await new Promise((r) => setTimeout(r, 30));
    expect(calls.some((c) => c.path === '/status')).toBe(false);
  });
});

describe('home airport', () => {
  const cancelled = JSON.stringify({ homeAirport: null, flights: { 'flight-1': 'cancelled' } });

  it('shows the inline prompt when unknown, and the modal saves the code and refetches with it', async () => {
    window.localStorage.setItem(PREFS_KEY, cancelled);
    mockApi({
      config: ok(configOn),
      options: (body) => ({ json: body.home_airport ? optionsAway : optionsUnknown }),
    });
    renderPanel();
    expect(await screen.findByText("What's your home airport?")).toBeTruthy();
    expect(optionsCalls()[0].body.home_airport).toBeUndefined();

    fireEvent.click(screen.getByRole('button', { name: 'Set home airport' }));
    const input = await screen.findByLabelText('Airport code or city');
    fireEvent.change(input, { target: { value: 'bos' } });
    fireEvent.click(await screen.findByRole('button', { name: /BOS/ }));

    expect(savedPrefs().homeAirport).toBe('BOS');
    await waitFor(() => expect(optionsCalls().some((c) => c.body.home_airport === 'BOS')).toBe(true));
    expect(await screen.findByText(/Home airport:/)).toBeTruthy();
  });

  it('accepts a typed code that is not in the quick list, and can clear it', async () => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ homeAirport: 'BOS', flights: { 'flight-1': 'cancelled' } }));
    mockApi({ config: ok(configOn), options: ok(optionsAway) });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'change' }));
    fireEvent.change(await screen.findByLabelText('Airport code or city'), { target: { value: 'zzz' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Use ZZZ' }));
    expect(savedPrefs().homeAirport).toBe('ZZZ');

    fireEvent.click(await screen.findByRole('button', { name: 'change' }));
    fireEvent.click(await screen.findByRole('button', { name: /Remove home airport/ }));
    expect(savedPrefs().homeAirport).toBeNull();
  });

  it('shows the ride home when at home', async () => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ homeAirport: 'JFK', flights: { 'flight-1': 'cancelled' } }));
    mockApi({ config: ok(configOn), options: ok(optionsHome) });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /Need help tonight/ }));
    expect(await screen.findByText('Get home')).toBeTruthy();
    expect(screen.queryByText('Need a place to stay?')).toBeNull();
  });
});

describe('hotel address', () => {
  it('fills the Uber drop-off on the device and never sends the address to the API', async () => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ homeAirport: 'BOS', flights: { 'flight-1': 'cancelled' } }));
    mockApi({ config: ok(configOn), options: ok(optionsAway) });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /Need help tonight/ }));
    const field = await screen.findByLabelText(/Paste your hotel address/);
    fireEvent.change(field, { target: { value: '1 Main St, Queens NY' } });

    const uber = screen.getByRole('link', { name: /Uber/ });
    expect(uber.getAttribute('href')).toBe(
      'https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=1%20Main%20St%2C%20Queens%20NY'
    );
    const lyft = screen.getByRole('link', { name: /Lyft/ });
    expect(lyft.getAttribute('href')).toBe('https://lyft.com/ride?id=lyft');
    expect(JSON.stringify(calls)).not.toContain('Main St');
  });

  it('does not offer the field when there is no hotel', async () => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ homeAirport: 'JFK', flights: { 'flight-1': 'cancelled' } }));
    mockApi({ config: ok(configOn), options: ok(optionsHome) });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /Need help tonight/ }));
    await screen.findByText('Get home');
    expect(screen.queryByLabelText(/Paste your hotel address/)).toBeNull();
  });
});

describe('disclosure and empty states', () => {
  const cancelled = JSON.stringify({ homeAirport: 'BOS', flights: { 'flight-1': 'cancelled' } });

  it('shows the commission line only when required, and opens the "How we choose these" sheet', async () => {
    window.localStorage.setItem(PREFS_KEY, cancelled);
    mockApi({ config: ok(configOn), options: ok(optionsAffiliate) });
    renderPanel();
    expect(await screen.findByText(/may earn a commission from some of these links/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'How we choose these' }));
    expect(await screen.findByText(/Links that may earn a commission are marked as sponsored/)).toBeTruthy();
  });

  it('omits the commission line for plain links but keeps the static ranking line', async () => {
    window.localStorage.setItem(PREFS_KEY, cancelled);
    mockApi({ config: ok(configOn), options: ok(optionsAway) });
    renderPanel();
    expect(await screen.findByText(/never by commission/)).toBeTruthy();
    expect(screen.queryByText(/may earn a commission/)).toBeNull();
  });

  it('shows the empty state with search hand-offs when there are no alternatives', async () => {
    window.localStorage.setItem(PREFS_KEY, cancelled);
    mockApi({ config: ok(configOn), options: ok(optionsNoAlternatives) });
    renderPanel();
    expect(await screen.findByText('No other flights found today')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /KAYAK/ }).length).toBeGreaterThan(0);
  });
});

describe('S-A6 response shapes', () => {
  const cancelled = JSON.stringify({ homeAirport: 'BOS', flights: { 'flight-1': 'cancelled' } });

  it('shows the carrier note and status link when airline is null but airline_notice is set', async () => {
    window.localStorage.setItem(PREFS_KEY, cancelled);
    mockApi({ config: ok(configOn), options: ok(optionsNotice) });
    renderPanel();
    expect(await screen.findByText('This carrier handles rebooking through its own help page.')).toBeTruthy();
    expect(screen.getByRole('link', { name: /flight status/ }).getAttribute('href')).toBe('https://example.com/status');
    expect(screen.queryByText('Contact your airline')).toBeNull();
  });

  it('falls back to "Contact your airline" when there is no airline and no notice, and copes with nulls', async () => {
    window.localStorage.setItem(PREFS_KEY, cancelled);
    mockApi({ config: ok(configOn), options: ok(optionsSparse) });
    renderPanel();
    expect(await screen.findByText('Contact your airline')).toBeTruthy();
    expect(screen.getByText('Risk unavailable')).toBeTruthy();
    expect(screen.getByText('No delay estimate for this flight')).toBeTruthy();
    expect(screen.queryByText(/Schedule as of/)).toBeNull();
  });

  it('422 unknown_airport says the route is not covered, with no retry', async () => {
    window.localStorage.setItem(PREFS_KEY, cancelled);
    mockApi({
      config: ok(configOn),
      options: () => ({ status: 422, json: { detail: { reason: 'unknown_airport', field: 'flight' } } }),
    });
    renderPanel();
    expect(await screen.findByText("We don't cover this route yet")).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    expect(optionsCalls()).toHaveLength(1);
  });

  it('treats status "unknown" with detail source_not_configured as no live status', async () => {
    mockApi({
      config: ok({ ...configOn, status_source: 'swim' }),
      status: ok({ status: 'unknown', source: 'swim', as_of: null, detail: 'source_not_configured' }),
    });
    const soon = new Date(Date.now() + 3 * 3600 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const local = `${soon.getFullYear()}-${pad(soon.getMonth() + 1)}-${pad(soon.getDate())}T${pad(soon.getHours())}:${pad(soon.getMinutes())}:00`;
    const { container } = renderPanel({ ...lowRiskFlight, scheduledDeparture: local });
    await waitFor(() => expect(calls.some((c) => c.path === '/status')).toBe(true));
    await new Promise((r) => setTimeout(r, 30));
    expect(container.innerHTML).toBe('');
  });
});

describe('typing', () => {
  it('fixtures satisfy OptionsResponse', () => {
    const all: OptionsResponse[] = [optionsAway, optionsHome, optionsUnknown];
    expect(all).toHaveLength(3);
  });
});
