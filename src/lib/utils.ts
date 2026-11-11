import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import type { RiskLevel } from '~/types';

// Teach tailwind-merge about the Figma type scale and radii so `text-body-sm`
// is treated as a font size (not a colour) and `rounded-btn` as a radius.
const twMerge = extendTailwindMerge({
  extend: {
    // Spacing tokens from tailwind.config (p-inset, px-gutter, gap-inset...) merge like p-2.
    theme: { spacing: ['inset', 'gutter'] },
    classGroups: {
      'font-size': [
        {
          text: [
            'display-lg', 'display-md', 'display-sm',
            'heading-lg', 'heading-md', 'heading-sm',
            'title-lg', 'title-md', 'title-sm',
            'body-lg', 'body-md', 'body-sm',
            'action-md', 'action-lg',
          ],
        },
      ],
      rounded: [{ rounded: ['btn', 'btn-sm', 'field', 'alert', 'tile', 'panel', 'ticket', 'pill'] }],
      shadow: [{ shadow: ['elevation-1', 'nav'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(isoDate: string): string {
  return `${formatDate(isoDate)} · ${formatTime(isoDate)}`;
}

export function getRiskLabel(risk: RiskLevel): string {
  switch (risk) {
    case 'low':
      return 'Low risk';
    case 'medium':
      return 'Some risk';
    case 'high':
      return 'High risk';
  }
}

/** Top two reasons from the API's risk_factors, joined for storage on a flight. */
export function topReasons(factors: string[] | undefined | null, n = 2): string | undefined {
  const picked = (factors ?? []).filter(Boolean).slice(0, n);
  return picked.length ? picked.join(' • ') : undefined;
}

export function formatDelayRange(minDelay: number, maxDelay: number): string {
  if (minDelay === maxDelay) {
    return `${minDelay} min delay`;
  }
  return `${minDelay}-${maxDelay} min delay`;
}

/** Model output only: "34% chance of a 15+ min delay", or null if no probability is stored. */
/** Short delay percent for pills, e.g. "18%". */
export function formatDelayPercent(probability?: number | null): string | null {
  if (typeof probability !== 'number') return null;
  return `${Math.round(probability * 100)}%`;
}

export function formatDelayChance(probability?: number): string | null {
  if (typeof probability !== 'number') return null;
  return `${Math.round(probability * 100)}% chance of a 15+ min delay`;
}

/**
 * Parse an IATA flight number like "B6123", "b6 123" or "DL5030".
 * Airline code is 2 chars (letters/digits, at least one letter), followed by 1-4 digits
 * and an optional operational suffix letter (dropped).
 */
export function parseFlightNumber(input: string): { airlineCode: string; number: string } | null {
  const m = input.replace(/\s+/g, '').toUpperCase().match(/^([A-Z0-9]{2})(\d{1,4})[A-Z]?$/);
  if (!m || !/[A-Z]/.test(m[1])) return null;
  return { airlineCode: m[1], number: m[2] };
}

/** Long date for headers, e.g. "Tuesday, December 9, 2025". */
export function formatLongDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** A random UUID; falls back when crypto.randomUUID is unavailable (insecure context, old browser). */
export function newUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Today's date on this device as YYYY-MM-DD (device-local, not UTC). Used as the `min` of date inputs. */
export function localToday(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}
