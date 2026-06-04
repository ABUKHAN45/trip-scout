import * as React from "react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import type { DayPrice } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface HeatmapCalendarProps {
  pricesByDay: DayPrice[];
  onSelectDay: (day: DayPrice) => void;
  selectedDate?: string | null;
}

export function HeatmapCalendar({ pricesByDay, onSelectDay, selectedDate }: HeatmapCalendarProps) {
  if (!pricesByDay.length) return null;

  // Find min and max for color scaling
  const prices = pricesByDay.map(p => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const getColorClass = (price: number) => {
    if (price === minPrice) return "bg-emerald-500 text-white font-bold"; // Cheapest
    if (maxPrice === minPrice) return "bg-emerald-100"; // Fallback if all same price

    // simple linear interpolation for a few buckets
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    if (ratio < 0.2) return "bg-emerald-400 text-white";
    if (ratio < 0.4) return "bg-emerald-200 text-emerald-900";
    if (ratio < 0.6) return "bg-amber-100 text-amber-900";
    if (ratio < 0.8) return "bg-amber-300 text-amber-900";
    return "bg-rose-400 text-white"; // Most expensive
  };

  return (
    <div className="grid grid-cols-7 gap-1 md:gap-2">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
        <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
          {day}
        </div>
      ))}
      {pricesByDay.map((dayData) => {
        const isSelected = selectedDate === dayData.date;
        const colorClass = getColorClass(dayData.price);
        
        return (
          <button
            key={dayData.date}
            onClick={() => onSelectDay(dayData)}
            data-testid={`heatmap-day-${dayData.date}`}
            className={cn(
              "flex flex-col items-center justify-center p-2 rounded-md transition-all hover:scale-105 active:scale-95 border border-transparent",
              colorClass,
              isSelected && "ring-2 ring-primary ring-offset-2 border-black"
            )}
            title={`${format(parseISO(dayData.date), "MMM d, yyyy")}: ${dayData.price} ${dayData.currency}`}
          >
            <span className="text-xs font-medium opacity-80 mb-1">{format(parseISO(dayData.date), "d")}</span>
            <span className="text-sm tracking-tight">${dayData.price}</span>
          </button>
        );
      })}
    </div>
  );
}
