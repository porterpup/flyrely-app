// Wire types for the /copilot API. Mirrors docs/PLAN_DISRUPTION_COPILOT.md §4 (flyrely-api copilot/schemas.py).
// Keep field names snake_case: these are the JSON shapes on the wire.

/** Shared flight reference (same meanings as /predict's FlightRequest). */
export interface FlightRef {
  airline: string;
  flight_number: string;
  origin: string;
  destination: string;
  departure_time: string; // local, ISO without offset, e.g. "2026-11-15T14:30:00"
}

// ---- 4.1 GET /copilot/config ----

export interface CopilotConfig {
  enabled: boolean;
  push: { enabled: boolean; vapid_public_key: string | null };
  status_source: 'none' | 'swim'; // anything else is treated as "none" (see statusSourceOrNone)
  affiliate_partners_configured: string[];
  schedule_as_of: string | null;
}

// ---- 4.2 POST /copilot/options ----

/** The app decides the state; the API does not second-guess it. */
export type CopilotState = 'at_risk' | 'cancelled' | 'rebooked';

export interface OptionsRequest {
  flight: FlightRef;
  state: CopilotState;
  /** Only meaningful with state "rebooked". */
  rebooked: 'today' | 'later' | null;
  /** IATA code. Used for this request only; never stored or logged by the API. */
  home_airport?: string;
  /** 1–15, server default 8. */
  max_alternatives?: number;
}

export interface CopilotContext {
  location: 'home' | 'away' | 'unknown';
  reason: 'origin_is_home' | 'origin_not_home' | 'no_home_airport';
  home_airport: string | null;
}

export interface AirlineInfo {
  code: string;
  name: string;
  manage_booking_url: string;
  phone: string;
  phone_display: string;
  verified_on?: string | null;
  verification?: 'verified' | 'official_source_unconfirmed';
  other_channels?: Record<string, string>;
}

/** Shown instead of contact details when `airline` is null but the carrier has a note or status page. */
export interface AirlineNotice {
  code: string;
  name: string;
  note: string | null;
  status_url: string | null;
}

/** A hand-off link. Built by the API (links.py) except hotel-address ride links, which are built on the device. */
export interface Handoff {
  partner: string;
  label: string;
  url: string;
  is_affiliate: boolean;
}

export interface RideLink extends Handoff {
  accepts_dropoff_address: boolean;
}

export interface AlternativeItem {
  marketing_airline: string;
  flight_number: string;
  operating_airline: string | null;
  operating_airline_name: string | null;
  origin: string;
  destination: string;
  dep_local: string;
  arr_local: string | null;
  /** null when the scorer was unavailable. */
  delay_probability: number | null;
  risk_level: 'low' | 'medium' | 'high' | null;
  days_seen: number;
  handoffs: Handoff[];
}

export interface Alternatives {
  source: string;
  schedule_as_of: string | null;
  date: string;
  items: AlternativeItem[];
  search_handoffs: Handoff[];
  warnings: string[];
}

export interface HotelBlock {
  airport: string;
  check_in: string;
  check_out: string;
  links: Handoff[];
}

export interface RideBlock {
  purpose: 'to_hotel' | 'home' | null;
  links: RideLink[];
}

export interface RefundRights {
  applies: boolean;
  jurisdiction: string | null;
  content_key: string | null;
  /** Route leaves or enters the US. Optional: treat missing as false. */
  international?: boolean;
  /** EU/UK passenger-rights rules (e.g. EU261) may apply. Optional: treat missing as false. */
  eu_possible?: boolean;
}

export interface OptionsResponse {
  state: CopilotState;
  context: CopilotContext;
  airline: AirlineInfo | null;
  airline_notice?: AirlineNotice | null;
  refund_rights: RefundRights;
  alternatives: Alternatives;
  hotel: HotelBlock | null;
  ride: RideBlock;
  disclosure: { required: boolean };
  warnings: string[];
}

// ---- 4.3 POST /copilot/status ----

export type FlightStatusValue = 'unknown' | 'scheduled' | 'delayed' | 'cancelled' | 'departed' | 'arrived';

export interface StatusRequest {
  flight: FlightRef;
}

export interface StatusResponse {
  status: FlightStatusValue;
  source: string;
  as_of: string | null;
  detail: string | null;
}

// ---- 4.4 / 4.5 push subscribe and unsubscribe ----

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushSubscribeRequest {
  subscription: PushSubscriptionJSON;
  flight: FlightRef;
  client_flight_id: string;
}

export interface PushSubscribeResponse {
  watch_id: string;
  expires_at: string;
}

export interface PushUnsubscribeRequest {
  endpoint: string;
  /** Omit to remove all watches for the endpoint. */
  watch_id?: string;
}

export interface PushUnsubscribeResponse {
  removed: number;
}

// ---- 4.6 push payload (server -> service worker) ----

export interface PushPayload {
  v: 1;
  kind: 'at_risk_heads_up' | 'cancelled' | 'test';
  title: string;
  body: string;
  url: string;
  client_flight_id: string;
}
