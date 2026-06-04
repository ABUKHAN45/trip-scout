# Trip Scout

A personal full-stack travel deal finder. Search flights across a date range, view prices on a colour-coded heatmap calendar, estimate total trip cost, and save trips to a watchlist.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/trip-scout run dev` — run the frontend (port 19120)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)
- Required secrets for live flights: `RAPIDAPI_KEY`, `RAPIDAPI_HOST` (Sky Scrapper / Skyscanner on RapidAPI)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Wouter, TanStack Query, shadcn/ui, Tailwind CSS
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/trips.ts` — trips table schema
- `artifacts/api-server/src/routes/airports.ts` — airport search (static list)
- `artifacts/api-server/src/routes/flights.ts` — flight search (Sky Scrapper API)
- `artifacts/api-server/src/routes/trips.ts` — saved trips CRUD + cost estimator
- `artifacts/api-server/src/lib/flight-api.ts` — flight API config (swap provider here)
- `artifacts/trip-scout/src/pages/Search.tsx` — main search + heatmap page
- `artifacts/trip-scout/src/pages/Trips.tsx` — My Trips watchlist page
- `artifacts/trip-scout/src/components/HeatmapCalendar.tsx` — price heatmap grid
- `artifacts/trip-scout/src/components/AirportCombobox.tsx` — airport autocomplete

## Architecture decisions

- Flight API config is isolated in `lib/flight-api.ts` — swap provider by changing that file, not the route handlers.
- No API key? Backend returns realistic stub data so the UI is fully usable in dev.
- Airport search uses a static list (85+ airports) — can be replaced with a live lookup when API keys are added.
- All secrets (`RAPIDAPI_KEY`, `RAPIDAPI_HOST`) live in Replit Secrets, never in frontend code.
- Single-user app — no auth required.

## Product

- **Search** — origin/destination with autocomplete, departure date range, travelers
- **Price heatmap** — colour-coded calendar grid (green=cheap → red=expensive); click a day for details
- **Cost estimator** — enter hotel/night + daily spend → see full trip total
- **My Trips** — save/delete trips, refresh prices, edit cost estimates

## Gotchas

- Before adding live API calls, set `RAPIDAPI_KEY` and `RAPIDAPI_HOST` in Secrets
- The flight API iterates each day in the range — keep ranges ≤ 30 days to avoid rate-limiting
- After any OpenAPI spec change: `pnpm --filter @workspace/api-spec run codegen`
- After any DB schema change: `pnpm --filter @workspace/db run push`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
