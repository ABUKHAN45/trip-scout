import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tripsTable = pgTable("trips", {
  id: serial("id").primaryKey(),
  origin: text("origin").notNull(),
  originName: text("origin_name"),
  destination: text("destination").notNull(),
  destinationName: text("destination_name"),
  departureDateFrom: text("departure_date_from").notNull(),
  departureDateTo: text("departure_date_to").notNull(),
  returnDateFrom: text("return_date_from"),
  returnDateTo: text("return_date_to"),
  travelers: integer("travelers").notNull().default(1),
  selectedFlight: jsonb("selected_flight"),
  hotelCostPerNight: numeric("hotel_cost_per_night", { precision: 10, scale: 2 }),
  dailySpend: numeric("daily_spend", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertTripSchema = createInsertSchema(tripsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof tripsTable.$inferSelect;
