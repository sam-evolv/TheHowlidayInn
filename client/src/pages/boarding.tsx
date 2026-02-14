import { useState, useEffect } from "react";
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
import { ArrowLeft, Bed, AlertTriangle, CreditCard, Gift } from "lucide-react";
import { insertBookingSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@/lib/api";
import { isBreedRestricted, checkCustomerStatus } from "@/lib/firebase";
import { AGE_OPTIONS, SERVICE_TYPES } from "@/lib/constants";
import { getDailyWindows, isClosed, getClosedMessage } from "@shared/hoursPolicy";
import { PRICES, isPmLabel } from "@shared/pricing";
import SuccessModal from "@/components/ui/success-modal";
import { useToast } from "@/hooks/use-toast";
import DogSelector from "@/components/booking/DogSelector";
import { useAuth } from "@/components/auth/AuthProvider";
import { useReservationFlow } from "@/hooks/useReservationFlow";
import TrialGateCard from "@/components/booking/TrialGateCard";
import TrialRequiredDialog from "@/components/booking/TrialRequiredDialog";
import { TrialCompletionGate } from "@/components/booking/TrialCompletionGate";
import { isBookingPauseActive } from "@/config/featureFlags";

const boardingSchema = insertBookingSchema.extend({
  serviceType: z.enum(['boarding:small', 'boarding:large'], { required_error: "Service type is required" }),
  kennelSize: z.enum(['small', 'large'], { required_error: "Kennel size is required" }),
  checkinDate: z.string().min(1, "Check-in date is required"),
  checkoutDate: z.string().min(1, "Check-out date is required"),
  checkinTimeSlot: z.string().min(1, "Check-in time slot is required"),
  checkoutTimeSlot: z.string().min(1, "Check-out time slot is required"),
  pickupWindow: z.enum(['AM', 'PM']).optional(), // Optional - v2 derives from checkoutTimeSlot
}).omit({
  serviceDate: true,
  dropoffTime: true,
  pickupTime: true,
  checkinTime: true,
  checkoutTime: true,
  trialDate: true,
  alternativeDate: true,
  emergencyName: true,
  emergencyPhone: true,
});

type BoardingFormData = z.infer<typeof boardingSchema>;

export default function Boarding() {
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
  const [pendingFormData, setPendingFormData] = useState<BoardingFormData | null>(null);
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

  // Initialize form BEFORE any early returns
  const form = useForm<BoardingFormData>({
    resolver: zodResolver(boardingSchema),
    defaultValues: {
      serviceType: 'boarding:small', // Default to small kennel canonical key
      kennelSize: 'small',
      dogId: "",
      dogName: "",
      breed: "",
      age: "",
      weight: undefined,
      ownerName: "",
      email: "",
      phone: "",
      checkinDate: "",
      checkoutDate: "",
      checkinTimeSlot: "",
      checkoutTimeSlot: "",
      notes: "",
      trialCompleted: false,
      status: "pending",
    },
  });

  // Track selected check-in date, checkout date, and kennel size (MUST be before early returns)
  const checkinDate = form.watch('checkinDate');
  const checkoutDate = form.watch('checkoutDate');
  const checkinTimeSlot = form.watch('checkinTimeSlot');
  const checkoutTimeSlot = form.watch('checkoutTimeSlot');
  const kennelSize = form.watch('kennelSize') || 'small';
  
  // Determine canonical service type based on kennel size (with colon)
  const serviceType = kennelSize === 'large' ? 'boarding:large' : 'boarding:small';
  
  // Sync serviceType in form with kennelSize selection
  useEffect(() => {
    const canonicalServiceType = kennelSize === 'large' ? 'boarding:large' : 'boarding:small';
    form.setValue('serviceType', canonicalServiceType);
  }, [kennelSize, form]);
  
  // Fetch availability for the check-in date (internal check only, no public display)
  const { data: availabilityData } = useQuery({
    queryKey: ['/api/availability', serviceType, checkinDate],
    enabled: !!checkinDate && checkinDate.length > 0,
    queryFn: async () => {
      const response = await api.get(`/availability?date=${checkinDate}&service=${encodeURIComponent(serviceType)}`);
      return response.data;
    },
    staleTime: 10000, // Cache for 10 seconds
  });

  // Helper function to convert time slot to ISO datetime
  const timeSlotToISO = (date: string, timeSlot: string): string => {
    // timeSlot format: "08:00 - 10:00" or "08:00-10:00"
    const startTime = timeSlot.split('-')[0].trim();
    return `${date}T${startTime}:00.000Z`;
  };

  // Mutations - must be declared before any early returns
  const createBookingMutation = useMutation({
    mutationFn: async (data: BoardingFormData) => {
      console.log("[boarding:mutation] calculating pricing with calendar_v2");
      
      // Server will calculate authoritative price using calendar_v2 model
      // Client just calculates for display purposes
      const bookingData = {
        ...data,
        currency: 'eur',
        paymentStatus: 'unpaid'
      };
      
      console.log("[boarding:mutation] POST /api/bookings - server will calculate price");
      
      const response = await apiRequest("/api/bookings", {
        method: "POST",
        body: JSON.stringify(bookingData)
      });
      
      console.log("[boarding:mutation] booking created successfully");
      return response;
    },
    onSuccess: async (booking) => {
      console.log("[boarding:mutation] success, bookingId received");
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
      console.error("[boarding:mutation] error:", error.message || "Unknown error");
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
  const processBooking = async (data: BoardingFormData) => {
    try {
      setIsSubmitting(true);

      const isRestricted = await isBreedRestricted(data.breed);
      if (isRestricted) {
        setShowBreedRestriction(true);
        setIsSubmitting(false);
        return;
      }

      // Check if selected dog needs trial day (server-side check)
      if (selectedDogId && dogTrialStatus && !dogTrialStatus.eligible) {
        setShowTrialRequiredDialog(true);
        setIsSubmitting(false);
        return;
      }

      // Reserve capacity before creating booking - use canonical service key
      const canonicalServiceType = data.kennelSize === 'large' ? "boarding:large" : "boarding:small";
      const resId = await reservation.reserve({
        serviceType: canonicalServiceType,
        date: data.checkinDate,
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
        title: error.message?.includes("fully booked") ? "Booking Unavailable" : "Couldn't continue to payment",
        description: error.message || "Unable to reserve your spot. Please try another date.",
        variant: "destructive"
      });
    }
  };

  // Form submit handler - checks for booking pause first
  const onSubmit = async (data: BoardingFormData) => {
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

  const handleSubmitWithDebug = form.handleSubmit(
    onSubmit,
    (errors) => {
      console.error("[boarding] validation failed:", Object.keys(errors));
      const firstError = Object.values(errors)[0];
      toast({
        title: "Form Validation Error",
        description: firstError?.message || "Please check all required fields",
        variant: "destructive"
      });
    }
  );

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];

  // Calculate price breakdown for display
  const calculatePriceBreakdown = () => {
    if (checkinDate && checkoutDate && checkinTimeSlot && checkoutTimeSlot) {
      try {
        // Calendar-based v2 pricing calculation for display
        const dogCount = kennelSize === 'large' ? 2 : 1;
        const perNight = dogCount >= 2 ? PRICES.boardingNightEUR_2dogs : PRICES.boardingNightEUR_1dog;
        
        // Calculate calendar nights
        const checkinDateObj = new Date(checkinDate);
        const checkoutDateObj = new Date(checkoutDate);
        const diffDays = Math.round((checkoutDateObj.getTime() - checkinDateObj.getTime()) / 86400000);
        const nights = Math.max(1, diffDays);
        
        // Check if PM checkout
        const pmSurcharge = isPmLabel(checkoutTimeSlot) ? PRICES.boardingLatePickupEUR : 0;
        const total = nights * perNight + pmSurcharge;
        
        return {
          total,
          nights,
          perNight,
          pmSurcharge,
        };
      } catch (error) {
        console.error("Price calculation error:", error);
        return null;
      }
    }
    return null;
  };
  
  const priceBreakdown = calculatePriceBreakdown();

  return (
    <div className="min-h-screen bg-gray-50 pt-24 sm:pt-32 pb-8 with-sticky-offset">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <Link href="/">
            <Button variant="ghost" className="inline-flex items-center text-primary hover:text-purple-700 mb-3 sm:mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 page-title">
            Book Boarding Service
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Multi-day stays with comfortable accommodations
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
              <form onSubmit={handleSubmitWithDebug} className="space-y-4 sm:space-y-6">
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
                <div className="border-b border-gray-200 pb-4 sm:pb-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Boarding Details</h3>
                  <div className="mb-4">
                    <FormField
                      control={form.control}
                      name="kennelSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kennel Size *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-kennel-size">
                                <SelectValue placeholder="Select kennel size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="small">Small</SelectItem>
                              <SelectItem value="large">Large</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FormField
                      control={form.control}
                      name="checkinDate"
                      render={({ field, fieldState }) => (
                        <FormItem data-invalid={!!fieldState.error}>
                          <FormLabel>Check-in Date *</FormLabel>
                          <FormControl>
                            <Input type="date" min={today} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="checkoutDate"
                      render={({ field, fieldState }) => (
                        <FormItem data-invalid={!!fieldState.error}>
                          <FormLabel>Check-out Date *</FormLabel>
                          <FormControl>
                            <Input type="date" min={today} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="checkinTimeSlot"
                      render={({ field, fieldState }) => {
                        const selectedDateObj = checkinDate ? new Date(checkinDate) : null;
                        const windows = selectedDateObj ? getDailyWindows(selectedDateObj) : [];
                        const isClosedDay = selectedDateObj ? isClosed(selectedDateObj) : false;

                        return (
                          <FormItem data-invalid={!!fieldState.error}>
                            <FormLabel>Check-in Time *</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                              disabled={!checkinDate}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={
                                    !checkinDate 
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
                              Check-in occurs during listed windows.
                            </p>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={form.control}
                      name="checkoutTimeSlot"
                      render={({ field, fieldState }) => {
                        const selectedDateObj = checkoutDate ? new Date(checkoutDate) : null;
                        const windows = selectedDateObj ? getDailyWindows(selectedDateObj) : [];
                        const isClosedDay = selectedDateObj ? isClosed(selectedDateObj) : false;

                        return (
                          <FormItem data-invalid={!!fieldState.error}>
                            <FormLabel>Check-out Time *</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                              disabled={!checkoutDate}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={
                                    !checkoutDate 
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
                              Check-out occurs during listed windows. Selecting 4–6pm check-out adds a €10 surcharge.
                            </p>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                </div>

                {/* Special Requirements */}
                <div className="border-b border-gray-200 pb-4 sm:pb-6">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Requirements or Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={3} 
                            placeholder="Any special care instructions, medical conditions, feeding schedule, or other requirements..." 
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

                {/* Pricing Display */}
                <div className="pt-4 sm:pt-6 border-t border-gray-200">
                  <div className="bg-blue-50 p-3 sm:p-4 rounded-lg mb-4">
                    <h4 className="font-semibold text-sm sm:text-base text-blue-900 mb-2">Pricing Breakdown</h4>
                    {priceBreakdown ? (
                      <div className="space-y-2 text-sm sm:text-base">
                        <div className="flex justify-between text-blue-700">
                          <span>{priceBreakdown.nights} night{priceBreakdown.nights !== 1 ? 's' : ''} × €{priceBreakdown.perNight} ({kennelSize === 'large' ? '2 dogs' : '1 dog'})</span>
                          <span>€{priceBreakdown.nights * priceBreakdown.perNight}</span>
                        </div>
                        {priceBreakdown.pmSurcharge > 0 && (
                          <div className="flex justify-between text-blue-700">
                            <span>Late pickup (PM) surcharge</span>
                            <span>+€{priceBreakdown.pmSurcharge}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold text-blue-900 pt-2 border-t border-blue-200">
                          <span>Total</span>
                          <span>€{priceBreakdown.total}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm sm:text-base text-blue-700">
                        {kennelSize === 'large' ? '€40/night (2 dogs)' : '€25/night (1 dog)'} • Selecting 4–6pm check-out adds €10
                      </p>
                    )}
                  </div>
                </div>

                {/* Submit Button 
                    QA STEPS:
                    1. Open DevTools → Console & Network tabs
                    2. Click "Continue to Payment" button
                    3. Expected flow:
                       - Console shows: [boarding] form submitted with values
                       - Console shows: [boarding:mutation] POST /api/bookings with pricing details
                       - Network tab: POST /api/bookings → 200 with { id: "booking-id" }
                       - Console shows: [boarding:mutation] success handler, bookingId: "..."
                       - UI changes to payment screen with StripeWrapper component
                    4. If validation fails:
                       - Console shows: [boarding] validation errors detected
                       - Page auto-scrolls to first invalid field
                       - Error messages appear under invalid fields
                    5. If booking creation fails:
                       - Console shows: [boarding:mutation] error handler
                       - Toast appears with error title and description
                */}
                <div className="pt-4 sm:pt-6">
                  <Button 
                    type="submit" 
                    className="w-full py-3 sm:py-4 text-base sm:text-lg font-semibold btn-primary min-h-[48px]"
                    disabled={createBookingMutation.isPending || isSubmitting}
                    data-testid="button-create-booking"
                  >
                    <Bed className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    {createBookingMutation.isPending || isSubmitting ? "Creating..." : "Continue to Payment"}
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
          service="boarding"
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
