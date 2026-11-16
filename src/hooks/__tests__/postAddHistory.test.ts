import { describe, expect, it } from 'vitest';
import { createMemoryHistory } from '@tanstack/react-router';

// Mirrors how the app navigates: Home -> Add flight (push) -> tracked flight (replace).
describe('post-add history stack', () => {
  it('Back from the flight page returns Home when the add form entry is replaced', () => {
    const h = createMemoryHistory({ initialEntries: ['/'] });
    h.push('/flights/add');
    h.replace('/flights/abc?added=1'); // useTrackFlight: replace: true
    expect(h.length).toBe(2);
    h.back();
    expect(h.location.pathname).toBe('/');
  });
  it('Back from the trip page returns to the flight that was being extended (?after=)', () => {
    const h = createMemoryHistory({ initialEntries: ['/', '/flights/abc'] });
    h.push('/flights/add?after=abc');
    h.replace('/trips/t1');
    h.back();
    expect(h.location.pathname).toBe('/flights/abc');
  });
  it('without replace the add form stays in the stack (the old bug)', () => {
    const h = createMemoryHistory({ initialEntries: ['/'] });
    h.push('/flights/add');
    h.push('/flights/abc');
    h.back();
    expect(h.location.pathname).toBe('/flights/add');
  });
});
