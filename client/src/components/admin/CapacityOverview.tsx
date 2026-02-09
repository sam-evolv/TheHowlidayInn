import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, AlertTriangle, TrendingUp, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResourceData {
  capacity: number;
  booked: number;
  reserved: number;
}

interface CapacityOverviewResponse {
  date: string;
  resources: {
    "daycare": ResourceData;
    "boarding:small": ResourceData;
    "boarding:large": ResourceData;
    "trial:day": ResourceData;
  };
  aggregate: {
    boarding: ResourceData;
  };
  totals: {
    capacity: number;
    available: number;
    occupied: number;
    utilisationPct: number;
  };
}

export function CapacityOverview() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Fetch unified capacity overview
  const { data, isLoading, isError } = useQuery<CapacityOverviewResponse>({
    queryKey: ["capacityOverview", selectedDate],
    queryFn: () => apiRequest(`/api/capacity/overview?date=${selectedDate}`),
    staleTime: 0,
    gcTime: 0,
  });

  const getUtilisationStatus = (capacity: number, occupied: number) => {
    if (capacity === 0) return { status: 'good', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' };
    const percentage = (occupied / capacity) * 100;
    if (percentage >= 90) return { status: 'critical', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' };
    if (percentage >= 75) return { status: 'warning', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' };
    return { status: 'good', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' };
  };

  const renderServiceCard = (
    title: string,
    resourceData: ResourceData,
    testId: string
  ) => {
    const { capacity, booked, reserved } = resourceData;
    const occupied = booked + reserved;
    const available = capacity - occupied;
    const utilisationPercentage = capacity > 0 ? (occupied / capacity) * 100 : 0;
    const { status, icon: Icon, color, bg } = getUtilisationStatus(capacity, occupied);

    return (
      <div 
        className={cn("p-4 rounded-lg border", bg)}
        data-testid={`capacity-card-${testId}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {available} of {capacity} spots available
            </p>
          </div>
          <Icon className={cn("h-6 w-6", color)} />
        </div>

        <Progress 
          value={utilisationPercentage} 
          className="mb-3 h-2"
          data-testid={`progress-${testId}`}
        />

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Booked</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100" data-testid={`booked-${testId}`}>
              {booked}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Reserved</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100" data-testid={`reserved-${testId}`}>
              {reserved}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Utilisation</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100" data-testid={`utilization-${testId}`}>
              {utilisationPercentage.toFixed(0)}%
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Capacity Overview
            </CardTitle>
            <CardDescription>
              Real-time capacity utilisation across all services
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
              data-testid="input-capacity-date"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading capacity data...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && isError && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <p className="text-gray-900 dark:text-gray-100 font-medium mb-2">Failed to load capacity data</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Please try again or select a different date</p>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {!isLoading && !isError && data && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b">
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Capacity</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="total-capacity">
              {data.totals.capacity}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Available</p>
            <p className="text-2xl font-bold text-green-600" data-testid="total-available">
              {data.totals.available}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Occupied</p>
            <p className="text-2xl font-bold text-blue-600" data-testid="total-occupied">
              {data.totals.occupied}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Utilisation</p>
            <p className="text-2xl font-bold text-purple-600" data-testid="total-utilization">
              {data.totals.utilisationPct}%
            </p>
          </div>
        </div>

        {/* Per-Service Breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700 dark:text-gray-300">Service Breakdown</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderServiceCard("Daycare", data.resources.daycare, "daycare")}
            {renderServiceCard("Boarding", data.aggregate.boarding, "boarding")}
            {renderServiceCard("Trial Day", data.resources["trial:day"], "trial")}
          </div>
        </div>
        </>
        )}
      </CardContent>
    </Card>
  );
}
