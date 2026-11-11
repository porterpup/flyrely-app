// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { makeFlight } from '~/lib/__tests__/memStorage';
import type { Flight } from '~/types';
import { ConnectionRow } from '../ConnectionRow';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
}));

afterEach(cleanup);

const ap = (code: string) => ({ code, name: code, city: code });
const pair = (hub: string, arr: string | undefined, dep: string, a = 'UA', b = 'UA'): [Flight, Flight] => [
  makeFlight({ id: 'a', airline: { code: a, name: a }, origin: ap('SFO'), destination: ap(hub), scheduledDeparture: '2026-12-03T07:00:00', ...(arr ? { scheduledArrivalLocal: arr } : {}) }),
  makeFlight({ id: 'b', airline: { code: b, name: b }, origin: ap(hub), destination: ap('BNA'), scheduledDeparture: dep }),
];

describe('ConnectionRow', () => {
  it('warns on a tight connection', () => {
    const [p, n] = pair('ORD', '2026-12-03T10:00:00', '2026-12-03T10:45:00');
    render(<ConnectionRow prev={p} next={n} />);
    expect(screen.getByText('Tight connection: 45 min in Chicago. We recommend at least 50 min here.')).toBeTruthy();
  });
  it('adds a tip on a tight or short connection', () => {
    const tip = 'Tip: sit near the front and check your arrival gate as soon as you land.';
    const [p, n] = pair('ORD', '2026-12-03T10:00:00', '2026-12-03T10:45:00');
    const { unmount } = render(<ConnectionRow prev={p} next={n} />);
    expect(screen.getByText(tip)).toBeTruthy();
    unmount();
    const [p2, n2] = pair('DEN', '2026-12-03T10:00:00', '2026-12-03T10:55:00');
    const { unmount: u2 } = render(<ConnectionRow prev={p2} next={n2} />);
    expect(screen.getByText(tip)).toBeTruthy();
    u2();
    const [p3, n3] = pair('DEN', '2026-12-03T10:00:00', '2026-12-03T13:00:00');
    render(<ConnectionRow prev={p3} next={n3} />);
    expect(screen.queryByText(tip)).toBeNull();
  });
  it('shows a short-connection caution', () => {
    const [p, n] = pair('DEN', '2026-12-03T10:00:00', '2026-12-03T10:55:00');
    render(<ConnectionRow prev={p} next={n} />);
    expect(screen.getByText('Short connection: 55 min in Denver. Usually OK if your first flight is on time.')).toBeTruthy();
  });
  it('says nothing extra for a comfortable overnight layover', () => {
    const [p, n] = pair('DEN', '2026-12-03T22:00:00', '2026-12-04T09:00:00');
    render(<ConnectionRow prev={p} next={n} />);
    expect(screen.getByText(/Connection in Denver/)).toBeTruthy();
    expect(screen.queryByText(/Tight|Short|Separate/)).toBeNull();
  });
  it('adds the separate-airlines note', () => {
    const [p, n] = pair('DEN', '2026-12-03T10:00:00', '2026-12-03T13:00:00', 'UA', 'DL');
    render(<ConnectionRow prev={p} next={n} />);
    expect(screen.getByText(/^Separate airlines: if your first flight is late/)).toBeTruthy();
  });
  it('keeps the unknown-arrival prompt', () => {
    const [p, n] = pair('DEN', undefined, '2026-12-03T13:00:00');
    render(<ConnectionRow prev={p} next={n} />);
    expect(screen.getByText('Connection time unknown ·')).toBeTruthy();
    expect(screen.getByText('Add arrival time')).toBeTruthy();
  });
});
