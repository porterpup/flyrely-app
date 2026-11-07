import { BedDouble } from 'lucide-react';
import { cn } from '~/lib/utils';
import type { HotelBlock } from '~/copilot/types';
import { PartnerButton } from './PartnerButton';
import { formatShortDate } from './format';

export interface HotelOfferProps {
  hotel: HotelBlock;
  onDark?: boolean;
  className?: string;
}

/** "Need a place to stay?" with hotel search hand-offs near the airport. */
export function HotelOffer({ hotel, onDark = true, className }: HotelOfferProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-start gap-3">
        <BedDouble className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
        <div>
          <p className="text-body-lg font-medium">Need a place to stay?</p>
          <p className={cn('text-body-md', onDark ? 'text-white/80' : 'text-ink-caption')}>
            Hotels near {hotel.airport}, {formatShortDate(hotel.check_in)} to {formatShortDate(hotel.check_out)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {hotel.links.map((h) => (
          <PartnerButton key={h.partner} handoff={h} onDark={onDark} />
        ))}
      </div>
    </div>
  );
}
