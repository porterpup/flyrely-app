const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://web-production-ea1e9.up.railway.app';

export interface PredictRequest {
  origin: string;
  destination: string;
  departure_time: string; // ISO datetime, e.g. "2026-03-15T09:00:00"
  airline?: string;
}

export interface PredictResponse {
  delay_probability: number;
  risk_level: 'low' | 'medium' | 'high';
  confidence: number;
  origin: string;
  destination: string;
  departure_time: string;
  airline?: string | null;
  risk_factors: string[];
  recommendations: string[];
  origin_weather?: Record<string, unknown> | null;
  destination_weather?: Record<string, unknown> | null;
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  weather_api_configured: boolean;
  timestamp: string;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const flyrelyApi = {
  health(): Promise<HealthResponse> {
    return apiFetch<HealthResponse>('/health');
  },

  predict(payload: PredictRequest): Promise<PredictResponse> {
    return apiFetch<PredictResponse>('/predict', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

/** Convert a date string + time to the fields the API needs */
export function buildPredictPayload(
  origin: string,
  destination: string,
  departureDateISO: string,
  airline?: string
): PredictRequest {
  return {
    origin: origin.toUpperCase(),
    destination: destination.toUpperCase(),
    departure_time: departureDateISO,
    airline,
  };
}

/** Map raw delay probability/minutes to a RiskLevel matching the app's type */
export function toRiskLevel(prob: number): 'low' | 'medium' | 'high' {
  if (prob < 0.35) return 'low';
  if (prob < 0.65) return 'medium';
  return 'high';
}
