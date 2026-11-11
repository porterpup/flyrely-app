// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AddedStrip } from '../AddedStrip';

afterEach(cleanup);

describe('AddedStrip', () => {
  it('shows the tracking message and an Undo that fires', () => {
    const onUndo = vi.fn();
    render(<AddedStrip show flightNumber="AA100" onUndo={onUndo} />);
    expect(screen.getByText("You're tracking AA100")).toBeTruthy();
    expect(screen.getByText("We'll keep checking it until you fly.")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalled();
  });
  it('renders nothing when not just added', () => {
    const { container } = render(<AddedStrip show={false} flightNumber="AA100" onUndo={() => {}} />);
    expect(container.innerHTML).toBe('');
  });
});
