// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AirportAutocomplete, autoCode } from '../AirportAutocomplete';
import { AIRPORTS } from '~/lib/airports';
import { AIRPORT_REF } from '~/lib/airportRef';

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
    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('SFO – San Francisco');
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

  it('shows the selected state for a typed code the same as for a picked one', () => {
    render(<Harness />);
    const input = screen.getByLabelText('From') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'ewr' } });
    expect(screen.getByLabelText('Selected')).toBeTruthy();
    fireEvent.blur(input);
    expect(input.value).toBe('EWR – Newark');
    expect(screen.getByLabelText('Selected')).toBeTruthy();
  });

  it('is not selected for a partial code or a city being typed', () => {
    render(<Harness />);
    const input = screen.getByLabelText('From') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'EW' } });
    expect(screen.queryByLabelText('Selected')).toBeNull();
    fireEvent.change(input, { target: { value: 'San Fran' } });
    expect(screen.queryByLabelText('Selected')).toBeNull();
    expect(input.value).toBe('San Fran');
  });

  it('reports no code for free text longer than a code', () => {
    const onChange = vi.fn();
    render(<AirportAutocomplete label="From" placeholder="x" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: 'San Fran' } });
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('does not add a second ring when selected (the focus ring is the only ring)', () => {
    render(<AirportAutocomplete label="From" placeholder="x" value="EWR" onChange={() => {}} />);
    const box = screen.getByLabelText('From').parentElement as HTMLElement;
    expect(box.className).toContain('border-surface-accent');
    expect(box.className).not.toMatch(/(^|\s)ring-2(\s|$)/);
  });

  it('truncates long selected text with an ellipsis', () => {
    render(<AirportAutocomplete label="To" placeholder="x" value="SFO" onChange={() => {}} />);
    expect(screen.getByLabelText('To').className).toContain('truncate');
  });

  it('does not turn a city prefix like "San" into a code', () => {
    const onChange = vi.fn();
    render(<AirportAutocomplete label="From" placeholder="x" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: 'San' } });
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(screen.queryByLabelText('Selected')).toBeNull();
  });

  it('still takes a code that is only its own city, like BOS', () => {
    const onChange = vi.fn();
    render(<AirportAutocomplete label="From" placeholder="x" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: 'bos' } });
    expect(onChange).toHaveBeenLastCalledWith('BOS');
  });
});

describe('autoCode sweep', () => {
  it('selects ATL, SEA, AUS and BOS in any case', () => {
    for (const code of ['ATL', 'SEA', 'AUS', 'BOS']) {
      expect(autoCode(code)).toBe(code);
      expect(autoCode(code.toLowerCase())).toBe(code);
    }
  });

  it('selects every known code typed in capitals; lower-case rejects only real city-prefix clashes', () => {
    const rejected: string[] = [];
    for (const [code] of Object.entries(AIRPORT_REF)) {
      expect(autoCode(code)).toBe(code);
      if (autoCode(code.toLowerCase()) !== code) rejected.push(code);
    }
    // Every rejected one must really be a prefix of another airport's city (e.g. "san", "new", "bal").
    for (const code of rejected) {
      const t = code.toLowerCase();
      const clash = [...AIRPORTS.map((a) => a), ...Object.entries(AIRPORT_REF).map(([c, r]) => ({ code: c, city: r.city ?? '' }))]
        .some((a) => a.code !== code && a.city.toLowerCase().startsWith(t));
      expect(clash).toBe(true);
    }
    expect(rejected).toContain('SAN');
    expect(rejected).not.toContain('ATL');
    expect(rejected).not.toContain('SEA');
    expect(rejected).not.toContain('AUS');
  });

  it('reports "San" as no code but "SAN" as San Diego', () => {
    expect(autoCode('San')).toBe('');
    expect(autoCode('SAN')).toBe('SAN');
  });

  it('passes an unknown 3-letter code up as typed so the form can say it is not recognised', () => {
    expect(autoCode('xyz')).toBe('XYZ');
    const onChange = vi.fn();
    render(<AirportAutocomplete label="From" placeholder="x" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: 'XYZ' } });
    expect(onChange).toHaveBeenLastCalledWith('XYZ');
    expect(screen.queryByLabelText('Selected')).toBeNull();
  });
});
