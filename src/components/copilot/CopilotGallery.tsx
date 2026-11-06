import { useState } from 'react';
import type { AlternativeItem, AirlineInfo, Handoff, OptionsResponse, RideLink } from '~/copilot/types';
import { Button } from '~/components/ui';
import {
  AffiliateDisclosure,
  AirlineContact,
  AltFlightRow,
  CopilotError,
  DisruptionCard,
  DisruptionOptions,
  HomeAirportPrompt,
  HotelOffer,
  HowWeChooseBody,
  NoAlternatives,
  PartnerButton,
  PushPermissionPrompt,
  RefundRightsNote,
  RideButton,
  RideOffer,
} from './index';

// DEV-ONLY. Everything here is a SAMPLE. Nothing in this file is real flight, airline, partner or price data,
// and it is only imported (lazily) by the dev-only /design-system route.

const SAMPLE_AIRLINE: AirlineInfo = {
  code: 'XX',
  name: 'Sample Air',
  manage_booking_url: 'https://example.com/sample-manage',
  phone: '+10000000000',
  phone_display: '1-800-000-0000',
  verified_on: '2026-08-15',
};

const h = (partner: string, label: string, is_affiliate = false): Handoff => ({
  partner,
  label,
  url: `https://example.com/${partner}`,
  is_affiliate,
});

const alt = (n: string, dep: string, arr: string, p: number | null, risk: AlternativeItem['risk_level']): AlternativeItem => ({
  marketing_airline: 'XX',
  flight_number: n,
  operating_airline: 'XX',
  operating_airline_name: 'Sample Air',
  origin: 'AAA',
  destination: 'BBB',
  dep_local: `2026-11-15T${dep}:00`,
  arr_local: `2026-11-15T${arr}:00`,
  delay_probability: p,
  risk_level: risk,
  days_seen: 12,
  handoffs: [h('sample-seats', 'Check seats', true)],
});

const SAMPLE_ALTS: AlternativeItem[] = [
  alt('101', '16:10', '18:25', 0.12, 'low'),
  { ...alt('202', '18:40', '20:55', 0.22, 'medium'), operating_airline: 'YY', operating_airline_name: 'Sample Regional' },
  alt('303', '21:05', '23:20', null, null),
];

const SEARCH: Handoff[] = [h('sample-search-1', 'Sample Search A'), h('sample-search-2', 'Sample Search B')];
const RIDES: RideLink[] = [
  { ...h('sample-ride-1', 'Sample Ride A', true), accepts_dropoff_address: true },
  { ...h('sample-ride-2', 'Sample Ride B'), accepts_dropoff_address: false },
];

const SAMPLE_FLIGHT = { origin: 'AAA', destination: 'BBB' };

const base: OptionsResponse = {
  state: 'cancelled',
  context: { location: 'away', reason: 'origin_not_home', home_airport: 'CCC' },
  airline: SAMPLE_AIRLINE,
  refund_rights: { applies: true, jurisdiction: 'US', content_key: 'us_dot_2024' },
  alternatives: {
    source: 'sample',
    schedule_as_of: '2026-08-31',
    date: '2026-11-15',
    items: SAMPLE_ALTS,
    search_handoffs: SEARCH,
    warnings: [],
  },
  hotel: { airport: 'AAA', check_in: '2026-11-15', check_out: '2026-11-16', links: [h('sample-hotels', 'Sample Hotels', true)] },
  ride: { purpose: 'to_hotel', links: RIDES },
  disclosure: { required: true },
  warnings: [],
};

const atHome: OptionsResponse = {
  ...base,
  context: { location: 'home', reason: 'origin_is_home', home_airport: 'AAA' },
  hotel: null,
  ride: { purpose: 'home', links: RIDES },
};
const unknownLoc: OptionsResponse = {
  ...base,
  context: { location: 'unknown', reason: 'no_home_airport', home_airport: null },
  hotel: null,
  ride: { purpose: null, links: [] },
};
const noAlts: OptionsResponse = {
  ...base,
  alternatives: { ...base.alternatives, items: [] },
  hotel: null,
  ride: { purpose: null, links: [] },
  disclosure: { required: false },
};

function Frame({ label, children, light = false }: { label: string; children: React.ReactNode; light?: boolean }) {
  return (
    <div data-sample={label} className="space-y-1">
      <p className="text-body-sm text-ink-caption">SAMPLE: {label}</p>
      <div className={light ? 'rounded-btn bg-white p-3 text-ink ring-1 ring-surface-stroke' : 'rounded-ticket bg-surface-card p-3 text-white'}>
        {children}
      </div>
    </div>
  );
}

export default function CopilotGallery() {
  const [open, setOpen] = useState(true);
  const [collapsedOpen, setCollapsedOpen] = useState(false);
  const noop = () => {};
  return (
    <section className="mb-10" id="copilot-gallery">
      <h2 className="mb-1 border-b border-surface-stroke pb-2 text-title-md text-ink">Disruption Copilot (draft)</h2>
      <p className="mb-4 text-body-sm text-ink-caption">
        Draft for approval. Dev-only. Every airline, flight, time, chance, partner and link below is a labelled sample.
        Risk is a level plus a chance, never minutes.
      </p>

      <div className="space-y-6">
        <h3 className="text-title-sm text-ink">Full cards (on the dark flight-details surface)</h3>

        <Frame label="High-risk Plan B, collapsed">
          <DisruptionCard state="at_risk" risk="high" chancePercent={34} expanded={collapsedOpen} onToggle={() => setCollapsedOpen((v) => !v)} />
        </Frame>

        <Frame label="High-risk Plan B, expanded (with push prompt)">
          <DisruptionCard state="at_risk" risk="high" chancePercent={34} expanded={open} onToggle={() => setOpen((v) => !v)}>
            <DisruptionOptions
              options={{ ...base, state: 'at_risk' }}
              flight={SAMPLE_FLIGHT}
              conditional
              onChangeHomeAirport={noop}
              header={<PushPermissionPrompt status="prompt" onEnable={noop} />}
            />
          </DisruptionCard>
        </Frame>

        <Frame label="Cancelled, with alternatives, away from home (hotel and ride)">
          <DisruptionCard
            state="cancelled"
            actions={
              <>
                <Button size="sm" className="!bg-white !text-ink hover:!bg-white/90">I&apos;ve been rebooked</Button>
                <Button size="sm" variant="text" className="!text-white hover:!bg-white/10">Not cancelled after all</Button>
              </>
            }
          >
            <DisruptionOptions options={base} flight={SAMPLE_FLIGHT} onChangeHomeAirport={noop} />
          </DisruptionCard>
        </Frame>

        <Frame label="Cancelled, at home (ride home)">
          <DisruptionCard state="cancelled">
            <DisruptionOptions options={atHome} flight={SAMPLE_FLIGHT} onChangeHomeAirport={noop} />
          </DisruptionCard>
        </Frame>

        <Frame label="Cancelled, home airport not set (inline prompt)">
          <DisruptionCard state="cancelled">
            <DisruptionOptions options={unknownLoc} flight={SAMPLE_FLIGHT} onChangeHomeAirport={noop} />
          </DisruptionCard>
        </Frame>

        <Frame label="Cancelled, no alternatives, airline unknown, non-US flight">
          <DisruptionCard state="cancelled">
            <DisruptionOptions
              options={{ ...noAlts, airline: null, refund_rights: { applies: false, jurisdiction: null, content_key: null } }}
              flight={SAMPLE_FLIGHT}
              onChangeHomeAirport={noop}
            />
          </DisruptionCard>
        </Frame>

        <Frame label="API error">
          <DisruptionCard state="cancelled">
            <CopilotError onRetry={noop} />
          </DisruptionCard>
        </Frame>

        <h3 className="text-title-sm text-ink">Individual components</h3>

        <Frame label="AltFlightRow (low risk, medium risk operated by a partner, no estimate)">
          <div className="space-y-2">{SAMPLE_ALTS.map((a) => <AltFlightRow key={a.flight_number} item={a} />)}</div>
        </Frame>
        <Frame label="AltFlightRow on a light surface" light>
          <AltFlightRow item={SAMPLE_ALTS[0]} onDark={false} />
        </Frame>

        <Frame label="PartnerButton (affiliate = sponsored rel, plain, primary, small)">
          <div className="flex flex-wrap gap-2">
            <PartnerButton handoff={h('a', 'Affiliate link', true)} onDark />
            <PartnerButton handoff={h('b', 'Plain link')} onDark />
            <PartnerButton handoff={h('c', 'Primary')} onDark variant="primary" />
          </div>
        </Frame>
        <Frame label="PartnerButton on a light surface" light>
          <div className="flex flex-wrap gap-2">
            <PartnerButton handoff={h('a', 'Secondary')} />
            <PartnerButton handoff={h('c', 'Primary')} variant="primary" />
          </div>
        </Frame>

        <Frame label="RefundRightsNote (cancelled)"><RefundRightsNote refund={base.refund_rights} /></Frame>
        <Frame label="RefundRightsNote (Plan B, conditional)"><RefundRightsNote refund={base.refund_rights} conditional /></Frame>
        <Frame label="RefundRightsNote (non-US, light)" light>
          <RefundRightsNote refund={{ applies: false, jurisdiction: null, content_key: null }} onDark={false} />
        </Frame>

        <Frame label="AirlineContact (known)"><AirlineContact airline={SAMPLE_AIRLINE} /></Frame>
        <Frame label="AirlineContact (unknown airline)"><AirlineContact airline={null} /></Frame>
        <Frame label="AirlineContact (light)" light><AirlineContact airline={SAMPLE_AIRLINE} onDark={false} /></Frame>

        <Frame label="HotelOffer"><HotelOffer hotel={base.hotel!} /></Frame>
        <Frame label="RideOffer: to hotel / RideButton"><RideOffer ride={base.ride} /></Frame>
        <Frame label="RideOffer: get home"><RideOffer ride={atHome.ride} /></Frame>
        <Frame label="RideButton alone"><RideButton ride={RIDES[0]} /></Frame>

        <Frame label="HomeAirportPrompt (unset)"><HomeAirportPrompt homeAirport={null} onChange={noop} /></Frame>
        <Frame label="HomeAirportPrompt (set, with change link)"><HomeAirportPrompt homeAirport="CCC" onChange={noop} /></Frame>

        <Frame label="AffiliateDisclosure (required; tap 'How we choose these' to open the sheet)">
          <AffiliateDisclosure required />
        </Frame>
        <Frame label="AffiliateDisclosure sheet content (static preview)" light>
          <HowWeChooseBody required />
        </Frame>

        <Frame label="PushPermissionPrompt: not asked / enabled / blocked">
          <div className="space-y-2">
            <PushPermissionPrompt status="prompt" onEnable={noop} />
            <PushPermissionPrompt status="enabled" onEnable={noop} onDisable={noop} />
            <PushPermissionPrompt status="denied" onEnable={noop} />
          </div>
        </Frame>

        <Frame label="Empty state: no alternatives">
          <NoAlternatives origin="AAA" destination="BBB" searchHandoffs={SEARCH} />
        </Frame>
        <Frame label="Error state"><CopilotError onRetry={noop} /></Frame>
      </div>
    </section>
  );
}
