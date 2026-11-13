// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Flight } from '~/types';

const m = vi.hoisted(() => ({
  setSelfReport: vi.fn(),
  markReportSent: vi.fn(),
  markReportRejected: vi.fn(),
  getFlightById: vi.fn(),
  sendReport: vi.fn(),
  emitNotice: vi.fn(),
}));
vi.mock('~/lib/flightStore', () => ({
  setSelfReport: m.setSelfReport,
  markReportSent: m.markReportSent,
  markReportRejected: m.markReportRejected,
  getFlightById: m.getFlightById,
}));
vi.mock('~/lib/syncEngine', () => ({ emitNotice: m.emitNotice }));
vi.mock('~/lib/flightReport', async (orig) => ({ ...(await orig<typeof import('~/lib/flightReport')>()), sendReport: m.sendReport }));

import { FlightReportPrompt } from '../FlightReportPrompt';

const flight: Flight = {
  id: 'f1',
  flightNumber: 'UA648',
  airline: { code: 'UA', name: 'United' },
  origin: { code: 'SFO', name: 'San Francisco Intl', city: 'San Francisco' },
  destination: { code: 'DEN', name: 'Denver Intl', city: 'Denver' },
  scheduledDeparture: '2026-11-07T08:00:00',
  status: 'completed',
  riskLevel: 'low',
  delayProbability: 0.2,
};

beforeEach(() => {
  vi.clearAllMocks();
  m.sendReport.mockResolvedValue(200);
  m.getFlightById.mockReturnValue({ selfReport: { answeredAt: 'ts-1' } });
});
afterEach(cleanup);

describe('FlightReportPrompt', () => {
  it('asks the question with the route and the origin-zone departure time', () => {
    render(<FlightReportPrompt flight={flight} />);
    expect(screen.getByText('Did UA648 leave on time?')).toBeTruthy();
    expect(screen.getByText(/SFO → DEN · Sat, Nov 7, 8:00 AM departure\./)).toBeTruthy();
  });

  it('renders the six options', () => {
    render(<FlightReportPrompt flight={flight} />);
    expect(screen.getAllByRole('button')).toHaveLength(6);
  });

  it('a tap saves, sends, marks sent and shows Thanks with Undo', async () => {
    render(<FlightReportPrompt flight={flight} />);
    fireEvent.click(screen.getByRole('button', { name: '15–44 min late' }));
    expect(m.setSelfReport).toHaveBeenCalledWith('f1', 'late_15_44');
    expect(screen.getAllByText('Thanks. You said it was 15–44 min late.').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy();
    await waitFor(() => expect(m.markReportSent).toHaveBeenCalledWith('f1', 'ts-1'));
    expect(m.sendReport).toHaveBeenCalledWith(flight, 'late_15_44');
  });

  it('Undo withdraws when there was no earlier answer, and sends again', async () => {
    render(<FlightReportPrompt flight={flight} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelled' }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(m.setSelfReport).toHaveBeenLastCalledWith('f1', null);
    await waitFor(() => expect(m.sendReport).toHaveBeenLastCalledWith(flight, null));
    expect(screen.queryByText(/Thanks/)).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(6);
  });

  it('Undo restores the previous answer after a change', async () => {
    const answered: Flight = { ...flight, selfReport: { answer: 'on_time', answeredAt: '2026-11-07T20:00:00Z', sent: true } };
    render(<FlightReportPrompt flight={answered} />);
    expect(screen.getByText('You said: on time')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    fireEvent.click(screen.getByRole('button', { name: 'Over 2 h late' }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(m.setSelfReport).toHaveBeenLastCalledWith('f1', 'on_time');
    await waitFor(() => expect(m.sendReport).toHaveBeenLastCalledWith(answered, 'on_time'));
  });

  it('a failed send is silent; only a 429 shows a notice', async () => {
    m.sendReport.mockResolvedValueOnce(0);
    const { unmount } = render(<FlightReportPrompt flight={flight} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelled' }));
    await waitFor(() => expect(m.sendReport).toHaveBeenCalled());
    expect(m.markReportSent).not.toHaveBeenCalled();
    expect(m.emitNotice).not.toHaveBeenCalled();
    unmount();
    m.sendReport.mockResolvedValueOnce(429);
    render(<FlightReportPrompt flight={flight} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelled' }));
    await waitFor(() => expect(m.emitNotice).toHaveBeenCalledWith("You've sent a lot of answers. Please try again later.", 'info'));
  });

  it('shows "Not now" only in the Home variant', () => {
    const onNotNow = vi.fn();
    const { unmount } = render(<FlightReportPrompt flight={flight} />);
    expect(screen.queryByRole('button', { name: 'Not now' })).toBeNull();
    unmount();
    render(<FlightReportPrompt flight={flight} variant="home" onNotNow={onNotNow} />);
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onNotNow).toHaveBeenCalled();
  });

  it('every button has an accessible name', () => {
    render(<FlightReportPrompt flight={flight} variant="home" onDark />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(7);
    for (const b of buttons) expect((b.textContent ?? '').trim().length).toBeGreaterThan(0);
  });

  it('the Home variant shows nothing visible for an answered flight', () => {
    const answered: Flight = { ...flight, selfReport: { answer: 'on_time', answeredAt: 'x', sent: true } };
    const { container } = render(<FlightReportPrompt flight={answered} variant="home" />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(container.textContent).toBe('');
  });

  it('a 422 marks the answer rejected', async () => {
    m.sendReport.mockResolvedValueOnce(422);
    render(<FlightReportPrompt flight={flight} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelled' }));
    await waitFor(() => expect(m.markReportRejected).toHaveBeenCalledWith('f1', 'ts-1'));
  });

  it('keeps one role=status region mounted and changes only its text', () => {
    render(<FlightReportPrompt flight={flight} />);
    const region = screen.getByRole('status');
    expect(region.textContent).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelled' }));
    expect(screen.getByRole('status')).toBe(region);
    expect(region.textContent).toBe('Thanks. You said it was cancelled.');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('status')).toBe(region);
    expect(region.textContent).toBe('');
  });

  it('names the question box and uses an h2 on the flight page but no heading on Home', () => {
    const { unmount } = render(<FlightReportPrompt flight={flight} />);
    expect(screen.getByRole('region', { name: 'Did UA648 leave on time?' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy();
    unmount();
    render(<FlightReportPrompt flight={flight} variant="home" />);
    expect(screen.getByRole('region', { name: 'Did UA648 leave on time?' })).toBeTruthy();
    expect(screen.queryAllByRole('heading')).toHaveLength(0);
  });

  it('moves focus: Undo after a tap, the question after Undo, the first option after Change', () => {
    render(<FlightReportPrompt flight={flight} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelled' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Undo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(document.activeElement).toBe(screen.getByText('Did UA648 leave on time?'));
    cleanup();
    const answered: Flight = { ...flight, selfReport: { answer: 'on_time', answeredAt: 'x', sent: true } };
    render(<FlightReportPrompt flight={answered} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'On time (under 15 min late)' }));
  });

  it('Cancel after Change returns to the answered row with focus on Change', () => {
    const answered: Flight = { ...flight, selfReport: { answer: 'late_15_44', answeredAt: 'x', sent: true } };
    render(<FlightReportPrompt flight={answered} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('You said: 15–44 min late')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Change' }));
  });

  it('pauses the 8 s auto-hide while the strip is hovered or focused', () => {
    vi.useFakeTimers();
    try {
      render(<FlightReportPrompt flight={flight} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancelled' }));
      const undo = screen.getByRole('button', { name: 'Undo' }); // focused by the component
      act(() => void vi.advanceTimersByTime(20_000));
      expect(screen.getByRole('button', { name: 'Undo' })).toBe(undo);
      fireEvent.blur(undo);
      act(() => void vi.advanceTimersByTime(7_900));
      expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeNull();
      act(() => void vi.advanceTimersByTime(200));
      expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
