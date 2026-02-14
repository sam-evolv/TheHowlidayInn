import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import VaccinationStatus from "@/components/VaccinationStatus";
import BreedBadge from "@/components/BreedBadge";
import { CapacityOverview } from "@/components/admin/CapacityOverview";
import { CapacityManagement } from "@/components/admin/CapacityManagement";
import { 
  Calendar, 
  Users, 
  Download, 
  Settings, 
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Euro,
  Dog,
  Search,
  User,
  LogOut
} from "lucide-react";
import { format } from "date-fns";

// Helper to format dates in UTC to prevent timezone offset issues
function formatDateUTC(dateString: string, formatString: string): string {
  if (!dateString) return 'N/A';
  // Extract just the date part (YYYY-MM-DD) to avoid timezone conversion
  const datePart = dateString.substring(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);
  // Create date in UTC (month is 0-indexed)
  const date = new Date(Date.UTC(year, month - 1, day));
  return format(date, formatString);
}

interface AdminBooking {
  id: string;
  dogId?: string;
  dogName?: string;
  breed?: string;
  serviceType: 'daycare' | 'boarding' | 'trial';
  serviceDate?: string;
  checkinDate?: string;
  checkoutDate?: string;
  trialDate?: string;
  dropoffTime?: string;
  pickupTime?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus?: 'unpaid' | 'paid' | 'refunded';
  amount?: number;
  ownerName?: string;
  email?: string;
  phone?: string;
  createdAt?: string;
}

interface AdminDog {
  id: string;
  name: string;
  breed: string;
  sex: string;
  dob: string;
  weightKg: number;
  photoUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  ownerUid: string;
  temperament?: string;
  disallowedReason?: string;
  createdAt: string;
  ownerName?: string;
  ownerEmail?: string;
}

interface AdminStats {
  total: number;
  confirmed: number;
  pending: number;
  completed: number;
  cancelled: number;
  revenueCents: number;
}

interface CapacityDefaults {
  daycare: number;
  boarding_small: number;
  boarding_large: number;
  trial: number;
}

interface CapacityDataResponse {
  defaults: CapacityDefaults;
  overrides: any[];
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [capacity, setCapacity] = useState<{ daycare: number; boarding: number; trial: number }>({ daycare: 40, boarding: 20, trial: 8 });
  const [blockedBreeds, setBlockedBreeds] = useState<string[]>([]);
  
  // Dogs tab state
  const [dogSearchTerm, setDogSearchTerm] = useState<string>("");
  const [dogStatusFilter, setDogStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const dogsPerPage = 10;
  const [selectedDog, setSelectedDog] = useState<any | null>(null);
  const [dogDetailsOpen, setDogDetailsOpen] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState<string>("");
  
  // Revenue reset state
  const [restrictedBreeds, setRestrictedBreeds] = useState<string[]>([]);
  const [newBreedInput, setNewBreedInput] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  // Check for cookie-based admin auth
  const { data: authData, isLoading: authLoading, error: authError } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && (authError || !authData)) {
      setLocation('/admin/login');
    }
  }, [authLoading, authData, authError, setLocation]);

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/auth/logout', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation('/admin/login');
    },
    onError: (error: Error) => {
      toast({
        title: 'Logout failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (passwords: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(passwords),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to change password');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Password changed',
        description: 'Your password has been updated successfully',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Password change failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation for updating capacity - uses the NEW capacity defaults system
  const updateCapacityMutation = useMutation({
    mutationFn: async (capacityData: { daycare: number; boarding: number; trial: number }) => {
      // Convert boarding total to small+large split (keep 10/8 ratio by default)
      const boardingTotal = capacityData.boarding;
      const boardingSmall = Math.ceil(boardingTotal * 0.56); // ~56% for small
      const boardingLarge = boardingTotal - boardingSmall;
      
      const response = await apiRequest("/api/capacity/defaults", {
        method: "PUT",
        body: JSON.stringify({
          daycare: capacityData.daycare,
          boardingSmall: boardingSmall,
          boardingLarge: boardingLarge,
          trial: capacityData.trial
        }),
      });
      return response;
    },
    onSuccess: () => {
      // Invalidate ALL capacity-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/admin/capacity'] });
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'capacityOverview'
      });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.startsWith('/api/availability');
        }
      });
      
      toast({
        title: "Success",
        description: "Capacity defaults updated successfully. Overview will update instantly.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update capacity settings.",
        variant: "destructive",
      });
    },
  });

  // Build query key with filters
  const buildBookingsQueryKey = () => {
    const params = new URLSearchParams();
    if (selectedDate) params.set('date', selectedDate);
    if (selectedService && selectedService !== 'all') params.set('service', selectedService);
    if (selectedStatus && selectedStatus !== 'all') params.set('status', selectedStatus);
    if (searchTerm) params.set('q', searchTerm);
    return `/api/admin/bookings?${params}`;
  };

  // Build dogs query key
  const buildDogsQueryKey = () => {
    const params = new URLSearchParams();
    if (dogStatusFilter !== 'all') {
      params.set('status', dogStatusFilter);
    }
    return `/api/admin/dogs?${params}`;
  };

  // Fetch admin stats - only when authenticated
  const { data: statsData } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: !authLoading && !authError && !!authData,
  });

  // Fetch all bookings - only when authenticated
  const { data: bookingsResponse, isLoading, refetch } = useQuery({
    queryKey: [buildBookingsQueryKey()],
    queryFn: () => apiRequest(buildBookingsQueryKey()),
    enabled: !authLoading && !authError && !!authData,
  });

  // Fetch all dogs - only when authenticated
  const { data: allDogs = [], isLoading: dogsLoading, refetch: refetchDogs } = useQuery<AdminDog[]>({
    queryKey: [buildDogsQueryKey()],
    enabled: !authLoading && !authError && !!authData,
  });

  // Fetch capacity defaults from the NEW system - only when authenticated
  const { data: capacityData } = useQuery<CapacityDataResponse>({
    queryKey: ["/api/admin/capacity"],
    enabled: !authLoading && !authError && !!authData,
  });

  // Initialize capacity state from NEW system defaults
  useEffect(() => {
    if (capacityData?.defaults) {
      // Convert boarding small+large to total for the UI
      const boardingTotal = (capacityData.defaults.boarding_small || 10) + (capacityData.defaults.boarding_large || 8);
      setCapacity({
        daycare: capacityData.defaults.daycare || 10,
        boarding: boardingTotal,
        trial: capacityData.defaults.trial || 10,
      });
    }
  }, [capacityData]);

  // Fetch restricted breeds on mount
  useEffect(() => {
    const fetchRestrictedBreeds = async () => {
      try {
        const response = await apiRequest('/api/admin/settings/restricted-breeds');
        if (response.success && Array.isArray(response.breeds)) {
          setRestrictedBreeds(response.breeds);
        }
      } catch (error) {
        console.error('Failed to fetch restricted breeds:', error);
      }
    };
    if (!authLoading && !authError && !!authData) {
      fetchRestrictedBreeds();
    }
  }, [authLoading, authError, authData]);

  // Handler to add a restricted breed
  const handleAddRestrictedBreed = async () => {
    if (!newBreedInput.trim()) return;
    
    try {
      const response = await apiRequest('/api/admin/settings/restricted-breeds', {
        method: 'POST',
        body: JSON.stringify({ breed: newBreedInput.trim() })
      });
      
      if (response.success && Array.isArray(response.breeds)) {
        setRestrictedBreeds(response.breeds);
        setNewBreedInput('');
        toast({
          title: "Breed Added",
          description: `${newBreedInput.trim()} has been added to restricted breeds.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add breed.",
        variant: "destructive",
      });
    }
  };

  // Handler to remove a restricted breed
  const handleRemoveRestrictedBreed = async (breed: string) => {
    try {
      const response = await apiRequest(`/api/admin/settings/restricted-breeds/${encodeURIComponent(breed)}`, {
        method: 'DELETE'
      });
      
      if (response.success && Array.isArray(response.breeds)) {
        setRestrictedBreeds(response.breeds);
        toast({
          title: "Breed Removed",
          description: `${breed} has been removed from restricted breeds.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove breed.",
        variant: "destructive",
      });
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dogSearchTerm, dogStatusFilter]);

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brown-600 mx-auto"></div>
          <p className="mt-4 text-brown-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render admin content if not authenticated
  if (authError || !authData) {
    return null;
  }

  const bookings: AdminBooking[] = bookingsResponse?.rows || [];

  // Settings are managed server-side
  // Capacity and breed restrictions are configured in the backend

  // Filtering is now done server-side, so we just use the bookings directly
  const filteredBookings = bookings;

  // Filter dogs
  const filteredDogs = allDogs.filter((dog) => {
    const matchesStatus = dogStatusFilter === "all" || dog.status === dogStatusFilter;
    const matchesSearch = !dogSearchTerm || 
      dog.name.toLowerCase().includes(dogSearchTerm.toLowerCase()) ||
      dog.breed.toLowerCase().includes(dogSearchTerm.toLowerCase()) ||
      dog.ownerName?.toLowerCase().includes(dogSearchTerm.toLowerCase()) ||
      dog.ownerEmail?.toLowerCase().includes(dogSearchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  // Paginate dogs
  const totalPages = Math.ceil(filteredDogs.length / dogsPerPage);
  const paginatedDogs = filteredDogs.slice(
    (currentPage - 1) * dogsPerPage,
    currentPage * dogsPerPage
  );

  // Use stats from API
  const stats = {
    total: statsData?.total || 0,
    confirmed: statsData?.confirmed || 0,
    pending: statsData?.pending || 0,
    completed: statsData?.completed || 0,
    cancelled: statsData?.cancelled || 0,
    revenue: (statsData?.revenueCents || 0) / 100,
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      await apiRequest(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      
      toast({
        title: "Success",
        description: "Booking status updated successfully.",
      });
      
      // Invalidate with predicate to match dynamic query keys
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.startsWith('/api/admin/bookings') || key === '/api/admin/stats';
        }
      });
    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        title: "Error",
        description: "Failed to update booking status.",
        variant: "destructive",
      });
    }
  };

  // Dog management functions
  const updateDogStatus = async (dogId: string, status: 'approved' | 'rejected', reason?: string) => {
    try {
      await apiRequest(`/api/admin/dogs/${dogId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      });

      toast({
        title: "Success",
        description: `Dog ${status} successfully.`,
      });
      
      // Invalidate with predicate to match dynamic query keys
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.startsWith('/api/admin/dogs');
        }
      });
    } catch (error) {
      console.error('Error updating dog status:', error);
      toast({
        title: "Error",
        description: "Failed to update dog status.",
        variant: "destructive",
      });
    }
  };

  const markTrialComplete = async (dogId: string, dogName: string) => {
    const confirmed = window.confirm(
      `Mark Trial Day as completed for ${dogName}? This will grant access to daycare and boarding services.`
    );
    
    if (!confirmed) return;

    try {
      await apiRequest(`/api/admin/dogs/${dogId}/trial/complete`, {
        method: 'POST',
      });

      toast({
        title: "Trial Completed",
        description: `${dogName}'s trial has been marked as complete.`,
      });
      
      // Invalidate dog queries to refresh the list
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.startsWith('/api/admin/dogs');
        }
      });
    } catch (error: any) {
      console.error('Error marking trial complete:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark trial as complete.",
        variant: "destructive",
      });
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob) return "Unknown";
    const birthDate = new Date(dob);
    const today = new Date();
    const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
    
    if (ageInMonths < 12) {
      return `${ageInMonths} month${ageInMonths !== 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(ageInMonths / 12);
      return `${years} year${years !== 1 ? 's' : ''}`;
    }
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    switch (status.toLowerCase()) {
      case 'approved':
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const viewDogDetails = async (dogId: string) => {
    try {
      const dogDetails = await apiRequest(`/api/admin/dogs/${dogId}`);
      setSelectedDog(dogDetails);
      setDogDetailsOpen(true);
    } catch (error) {
      console.error('Error fetching dog details:', error);
      toast({
        title: "Error",
        description: "Failed to load dog details.",
        variant: "destructive",
      });
    }
  };

  const updateCapacity = () => {
    updateCapacityMutation.mutate(capacity);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all password fields',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'New password and confirmation must match',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Password too short',
        description: 'New password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const exportToCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.set('date', selectedDate);
      if (selectedService && selectedService !== 'all') params.set('service', selectedService);
      if (selectedStatus && selectedStatus !== 'all') params.set('status', selectedStatus);
      if (searchTerm) params.set('q', searchTerm);
      
      const response = await api.get(`/api/admin/bookings/export?${params}`, {
        headers: { 'Accept': 'text/csv' },
        responseType: 'blob'
      });
      
      const blob = response.data;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `howliday-bookings-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Bookings exported successfully.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to export bookings.",
        variant: "destructive",
      });
    }
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pt-32">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage bookings, availability, and facility settings
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.revenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Capacity Overview */}
      <div className="mb-8">
        <CapacityOverview />
      </div>

      <Tabs defaultValue="bookings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="dogs">Dogs</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters & Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Input
                  placeholder="Search by owner or dog name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-bookings"
                />

                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  data-testid="input-filter-date"
                />

                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger data-testid="select-filter-service">
                    <SelectValue placeholder="All services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    <SelectItem value="daycare">Daycare</SelectItem>
                    <SelectItem value="boarding">Boarding</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger data-testid="select-filter-status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={exportToCSV} variant="outline" data-testid="button-export-csv">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bookings Table */}
          <Card>
            <CardHeader>
              <CardTitle>Bookings ({filteredBookings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Dogs</TableHead>
                        <TableHead>Times</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map((booking) => {
                        const bookingDate = booking.serviceDate || booking.checkinDate || booking.trialDate || '';
                        const endDate = booking.checkoutDate;
                        
                        return (
                          <TableRow key={booking.id} data-testid={`booking-row-${booking.id}`}>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium">
                                  {formatDateUTC(bookingDate, 'MMM d, yyyy')}
                                </div>
                                {booking.serviceType === 'boarding' && endDate && (
                                  <div className="text-gray-500">to {formatDateUTC(endDate, 'MMM d')}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {booking.serviceType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium">{booking.ownerName || 'N/A'}</div>
                                <div className="text-gray-500">{booking.email || 'N/A'}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{booking.dogName || 'N/A'}</div>
                                {booking.breed && (
                                  <div className="text-gray-500 text-xs">{booking.breed}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {booking.dropoffTime && <div>Drop: {booking.dropoffTime}</div>}
                                {booking.pickupTime && <div>Pick: {booking.pickupTime}</div>}
                                {!booking.dropoffTime && !booking.pickupTime && <div>N/A</div>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Badge className={getBookingStatusColor(booking.status)}>
                                  {booking.status}
                                </Badge>
                                {booking.paymentStatus && (
                                  <div className="text-xs text-gray-500">
                                    {booking.paymentStatus}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              €{((booking.amount || 0) / 100).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {booking.status === 'pending' && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                    data-testid={`button-confirm-${booking.id}`}
                                  >
                                    Confirm
                                  </Button>
                                )}
                                {booking.status === 'confirmed' && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                    data-testid={`button-cancel-${booking.id}`}
                                  >
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  
                  {filteredBookings.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No bookings found matching your filters.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dogs" className="space-y-6">
          {/* Dogs Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Dog Search & Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Search by dog name, breed, or owner..."
                  value={dogSearchTerm}
                  onChange={(e) => setDogSearchTerm(e.target.value)}
                  data-testid="input-search-dogs"
                />

                <Select value={dogStatusFilter} onValueChange={setDogStatusFilter}>
                  <SelectTrigger data-testid="select-filter-dog-status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <div className="text-sm text-muted-foreground flex items-center">
                  Showing {paginatedDogs.length} of {filteredDogs.length} dogs
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dogs Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dog className="w-5 h-5" />
                Dogs Management ({filteredDogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dogsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dog</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Trial Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedDogs.map((dog) => (
                        <TableRow key={dog.id} data-testid={`dog-row-${dog.id}`}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              {dog.photoUrl ? (
                                <img 
                                  src={dog.photoUrl} 
                                  alt={dog.name}
                                  className="h-12 w-12 rounded-full object-cover border"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                  <Dog className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium">{dog.name}</div>
                                <div className="text-sm text-muted-foreground">{dog.breed}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm space-y-1">
                              <div>{dog.sex} • {calculateAge(dog.dob)}</div>
                              <div>{dog.weightKg}kg</div>
                              {dog.temperament && (
                                <div className="text-muted-foreground">🐕 {dog.temperament}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{dog.ownerName || 'Unknown'}</div>
                              <div className="text-muted-foreground">{dog.ownerEmail || 'Unknown'}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(dog.status)}>
                              {dog.status}
                            </Badge>
                            {dog.status === 'rejected' && dog.disallowedReason && (
                              <div className="text-xs text-red-600 mt-1">
                                {dog.disallowedReason}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {(dog as any).trialCompletedAt ? (
                                <div className="space-y-1">
                                  <Badge className="bg-green-100 text-green-800">Completed</Badge>
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date((dog as any).trialCompletedAt), 'MMM d, yyyy')}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <Badge className="bg-amber-100 text-amber-800">Required</Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => markTrialComplete(dog.id, dog.name)}
                                    className="text-green-600 hover:bg-green-50 mt-1 w-full"
                                    data-testid={`button-mark-trial-complete-${dog.id}`}
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Override - Mark Complete
                                  </Button>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {dog.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateDogStatus(dog.id, 'approved')}
                                    className="text-green-600 hover:bg-green-50"
                                    data-testid={`button-approve-${dog.id}`}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateDogStatus(dog.id, 'rejected', 'Needs additional information')}
                                    className="text-red-600 hover:bg-red-50"
                                    data-testid={`button-reject-${dog.id}`}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {dog.status === 'rejected' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateDogStatus(dog.id, 'approved')}
                                  className="text-green-600 hover:bg-green-50"
                                  data-testid={`button-approve-${dog.id}`}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => viewDogDetails(dog.id)}
                                data-testid={`button-view-${dog.id}`}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {filteredDogs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No dogs found matching your filters.
                    </div>
                  )}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      data-testid="button-next-page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {/* Revenue Reset */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="w-5 h-5" />
                Dashboard Revenue Reset
              </CardTitle>
              <CardDescription>
                Non-destructive revenue resets using offsets. Bookings and historical data remain intact.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={async () => {
                    if (!confirm('Reset all-time revenue to zero? This is non-destructive - it uses offsets, bookings remain intact.')) return;
                    try {
                      const res = await apiRequest('/api/admin/settings/revenue-reset', {
                        method: 'POST',
                        body: JSON.stringify({ scope: 'all' })
                      });
                      if (res.success) {
                        toast({
                          title: "Revenue Reset",
                          description: "All-time revenue has been reset to zero (via offset).",
                        });
                        queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
                      }
                    } catch (error: any) {
                      toast({
                        title: "Error",
                        description: error.message || "Failed to reset revenue.",
                        variant: "destructive",
                      });
                    }
                  }}
                  variant="destructive"
                  data-testid="button-reset-revenue-all"
                >
                  Reset All-Time Revenue to Zero
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Restricted Breeds Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dog className="w-5 h-5" />
                Restricted Breeds Management
              </CardTitle>
              <CardDescription>
                Manage the list of dog breeds that are not accepted. Public bookings will be blocked for these breeds.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter breed name (e.g., Pit Bull)"
                  value={newBreedInput}
                  onChange={(e) => setNewBreedInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRestrictedBreed();
                    }
                  }}
                  data-testid="input-new-breed"
                />
                <Button
                  onClick={handleAddRestrictedBreed}
                  data-testid="button-add-breed"
                >
                  Add
                </Button>
              </div>
              {restrictedBreeds.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {restrictedBreeds.map((breed, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="capitalize flex items-center gap-1"
                      data-testid={`badge-breed-${index}`}
                    >
                      {breed}
                      <button
                        onClick={() => handleRemoveRestrictedBreed(breed)}
                        className="ml-1 hover:text-destructive"
                        data-testid={`button-remove-breed-${index}`}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No restricted breeds configured.</p>
              )}
            </CardContent>
          </Card>

          {/* Capacity Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Daily Capacity Limits
              </CardTitle>
              <CardDescription>
                Set the maximum number of dogs that can be accommodated per day for each service type.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Daycare Capacity</label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={capacity.daycare}
                    onChange={(e) => setCapacity(prev => ({ ...prev, daycare: parseInt(e.target.value) || 0 }))}
                    data-testid="input-daycare-capacity"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Boarding Capacity</label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={capacity.boarding}
                    onChange={(e) => setCapacity(prev => ({ ...prev, boarding: parseInt(e.target.value) || 0 }))}
                    data-testid="input-boarding-capacity"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Trial Day Capacity</label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={capacity.trial}
                    onChange={(e) => setCapacity(prev => ({ ...prev, trial: parseInt(e.target.value) || 0 }))}
                    data-testid="input-trial-capacity"
                  />
                </div>
              </div>
              <Button 
                onClick={updateCapacity} 
                disabled={updateCapacityMutation.isPending}
                data-testid="button-update-capacity"
              >
                {updateCapacityMutation.isPending ? "Updating..." : "Update Capacity Settings"}
              </Button>
            </CardContent>
          </Card>

          {/* Advanced Capacity Management */}
          <CapacityManagement />

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your admin password for security
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Current Password</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    disabled={changePasswordMutation.isPending}
                    data-testid="input-current-password"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">New Password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 8 characters)"
                    disabled={changePasswordMutation.isPending}
                    data-testid="input-new-password"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Confirm New Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    disabled={changePasswordMutation.isPending}
                    data-testid="input-confirm-password"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={changePasswordMutation.isPending}
                  data-testid="button-change-password"
                >
                  {changePasswordMutation.isPending ? 'Changing Password...' : 'Change Password'}
                </Button>
              </form>
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="reminders" className="space-y-6">
          <ReminderSettings />
        </TabsContent>
      </Tabs>

      {/* Dog Details Modal */}
      <DogDetailsModal 
        dogDetailsOpen={dogDetailsOpen}
        setDogDetailsOpen={setDogDetailsOpen}
        selectedDog={selectedDog}
        updateDogStatus={updateDogStatus}
        getStatusColor={getStatusColor}
        markTrialComplete={markTrialComplete}
      />
    </div>
  );
}

interface ReminderSettings {
  daysBefore: number;
  enabled: boolean;
}

interface ReminderHistory {
  id: string;
  bookingId: string;
  sentAt: string;
  recipientEmail: string;
  status: string;
}

function ReminderSettings() {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = useQuery<ReminderSettings>({
    queryKey: ["/api/reminders/settings"],
  });

  const { data: history = [], isLoading: historyLoading, refetch: refetchHistory } = useQuery<ReminderHistory[]>({
    queryKey: ["/api/reminders/history"],
  });

  const handleUpdateSettings = async (daysBefore: number, enabled: boolean) => {
    try {
      await apiRequest('/api/reminders/settings', {
        method: 'PUT',
        body: JSON.stringify({ daysBefore, enabled })
      });
      
      toast({
        title: "Settings Updated",
        description: "Reminder settings have been updated successfully.",
      });
      refetchSettings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update reminder settings.",
        variant: "destructive",
      });
    }
  };

  const handleCheckReminders = async () => {
    setIsSending(true);
    try {
      const result = await apiRequest<{ success: boolean; message?: string; error?: string }>('/api/reminders/check', {
        method: 'POST',
        body: JSON.stringify({})
      });
      
      if (result.success) {
        toast({
          title: "Reminders Sent",
          description: result.message,
        });
        refetchHistory();
      } else {
        throw new Error(result.error || 'Failed to send reminders');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reminders.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Reminder Settings
          </CardTitle>
          <CardDescription>
            Configure automated booking reminders for customers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settingsLoading ? (
            <div className="text-center py-4">Loading settings...</div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium whitespace-nowrap">
                  Send reminders
                </label>
                <Input
                  type="number"
                  min="0"
                  max="7"
                  value={settings?.daysBefore || 1}
                  onChange={(e) => handleUpdateSettings(parseInt(e.target.value) || 1, settings?.enabled !== false)}
                  className="w-20"
                  data-testid="input-reminder-days"
                />
                <span className="text-sm text-muted-foreground">day(s) before booking</span>
              </div>

              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Enable reminders</label>
                <Button
                  variant={settings?.enabled !== false ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleUpdateSettings(settings?.daysBefore || 1, !(settings?.enabled !== false))}
                  data-testid="button-toggle-reminders"
                >
                  {settings?.enabled !== false ? "Enabled" : "Disabled"}
                </Button>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  onClick={handleCheckReminders} 
                  disabled={isSending || settings?.enabled === false}
                  data-testid="button-send-reminders"
                >
                  {isSending ? "Sending..." : "Send Reminders Now"}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Manually trigger reminder emails for all upcoming bookings.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reminder History</CardTitle>
          <CardDescription>
            Recent reminder emails sent to customers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="text-center py-4">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reminders have been sent yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Sent</TableHead>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.slice(0, 20).map((reminder: any) => (
                  <TableRow key={reminder.id}>
                    <TableCell>
                      {format(new Date(reminder.sentAt), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {reminder.bookingId.substring(0, 8)}
                    </TableCell>
                    <TableCell>{reminder.recipientEmail}</TableCell>
                    <TableCell>
                      <Badge variant={reminder.status === 'sent' ? 'default' : 'destructive'}>
                        {reminder.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function DogDetailsModal({ dogDetailsOpen, setDogDetailsOpen, selectedDog, updateDogStatus, getStatusColor, markTrialComplete }: any) {
  const dog = selectedDog?.dog;
  const health = selectedDog?.health;
  const vaccinations = selectedDog?.vaccinations || [];
  
  return (
    <Dialog open={dogDetailsOpen} onOpenChange={setDogDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedDog && dog && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {dog.name} - Dog Profile Review
                </DialogTitle>
                <DialogDescription>
                  Review complete application form and supporting documents
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Dog Photo */}
                {dog.photoUrl && (
                  <div className="flex justify-center">
                    <img 
                      src={dog.photoUrl} 
                      alt={dog.name}
                      className="w-48 h-48 object-cover rounded-lg border-4 border-gray-200"
                    />
                  </div>
                )}

                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Dog className="h-5 w-5" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{dog.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Breed</p>
                      <p className="font-medium">{dog.breed}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Sex</p>
                      <p className="font-medium">{dog.sex || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="font-medium">{dog.dob ? format(new Date(dog.dob), 'MMM d, yyyy') : 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Weight</p>
                      <p className="font-medium">{dog.weightKg ? `${dog.weightKg} kg` : 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Color</p>
                      <p className="font-medium">{dog.color || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Microchip</p>
                      <p className="font-medium">{dog.microchip || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Neutered/Spayed</p>
                      <p className="font-medium">{dog.neuteredSpayed ? 'Yes' : 'No'}</p>
                    </div>
                    {dog.temperament && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500">Temperament</p>
                        <p className="font-medium">{dog.temperament}</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">Status</p>
                      <Badge className={getStatusColor(dog.status)}>
                        {dog.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Owner Information */}
                {selectedDog.owner && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Owner Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="font-medium">{selectedDog.owner.name || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{selectedDog.owner.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{selectedDog.owner.phone || 'Not provided'}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Vaccination Records */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Vaccination Records</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {vaccinations && vaccinations.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Date Administered</TableHead>
                            <TableHead>Valid Until</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Proof</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vaccinations.map((vax: any) => (
                            <TableRow key={vax.id}>
                              <TableCell className="font-medium capitalize">{vax.type}</TableCell>
                              <TableCell>
                                {vax.dateAdministered ? format(new Date(vax.dateAdministered), 'MMM d, yyyy') : 'N/A'}
                              </TableCell>
                              <TableCell>
                                {vax.validUntil ? format(new Date(vax.validUntil), 'MMM d, yyyy') : 'N/A'}
                              </TableCell>
                              <TableCell>
                                <Badge className={vax.verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                  {vax.verified ? 'Verified' : 'Pending'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {vax.proofUrl ? (
                                  <a href={vax.proofUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    View Document
                                  </a>
                                ) : (
                                  <span className="text-gray-400">No document</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-gray-500">No vaccination records available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Health Profile */}
                {health && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Health & Emergency Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      {health.behaviourNotes && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500">Behaviour Notes</p>
                          <p className="font-medium">{health.behaviourNotes}</p>
                        </div>
                      )}
                      {health.vetName && (
                        <>
                          <div>
                            <p className="text-sm text-gray-500">Veterinarian</p>
                            <p className="font-medium">{health.vetName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Vet Phone</p>
                            <p className="font-medium">{health.vetPhone || 'Not provided'}</p>
                          </div>
                        </>
                      )}
                      {health.emergencyName && (
                        <>
                          <div>
                            <p className="text-sm text-gray-500">Emergency Contact</p>
                            <p className="font-medium">{health.emergencyName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Emergency Phone</p>
                            <p className="font-medium">{health.emergencyPhone || 'Not provided'}</p>
                          </div>
                        </>
                      )}
                      {health.conditions && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500">Medical Conditions</p>
                          <p className="font-medium">{health.conditions}</p>
                        </div>
                      )}
                      {health.medications && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500">Medications</p>
                          <p className="font-medium">{health.medications}</p>
                        </div>
                      )}
                      {health.allergies && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500">Allergies</p>
                          <p className="font-medium">{health.allergies}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Trial Day Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Trial Day Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(dog as any).trialCompletedAt ? (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800">Completed</Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date((dog as any).trialCompletedAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-100 text-amber-800">Trial Required</Badge>
                          <span className="text-sm text-muted-foreground">
                            This dog has not completed a trial day yet
                          </span>
                        </div>
                        <Button
                          onClick={() => {
                            markTrialComplete(dog.id, dog.name);
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Override - Mark Trial Complete
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Use this if the dog has already completed a trial day prior to the website being set up.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t">
                  {dog.status === 'pending' && (
                    <>
                      <Button
                        onClick={() => {
                          updateDogStatus(dog.id, 'approved');
                          setDogDetailsOpen(false);
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve Dog
                      </Button>
                      <Button
                        onClick={() => {
                          updateDogStatus(dog.id, 'rejected', 'Requires additional documentation');
                          setDogDetailsOpen(false);
                        }}
                        variant="destructive"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </>
                  )}
                  {dog.status === 'rejected' && (
                    <Button
                      onClick={() => {
                        updateDogStatus(dog.id, 'approved');
                        setDogDetailsOpen(false);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Dog
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setDogDetailsOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
  );
}