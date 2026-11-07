// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { RefundRightsNote } from '../RefundRightsNote';
import { AffiliateDisclosure } from '../AffiliateDisclosure';
import { HomeAirportPrompt } from '../HomeAirportPrompt';

afterEach(cleanup);
const us = { applies: true, jurisdiction: 'US', content_key: 'us_dot' };
const text = (ui: React.ReactElement) => render(ui).container.textContent ?? '';

describe('RefundRightsNote wording', () => {
  it('uses original form of payment, never "cash refund", and covers significant delays', () => {
    const t = text(<RefundRightsNote refund={us} />);
    expect(t).toContain('a refund to your original form of payment');
    expect(t).not.toContain('cash refund');
    expect(t).toContain('3+ hours domestic, 6+ hours international');
    expect(t).toContain("delay compensation in cash isn't required by US law");
    expect(t).toContain('not legal advice');
  });

  it('adds the other-countries line only when international or eu_possible', () => {
    expect(text(<RefundRightsNote refund={us} />)).not.toContain('EU261');
    expect(text(<RefundRightsNote refund={{ ...us, international: true }} />)).toContain('EU261');
    cleanup();
    expect(text(<RefundRightsNote refund={{ ...us, eu_possible: true }} />)).toContain('EU261');
    cleanup();
    expect(text(<RefundRightsNote refund={{ ...us, applies: false, international: true }} />)).toContain('EU261');
  });

  it('rebooked: no "if you don\'t accept"', () => {
    const t = text(<RefundRightsNote refund={us} rebooked />);
    expect(t).not.toContain('don\'t accept');
    expect(t).toContain('usually means no refund for the original flight');
    expect(t).toContain('you can still ask your airline');
  });

  it('airline notice: no automatic-refund claim, mentions chargeback', () => {
    const t = text(<RefundRightsNote refund={us} airlineNotice />);
    expect(t).not.toContain('automatically');
    expect(t).toContain('Refund handling may differ');
    expect(t).toContain('card issuer about a chargeback');
  });
});

describe('other copy', () => {
  it('disclosure does not overclaim', () => {
    const t = text(<AffiliateDisclosure required />);
    expect(t).toContain("It doesn't change how we rank flights or the price you pay.");
    expect(t).not.toContain('the order');
  });
  it('home airport prompt is honest', () => {
    const t = text(<HomeAirportPrompt homeAirport={null} onChange={() => {}} />);
    expect(t).toContain('Saved on this device and used to tailor your options.');
    expect(t).not.toContain('stays on this device');
  });
});
