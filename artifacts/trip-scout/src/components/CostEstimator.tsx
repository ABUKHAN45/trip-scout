import * as React from "react";
import { useState } from "react";
import { useEstimateTripCost } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface CostEstimatorProps {
  tripId: number;
  flightPrice: number;
  initialNights?: number;
  initialDays?: number;
  onEstimateSaved?: () => void;
}

export function CostEstimator({ tripId, flightPrice, initialNights = 3, initialDays = 4, onEstimateSaved }: CostEstimatorProps) {
  const [hotelCostPerNight, setHotelCostPerNight] = useState<number>(100);
  const [dailySpend, setDailySpend] = useState<number>(50);
  const [nights, setNights] = useState<number>(initialNights);
  const [days, setDays] = useState<number>(initialDays);

  const estimateCost = useEstimateTripCost();

  const handleEstimate = () => {
    estimateCost.mutate({
      id: tripId,
      data: {
        flightPrice,
        hotelCostPerNight,
        dailySpend,
        nights,
        days,
      }
    }, {
      onSuccess: () => {
        if (onEstimateSaved) onEstimateSaved();
      }
    });
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Trip Cost Estimator</CardTitle>
        <CardDescription>Estimate your total spend for this trip</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Hotel / Night ($)</Label>
            <Input 
              type="number" 
              value={hotelCostPerNight} 
              onChange={e => setHotelCostPerNight(Number(e.target.value))} 
              data-testid="input-hotel-cost"
            />
          </div>
          <div className="space-y-2">
            <Label>Daily Spend ($)</Label>
            <Input 
              type="number" 
              value={dailySpend} 
              onChange={e => setDailySpend(Number(e.target.value))} 
              data-testid="input-daily-spend"
            />
          </div>
          <div className="space-y-2">
            <Label>Nights</Label>
            <Input 
              type="number" 
              value={nights} 
              onChange={e => setNights(Number(e.target.value))} 
              data-testid="input-nights"
            />
          </div>
          <div className="space-y-2">
            <Label>Days</Label>
            <Input 
              type="number" 
              value={days} 
              onChange={e => setDays(Number(e.target.value))} 
              data-testid="input-days"
            />
          </div>
        </div>

        <Button 
          onClick={handleEstimate} 
          disabled={estimateCost.isPending} 
          className="w-full"
          data-testid="button-calculate-estimate"
        >
          {estimateCost.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Calculate Estimate
        </Button>

        {estimateCost.data && (
          <div className="mt-4 p-4 bg-muted rounded-md space-y-2 text-sm border">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Flights:</span>
              <span className="font-medium">${estimateCost.data.flightCost}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hotel ({estimateCost.data.nights} nights):</span>
              <span className="font-medium">${estimateCost.data.hotelCost}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Spend ({estimateCost.data.days} days):</span>
              <span className="font-medium">${estimateCost.data.dailySpendTotal}</span>
            </div>
            <div className="pt-2 border-t flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>${estimateCost.data.totalCost}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
