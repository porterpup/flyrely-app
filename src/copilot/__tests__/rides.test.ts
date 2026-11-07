import { describe, expect, it } from 'vitest';
import { rideUrlWithDropoff } from '../rides';
import type { RideLink } from '../types';

const uber: RideLink = {
  partner: 'uber',
  label: 'Uber',
  url: 'https://m.uber.com/ul/?action=setPickup&pickup=my_location',
  is_affiliate: false,
  accepts_dropoff_address: true,
};

const lyft: RideLink = {
  partner: 'lyft',
  label: 'Lyft',
  url: 'https://lyft.com/ride?id=lyft',
  is_affiliate: false,
  accepts_dropoff_address: false,
};

describe('rideUrlWithDropoff', () => {
  it('appends the encoded hotel address to the Uber link', () => {
    expect(rideUrlWithDropoff(uber, '1 Hotel Way, Los Angeles, CA 90001')).toBe(
      'https://m.uber.com/ul/?action=setPickup&pickup=my_location' +
        '&dropoff[formatted_address]=1%20Hotel%20Way%2C%20Los%20Angeles%2C%20CA%2090001',
    );
  });

  it('uses ? when the Uber link has no query string', () => {
    const bare = { ...uber, url: 'https://m.uber.com/ul/' };
    expect(rideUrlWithDropoff(bare, '5 Main St')).toBe(
      'https://m.uber.com/ul/?dropoff[formatted_address]=5%20Main%20St',
    );
  });

  it('trims the address and encodes characters that would break the query', () => {
    expect(rideUrlWithDropoff(uber, '  Q&A Inn #4 ')).toBe(
      uber.url + '&dropoff[formatted_address]=Q%26A%20Inn%20%234',
    );
  });

  it('returns the server URL unchanged when the address is blank', () => {
    expect(rideUrlWithDropoff(uber, '')).toBe(uber.url);
    expect(rideUrlWithDropoff(uber, '   ')).toBe(uber.url);
  });

  it('leaves links that do not take a drop-off address alone', () => {
    expect(rideUrlWithDropoff(lyft, '1 Hotel Way')).toBe(lyft.url);
  });

  it('never adds an address to a URL that is not Uber', () => {
    const spoof = { ...uber, url: 'https://evil.example/ul/?action=setPickup' };
    expect(rideUrlWithDropoff(spoof, '1 Hotel Way')).toBe(spoof.url);
  });

  it('returns the URL unchanged when it does not parse', () => {
    const broken = { ...uber, url: 'not a url' };
    expect(rideUrlWithDropoff(broken, '1 Hotel Way')).toBe('not a url');
  });

  it('caps the address length', () => {
    const long = 'a'.repeat(500);
    const out = rideUrlWithDropoff(uber, long);
    expect(out).toBe(uber.url + '&dropoff[formatted_address]=' + 'a'.repeat(200));
  });
});
