import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SectionHeader, Divider } from '~/components/ui';
import type { FlightRef, OptionsResponse } from '~/copilot/types';
import { AirlineContact } from './AirlineContact';
import { RefundRightsNote } from './RefundRightsNote';
import { AltFlightRow } from './AltFlightRow';
import { PartnerButton } from './PartnerButton';
import { HotelOffer } from './HotelOffer';
import { RideOffer } from './RideButton';
import { HomeAirportPrompt } from './HomeAirportPrompt';
import { AffiliateDisclosure } from './AffiliateDisclosure';
import { NoAlternatives } from './CopilotStates';
import { formatMonthYear } from './format';

export interface DisruptionOptionsProps {
  /** The /copilot/options response. */
  options: OptionsResponse;
  flight: Pick<FlightRef, 'origin' | 'destination'>;
  /** At-risk (Plan B) wording. */
  conditional?: boolean;
  /** Called by the inline home-airport prompt. */
  onChangeHomeAirport: () => void;
  /** Optional slot, e.g. the push prompt. Rendered first. */
  header?: React.ReactNode;
  /** Start with "Need help tonight?" open (gallery/testing). Default collapsed. */
  helpDefaultOpen?: boolean;
  /** Optional slot between the hotel offer and the ride offer (the hotel address field). */
  stayExtra?: React.ReactNode;
}

/** The body of the card: airline, refund rights, alternatives, stay/ride, disclosure. Presentational. */
export function DisruptionOptions({ options, flight, conditional = false, onChangeHomeAirport, header, helpDefaultOpen = false, stayExtra }: DisruptionOptionsProps) {
  const { airline, airline_notice, refund_rights, alternatives, hotel, ride, context, disclosure } = options;
  return (
    <div className="space-y-5">
      {header}

      <section aria-label="Your airline">
        <SectionHeader title="Your airline" as="h3" kind="no-space" onDark />
        <AirlineContact airline={airline} notice={airline_notice} className="mt-2" />
      </section>

      <Divider tone="dark" />

      <section aria-label="Your refund rights">
        <SectionHeader title="Your refund rights" as="h3" kind="no-space" onDark />
        <RefundRightsNote refund={refund_rights} conditional={conditional} className="mt-2" />
      </section>

      <Divider tone="dark" />

      <section aria-label="Other flights today">
        <SectionHeader
          title={`Other flights today, ${flight.origin} to ${flight.destination}`}
          as="h3"
          kind="no-space"
          onDark
        />
        {alternatives.items.length === 0 ? (
          <NoAlternatives
            origin={flight.origin}
            destination={flight.destination}
            searchHandoffs={alternatives.search_handoffs}
            className="mt-3"
          />
        ) : (
          <div className="mt-3 space-y-2">
            {alternatives.items.map((item) => (
              <AltFlightRow key={`${item.marketing_airline}${item.flight_number}${item.dep_local}`} item={item} />
            ))}
            <p className="pt-1 text-body-sm text-white/80">
              Usually scheduled on this day of the week.
              {alternatives.schedule_as_of && <> Schedule as of {formatMonthYear(alternatives.schedule_as_of)} (US DOT data).</>}{' '}
              Check times, seats and prices on the partner site.
            </p>
            {alternatives.search_handoffs.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {alternatives.search_handoffs.map((h) => (
                  <PartnerButton key={h.partner} handoff={h} onDark />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {context.location === 'unknown' && <HomeAirportPrompt homeAirport={null} onChange={onChangeHomeAirport} />}

      {(hotel || (ride.purpose && ride.links.length > 0)) && (
        <>
          <Divider tone="dark" />
          <NeedHelpTonight defaultOpen={helpDefaultOpen}>
            {hotel && <HotelOffer hotel={hotel} />}
            {hotel && stayExtra}
            <RideOffer ride={ride} />
          </NeedHelpTonight>
        </>
      )}
      {context.location !== 'unknown' && (
        <HomeAirportPrompt homeAirport={context.home_airport} onChange={onChangeHomeAirport} />
      )}

      <Divider tone="dark" />
      <AffiliateDisclosure required={disclosure.required} />
    </div>
  );
}

/** "Need help tonight?" disclosure for hotel and ride. Collapsed by default; keyboard accessible. */
export function NeedHelpTonight({ children, defaultOpen = false }: { children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section aria-label="Need help tonight?">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="-mx-2 flex w-[calc(100%+1rem)] items-center justify-between rounded-btn px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <span className="text-title-md text-white">Need help tonight?</span>
        <ChevronDown className={`h-6 w-6 shrink-0 text-white transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div id={id} className="mt-3 space-y-5">
          {children}
        </div>
      )}
    </section>
  );
}
