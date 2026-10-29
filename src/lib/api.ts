export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/** Canonical /predict request. See flyrely-api main.py FlightRequest. */
export interface PredictRequest {
  /** Client flight id, echoed back in the response. Server generates one if omitted. */
  flight_id?: string;
  origin: string;
  destination: string;
  departure_time: string; // local scheduled time, ISO without offset, e.g. "2026-03-15T09:00:00"
  airline?: string;
}

export interface DelaySeverity {
  /** Probability of a 15–44 min delay, given a delay occurs (0–1) */
  minor_pct: number;
  /** Probability of a 45–119 min delay, given a delay occurs (0–1) */
  moderate_pct: number;
  /** Probability of a 120+ min delay, given a delay occurs (0–1) */
  severe_pct: number;
  /** Most likely severity bucket: 'minor' | 'moderate' | 'severe' */
  expected_delay_label: string;
  /** Human-readable range, e.g. '15–44 min' */
  expected_delay_range: string;
}

/** Canonical /predict response. See flyrely-api main.py PredictionResponse. */
export interface PredictResponse {
  flight_id: string;
  delay_probability: number;
  risk_level: 'low' | 'medium' | 'high';
  confidence: number;
  /** null when the severity model is unavailable */
  delay_severity: DelaySeverity | null;
  origin: string;
  destination: string;
  departure_time: string;
  airline: string | null;
  /** Weather is not a model input; false means risk factors exclude weather */
  weather_available: boolean;
  origin_weather: Record<string, unknown> | null;
  destination_weather: Record<string, unknown> | null;
  risk_factors: string[];
  recommendations: string[];
  /** Data-coverage caveats, e.g. airport not in historical data */
  warnings: string[];
  model_version: string;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded';
  model_loaded: boolean;
  severity_model_loaded: boolean;
  weather_api_configured: boolean;
  model_version: string;
  timestamp: string;
}

/** The API could not produce a real prediction (HTTP 503). Show NoPredictionBanner. */
export class PredictionUnavailableError extends Error {
  constructor(public reason: string, message: string) {
    super(message);
    this.name = 'PredictionUnavailableError';
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 503) {
    const body = await res.json().catch(() => ({}));
    throw new PredictionUnavailableError(
      body?.detail?.reason ?? 'unavailable',
      body?.detail?.message ?? 'Prediction unavailable'
    );
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/** Guard against older/partial responses so call sites never read undefined arrays. */
function normalizePrediction(raw: Partial<PredictResponse>): PredictResponse {
  if (typeof raw.delay_probability !== 'number' || !raw.risk_level) {
    throw new PredictionUnavailableError('invalid_response', 'Prediction response missing probability');
  }
  return {
    flight_id: raw.flight_id ?? '',
    delay_probability: raw.delay_probability,
    risk_level: raw.risk_level,
    confidence: raw.confidence ?? Math.max(raw.delay_probability, 1 - raw.delay_probability),
    delay_severity: raw.delay_severity ?? null,
    origin: raw.origin ?? '',
    destination: raw.destination ?? '',
    departure_time: raw.departure_time ?? '',
    airline: raw.airline ?? null,
    weather_available: raw.weather_available ?? false,
    origin_weather: raw.origin_weather ?? null,
    destination_weather: raw.destination_weather ?? null,
    risk_factors: raw.risk_factors ?? [],
    recommendations: raw.recommendations ?? [],
    warnings: raw.warnings ?? [],
    model_version: raw.model_version ?? 'unknown',
  };
}

export const flyrelyApi = {
  health(): Promise<HealthResponse> {
    return apiFetch<HealthResponse>('/health');
  },

  async predict(payload: PredictRequest): Promise<PredictResponse> {
    const raw = await apiFetch<Partial<PredictResponse>>('/predict', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizePrediction(raw);
  },
};

/** Convert a date string + time to the fields the API needs */
export function buildPredictPayload(
  origin: string,
  destination: string,
  departureDateISO: string,
  airline?: string,
  flightId?: string
): PredictRequest {
  return {
    flight_id: flightId,
    origin: origin.toUpperCase(),
    destination: destination.toUpperCase(),
    departure_time: departureDateISO,
    airline,
  };
}

/** Map raw delay probability/minutes to a RiskLevel matching the app's type */
export function toRiskLevel(prob: number): 'low' | 'medium' | 'high' {
  // Calibration v2 thresholds: Low < 0.20, Medium 0.20–0.30, High >= 0.30
  if (prob < 0.20) return 'low';
  if (prob < 0.30) return 'medium';
  return 'high';
}
