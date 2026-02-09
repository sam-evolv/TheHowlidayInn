import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Trash2, Plus, RotateCcw, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface CapacityOverride {
  service: string;
  date_start: string;
  date_end: string | null;
  slot: string;
  capacity: number;
}

interface CapacityDefaults {
  daycare: number;
  boarding_small: number;
  boarding_large: number;
  trial: number;
}

export function CapacityManagement() {
  const { toast } = useToast();
  const [mode, setMode] = useState<'single' | 'range'>('single');
  const [service, setService] = useState<string>('Daycare');
  const [singleDate, setSingleDate] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [capacity, setCapacity] = useState<string>('');
  
  // State for editing defaults
  const [editingDefaults, setEditingDefaults] = useState(false);
  const [defaultDaycare, setDefaultDaycare] = useState<string>('');
  const [defaultBoardingSmall, setDefaultBoardingSmall] = useState<string>('');
  const [defaultBoardingLarge, setDefaultBoardingLarge] = useState<string>('');
  const [defaultTrial, setDefaultTrial] = useState<string>('');

  // Fetch capacity defaults and overrides
  const { data: capacityData, isLoading } = useQuery({
    queryKey: ['/api/admin/capacity'],
    queryFn: () => apiRequest('/api/admin/capacity')
  });

  const defaults: CapacityDefaults = capacityData?.defaults || { daycare: 10, boarding_small: 10, boarding_large: 8, trial: 8 };
  const overrides: CapacityOverride[] = capacityData?.overrides || [];

  // Update capacity defaults mutation
  const updateDefaultsMutation = useMutation({
    mutationFn: async (data: {
      daycare: number;
      boardingSmall: number;
      boardingLarge: number;
      trial: number;
    }) => {
      const response = await apiRequest('/api/capacity/defaults', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      const debug = import.meta.env.VITE_CAPACITY_DEBUG === 'true';
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/capacity'] });
      
      // Invalidate ALL capacityOverview queries (any date)
      const invalidatedOverview = queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'capacityOverview';
        }
      });
      
      // Invalidate availability queries
      const invalidatedAvailability = queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.startsWith('/api/availability');
        }
      });
      
      if (debug) {
        console.log('[CAPACITY_DEBUG] Invalidated capacityOverview queries:', invalidatedOverview);
        console.log('[CAPACITY_DEBUG] Invalidated availability queries:', invalidatedAvailability);
      }
      
      setEditingDefaults(false);
      toast({
        title: "Success",
        description: "Capacity defaults updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update capacity defaults.",
        variant: "destructive",
      });
    },
  });

  // Create capacity override mutation
  const createOverrideMutation = useMutation({
    mutationFn: async (data: {
      service: string;
      date_start: string;
      date_end: string | null;
      slot: string;
      capacity: number;
    }) => {
      const response = await apiRequest('/api/admin/capacity', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      const debug = import.meta.env.VITE_CAPACITY_DEBUG === 'true';
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/capacity'] });
      
      // Invalidate ALL capacityOverview queries (any date)
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'capacityOverview'
      });
      
      // Invalidate availability queries
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.startsWith('/api/availability');
        }
      });
      
      if (debug) console.log('[CAPACITY_DEBUG] Invalidated queries after override create');
      
      toast({
        title: "Success",
        description: "Capacity override created successfully.",
      });
      // Reset form
      setSingleDate('');
      setStartDate('');
      setEndDate('');
      setCapacity('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create capacity override.",
        variant: "destructive",
      });
    },
  });

  // Delete capacity override mutation
  const deleteOverrideMutation = useMutation({
    mutationFn: async (override: CapacityOverride) => {
      const params = new URLSearchParams({
        service: override.service,
        date_start: override.date_start,
        date_end: override.date_end || '',
        slot: override.slot,
      });
      const response = await apiRequest(`/api/admin/capacity?${params}`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: () => {
      const debug = import.meta.env.VITE_CAPACITY_DEBUG === 'true';
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/capacity'] });
      
      // Invalidate ALL capacityOverview queries (any date)
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'capacityOverview'
      });
      
      // Invalidate availability queries
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.startsWith('/api/availability');
        }
      });
      
      if (debug) console.log('[CAPACITY_DEBUG] Invalidated queries after override delete');
      
      toast({
        title: "Success",
        description: "Capacity override deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete capacity override.",
        variant: "destructive",
      });
    },
  });

  // Reset all overrides mutation
  const resetAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/admin/capacity/reset', {
        method: 'POST',
      });
      return response;
    },
    onSuccess: () => {
      const debug = import.meta.env.VITE_CAPACITY_DEBUG === 'true';
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/capacity'] });
      
      // Invalidate ALL capacityOverview queries (any date)
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'capacityOverview'
      });
      
      // Invalidate availability queries
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.startsWith('/api/availability');
        }
      });
      
      if (debug) console.log('[CAPACITY_DEBUG] Invalidated queries after reset all overrides');
      
      toast({
        title: "Success",
        description: "All capacity overrides have been reset.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset capacity overrides.",
        variant: "destructive",
      });
    },
  });

  const handleCreateOverride = () => {
    const capacityNum = parseInt(capacity);
    
    if (isNaN(capacityNum) || capacityNum < 0) {
      toast({
        title: "Invalid capacity",
        description: "Please enter a valid capacity number.",
        variant: "destructive",
      });
      return;
    }

    if (mode === 'single') {
      if (!singleDate) {
        toast({
          title: "Missing date",
          description: "Please select a date.",
          variant: "destructive",
        });
        return;
      }
      createOverrideMutation.mutate({
        service,
        date_start: singleDate,
        date_end: singleDate,
        slot: 'ALL_DAY',
        capacity: capacityNum,
      });
    } else {
      if (!startDate || !endDate) {
        toast({
          title: "Missing dates",
          description: "Please select both start and end dates.",
          variant: "destructive",
        });
        return;
      }
      if (startDate > endDate) {
        toast({
          title: "Invalid date range",
          description: "Start date must be before or equal to end date.",
          variant: "destructive",
        });
        return;
      }
      createOverrideMutation.mutate({
        service,
        date_start: startDate,
        date_end: endDate,
        slot: 'ALL_DAY',
        capacity: capacityNum,
      });
    }
  };

  const handleDeleteOverride = (override: CapacityOverride) => {
    if (confirm(`Are you sure you want to delete this capacity override?`)) {
      deleteOverrideMutation.mutate(override);
    }
  };

  const handleResetAll = () => {
    if (confirm(`Are you sure you want to reset ALL capacity overrides? This will remove all date-specific capacity limits.`)) {
      resetAllMutation.mutate();
    }
  };

  const handleStartEditDefaults = () => {
    setDefaultDaycare(defaults.daycare.toString());
    setDefaultBoardingSmall(defaults.boarding_small.toString());
    setDefaultBoardingLarge(defaults.boarding_large.toString());
    setDefaultTrial(defaults.trial.toString());
    setEditingDefaults(true);
  };

  const handleCancelEditDefaults = () => {
    setEditingDefaults(false);
  };

  const handleSaveDefaults = () => {
    const daycare = parseInt(defaultDaycare);
    const boardingSmall = parseInt(defaultBoardingSmall);
    const boardingLarge = parseInt(defaultBoardingLarge);
    const trial = parseInt(defaultTrial);

    if (isNaN(daycare) || isNaN(boardingSmall) || isNaN(boardingLarge) || isNaN(trial) ||
        daycare < 0 || boardingSmall < 0 || boardingLarge < 0 || trial < 0) {
      toast({
        title: "Invalid values",
        description: "Please enter valid positive numbers for all capacities.",
        variant: "destructive",
      });
      return;
    }

    updateDefaultsMutation.mutate({ daycare, boardingSmall, boardingLarge, trial });
  };

  const formatDateRange = (start: string, end: string | null) => {
    if (!end || start === end) {
      return format(new Date(start), 'MMM d, yyyy');
    }
    return `${format(new Date(start), 'MMM d, yyyy')} - ${format(new Date(end), 'MMM d, yyyy')}`;
  };

  const getServiceBadgeColor = (service: string) => {
    switch (service.toLowerCase()) {
      case 'daycare':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'boarding small':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'boarding large':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'trial day':
      case 'trial':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Helper function to get default capacity for a service
  const getServiceDefaultCapacity = (service: string): number => {
    const normalized = service.toLowerCase();
    if (normalized === 'daycare') return defaults.daycare;
    if (normalized === 'boarding small') return defaults.boarding_small;
    if (normalized === 'boarding large') return defaults.boarding_large;
    if (normalized === 'trial day' || normalized === 'trial') return defaults.trial;
    return 10; // fallback
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Loading capacity settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Update Capacity Defaults Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Update Capacity Settings
          </CardTitle>
          <CardDescription>
            Set daily capacity limits for all services
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!editingDefaults ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Daycare</p>
                  <p className="text-2xl font-bold" data-testid="default-daycare">{defaults.daycare}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Boarding Small</p>
                  <p className="text-2xl font-bold" data-testid="default-boarding-small">{defaults.boarding_small}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Boarding Large</p>
                  <p className="text-2xl font-bold" data-testid="default-boarding-large">{defaults.boarding_large}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Trial Day</p>
                  <p className="text-2xl font-bold" data-testid="default-trial">{defaults.trial}</p>
                </div>
              </div>
              <Button onClick={handleStartEditDefaults} data-testid="button-edit-defaults">
                Edit Capacity Settings
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Daycare</label>
                  <Input
                    type="number"
                    min="0"
                    value={defaultDaycare}
                    onChange={(e) => setDefaultDaycare(e.target.value)}
                    data-testid="input-default-daycare"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Boarding Small</label>
                  <Input
                    type="number"
                    min="0"
                    value={defaultBoardingSmall}
                    onChange={(e) => setDefaultBoardingSmall(e.target.value)}
                    data-testid="input-default-boarding-small"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Boarding Large</label>
                  <Input
                    type="number"
                    min="0"
                    value={defaultBoardingLarge}
                    onChange={(e) => setDefaultBoardingLarge(e.target.value)}
                    data-testid="input-default-boarding-large"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Trial Day</label>
                  <Input
                    type="number"
                    min="0"
                    value={defaultTrial}
                    onChange={(e) => setDefaultTrial(e.target.value)}
                    data-testid="input-default-trial"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveDefaults}
                  disabled={updateDefaultsMutation.isPending}
                  data-testid="button-save-defaults"
                >
                  {updateDefaultsMutation.isPending ? 'Updating...' : 'Update Capacity Settings'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelEditDefaults}
                  disabled={updateDefaultsMutation.isPending}
                  data-testid="button-cancel-defaults"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Advanced Capacity Management
          </CardTitle>
          <CardDescription>
            Create date-specific capacity overrides. Default capacities: Daycare ({defaults.daycare}), Boarding Small ({defaults.boarding_small}), Boarding Large ({defaults.boarding_large}), Trial ({defaults.trial})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode selector */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('single')}
              data-testid="button-mode-single"
            >
              Single Date
            </Button>
            <Button
              variant={mode === 'range' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('range')}
              data-testid="button-mode-range"
            >
              Date Range
            </Button>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Service Type</label>
              <Select value={service} onValueChange={setService}>
                <SelectTrigger data-testid="select-override-service">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daycare">Daycare</SelectItem>
                  <SelectItem value="Boarding Small">Boarding Small</SelectItem>
                  <SelectItem value="Boarding Large">Boarding Large</SelectItem>
                  <SelectItem value="Trial Day">Trial Day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === 'single' ? (
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  data-testid="input-override-single-date"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="input-override-start-date"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    data-testid="input-override-end-date"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium">Capacity Override</label>
              <Input
                type="number"
                min="0"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder={`Default: ${getServiceDefaultCapacity(service)}`}
                data-testid="input-override-capacity"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCreateOverride}
              disabled={createOverrideMutation.isPending}
              data-testid="button-create-override"
            >
              <Plus className="h-4 w-4 mr-2" />
              {createOverrideMutation.isPending ? 'Creating...' : 'Create Override'}
            </Button>
            
            {overrides.length > 0 && (
              <Button
                variant="destructive"
                onClick={handleResetAll}
                disabled={resetAllMutation.isPending}
                data-testid="button-reset-all-overrides"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {resetAllMutation.isPending ? 'Resetting...' : 'Reset All Overrides'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Existing overrides */}
      {overrides.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Capacity Overrides</CardTitle>
            <CardDescription>
              {overrides.length} override{overrides.length !== 1 ? 's' : ''} currently active
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map((override, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge className={getServiceBadgeColor(override.service)}>
                        {override.service.charAt(0).toUpperCase() + override.service.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateRange(override.date_start, override.date_end)}</TableCell>
                    <TableCell className="font-semibold">{override.capacity}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {getServiceDefaultCapacity(override.service)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteOverride(override)}
                        disabled={deleteOverrideMutation.isPending}
                        data-testid={`button-delete-override-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
