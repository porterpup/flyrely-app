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
