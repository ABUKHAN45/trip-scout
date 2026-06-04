/** Shared types used by flight-api.ts and search-cache.ts. */

export interface DayPrice {
  date: string;
  price: number;
  currency: string;
  airline: string | null;
  stops: number | null;
  duration: string | null;
}
