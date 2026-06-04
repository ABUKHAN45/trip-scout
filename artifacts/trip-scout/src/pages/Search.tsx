import * as React from "react";
import { useState } from "react";
import { AirportCombobox } from "@/components/AirportCombobox";
import { HeatmapCalendar } from "@/components/HeatmapCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, addDays } from "date-fns";
import { useSearchFlights, useSaveTrip } from "@workspace/api-client-react";
import type { DayPrice } from "@workspace/api-client-react";
import { Loader2, Search, Plane, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SearchPage() {
  const [origin, setOrigin] = useState("SFO");
  const [destination, setDestination] = useState("JFK");
  const [departureDateFrom, setDepartureDateFrom] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [departureDateTo, setDepartureDateTo] = useState(() => format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [travelers, setTravelers] = useState(1);
  const [selectedDay, setSelectedDay] = useState<DayPrice | null>(null);

  const { toast } = useToast();
  const searchFlights = useSearchFlights();
  const saveTrip = useSaveTrip();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedDay(null);
    searchFlights.mutate({
      data: {
        origin,
        destination,
        departureDateFrom,
        departureDateTo,
        travelers,
      }
    });
  };

  const handleSaveTrip = () => {
    if (!selectedDay) return;
    
    saveTrip.mutate({
      data: {
        origin,
        destination,
        departureDateFrom,
        departureDateTo,
        travelers,
        selectedFlight: {
          departureDate: selectedDay.date,
          price: selectedDay.price,
          currency: selectedDay.currency,
          origin,
          destination
        } as any
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Trip Saved",
          description: `Saved flight to ${destination} for ${selectedDay.date}`,
        });
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Scout Flights</h1>
        <p className="text-muted-foreground mt-2">Find the cheapest days to fly across a range of dates.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-2 md:col-span-2">
              <Label>Origin</Label>
              <AirportCombobox value={origin} onChange={setOrigin} testId="search-origin" />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label>Destination</Label>
              <AirportCombobox value={destination} onChange={setDestination} testId="search-destination" />
            </div>

            <div className="space-y-2">
              <Label>Travelers</Label>
              <Input type="number" min={1} value={travelers} onChange={e => setTravelers(Number(e.target.value))} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Date Range Start</Label>
              <Input type="date" value={departureDateFrom} onChange={e => setDepartureDateFrom(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Date Range End</Label>
              <Input type="date" value={departureDateTo} onChange={e => setDepartureDateTo(e.target.value)} />
            </div>

            <Button type="submit" disabled={searchFlights.isPending} className="w-full">
              {searchFlights.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {searchFlights.data && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-4">Price Heatmap</h2>
            <Card>
              <CardContent className="p-4 md:p-6">
                <HeatmapCalendar 
                  pricesByDay={searchFlights.data.pricesByDay} 
                  onSelectDay={setSelectedDay}
                  selectedDate={selectedDay?.date}
                />
              </CardContent>
            </Card>
          </div>

          {selectedDay && (
            <Card className="border-primary/50 shadow-md">
              <CardHeader className="pb-3 border-b bg-muted/30">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      {origin} <ArrowRight className="h-4 w-4 text-muted-foreground" /> {destination}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {format(new Date(selectedDay.date), "EEEE, MMMM d, yyyy")}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold tracking-tight text-primary">
                      ${selectedDay.price}
                    </div>
                    <div className="text-sm text-muted-foreground uppercase">{selectedDay.currency}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex justify-end gap-3">
                  <Button variant="outline">View Flights</Button>
                  <Button onClick={handleSaveTrip} disabled={saveTrip.isPending}>
                    {saveTrip.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save this trip
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
