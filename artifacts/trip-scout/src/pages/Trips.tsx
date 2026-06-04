import * as React from "react";
import { useListTrips, useDeleteTrip, useRefreshTrip } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CostEstimator } from "@/components/CostEstimator";
import { Loader2, Trash2, RefreshCw, MapPin, Calendar, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListTripsQueryKey } from "@workspace/api-client-react";

export function TripsPage() {
  const { data: trips, isLoading } = useListTrips();
  const deleteTrip = useDeleteTrip();
  const refreshTrip = useRefreshTrip();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [expandedTripId, setExpandedTripId] = React.useState<number | null>(null);

  const handleDelete = (id: number) => {
    deleteTrip.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Trip deleted" });
        queryClient.invalidateQueries({ queryKey: getListTripsQueryKey() });
      }
    });
  };

  const handleRefresh = (id: number) => {
    refreshTrip.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Prices refreshed" });
        queryClient.invalidateQueries({ queryKey: getListTripsQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">My Trips</h1>
        <p className="text-muted-foreground mt-2">Your watchlist and saved deals.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !trips || trips.length === 0 ? (
        <div className="text-center p-12 border rounded-lg border-dashed bg-muted/20">
          <p className="text-muted-foreground">You haven't saved any trips yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {trips.map(trip => {
            const flight = trip.selectedFlight as any;
            const price = flight?.price;
            
            return (
              <Card key={trip.id} className="flex flex-col h-full hover-elevate">
                <CardHeader className="pb-3 border-b bg-muted/10">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      {trip.origin} → {trip.destination}
                    </CardTitle>
                    {price && (
                      <div className="text-right">
                        <div className="text-2xl font-bold tracking-tight">${price}</div>
                        <div className="text-xs text-muted-foreground">Flight</div>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4 flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {format(parseISO(trip.departureDateFrom), "MMM d")} - {format(parseISO(trip.departureDateTo), "MMM d")}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {trip.travelers} Traveler{trip.travelers > 1 ? 's' : ''}
                    </div>
                  </div>

                  {expandedTripId === trip.id ? (
                    <div className="pt-4 border-t mt-4">
                      <CostEstimator 
                        tripId={trip.id} 
                        flightPrice={price || 0}
                        onEstimateSaved={() => queryClient.invalidateQueries({ queryKey: getListTripsQueryKey() })}
                      />
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full mt-4" onClick={() => setExpandedTripId(trip.id)}>
                      Estimate Costs
                    </Button>
                  )}
                </CardContent>
                <CardFooter className="pt-4 border-t gap-2 flex-wrap">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleRefresh(trip.id)}
                    disabled={refreshTrip.isPending}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Prices
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleDelete(trip.id)}
                    disabled={deleteTrip.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
