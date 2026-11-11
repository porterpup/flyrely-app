// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PasswordInput } from '../PasswordInput';
import { localToday, formatMonthYear } from '~/lib/utils';

afterEach(cleanup);

describe('PasswordInput', () => {
  it('toggles between hidden and visible', () => {
    render(<PasswordInput label="Password" />);
    const input = screen.getByLabelText('Password') as HTMLInputElement;
    expect(input.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input.type).toBe('text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeTruthy();
  });
});

describe('helpers', () => {
  it('localToday uses the device-local date', () => {
    expect(localToday(new Date(2026, 10, 9, 23, 59))).toBe('2026-11-09');
  });
  it('formatMonthYear uses full month names', () => {
    expect(formatMonthYear('2026-08')).toBe('August 2026');
    expect(formatMonthYear('2026-08-31')).toBe('August 2026');
  });
});
