import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, tripsTable } from "@workspace/db";
import {
  ListTripsResponse,
  GetTripParams,
  GetTripResponse,
  SaveTripBody,
  UpdateTripParams,
  UpdateTripBody,
  UpdateTripResponse,
  DeleteTripParams,
  RefreshTripParams,
  RefreshTripResponse,
  EstimateTripCostParams,
  EstimateTripCostBody,
  EstimateTripCostResponse,
} from "@workspace/api-zod";
import {
  isFlightApiConfigured,
  getFlightApiConfig,
  generateStubPrices,
  fetchOneDayPrice,
  MAX_RANGE_DAYS,
} from "../lib/flight-api.js";
import {
  makeCacheKey,
  getCached,
  setCached,
  ttlSeconds,
  pruneCache,
} from "../lib/search-cache.js";

const router: IRouter = Router();

router.get("/trips", async (_req, res): Promise<void> => {
  const trips = await db.select().from(tripsTable).orderBy(tripsTable.createdAt);
  res.json(ListTripsResponse.parse(trips));
});

router.post("/trips", async (req, res): Promise<void> => {
  const parsed = SaveTripBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const [trip] = await db
    .insert(tripsTable)
    .values({
      origin: data.origin,
      originName: data.originName ?? null,
      destination: data.destination,
      destinationName: data.destinationName ?? null,
      departureDateFrom: data.departureDateFrom,
      departureDateTo: data.departureDateTo,
      returnDateFrom: data.returnDateFrom ?? null,
      returnDateTo: data.returnDateTo ?? null,
      travelers: data.travelers,
      selectedFlight: data.selectedFlight ?? null,
      hotelCostPerNight: data.hotelCostPerNight != null ? String(data.hotelCostPerNight) : null,
      dailySpend: data.dailySpend != null ? String(data.dailySpend) : null,
      notes: data.notes ?? null,
    })
    .returning();

  res.status(201).json(GetTripResponse.parse(trip));
});

router.get("/trips/:id", async (req, res): Promise<void> => {
  const params = GetTripParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [trip] = await db
    .select()
    .from(tripsTable)
    .where(eq(tripsTable.id, params.data.id));

  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }

  res.json(GetTripResponse.parse(trip));
});

router.patch("/trips/:id", async (req, res): Promise<void> => {
  const params = UpdateTripParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTripBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const updateValues: Record<string, unknown> = {};

  if (data.selectedFlight !== undefined) updateValues.selectedFlight = data.selectedFlight;
  if (data.hotelCostPerNight !== undefined)
    updateValues.hotelCostPerNight = data.hotelCostPerNight != null ? String(data.hotelCostPerNight) : null;
  if (data.dailySpend !== undefined)
    updateValues.dailySpend = data.dailySpend != null ? String(data.dailySpend) : null;
  if (data.notes !== undefined) updateValues.notes = data.notes;

  const [trip] = await db
    .update(tripsTable)
    .set(updateValues)
    .where(eq(tripsTable.id, params.data.id))
    .returning();

  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }

  res.json(UpdateTripResponse.parse(trip));
});

router.delete("/trips/:id", async (req, res): Promise<void> => {
  const params = DeleteTripParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [trip] = await db
    .delete(tripsTable)
    .where(eq(tripsTable.id, params.data.id))
    .returning();

  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/trips/:id/refresh", async (req, res): Promise<void> => {
  const params = RefreshTripParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [trip] = await db
    .select()
    .from(tripsTable)
    .where(eq(tripsTable.id, params.data.id));

  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }

  // --- Validate range ---
  const from = new Date(trip.departureDateFrom);
  const to = new Date(trip.departureDateTo);
  const dayDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (dayDiff > MAX_RANGE_DAYS) {
    res.status(400).json({
      error: `Trip date range is too wide (${dayDiff} days). Maximum is ${MAX_RANGE_DAYS} days.`,
    });
    return;
  }

  // --- Stub mode ---
  if (!isFlightApiConfigured()) {
    req.log.warn({ tripId: trip.id }, "Flight API not configured — returning stub data for refresh");
    const pricesByDay = generateStubPrices(trip.departureDateFrom, trip.departureDateTo, trip.travelers);
    res.json(RefreshTripResponse.parse({ pricesByDay, searchedAt: new Date().toISOString() }));
    return;
  }

  // --- Cache check (refresh always busts the cache — that's the point) ---
  const cacheKey = makeCacheKey({
    origin: trip.origin,
    destination: trip.destination,
    departureDateFrom: trip.departureDateFrom,
    departureDateTo: trip.departureDateTo,
    travelers: trip.travelers,
  });

  const cached = getCached(cacheKey);
  if (cached) {
    req.log.info(
      { tripId: trip.id, ttlRemaining: ttlSeconds(cached) },
      "Trip refresh — cache hit, 0 API calls used",
    );
    res.setHeader("X-Cache", "HIT");
    res.setHeader("X-Cache-TTL", String(ttlSeconds(cached)));
    res.json(RefreshTripResponse.parse({
      pricesByDay: cached.pricesByDay,
      searchedAt: cached.searchedAt,
    }));
    return;
  }

  // --- Live API ---
  const config = getFlightApiConfig();
  pruneCache();

  req.log.info(
    { tripId: trip.id, origin: trip.origin, destination: trip.destination, days: dayDiff },
    `Trip refresh — cache miss, will consume up to ${dayDiff} API calls`,
  );

  const pricesByDay = [];
  let apiCallsUsed = 0;
  let apiCallsFailed = 0;

  try {
    const current = new Date(trip.departureDateFrom);
    const end = new Date(trip.departureDateTo);

    while (current <= end) {
      const dateStr = current.toISOString().split("T")[0];
      apiCallsUsed++;

      const result = await fetchOneDayPrice(
        config,
        trip.origin,
        trip.destination,
        dateStr,
        trip.travelers,
      );

      if (result) {
        pricesByDay.push(result);
      } else {
        apiCallsFailed++;
      }

      current.setDate(current.getDate() + 1);
      if (current <= end) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    req.log.info(
      { tripId: trip.id, apiCallsUsed, apiCallsFailed, daysWithPrices: pricesByDay.length },
      `Trip refresh complete — consumed ${apiCallsUsed} API call(s)`,
    );

    const searchedAt = new Date().toISOString();
    setCached(cacheKey, { pricesByDay, searchedAt, apiCallsUsed });

    res.setHeader("X-Cache", "MISS");
    res.setHeader("X-Api-Calls-Used", String(apiCallsUsed));
    res.json(RefreshTripResponse.parse({ pricesByDay, searchedAt }));
  } catch (err) {
    req.log.error({ err, tripId: trip.id, apiCallsUsed }, "Trip refresh failed");
    res.status(500).json({ error: "Flight refresh failed" });
  }
});

router.post("/trips/:id/estimate", async (req, res): Promise<void> => {
  const params = EstimateTripCostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = EstimateTripCostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [trip] = await db
    .select()
    .from(tripsTable)
    .where(eq(tripsTable.id, params.data.id));

  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }

  const { flightPrice, hotelCostPerNight, dailySpend, nights, days } = parsed.data;

  const flightCost = flightPrice;
  const hotelCost = (hotelCostPerNight ?? 0) * nights;
  const dailySpendTotal = (dailySpend ?? 0) * days;
  const totalCost = flightCost + hotelCost + dailySpendTotal;

  res.json(
    EstimateTripCostResponse.parse({
      flightCost,
      hotelCost,
      dailySpendTotal,
      totalCost,
      nights,
      days,
      currency: null,
    }),
  );
});

export default router;
