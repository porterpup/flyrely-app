// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AirportAutocomplete } from '../AirportAutocomplete';

afterEach(cleanup);

function Harness() {
  const [code, setCode] = useState('');
  return (
    // Mirrors the add-flight screen: the parent stores the typed code and passes it back in.
    <AirportAutocomplete label="From" placeholder="e.g., EWR" value={code} onChange={(c) => setCode(c)} />
  );
}

describe('AirportAutocomplete', () => {
  it('keeps the same focused input while typing several characters', () => {
    render(<Harness />);
    const input = screen.getByLabelText('From') as HTMLInputElement;
    input.focus();
    for (const typed of ['a', 'at', 'atl']) {
      fireEvent.change(input, { target: { value: typed } });
      expect(screen.getByLabelText('From')).toBe(input);
      expect(document.activeElement).toBe(input);
      expect(input.value).toBe(typed);
    }
  });

  it('takes a prefilled value arriving later', () => {
    const { rerender } = render(<AirportAutocomplete label="From" placeholder="x" value="" onChange={() => {}} />);
    rerender(<AirportAutocomplete label="From" placeholder="x" value="SFO" onChange={() => {}} />);
    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('SFO');
  });

  it('selects the prefilled value on focus so typing replaces it', () => {
    render(<AirportAutocomplete label="From" placeholder="x" value="ATL" onChange={() => {}} />);
    const input = screen.getByLabelText('From') as HTMLInputElement;
    fireEvent.focus(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  it('clears with the x button and reports an empty value', () => {
    const onChange = vi.fn();
    render(<AirportAutocomplete label="From" placeholder="x" value="ATL" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('');
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('hides the clear button when empty', () => {
    render(<AirportAutocomplete label="From" placeholder="x" value="" onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });
});
