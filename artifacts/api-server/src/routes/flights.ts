import { Router, type IRouter } from "express";
import { SearchFlightsBody, SearchFlightsResponse } from "@workspace/api-zod";
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

router.post("/flights/search", async (req, res): Promise<void> => {
  const parsed = SearchFlightsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { origin, destination, departureDateFrom, departureDateTo, travelers } =
    parsed.data;

  // --- Date range validation ---
  const from = new Date(departureDateFrom);
  const to = new Date(departureDateTo);

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    res.status(400).json({ error: "Invalid date format" });
    return;
  }
  if (to < from) {
    res.status(400).json({ error: "departureDateTo must be after departureDateFrom" });
    return;
  }

  const dayDiff =
    Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (dayDiff > MAX_RANGE_DAYS) {
    res.status(400).json({
      error: `Date range is too wide (${dayDiff} days). Maximum is ${MAX_RANGE_DAYS} days to keep API usage in check. Please narrow your search window.`,
    });
    return;
  }

  // --- Stub mode (no API keys configured) ---
  if (!isFlightApiConfigured()) {
    req.log.warn({ origin, destination }, "Flight API not configured — returning stub data");
    const pricesByDay = generateStubPrices(departureDateFrom, departureDateTo, travelers);
    res.json(SearchFlightsResponse.parse({ pricesByDay, searchedAt: new Date().toISOString() }));
    return;
  }

  // --- Cache check ---
  const cacheKey = makeCacheKey({ origin, destination, departureDateFrom, departureDateTo, travelers });
  const cached = getCached(cacheKey);

  if (cached) {
    req.log.info(
      { origin, destination, cacheKey, ttlRemaining: ttlSeconds(cached) },
      "Flight search — cache hit, 0 API calls used",
    );
    res.setHeader("X-Cache", "HIT");
    res.setHeader("X-Cache-TTL", String(ttlSeconds(cached)));
    res.json(SearchFlightsResponse.parse({
      pricesByDay: cached.pricesByDay,
      searchedAt: cached.searchedAt,
    }));
    return;
  }

  // --- Live API: iterate day by day ---
  const config = getFlightApiConfig();

  // Prune stale cache entries on each live request (low-overhead housekeeping)
  pruneCache();

  req.log.info(
    { origin, destination, departureDateFrom, departureDateTo, travelers, days: dayDiff },
    `Flight search — cache miss, will consume up to ${dayDiff} API calls`,
  );

  const pricesByDay = [];
  let apiCallsUsed = 0;
  let apiCallsFailed = 0;

  try {
    const current = new Date(departureDateFrom);
    const end = new Date(departureDateTo);

    while (current <= end) {
      const dateStr = current.toISOString().split("T")[0];
      apiCallsUsed++;

      const result = await fetchOneDayPrice(config, origin, destination, dateStr, travelers);

      if (result) {
        pricesByDay.push(result);
      } else {
        apiCallsFailed++;
        req.log.warn({ date: dateStr }, "No price returned for date");
      }

      current.setDate(current.getDate() + 1);

      // Brief delay between calls to respect rate limits
      if (current <= end) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    req.log.info(
      { origin, destination, apiCallsUsed, apiCallsFailed, daysWithPrices: pricesByDay.length },
      `Flight search complete — consumed ${apiCallsUsed} API call(s)`,
    );

    const searchedAt = new Date().toISOString();

    // Cache the result so repeated searches don't burn quota
    setCached(cacheKey, { pricesByDay, searchedAt, apiCallsUsed });

    res.setHeader("X-Cache", "MISS");
    res.setHeader("X-Api-Calls-Used", String(apiCallsUsed));
    res.json(SearchFlightsResponse.parse({ pricesByDay, searchedAt }));
  } catch (err) {
    req.log.error({ err, apiCallsUsed }, "Flight search failed");
    res.status(500).json({ error: "Flight search failed" });
  }
});

export default router;
