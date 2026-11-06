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
}

/** The body of the card: airline, refund rights, alternatives, stay/ride, disclosure. Presentational. */
export function DisruptionOptions({ options, flight, conditional = false, onChangeHomeAirport, header }: DisruptionOptionsProps) {
  const { airline, refund_rights, alternatives, hotel, ride, context, disclosure } = options;
  return (
    <div className="space-y-5">
      {header}

      <section aria-label="Your airline">
        <SectionHeader title="Your airline" as="h3" kind="no-space" onDark />
        <AirlineContact airline={airline} className="mt-2" />
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
              Usually scheduled on this day of the week. Schedule as of{' '}
              {formatMonthYear(alternatives.schedule_as_of)} (US DOT data). Check times, seats and prices on the
              partner site.
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

      {(hotel || ride.purpose) && <Divider tone="dark" />}
      {hotel && <HotelOffer hotel={hotel} />}
      <RideOffer ride={ride} />
      {context.location !== 'unknown' && (
        <HomeAirportPrompt homeAirport={context.home_airport} onChange={onChangeHomeAirport} />
      )}

      <Divider tone="dark" />
      <AffiliateDisclosure required={disclosure.required} />
    </div>
  );
}
