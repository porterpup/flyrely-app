import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { rescoreFlight } from '~/lib/prediction';
import { PredictionUnavailableError } from '~/lib/api';
import { LookupError, legArrivalISO, legDepartureISO } from '~/lib/flightLookup';
import type { LookupLeg, LookupResponse } from '~/lib/flightLookup';
import { saveFlight, getFlightById, getFlights, getTripById, createTrip, appendLeg } from '~/lib/flightStore';
import { naturalKey, emitNotice } from '~/lib/syncEngine';
import { legsOf, tripErrorMessage, validateTripLegs } from '~/lib/tripGrouping';
import { findAirline } from '~/lib/airlines';
import { getAirport } from '~/lib/airports';
import { getAirportRef } from '~/lib/airportRef';
import { newUuid } from '~/lib/utils';
import type { Flight } from '~/types';

export interface TrackInput {
  airline: string;
  number: string;
  depISO: string;
  arrISO?: string;
  origin: string;
  dest: string;
  /** Id of the flight this one connects after ("Add connecting flight"). */
  after?: string;
}

export function trackErrorMessage(e: unknown): string {
  if (e instanceof LookupError) return e.message;
  return e instanceof PredictionUnavailableError
    ? 'Predictions are temporarily unavailable. Please try again shortly.'
    : 'Could not get prediction. Please check your inputs and try again.';
}

function airportBits(code: string) {
  const info = getAirport(code);
  const ref = getAirportRef(code);
  return { code, name: info?.name ?? ref?.name ?? code, city: info?.city ?? ref?.city ?? code };
}

export function buildFlight(input: TrackInput): Flight {
  const { airline, number, depISO, arrISO, origin, dest } = input;
  return {
    id: `flight-${newUuid()}`,
    flightNumber: `${airline}${number}`,
    airline: { code: airline, name: findAirline(airline)?.name ?? airline },
    origin: airportBits(origin),
    destination: airportBits(dest),
    scheduledDeparture: depISO,
    status: 'scheduled',
    riskLevel: 'low',
    ...(arrISO ? { scheduledArrivalLocal: arrISO, arrivalSource: 'lookup' as const } : {}),
  };
}

/** The leg of a lookup as track() input. */
export function legTrackInput(lookup: LookupResponse, leg: LookupLeg, date: string, after?: string): TrackInput {
  return {
    airline: lookup.airline,
    number: lookup.flight_number,
    depISO: legDepartureISO(date, leg),
    arrISO: legArrivalISO(date, leg),
    origin: leg.origin,
    dest: leg.dest,
    after,
  };
}

/** When a lookup has exactly one leg, track it straight away (no extra card to tap). Returns null when there is a choice to make. */
export function autoTrackSingle(
  lookup: LookupResponse,
  date: string,
  track: (input: TrackInput) => Promise<string | null>,
  after?: string
): Promise<string | null> | null {
  return lookup.matches.length === 1 ? track(legTrackInput(lookup, lookup.matches[0], date, after)) : null;
}

/**
 * One-step "track this flight": score it, save it, and open its page.
 * Resolves to an error message to show inline, or null on success. Never throws.
 */
export function useTrackFlight() {
  const navigate = useNavigate();
  return useCallback(
    async (input: TrackInput): Promise<string | null> => {
      const base = buildFlight(input);
      const key = naturalKey(base);
      const existing = getFlights().find((f) => naturalKey(f) === key);
      if (existing) {
        emitNotice(`You already track ${existing.flightNumber}.`);
        navigate({ to: '/flights/$flightId', params: { flightId: existing.id } });
        return null;
      }
      let flight: Flight;
      try {
        flight = await rescoreFlight(base);
      } catch (e) {
        return trackErrorMessage(e);
      }
      // "Add connecting flight": check it connects before saving anything.
      const prev = input.after ? getFlightById(input.after) : undefined;
      if (prev) {
        const trip = prev.tripId ? getTripById(prev.tripId) : undefined;
        const chain = [...(trip ? legsOf(trip, getFlights()) : [prev]), flight];
        const check = validateTripLegs(chain);
        if (!check.ok) return tripErrorMessage(check.reason, chain, check.index);
      }
      saveFlight(flight);
      if (prev) {
        const result = prev.tripId ? appendLeg(prev.tripId, flight.id) : createTrip([prev.id, flight.id]);
        if (result.ok) {
          emitNotice('Added to your trip.');
          navigate({ to: '/trips/$tripId', params: { tripId: result.tripId } });
          return null;
        }
        emitNotice(result.reason);
      }
      navigate({ to: '/flights/$flightId', params: { flightId: flight.id }, search: { added: '1' } });
      return null;
    },
    [navigate]
  );
}
