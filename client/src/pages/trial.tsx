import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, CalendarPlus, Gift, PawPrint, Clock, Heart, ClipboardCheck, Upload, Euro, Info, Lock } from "lucide-react";
import { insertBookingSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@/lib/api";
import { AGE_OPTIONS, SERVICE_TYPES } from "@/lib/constants";
import { getDailyWindows, isClosed, getClosedMessage, isWeekend } from "@shared/hoursPolicy";
import { PRICES } from "@shared/pricing";
import SuccessModal from "@/components/ui/success-modal";
import { useToast } from "@/hooks/use-toast";
import DogSelector from "@/components/booking/DogSelector";
import { useAuth } from "@/components/auth/AuthProvider";
import { StripeWrapper } from "@/components/payment/StripeWrapper";
import { useReservationFlow } from "@/hooks/useReservationFlow";
import { AvailabilityIndicator } from "@/components/booking/AvailabilityIndicator";
import { BOOKING_PAUSE, isBookingPauseActive } from "@/config/featureFlags";

const trialSchema = insertBookingSchema.extend({
  serviceType: z.literal(SERVICE_TYPES.TRIAL),
  trialDate: z.string().min(1, "Preferred trial date is required"),
  timeSlot: z.string().min(1, "Time slot is required"),
  vaccinationProof: z.string().min(1, "Vaccination proof upload is required"),
  customerId: z.string().optional(),
}).omit({
  serviceDate: true,
  checkinDate: true,
  checkoutDate: true,
  dropoffTime: true,
  pickupTime: true,
  checkinTime: true,
  checkoutTime: true,
  emergencyName: true,
  emergencyPhone: true,
  vaccinationDate: true,
  vaccinationType: true,
});

type TrialFormData = z.infer<typeof trialSchema>;

export default function Trial() {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState<string>('');
  const [selectedDogId, setSelectedDogId] = useState<string>('');
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const reservation = useReservationFlow();

  const form = useForm<TrialFormData>({
    resolver: zodResolver(trialSchema),
    defaultValues: {
      serviceType: SERVICE_TYPES.TRIAL,
      dogId: "",
      dogName: "",
      breed: "",
      age: "",
      weight: undefined,
      ownerName: "",
      email: "",
      phone: "",
      trialDate: "",
      timeSlot: "",
      alternativeDate: "",
      notes: "",
      vaccinationProof: "",
      trialCompleted: false,
      status: "pending",
    },
  });

  // Handle dog selection
  const handleDogSelect = (dog: any, ownerInfo: any) => {
    setSelectedDogId(dog?.id || '');
    
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

  const createBookingMutation = useMutation({
    mutationFn: async (data: TrialFormData) => {
      // Server will calculate authoritative price
      const bookingData = {
        ...data,
        amount: PRICES.trialFlatEUR * 100, // Trial still uses client-side price for old StripeWrapper flow
        currency: 'eur',
        paymentStatus: 'unpaid'
      };
      return apiRequest("/api/bookings", {
        method: "POST",
        body: JSON.stringify(bookingData)
      });
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setBookingId(booking.id);
      setShowPayment(true);
      // Payment required before reset
    },
    onError: (error: any) => {
      setShowPayment(false);
      // Release reservation if booking creation failed
      if (reservationId) {
        reservation.release(reservationId);
        setReservationId('');
      }
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to schedule trial day. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to mark user's trial as completed
  const completeTrialMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest("/api/me/complete-trial", {
        method: "POST",
        body: JSON.stringify({ bookingId })
      });
    },
    onSuccess: () => {
      // Invalidate trial status cache to update UI
      queryClient.invalidateQueries({ queryKey: ['/api/me/trial-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
    },
    onError: (error: any) => {
      console.error("Failed to mark trial as completed:", error);
      // Don't show error to user as payment was successful
    },
  });

  // Track selected trial date for availability checking
  const trialDate = form.watch('trialDate');
  
  // Fetch availability for the trial date
  const { data: availabilityData } = useQuery({
    queryKey: ['/api/availability', 'trial', trialDate],
    enabled: !!trialDate && trialDate.length > 0,
    queryFn: async () => {
      const response = await api.get(`/api/availability?date=${trialDate}&serviceType=trial`);
      return response.data;
    },
    staleTime: 10000, // Cache for 10 seconds
  });

  const onSubmit = async (data: TrialFormData) => {
    try {
      // Reserve capacity before creating booking
      const resId = await reservation.reserve({
        serviceType: "trial",
        date: data.trialDate,
        userEmail: data.email,
        dogId: data.dogId,
      });
      setReservationId(resId);
      createBookingMutation.mutate(data);
    } catch (error: any) {
      toast({
        title: "Booking Unavailable",
        description: error.message || "Unable to reserve your trial day. Please try another date.",
        variant: "destructive",
      });
    }
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    
    // Mark trial as completed for this user with verified booking
    if (bookingId) {
      completeTrialMutation.mutate(bookingId);
    }
    
    setSuccessMessage("Payment successful! Your €20 trial day has been confirmed. You can now book daycare and boarding services. We'll contact you shortly with further details.");
    setShowSuccessModal(true);
    form.reset();
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
  };

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];

  // Check if booking pause is active
  const isPauseActive = isBookingPauseActive();

  return (
    <div className="min-h-screen pt-24 sm:pt-32 pb-8 with-sticky-offset" style={{ background: 'var(--hi-cream)' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <Link href="/">
            <Button variant="ghost" className="inline-flex items-center mb-3 sm:mb-4" style={{ color: 'var(--hi-gold)' }}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 page-title" style={{ color: 'var(--hi-brown)' }}>Trial Day Information</h2>
          <p className="text-sm sm:text-base" style={{ color: 'var(--hi-brown-light)' }}>Required assessment day for all new customers - €20</p>
        </div>

        {/* Show locked state if pause is active */}
        {isPauseActive ? (
          <>
            {/* Trial Day Explanation (read-only) */}
            <Card className="mb-6 sm:mb-8" style={{ background: 'var(--hi-cream)', borderColor: 'var(--hi-border)' }}>
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="text-center mb-4 sm:mb-6">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--hi-beige)' }}>
                    <Gift className="text-3xl h-12 w-12" style={{ color: 'var(--hi-gold)' }} />
                  </div>
                  <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--hi-brown)' }}>Trial Day - €20</h3>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center mr-4 flex-shrink-0 mt-1" style={{ background: 'var(--hi-beige)' }}>
                      <PawPrint className="text-sm h-4 w-4" style={{ color: 'var(--hi-gold)' }} />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2" style={{ color: 'var(--hi-brown)' }}>What is a Trial Day?</h4>
                      <p style={{ color: 'var(--hi-brown-light)' }}>A mandatory assessment day for all new customers. Our staff evaluates your dog's temperament, social behavior, and special needs to ensure the best possible care. This €20 investment ensures your dog's safety and comfort.</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center mr-4 flex-shrink-0 mt-1" style={{ background: 'var(--hi-beige)' }}>
                      <Clock className="text-sm h-4 w-4" style={{ color: 'var(--hi-gold)' }} />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2" style={{ color: 'var(--hi-brown)' }}>Duration & Schedule</h4>
                      <p style={{ color: 'var(--hi-brown-light)' }}>Trial days run from 9:00 AM to 3:00 PM, giving us enough time for proper assessment while keeping your dog comfortable. You'll receive a detailed report at pickup.</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center mr-4 flex-shrink-0 mt-1" style={{ background: 'var(--hi-beige)' }}>
                      <Heart className="text-sm h-4 w-4" style={{ color: 'var(--hi-gold)' }} />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2" style={{ color: 'var(--hi-brown)' }}>What to Expect</h4>
                      <p style={{ color: 'var(--hi-brown-light)' }}>Our trained staff will monitor socialisation, eating habits, play preferences, and any anxiety indicators. We'll also take notes on special needs or preferences for future visits.</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center mr-4 flex-shrink-0 mt-1" style={{ background: 'var(--hi-beige)' }}>
                      <ClipboardCheck className="text-sm h-4 w-4" style={{ color: 'var(--hi-gold)' }} />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2" style={{ color: 'var(--hi-brown)' }}>Requirements</h4>
                      <p style={{ color: 'var(--hi-brown-light)' }}><strong>Mandatory:</strong> Current vaccination records including kennel cough must be provided at booking. Also bring any medications your dog takes and their favorite treats or comfort items.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Locked State Message */}
            <Card style={{ background: 'var(--hi-cream)', borderColor: 'var(--hi-border)' }} data-testid="trial-locked-card">
              <CardContent className="p-6 sm:p-8 md:p-10">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--hi-beige)' }}>
                    <Lock className="h-8 w-8" style={{ color: 'var(--hi-gold)' }} />
                  </div>
                  <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--hi-brown)' }}>
                    Trial Days Currently Unavailable
                  </h3>
                  <Alert className="mb-4" style={{ background: 'var(--hi-beige)', borderColor: 'var(--hi-border)' }}>
                    <Info className="h-4 w-4" style={{ color: 'var(--hi-brown)' }} />
                    <AlertDescription style={{ color: 'var(--hi-brown)' }}>
                      {BOOKING_PAUSE.TRIAL_DAY_COPY}
                    </AlertDescription>
                  </Alert>
                  <p className="text-sm mb-6" style={{ color: 'var(--hi-brown-light)' }}>
                    We apologise for the inconvenience. We look forward to welcoming you and your dog after the holidays!
                  </p>
                  <Link href="/">
                    <Button 
                      variant="default"
                      data-testid="button-back-home"
                      style={{ background: 'var(--hi-gold)', color: 'white' }}
                    >
                      Back to Home
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Trial Day Explanation */}
            <Card className="mb-6 sm:mb-8">
          <CardContent className="p-4 sm:p-6 md:p-8">
            <div className="text-center mb-4 sm:mb-6">
              <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="text-success text-3xl h-12 w-12" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Trial Day - €20</h3>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-4 flex-shrink-0 mt-1">
                  <PawPrint className="text-primary text-sm h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">What is a Trial Day?</h4>
                  <p className="text-gray-600">A mandatory assessment day for all new customers. Our staff evaluates your dog's temperament, social behavior, and special needs to ensure the best possible care. This €20 investment ensures your dog's safety and comfort.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center mr-4 flex-shrink-0 mt-1">
                  <Clock className="text-secondary text-sm h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Duration & Schedule</h4>
                  <p className="text-gray-600">Trial days run from 9:00 AM to 3:00 PM, giving us enough time for proper assessment while keeping your dog comfortable. You'll receive a detailed report at pickup.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center mr-4 flex-shrink-0 mt-1">
                  <Heart className="text-success text-sm h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">What to Expect</h4>
                  <p className="text-gray-600">Our trained staff will monitor socialisation, eating habits, play preferences, and any anxiety indicators. We'll also take notes on special needs or preferences for future visits.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center mr-4 flex-shrink-0 mt-1">
                  <ClipboardCheck className="text-destructive text-sm h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Requirements</h4>
                  <p className="text-gray-600"><strong>Mandatory:</strong> Current vaccination records including kennel cough must be provided at booking. Also bring any medications your dog takes and their favorite treats or comfort items.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Form */}
        <Card>
          <CardContent className="p-4 sm:p-6 md:p-8">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Schedule Your Trial Day</h3>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                {/* Dog & Owner Selection */}
                <div className="border-b border-gray-200 pb-4 sm:pb-6">
                  <DogSelector
                    selectedDogId={selectedDogId}
                    onDogSelect={handleDogSelect}
                    disabled={false}
                    className="mb-6"
                  />
                </div>

                {/* Owner Contact Information */}
                <div className="border-b border-gray-200 pb-4 sm:pb-6">
                  <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Your Contact Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FormField
                      control={form.control}
                      name="ownerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Your full name" {...field} data-testid="input-owner-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="087 123 4567" {...field} data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your.email@example.com" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Trial Day Details */}
                <div className="border-b border-gray-200 pb-4 sm:pb-6">
                  <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Preferred Trial Date</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FormField
                      control={form.control}
                      name="trialDate"
                      render={({ field }) => {
                        const selectedDateObj = field.value ? new Date(field.value) : null;
                        const isWeekendDay = selectedDateObj ? isWeekend(selectedDateObj) : false;

                        return (
                          <FormItem>
                            <FormLabel>Preferred Date (Mon-Fri Only) *</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                min={today} 
                                {...field}
                                className={isWeekendDay ? "border-red-500" : ""}
                              />
                            </FormControl>
                            {isWeekendDay && (
                              <p className="text-sm text-red-600">
                                Trial days are only available Monday through Friday
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={form.control}
                      name="timeSlot"
                      render={({ field }) => {
                        const selectedDateObj = trialDate ? new Date(trialDate) : null;
                        const windows = selectedDateObj ? getDailyWindows(selectedDateObj) : [];
                        const isClosedDay = selectedDateObj ? isClosed(selectedDateObj) : false;
                        const isWeekendDay = selectedDateObj ? isWeekend(selectedDateObj) : false;

                        return (
                          <FormItem>
                            <FormLabel>Time Slot *</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                              disabled={isClosedDay || isWeekendDay || !trialDate}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-trial-time-slot">
                                  <SelectValue placeholder={
                                    isClosedDay 
                                      ? "Not available" 
                                      : isWeekendDay
                                        ? "Weekdays only"
                                        : !trialDate 
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
                            {(isClosedDay || isWeekendDay) && selectedDateObj && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Trial days are available Monday through Friday only
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={form.control}
                      name="alternativeDate"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Alternative Date (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              min={today} 
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
                  {/* Show availability indicator when trial date is selected */}
                  {trialDate && availabilityData && (
                    <AvailabilityIndicator
                      available={availabilityData.available}
                      capacity={availabilityData.capacity}
                      serviceType="trial"
                      className="mt-4"
                    />
                  )}
                </div>

                {/* Vaccination Proof Upload */}
                <div className="border-b border-gray-200 pb-4 sm:pb-6">
                  <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Vaccination Requirements</h4>
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
                    <div className="flex items-center">
                      <ClipboardCheck className="text-amber-600 h-5 w-5 mr-2" />
                      <p className="text-amber-800 text-sm">
                        <strong>Mandatory:</strong> Upload current vaccination records including kennel cough vaccination.
                      </p>
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="vaccinationProof"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vaccination Records Upload *</FormLabel>
                        <FormControl>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <p className="text-gray-600 mb-2">Upload vaccination records (PDF, JPG, PNG)</p>
                            <Input 
                              type="file" 
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  field.onChange(file.name);
                                }
                              }}
                              className="hidden"
                              id="vaccination-upload"
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => document.getElementById('vaccination-upload')?.click()}
                            >
                              Choose File
                            </Button>
                            {field.value && (
                              <p className="text-green-600 text-sm mt-2">
                                ✓ File selected: {field.value}
                              </p>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Special Notes */}
                <div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Notes or Concerns</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={3} 
                            placeholder="Any behavioral concerns, medical conditions, social preferences, or other information we should know..." 
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
                  <Button 
                    type="submit" 
                    className="w-full py-3 sm:py-4 text-base sm:text-lg font-semibold btn-success min-h-[48px]"
                    disabled={createBookingMutation.isPending}
                    data-testid="button-book-trial"
                  >
                    <CalendarPlus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    {createBookingMutation.isPending ? "Scheduling..." : "Book Trial Day - €20"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Payment Section */}
        {showPayment && bookingId && (
          <Card className="mt-6 sm:mt-8">
            <CardContent className="p-4 sm:p-6 md:p-8">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Euro className="text-amber-600 h-12 w-12" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Complete Payment</h3>
                <p className="text-gray-600">Your booking is reserved. Complete payment to confirm your trial day.</p>
              </div>
              
              <StripeWrapper
                bookingId={bookingId}
                reservationId={reservationId}
                serviceType="trial"
                amount={PRICES.trialFlatEUR * 100} // amount in cents
                dogAge={form.getValues("age")}
                phoneNumber={form.getValues("phone")}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </CardContent>
          </Card>
        )}

        {/* Success Modal */}
        <SuccessModal
          open={showSuccessModal}
          onOpenChange={setShowSuccessModal}
          title="Trial Day Confirmed!"
          message={successMessage}
        />
          </>
        )}
      </div>
    </div>
  );
}
