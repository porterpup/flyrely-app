// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { PartnerButton } from '../PartnerButton';
import type { Handoff } from '~/copilot/types';

afterEach(cleanup);

const handoff = (is_affiliate: boolean): Handoff => ({
  partner: 'sample',
  label: 'Sample partner',
  url: 'https://example.com/go',
  is_affiliate,
});

function link(h: Handoff) {
  return render(<PartnerButton handoff={h} />).container.querySelector('a') as HTMLAnchorElement;
}

describe('PartnerButton', () => {
  it('opens in a new tab with noopener noreferrer', () => {
    const a = link(handoff(false));
    expect(a.getAttribute('href')).toBe('https://example.com/go');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toContain('noopener');
    expect(a.getAttribute('rel')).toContain('noreferrer');
  });
  it('adds sponsored only for affiliate links', () => {
    expect(link(handoff(true)).getAttribute('rel')).toContain('sponsored');
    expect(link(handoff(false)).getAttribute('rel')).not.toContain('sponsored');
  });
});
