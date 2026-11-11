import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PredictionPanel } from '../PredictionPanel';

const html = (risk: 'low' | 'medium' | 'high', pct: number) =>
  renderToStaticMarkup(<PredictionPanel risk={risk} chancePercent={pct} reason="r" />);

describe('PredictionPanel', () => {
  it('low is calm: white, with reassurance line', () => {
    const h = html('low', 6);
    expect(h).toContain('bg-white');
    expect(h).toContain('Looks good. 94% of flights like this leave within 15 minutes of schedule.');
  });
  it('medium has the warning band and label', () => {
    const h = html('medium', 25);
    expect(h).toContain('border-status-warning-solid');
    expect(h).toContain('Some risk');
    expect(h).not.toContain('Looks good');
  });
  it('high keeps the solid error fill', () => {
    const h = html('high', 60);
    expect(h).toContain('bg-status-error-solid');
    expect(h).toContain('text-white');
  });
});
