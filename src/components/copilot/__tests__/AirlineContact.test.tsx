import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AirlineContact } from '../AirlineContact';

const airline = {
  code: 'XX',
  name: 'Sample Air',
  manage_booking_url: 'https://example.com/manage',
  phone: '+10000000000',
  phone_display: '1-800-000-0000',
  verified_on: '2026-08-15',
};

describe('AirlineContact', () => {
  it('shows the single airline with its phone and manage link', () => {
    const html = renderToStaticMarkup(<AirlineContact airline={airline} />);
    expect(html).toContain('href="tel:+10000000000"');
    expect(html).toContain('1-800-000-0000');
    expect(html).toContain('href="https://example.com/manage"');
    expect(html).toContain('Sample Air');
    expect((html.match(/href="https:/g) ?? []).length).toBe(1);
  });

  it('falls back to "Contact your airline" with no links when unknown', () => {
    const html = renderToStaticMarkup(<AirlineContact airline={null} />);
    expect(html).toContain('Contact your airline');
    expect(html).not.toContain('href=');
  });
});
