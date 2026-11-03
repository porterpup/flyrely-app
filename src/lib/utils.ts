import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { RiskLevel } from '~/types';

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

export function getRiskBadgeClass(risk: RiskLevel): string {
  switch (risk) {
    case 'low':
      return 'risk-badge risk-badge-low';
    case 'medium':
      return 'risk-badge risk-badge-medium';
    case 'high':
      return 'risk-badge risk-badge-high';
  }
}

export function getRiskLabel(risk: RiskLevel): string {
  switch (risk) {
    case 'low':
      return 'On track';
    case 'medium':
      return 'At risk';
    case 'high':
      return 'High risk';
  }
}

export function formatDelayRange(minDelay: number, maxDelay: number): string {
  if (minDelay === maxDelay) {
    return `${minDelay} min delay`;
  }
  return `${minDelay}-${maxDelay} min delay`;
}

/** Model output only: "34% chance of a 15+ min delay", or null if no probability is stored. */
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
