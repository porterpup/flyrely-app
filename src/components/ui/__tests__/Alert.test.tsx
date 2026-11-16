import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Alert } from '../Alert';
import { NoPredictionBanner } from '~/components/flight/NoPredictionBanner';

const RISK_COLOURS = /status-(success|warning)/;

describe('non-risk notices are neutral navy', () => {
  it('info and success alerts use no green or amber', () => {
    for (const status of ['info', 'success'] as const) {
      const html = renderToStaticMarkup(<Alert status={status} lineOne="x" />);
      expect(html).not.toMatch(RISK_COLOURS);
      expect(html).toContain('bg-surface-panel');
    }
  });
  it('onPanel stays neutral but gets an accent edge and darker fill', () => {
    const html = renderToStaticMarkup(<Alert status="info" onPanel lineOne="x" />);
    expect(html).not.toMatch(RISK_COLOURS);
    expect(html).toContain('border-surface-accent/50');
    expect(html).toContain('bg-surface-field');
  });
  it('error alerts stay red and announce themselves', () => {
    const html = renderToStaticMarkup(<Alert status="error" lineOne="x" />);
    expect(html).toContain('bg-status-error-bg');
    expect(html).toContain('role="alert"');
  });
  it('the temporary no-prediction banner is neutral', () => {
    expect(renderToStaticMarkup(<NoPredictionBanner type="temporary" onRetry={() => {}} />)).not.toMatch(RISK_COLOURS);
  });
});
