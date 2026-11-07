import { Car } from 'lucide-react';
import { cn } from '~/lib/utils';
import type { RideBlock, RideLink } from '~/copilot/types';
import { PartnerButton } from './PartnerButton';

export interface RideButtonProps {
  /** One ride-app link (Uber, Lyft). */
  ride: RideLink;
  onDark?: boolean;
  className?: string;
}

/** A single ride-app hand-off. Same link rules as PartnerButton. */
export function RideButton({ ride, onDark = true, className }: RideButtonProps) {
  return <PartnerButton handoff={ride} onDark={onDark} className={className} />;
}

export interface RideOfferProps {
  ride: RideBlock;
  onDark?: boolean;
  className?: string;
}

const purposeCopy = {
  to_hotel: { title: 'Ride to your hotel', body: 'Open your ride app with the destination ready.' },
  home: { title: 'Get home', body: 'Open your ride app. Pick your saved Home as the destination.' },
} as const;

/** Heading plus ride buttons. Renders nothing when there is no ride purpose or no links. */
export function RideOffer({ ride, onDark = true, className }: RideOfferProps) {
  if (!ride.purpose || ride.links.length === 0) return null;
  const copy = purposeCopy[ride.purpose];
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-start gap-3">
        <Car className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
        <div>
          <p className="text-body-lg font-medium">{copy.title}</p>
          <p className={cn('text-body-md', onDark ? 'text-white/80' : 'text-ink-caption')}>{copy.body}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {ride.links.map((r) => (
          <RideButton key={r.partner} ride={r} onDark={onDark} />
        ))}
      </div>
    </div>
  );
}
