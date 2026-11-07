import { API_BASE_URL } from '~/lib/api';
import { getFlightById } from '~/lib/flightStore';
import type { Flight } from '~/types';

export const FEEDBACK_CATEGORIES = ['bug', 'wrong prediction', 'idea', 'other'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
export const FEEDBACK_MAX_LENGTH = 2000;
export const OPEN_FEEDBACK_EVENT = 'flyrely:open-feedback';

export interface FeedbackContext {
  route: string;
  flight?: {
    airline?: string;
    flight_number?: string;
    origin?: string;
    destination?: string;
    departure_time?: string;
    delay_probability?: number;
    risk_level?: string;
  };
  app_version?: string;
  user_agent?: string;
}

/** Flight id when the path is a flight screen (/flights/<id>[/edit]); null for /flights/add, /flights/history, etc. */
export function flightIdFromPath(pathname: string): string | null {
  const m = /^\/flights\/([^/]+)/.exec(pathname);
  if (!m) return null;
  const id = decodeURIComponent(m[1]);
  return id === 'add' || id === 'history' ? null : id;
}

export function flightContext(f: Flight): NonNullable<FeedbackContext['flight']> {
  return {
    airline: f.airline?.code,
    flight_number: f.flightNumber,
    origin: f.origin?.code,
    destination: f.destination?.code,
    departure_time: f.scheduledDeparture,
    delay_probability: f.delayProbability,
    risk_level: f.riskLevel,
  };
}

export function buildFeedbackContext(
  pathname: string,
  opts: { lookup?: (id: string) => Flight | null | undefined; appVersion?: string; userAgent?: string } = {}
): FeedbackContext {
  const lookup = opts.lookup ?? ((id: string) => getFlightById(id));
  const ctx: FeedbackContext = { route: pathname };
  const id = flightIdFromPath(pathname);
  if (id) {
    try {
      const f = lookup(id);
      if (f) ctx.flight = flightContext(f);
    } catch {
      /* context is best-effort */
    }
  }
  const version = opts.appVersion ?? (import.meta.env.VITE_APP_VERSION as string | undefined);
  if (version) ctx.app_version = version;
  const ua = opts.userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : undefined);
  if (ua) ctx.user_agent = ua.slice(0, 400);
  return ctx;
}

export class FeedbackError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function accessToken(): Promise<string> {
  const { getSupabase, isSupabaseConfigured } = await import('~/lib/supabaseAuth');
  if (!isSupabaseConfigured()) throw new FeedbackError(401, 'Sign in to send feedback');
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new FeedbackError(401, 'Sign in to send feedback');
  return token;
}

export function feedbackErrorMessage(status: number): string {
  if (status === 401) return 'Please sign in again to send feedback.';
  if (status === 429) return "You've sent a lot of feedback — please try again later.";
  if (status === 422) return 'Please check your message (1–2000 characters).';
  return "Couldn't send feedback. Please try again.";
}

export async function sendFeedback(
  input: { message: string; category?: FeedbackCategory | ''; context: FeedbackContext },
  fetchImpl: typeof fetch = fetch,
  getToken: () => Promise<string> = accessToken
): Promise<void> {
  const token = await getToken();
  let res: Response;
  try {
    res = await fetchImpl(`${API_BASE_URL}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        message: input.message.trim(),
        ...(input.category ? { category: input.category } : {}),
        context: input.context,
      }),
    });
  } catch {
    throw new FeedbackError(0, feedbackErrorMessage(0));
  }
  if (!res.ok) throw new FeedbackError(res.status, feedbackErrorMessage(res.status));
}

export interface FeedbackItem {
  id: number;
  ts_utc: string;
  email: string;
  category: string | null;
  message: string;
  context: FeedbackContext | null;
}

/** Admin list. Throws FeedbackError(403) for non-admins. */
export async function listFeedback(
  fetchImpl: typeof fetch = fetch,
  getToken: () => Promise<string> = accessToken
): Promise<FeedbackItem[]> {
  const token = await getToken();
  const res = await fetchImpl(`${API_BASE_URL}/feedback?limit=200`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new FeedbackError(res.status, res.status === 403 ? 'Admin only' : 'Could not load feedback');
  return (await res.json()).items as FeedbackItem[];
}

export function openFeedback(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_FEEDBACK_EVENT));
}
