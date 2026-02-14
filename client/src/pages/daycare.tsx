import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CalendarCheck, AlertTriangle, CreditCard, Gift } from "lucide-react";
import { insertBookingSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@/lib/api";
import { isBreedRestricted, checkCustomerStatus } from "@/lib/firebase";
import { AGE_OPTIONS, SERVICE_TYPES } from "@/lib/constants";
import { getDailyWindows, isClosed, getClosedMessage } from "@shared/hoursPolicy";
import { PRICES } from "@shared/pricing";
import SuccessModal from "@/components/ui/success-modal";
import { useToast } from "@/hooks/use-toast";
import DogSelector from "@/components/booking/DogSelector";
import { useAuth } from "@/components/auth/AuthProvider";
import { useReservationFlow } from "@/hooks/useReservationFlow";
import { AvailabilityIndicator } from "@/components/booking/AvailabilityIndicator";
import TrialGateCard from "@/components/booking/TrialGateCard";
import TrialRequiredDialog from "@/components/booking/TrialRequiredDialog";
import { TrialCompletionGate } from "@/components/booking/TrialCompletionGate";
import { isBookingPauseActive } from "@/config/featureFlags";

const daycareSchema = insertBookingSchema.extend({
  serviceType: z.literal(SERVICE_TYPES.DAYCARE),
  serviceDate: z.string().min(1, "Service date is required"),
  timeSlot: z.string().min(1, "Time slot is required"),
}).omit({
  checkinDate: true,
  checkoutDate: true,
  checkinTime: true,
  checkoutTime: true,
  trialDate: true,
  alternativeDate: true,
  emergencyName: true,
  emergencyPhone: true,
  dropoffTime: true,
  pickupTime: true,
});

type DaycareFormData = z.infer<typeof daycareSchema>;

export default function Daycare() {
  const [showBreedRestriction, setShowBreedRestriction] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string>('');
  const [reservationId, setReservationId] = useState<string>('');
  const [selectedDogId, setSelectedDogId] = useState<string>('');
  const [selectedDog, setSelectedDog] = useState<any>(null);
  const [showTrialGateModal, setShowTrialGateModal] = useState(false);
  const [showTrialRequiredDialog, setShowTrialRequiredDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<DaycareFormData | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const reservation = useReservationFlow();

  // Fetch user profile for owner name
  const { data: userProfile } = useQuery<{
    id: string;
    email: string;
    name: string;
    role: string;
    completedTrial: boolean;
    createdAt: string;
  }>({
    queryKey: ['/api/me'],
    enabled: !!user
  });

  // Check trial status for the selected dog
  const { data: dogTrialStatus, isLoading: isCheckingDogTrial } = useQuery<{
    eligible: boolean;
    reason: string | null;
    eligibleAt: string | null;
  }>({
    queryKey: ['/api/dogs', selectedDogId, 'trial-status'],
    enabled: !!selectedDogId,
  });

  // Initialize form hook at the top (before any conditional returns)
  const form = useForm<DaycareFormData>({
    resolver: zodResolver(daycareSchema),
    defaultValues: {
      serviceType: SERVICE_TYPES.DAYCARE,
      dogId: "",
      dogName: "",
      breed: "",
      age: "",
      weight: undefined,
      ownerName: "",
      email: "",
      phone: "",
      serviceDate: "",
      timeSlot: "",
      notes: "",
      trialCompleted: false,
      status: "pending",
    },
  });

  // Initialize mutation hook (must be before conditional returns)
  const createBookingMutation = useMutation({
    mutationFn: async (data: DaycareFormData) => {
      setIsSubmitting(true);
      // Server will calculate authoritative price
      const bookingData = {
        ...data,
        currency: 'eur',
        paymentStatus: 'unpaid'
      };
      return apiRequest("/api/bookings", {
        method: "POST",
        body: JSON.stringify(bookingData)
      });
    },
    onSuccess: async (booking) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setBookingId(booking.id);
      
      // Redirect to Stripe Checkout instead of showing payment form
      try {
        const { data } = await api.post('/api/payments/checkout', {
          bookingId: booking.id,
          email: form.getValues('email')
        });
        
        if (!data?.url) {
          throw new Error('No checkout URL returned');
        }
        
        // Hard redirect to Stripe
        window.location.href = data.url;
      } catch (error: any) {
        console.error('CHECKOUT ERROR:', error);
        setIsSubmitting(false);
        // Release reservation if checkout failed
        if (reservationId) {
          reservation.release(reservationId);
          setReservationId('');
        }
        toast({
          title: "Payment Setup Failed",
          description: "Could not start payment. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      // Release reservation if booking creation failed
      if (reservationId) {
        reservation.release(reservationId);
        setReservationId('');
      }
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to submit booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Track selected date for availability checking (MUST be before conditional returns)
  const selectedDate = form.watch('serviceDate');
  
  // Fetch availability for the selected date (MUST be before conditional returns)
  const { data: availabilityData } = useQuery({
    queryKey: ['/api/availability', 'daycare', selectedDate],
    enabled: !!selectedDate && selectedDate.length > 0,
    queryFn: async () => {
      const response = await api.get(`/api/availability?date=${selectedDate}&service=Daycare`);
      const result = response.data;
      // Map API response to expected format
      if (result.success && result.data) {
        return {
          available: result.data.remaining,
          capacity: result.data.capacity,
          booked: result.data.confirmed,
          reserved: result.data.reserved,
        };
      }
      throw new Error('Invalid response format');
    },
    staleTime: 10000, // Cache for 10 seconds
  });


  // Handle dog selection
  const handleDogSelect = (dog: any, ownerInfo: any) => {
    setSelectedDogId(dog?.id || '');
    setSelectedDog(dog || null);
    
    if (dog) {
      // Calculate age from DOB
      const calculateAge = (dob: string) => {
        if (!dob) return "";
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

      // Pre-fill form with selected dog and owner info
      form.setValue('dogId', dog.id);
      form.setValue('dogName', dog.name);
      form.setValue('breed', dog.breed);
      form.setValue('age', calculateAge(dog.dob));
      form.setValue('weight', dog.weightKg || undefined);
      form.setValue('ownerName', ownerInfo.name);
      form.setValue('email', ownerInfo.email);
      form.setValue('phone', ownerInfo.phone);
    }
  };

  // Actual booking submission (called after gate passes or if pause not active)
  const processBooking = async (data: DaycareFormData) => {
    // Check for breed restrictions
    const isRestricted = await isBreedRestricted(data.breed);
    if (isRestricted) {
      setShowBreedRestriction(true);
      return;
    }

    // Check if selected dog needs trial day (server-side check)
    if (selectedDogId && dogTrialStatus && !dogTrialStatus.eligible) {
      setShowTrialRequiredDialog(true);
      return;
    }

    // Reserve capacity before creating booking
    try {
      setIsSubmitting(true);
      const resId = await reservation.reserve({
        serviceType: "daycare",
        date: data.serviceDate,
        userEmail: data.email,
        dogId: data.dogId,
      });
      setReservationId(resId);
      
      // Add trialCompleted flag if booking pause is active
      // This tells the server that the user confirmed trial completion via the gate
      const bookingData = isBookingPauseActive() 
        ? { ...data, trialCompleted: true }
        : data;
      
      createBookingMutation.mutate(bookingData);
    } catch (error: any) {
      setIsSubmitting(false);
      toast({
        title: "Booking Unavailable",
        description: error.message || "Unable to reserve your spot. Please try another date.",
        variant: "destructive",
      });
    }
  };

  // Form submit handler - checks for booking pause first
  const onSubmit = async (data: DaycareFormData) => {
    // If booking pause is active, show gate modal first
    if (isBookingPauseActive()) {
      setPendingFormData(data);
      setShowTrialGateModal(true);
      return;
    }

    // Otherwise proceed directly
    await processBooking(data);
  };

  // Called when user confirms trial completion in gate modal
  const handleTrialGatePass = () => {
    if (pendingFormData) {
      processBooking(pendingFormData);
      setPendingFormData(null);
    }
  };

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen pt-24 sm:pt-32 pb-8 with-sticky-offset" style={{ background: 'var(--hi-cream)' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 page-title" style={{ color: 'var(--hi-brown)' }}>
            Book Daycare Service
          </h2>
          <p className="text-sm sm:text-base" style={{ color: 'var(--hi-brown-light)' }}>
            Same-day care with flexible drop-off and pickup times
          </p>
        </div>

        {/* Booking Form or Trial Gate Card */}
        {selectedDogId && isCheckingDogTrial ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Checking eligibility...</p>
            </CardContent>
          </Card>
        ) : selectedDogId && dogTrialStatus && !dogTrialStatus.eligible ? (
          <TrialGateCard
            dogName={selectedDog?.name || 'Your dog'}
            reason={dogTrialStatus.reason === 'TRIAL_REQUIRED' ? 'trial_required' : 'trial_cooldown'}
            eligibleAt={dogTrialStatus.eligibleAt ? new Date(dogTrialStatus.eligibleAt) : undefined}
            className="mb-6"
          />
        ) : (
          <Card>
            <CardContent className="p-4 sm:p-6 md:p-8">
              <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                {/* Dog & Owner Selection */}
                <div className="border-b border-gray-200 pb-6">
                  <DogSelector
                    selectedDogId={selectedDogId}
                    onDogSelect={handleDogSelect}
                    disabled={isSubmitting}
                    className="mb-6"
                  />
                </div>

                {/* Contact Information */}
                <div className="border-b border-gray-200 pb-4 sm:pb-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Contact & Dog Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input 
                              type="tel" 
                              placeholder="087 123 4567" 
                              {...field}
                              value={field.value || ""}
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dog's Age *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., 2 years, 6 months" 
                              {...field}
                              value={field.value || ""}
                              data-testid="input-age"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Service Details */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Service Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="sm:col-span-2">
                      <FormField
                        control={form.control}
                        name="serviceDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Date *</FormLabel>
                            <FormControl>
                              <Input type="date" min={today} {...field} data-testid="input-service-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Show availability indicator when date is selected */}
                      {selectedDate && availabilityData && (
                        <AvailabilityIndicator
                          available={availabilityData.available}
                          capacity={availabilityData.capacity}
                          serviceType="daycare"
                          className="mt-3"
                        />
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <FormField
                        control={form.control}
                        name="timeSlot"
                        render={({ field }) => {
                          const selectedDateObj = selectedDate ? new Date(selectedDate) : null;
                          const windows = selectedDateObj ? getDailyWindows(selectedDateObj) : [];
                          const isClosedDay = selectedDateObj ? isClosed(selectedDateObj) : false;

                          return (
                            <FormItem>
                              <FormLabel>Time Slot *</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value}
                                disabled={!selectedDate}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-time-slot">
                                    <SelectValue placeholder={
                                      !selectedDate 
                                        ? "Select a date first" 
                                        : "Select time slot"
                                    } />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {windows.map((window) => (
                                    <SelectItem key={window.start} value={window.label || `${window.start}-${window.end}`}>
                                      {window.label || `${window.start} - ${window.end}`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-sm text-muted-foreground mt-1">
                                Drop-off and collection are only available during listed windows.
                              </p>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Special Requirements */}
                <div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Requirements or Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={3} 
                            placeholder="Any special care instructions, medical conditions, or dietary requirements..." 
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-4 sm:pt-6">
                  <div className="bg-blue-50 p-3 sm:p-4 rounded-lg mb-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm sm:text-base">Total Cost:</span>
                      <span className="text-xl sm:text-2xl font-bold text-blue-600">€{PRICES.daycareFlatEUR}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">Payment will be processed securely via Stripe</p>
                  </div>
                  
                  {Object.keys(form.formState.errors).length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-red-800 mb-2">Please complete the following:</h4>
                      <ul className="list-disc list-inside text-red-700 space-y-1">
                        {Object.entries(form.formState.errors).map(([field, error]: [string, any]) => (
                          <li key={field}>
                            <span className="font-medium capitalize">{field}:</span> {error.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full py-3 sm:py-4 text-base sm:text-lg font-semibold btn-primary min-h-[48px]"
                    disabled={createBookingMutation.isPending}
                    data-testid="button-submit-booking"
                  >
                    <CalendarCheck className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    {createBookingMutation.isPending ? "Creating..." : "Continue to Payment"}
                  </Button>
                </div>
              </form>
            </Form>
            </CardContent>
          </Card>
        )}

        {/* Breed Restriction Notice */}
        {showBreedRestriction && (
          <Card className="mt-6 border-red-200">
            <CardContent className="p-6 bg-red-50">
              <div className="flex items-start">
                <AlertTriangle className="text-red-500 mt-1 mr-3 h-5 w-5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-red-800 mb-2">Breed Restriction Notice</h4>
                  <p className="text-red-700 mb-4">
                    We apologise, but due to insurance restrictions, we are currently unable to accommodate this breed. 
                    We recommend contacting specialised facilities that cater to this breed's specific needs.
                  </p>
                  <Link href="/">
                    <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                      <ArrowLeft className="mr-1 h-4 w-4" />
                      Return to Home
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Modal */}
        <SuccessModal
          open={showSuccessModal}
          onOpenChange={setShowSuccessModal}
          title="Booking Confirmed!"
          message={successMessage}
        />

        {/* Trial Completion Gate Modal (shown during booking pause) */}
        <TrialCompletionGate
          isOpen={showTrialGateModal}
          onClose={() => setShowTrialGateModal(false)}
          onPass={handleTrialGatePass}
          service="daycare"
        />

        {/* Trial Required Dialog (shown when dog needs trial day) */}
        <TrialRequiredDialog
          open={showTrialRequiredDialog}
          onOpenChange={setShowTrialRequiredDialog}
          dogName={selectedDog?.name || 'Your dog'}
          reason={dogTrialStatus?.reason === 'TRIAL_COOLDOWN' ? 'trial_cooldown' : 'trial_required'}
          eligibleAt={dogTrialStatus?.eligibleAt}
        />
      </div>
    </div>
  );
}
