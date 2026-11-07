// Client-side ride links (plan §3.6, §8). The hotel address the user types is added to the
// Uber link here, on the device, so it never reaches the FlyRely API.
import type { RideLink } from './types';

const UBER_HOST = 'm.uber.com';
const MAX_ADDRESS_LENGTH = 200;

/**
 * Returns the ride link's URL with the drop-off address added (Uber only, when the link
 * accepts a drop-off). Returns the server URL unchanged when there is no address, the link
 * does not take one, or the URL is not Uber's.
 */
export function rideUrlWithDropoff(link: RideLink, hotelAddress: string): string {
  const address = hotelAddress.trim().slice(0, MAX_ADDRESS_LENGTH);
  if (!address || !link.accepts_dropoff_address) return link.url;

  let url: URL;
  try {
    url = new URL(link.url);
  } catch {
    return link.url;
  }
  if (url.protocol !== 'https:' || url.hostname !== UBER_HOST) return link.url;

  // Literal key with brackets, as in the documented Uber deep link; value is percent-encoded.
  const separator = url.search ? '&' : '?';
  return `${link.url}${separator}dropoff[formatted_address]=${encodeURIComponent(address)}`;
}
