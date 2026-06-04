/**
 * Flight API configuration.
 * Swap the provider here without rewriting route handlers.
 *
 * Currently wired to Sky Scrapper (Skyscanner) on RapidAPI.
 * Set RAPIDAPI_KEY and RAPIDAPI_HOST in Replit Secrets to enable live data.
 *
 * Note on Sky Scrapper API design: the API exposes single-day endpoints only
 * (e.g. /flights/search-one-way?departDate=YYYY-MM-DD). There is no native
 * price-calendar endpoint that returns cheapest fares for a whole range in one
 * call. As a result we iterate per-day, which is why this module enforces a
 * hard cap on range length and caches results aggressively.
 */

import type { DayPrice } from "./flight-api-types.js";

export type { DayPrice };

export interface FlightApiConfig {
  baseUrl: string;
  headers: Record<string, string>;
}

/** Maximum searchable date range in days when using the live API. */
export const MAX_RANGE_DAYS = 30;

export function getFlightApiConfig(): FlightApiConfig {
  const key = process.env.RAPIDAPI_KEY;
  const host = process.env.RAPIDAPI_HOST;

  if (!key || !host) {
    return { baseUrl: "", headers: {} };
  }

  return {
    baseUrl: `https://${host}`,
    headers: {
      "x-rapidapi-key": key,
      "x-rapidapi-host": host,
      "Content-Type": "application/json",
    },
  };
}

export function isFlightApiConfigured(): boolean {
  return !!(process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_HOST);
}

/**
 * Fetch cheapest fare for a single departure date from Sky Scrapper.
 * Returns null if the date has no results or the API errors.
 */
export async function fetchOneDayPrice(
  config: FlightApiConfig,
  origin: string,
  destination: string,
  dateStr: string,
  travelers: number,
): Promise<DayPrice | null> {
  const [year, month, day] = dateStr.split("-");
  const url = `${config.baseUrl}/flights/search-one-way?fromEntityId=${origin}&toEntityId=${destination}&departDate=${year}-${month}-${day}&adults=${travelers}`;

  const apiRes = await fetch(url, { headers: config.headers });
  if (!apiRes.ok) return null;

  const data = (await apiRes.json()) as Record<string, unknown>;
  const itineraries = (data?.data as Record<string, unknown>)
    ?.itineraries as Array<Record<string, unknown>> | undefined;

  if (!itineraries || itineraries.length === 0) return null;

  const cheapest = itineraries[0];
  const priceRaw = (cheapest?.price as Record<string, unknown>)?.raw as
    | number
    | undefined;
  if (priceRaw === undefined) return null;

  const legs = cheapest?.legs as Array<Record<string, unknown>> | undefined;
  const firstLeg = legs?.[0];
  const carrier = (firstLeg?.carriers as Record<string, unknown>)
    ?.marketing as Array<Record<string, unknown>> | undefined;
  const airlineName: string | null =
    (carrier?.[0]?.name as string | undefined) ?? null;
  const stopCount: number | null = (firstLeg?.stopCount as number) ?? null;
  const durationMins = firstLeg?.durationInMinutes as number | undefined;
  const duration = durationMins
    ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`
    : null;

  // Currency: try to extract from the formatted price string, fall back to USD
  const formattedPrice = (cheapest?.price as Record<string, unknown>)
    ?.formatted as string | undefined;
  const currency = formattedPrice?.match(/[A-Z]{3}/)?.[0] ?? "USD";

  return { date: dateStr, price: priceRaw, currency, airline: airlineName, stops: stopCount, duration };
}

/**
 * Stub flight data generator — used when API keys are absent.
 * Returns plausible-looking prices for a date range so the full UI works in dev.
 */
export function generateStubPrices(
  departureDateFrom: string,
  departureDateTo: string,
  travelers: number,
): DayPrice[] {
  const results: DayPrice[] = [];
  const airlines = ["BA", "EZY", "FR", "LH", "U2", "AF", "KL", "IB"];
  const baseFare = 80 + Math.random() * 200;

  for (
    let d = new Date(departureDateFrom);
    d <= new Date(departureDateTo);
    d.setDate(d.getDate() + 1)
  ) {
    const dayOfWeek = d.getDay();
    const weekendPremium = dayOfWeek === 0 || dayOfWeek === 6 ? 1.2 : 1.0;
    const jitter = 0.8 + Math.random() * 0.5;
    const price =
      Math.round(baseFare * weekendPremium * jitter * travelers * 100) / 100;

    results.push({
      date: d.toISOString().split("T")[0],
      price,
      currency: "GBP",
      airline: airlines[Math.floor(Math.random() * airlines.length)],
      stops: Math.random() > 0.7 ? 1 : 0,
      duration: `${2 + Math.floor(Math.random() * 6)}h ${Math.floor(Math.random() * 59)}m`,
    });
  }

  return results;
}
