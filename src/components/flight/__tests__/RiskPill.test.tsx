import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RiskPill } from '../RiskPill';

describe('RiskPill', () => {
  it('low and medium are never solid fills', () => {
    for (const risk of ['low', 'medium'] as const) {
      expect(renderToStaticMarkup(<RiskPill risk={risk} />)).not.toMatch(/bg-status-\w+-solid/);
      expect(renderToStaticMarkup(<RiskPill risk={risk} emphasis="soft" />)).not.toMatch(/bg-status-\w+-solid/);
    }
  });
  it('low and medium are outlined in the risk colour', () => {
    expect(renderToStaticMarkup(<RiskPill risk="low" />)).toContain('border-status-success-text');
    expect(renderToStaticMarkup(<RiskPill risk="medium" />)).toContain('border-status-warning-text');
  });
  it('high is a solid red fill', () => {
    expect(renderToStaticMarkup(<RiskPill risk="high" />)).toContain('bg-status-error-solid');
  });
});
