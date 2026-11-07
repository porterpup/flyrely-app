// Fixtures that match docs/PLAN_DISRUPTION_COPILOT.md section 4 exactly (the plan's example payloads).
import type { Flight } from '~/types';
import type { CopilotConfig, OptionsResponse, StatusResponse } from '../types';

export const configOn: CopilotConfig = {
  enabled: true,
  push: { enabled: false, vapid_public_key: null },
  status_source: 'none',
  affiliate_partners_configured: [],
  schedule_as_of: '2026-08',
};

export const statusUnknown: StatusResponse = { status: 'unknown', source: 'none', as_of: null, detail: null };

const link = (partner: string, label: string, url: string, is_affiliate = false) => ({ partner, label, url, is_affiliate });

export const optionsAway: OptionsResponse = {
  state: 'cancelled',
  context: { location: 'away', reason: 'origin_not_home', home_airport: 'BOS' },
  airline: {
    code: 'DL',
    name: 'Delta Air Lines',
    manage_booking_url: 'https://www.delta.com/mytrips/',
    phone: '+1-800-221-1212',
    phone_display: '800-221-1212',
    verified_on: '2026-11-10',
  },
  refund_rights: { applies: true, jurisdiction: 'US_DOT', content_key: 'us_dot_part260_v1' },
  alternatives: {
    source: 'bts_typical_schedule',
    schedule_as_of: '2026-08',
    date: '2026-11-15',
    items: [
      {
        marketing_airline: 'AA',
        flight_number: 'AA117',
        operating_airline: 'AA',
        operating_airline_name: 'American Airlines',
        origin: 'JFK',
        destination: 'LAX',
        dep_local: '2026-11-15T16:00:00',
        arr_local: '2026-11-15T19:25:00',
        delay_probability: 0.17,
        risk_level: 'low',
        days_seen: 8,
        handoffs: [
          link('google_flights', 'Google Flights', 'https://www.google.com/travel/flights?q=Flights+from+JFK+to+LAX+on+2026-11-15'),
          link('kayak', 'KAYAK', 'https://www.kayak.com/flights/JFK-LAX/2026-11-15'),
        ],
      },
    ],
    search_handoffs: [
      link('google_flights', 'Google Flights', 'https://www.google.com/travel/flights?q=Flights+from+JFK+to+LAX+on+2026-11-15'),
      link('kayak', 'KAYAK', 'https://www.kayak.com/flights/JFK-LAX/2026-11-15'),
      link('skyscanner', 'Skyscanner', 'https://www.skyscanner.com/transport/flights/jfk/lax/261115/'),
      link('expedia', 'Expedia', 'https://www.expedia.com/Flights-Search?trip=oneway'),
    ],
    warnings: [],
  },
  hotel: {
    airport: 'JFK',
    check_in: '2026-11-15',
    check_out: '2026-11-16',
    links: [link('booking', 'Booking.com', 'https://www.booking.com/searchresults.html?latitude=40.64&longitude=-73.78')],
  },
  ride: {
    purpose: 'to_hotel',
    links: [
      { ...link('uber', 'Uber', 'https://m.uber.com/ul/?action=setPickup&pickup=my_location'), accepts_dropoff_address: true },
      { ...link('lyft', 'Lyft', 'https://lyft.com/ride?id=lyft'), accepts_dropoff_address: false },
    ],
  },
  disclosure: { required: false },
  warnings: [],
};

export const optionsHome: OptionsResponse = {
  ...optionsAway,
  context: { location: 'home', reason: 'origin_is_home', home_airport: 'JFK' },
  hotel: null,
  ride: {
    purpose: 'home',
    links: [{ ...link('uber', 'Uber', 'https://m.uber.com/ul/?action=setPickup&pickup=my_location'), accepts_dropoff_address: false }],
  },
};

export const optionsUnknown: OptionsResponse = {
  ...optionsAway,
  context: { location: 'unknown', reason: 'no_home_airport', home_airport: null },
  hotel: null,
  ride: { purpose: null, links: [] },
};

export const optionsRebookedToday: OptionsResponse = { ...optionsUnknown, state: 'rebooked' };

export const optionsAffiliate: OptionsResponse = {
  ...optionsAway,
  hotel: {
    ...optionsAway.hotel!,
    links: [link('stay22', 'Stay22', 'https://www.stay22.com/x', true)],
  },
  disclosure: { required: true },
};

// S-A6 shapes: carrier note instead of contact details, null operating name / arrival / risk.
export const optionsNotice: OptionsResponse = {
  ...optionsAway,
  airline: null,
  airline_notice: {
    code: 'NK',
    name: 'Sample Notice Air',
    note: 'This carrier handles rebooking through its own help page.',
    status_url: 'https://example.com/status',
  },
  warnings: ['unknown_airline'],
};

export const optionsSparse: OptionsResponse = {
  ...optionsAway,
  airline: null,
  warnings: ['unknown_airline', 'risk_unavailable'],
  alternatives: {
    ...optionsAway.alternatives,
    schedule_as_of: null,
    items: [
      {
        ...optionsAway.alternatives.items[0],
        operating_airline: null,
        operating_airline_name: null,
        arr_local: null,
        delay_probability: null,
        risk_level: null,
      },
    ],
  },
};

export const optionsNoAlternatives: OptionsResponse = {
  ...optionsAway,
  alternatives: { ...optionsAway.alternatives, items: [], warnings: ['no_alternatives_found'] },
};

export const highRiskFlight: Flight = {
  id: 'flight-1',
  flightNumber: 'DL1234',
  airline: { code: 'DL', name: 'Delta Air Lines' },
  origin: { code: 'JFK', name: 'John F. Kennedy International', city: 'New York' },
  destination: { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles' },
  scheduledDeparture: '2026-11-15T14:30:00',
  status: 'scheduled',
  riskLevel: 'high',
  delayProbability: 0.34,
};

export const lowRiskFlight: Flight = { ...highRiskFlight, id: 'flight-2', riskLevel: 'low', delayProbability: 0.08 };
