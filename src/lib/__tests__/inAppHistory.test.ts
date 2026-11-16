import { describe, expect, it } from 'vitest';
import { createMemoryHistory } from '@tanstack/react-router';
import { canGoBackInApp, trackInAppHistory } from '../inAppHistory';

const setup = (entries: string[]) => {
  const h = createMemoryHistory({ initialEntries: entries, initialIndex: entries.length - 1 });
  trackInAppHistory(h);
  return h;
};

describe('canGoBackInApp', () => {
  it('is false on the first entry of a session (opened directly)', () => {
    expect(canGoBackInApp(setup(['/flights/abc']))).toBe(false);
  });
  it('is true after a push and false again after going back', () => {
    const h = setup(['/']);
    h.push('/flights/add');
    expect(canGoBackInApp(h)).toBe(true);
    h.back();
    expect(canGoBackInApp(h)).toBe(false);
  });
  it('stays false when the only entry is replaced', () => {
    const h = setup(['/flights/add']);
    h.replace('/flights/abc');
    expect(canGoBackInApp(h)).toBe(false);
  });
  it('stays true after Home -> add -> replace with the flight', () => {
    const h = setup(['/']);
    h.push('/flights/add');
    h.replace('/flights/abc');
    expect(canGoBackInApp(h)).toBe(true);
    h.back();
    expect(h.location.pathname).toBe('/');
    expect(canGoBackInApp(h)).toBe(false);
  });
  it('is false for an untracked history', () => {
    expect(canGoBackInApp(createMemoryHistory({ initialEntries: ['/', '/a'] }))).toBe(false);
  });
});
