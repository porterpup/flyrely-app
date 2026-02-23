const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://web-production-ea1e9.up.railway.app';

export interface PredictRequest {
  origin: string;
  destination: string;
  dep_hour: number;
  day_of_week: number;
  month: number;
  distance?: number;
  airline?: string;
}

export interface PredictResponse {
  delay_probability: number;
  risk_level: 'low' | 'medium' | 'high';
  predicted_delay_minutes: number;
  confidence: number;
  factors: string[];
  weather?: {
    origin?: Record<string, unknown>;
    destination?: Record<string, unknown>;
  };
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
  const d = new Date(departureDateISO);
  return {
    origin: origin.toUpperCase(),
    destination: destination.toUpperCase(),
    dep_hour: d.getHours(),
    day_of_week: d.getDay(),
    month: d.getMonth() + 1,
    airline,
  };
}

/** Map raw delay probability/minutes to a RiskLevel matching the app's type */
export function toRiskLevel(prob: number): 'low' | 'medium' | 'high' {
  if (prob < 0.35) return 'low';
  if (prob < 0.65) return 'medium';
  return 'high';
}
