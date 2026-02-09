import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { getUserDogs, createBooking, getBookingsForDate, getDailyCapacity, isBreedRestricted, FirebaseDog } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";
import { authenticatedFetch } from "@/lib/apiClient";
import VaccinationStatus from "@/components/VaccinationStatus";
import BreedBadge from "@/components/BreedBadge";
import { Calendar, Clock, Users, AlertTriangle, CheckCircle } from "lucide-react";
import { format, addDays, isBefore, startOfDay } from "date-fns";

const bookingSchema = z.object({
  serviceType: z.enum(["daycare", "boarding"]),
  checkInDate: z.string().min(1, "Check-in date is required"),
  checkOutDate: z.string().min(1, "Check-out date is required"),
  dropOffTime: z.string().min(1, "Drop-off time is required"),
  pickUpTime: z.string().min(1, "Pick-up time is required"),
  selectedDogs: z.array(z.string()).min(1, "Please select at least one dog"),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  serviceType: "daycare" | "boarding";
  onSubmit: (data: BookingFormData & { dogs: FirebaseDog[] }) => void;
  className?: string;
}

export default function BookingForm({ serviceType, onSubmit, className = "" }: BookingFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availabilityInfo, setAvailabilityInfo] = useState<{ available: number; total: number } | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      serviceType,
      selectedDogs: [],
      notes: "",
    },
  });

  const selectedDogs = form.watch("selectedDogs");
  const checkInDate = form.watch("checkInDate");

  // Fetch user's dogs
  const { data: userDogs = [], isLoading: isLoadingDogs } = useQuery({
    queryKey: ["user-dogs", user?.uid],
    queryFn: () => user ? getUserDogs(user.uid) : [],
    enabled: !!user,
  });

  // Check availability when date changes
  useEffect(() => {
    if (checkInDate) {
      checkAvailability(checkInDate);
      setSelectedDate(checkInDate);
    }
  }, [checkInDate, serviceType]);

  const checkAvailability = async (date: string) => {
    setIsCheckingAvailability(true);
    try {
      const [bookings, capacity] = await Promise.all([
        getBookingsForDate(date, serviceType),
        getDailyCapacity(),
      ]);

      const total = capacity[serviceType];
      const booked = bookings.length;
      const available = Math.max(0, total - booked);

      setAvailabilityInfo({ available, total });
    } catch (error) {
      console.error("Error checking availability:", error);
      toast({
        title: "Error",
        description: "Could not check availability. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const validateSelectedDogs = async (dogIds: string[]) => {
    const dogs = userDogs.filter(dog => dogIds.includes(dog.id!));
    const issues: string[] = [];

    for (const dog of dogs) {
      // Check breed restrictions
      const restricted = await isBreedRestricted(dog.breed);
      if (restricted) {
        issues.push(`${dog.name}: Breed is not accepted at our facility`);
      }

      // Check vaccination status
      const today = new Date();
      const isRabiesValid = dog.vaccinations.rabiesDate && 
        new Date(dog.vaccinations.rabiesDate) > new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
      const isDhppValid = dog.vaccinations.dhppDate && 
        new Date(dog.vaccinations.dhppDate) > new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
      const isBordetellaValid = dog.vaccinations.bordetellaDate && 
        new Date(dog.vaccinations.bordetellaDate) > new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);

      if (!isRabiesValid || !isDhppValid || !isBordetellaValid) {
        issues.push(`${dog.name}: Vaccination records are incomplete or expired`);
      }
    }

    return issues;
  };

  const handleSubmit = async (data: BookingFormData) => {
    try {
      // Validate dates
      const checkIn = new Date(data.checkInDate);
      const checkOut = new Date(data.checkOutDate);
      const today = startOfDay(new Date());

      if (isBefore(checkIn, today)) {
        toast({
          title: "Invalid Date",
          description: "Check-in date cannot be in the past.",
          variant: "destructive",
        });
        return;
      }

      if (serviceType === "boarding" && checkOut <= checkIn) {
        toast({
          title: "Invalid Date",
          description: "Check-out date must be after check-in date for boarding.",
          variant: "destructive",
        });
        return;
      }

      // Check availability
      if (availabilityInfo && availabilityInfo.available < data.selectedDogs.length) {
        toast({
          title: "No Availability",
          description: `Only ${availabilityInfo.available} spots available for the selected date.`,
          variant: "destructive",
        });
        return;
      }

      // Validate selected dogs
      const issues = await validateSelectedDogs(data.selectedDogs);
      if (issues.length > 0) {
        toast({
          title: "Booking Issues",
          description: issues.join(". "),
          variant: "destructive",
        });
        return;
      }

      // TODO HowlidayInn: Validate dog eligibility before enabling payment
      const validationResults = await Promise.all(
        data.selectedDogs.map(async (dogId) => {
          try {
            const response = await authenticatedFetch(
              `/api/booking/validate?dogId=${dogId}&start=${data.checkInDate}&end=${data.checkOutDate}`
            );
            const result = await response.json();
            return { dogId, valid: result.ok, error: result.error };
          } catch (error) {
            return { dogId, valid: false, error: "Validation failed" };
          }
        })
      );

      const invalidDogs = validationResults.filter(r => !r.valid);
      if (invalidDogs.length > 0) {
        const dogNames = invalidDogs.map(r => {
          const dog = userDogs.find(d => d.id === r.dogId);
          return dog?.name || 'Unknown';
        }).join(', ');
        
        toast({
          title: "Dogs Not Eligible",
          description: `${dogNames}: ${invalidDogs[0].error}. Please complete vaccination requirements first.`,
          variant: "destructive",
        });
        return;
      }

      const selectedDogsData = userDogs.filter(dog => data.selectedDogs.includes(dog.id!));
      onSubmit({ ...data, dogs: selectedDogsData });
    } catch (error) {
      console.error("Error submitting booking:", error);
      toast({
        title: "Error",
        description: "Failed to submit booking. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isDateDisabled = (date: string) => {
    const selectedDate = new Date(date);
    const today = startOfDay(new Date());
    return isBefore(selectedDate, today);
  };

  // Generate time slots
  const timeSlots: string[] = [];
  for (let hour = 7; hour <= 18; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 18) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }

  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Book {serviceType === "daycare" ? "Daycare" : "Boarding"}
        </CardTitle>
        <CardDescription>
          {serviceType === "daycare" 
            ? "Schedule same-day care for your dog with flexible drop-off and pickup times."
            : "Reserve overnight accommodations in our comfortable boarding suites."
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Service Type */}
            <FormField
              control={form.control}
              name="serviceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Type</FormLabel>
                  <FormControl>
                    <Input value={serviceType === "daycare" ? "Daycare" : "Boarding"} disabled />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Dog Selection */}
            <div className="space-y-4">
              <FormLabel>Select Your Dogs</FormLabel>
              {isLoadingDogs ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : userDogs.length === 0 ? (
                <Card className="p-4 text-center">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    You haven't added any dogs to your profile yet.
                  </p>
                  <Button type="button" onClick={() => window.location.href = '/add-dog'}>
                    Add Your First Dog
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {userDogs.map((dog) => (
                    <Card 
                      key={dog.id} 
                      className={`p-4 cursor-pointer transition-all ${
                        selectedDogs.includes(dog.id!) 
                          ? 'ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-900/20' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => {
                        const current = form.getValues("selectedDogs");
                        const updated = current.includes(dog.id!)
                          ? current.filter(id => id !== dog.id)
                          : [...current, dog.id!];
                        form.setValue("selectedDogs", updated);
                      }}
                      data-testid={`dog-selection-${dog.id}`}
                    >
                      <div className="flex items-start gap-4">
                        {dog.photoUrl && (
                          <img 
                            src={dog.photoUrl} 
                            alt={dog.name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{dog.name}</h3>
                            <Badge variant="outline">{dog.breed}</Badge>
                            {selectedDogs.includes(dog.id!) && (
                              <CheckCircle className="w-5 h-5 text-amber-500" />
                            )}
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {dog.age} years old • {dog.gender} • {dog.weightKg}kg
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <BreedBadge breed={dog.breed} />
                              <VaccinationStatus dog={dog} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
              {form.formState.errors.selectedDogs && (
                <p className="text-sm text-red-600">{form.formState.errors.selectedDogs.message}</p>
              )}
            </div>

            {/* Date Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="checkInDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-in Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        min={tomorrow}
                        {...field}
                        data-testid="input-checkin-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {serviceType === "boarding" && (
                <FormField
                  control={form.control}
                  name="checkOutDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check-out Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          min={checkInDate || tomorrow}
                          {...field}
                          data-testid="input-checkout-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Availability Display */}
            {selectedDate && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5" />
                  <h4 className="font-semibold">Availability for {format(new Date(selectedDate), 'MMMM d, yyyy')}</h4>
                </div>
                {isCheckingAvailability ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <span>Checking availability...</span>
                  </div>
                ) : availabilityInfo ? (
                  <div className="flex items-center gap-4">
                    <Badge 
                      className={`${
                        availabilityInfo.available > 0 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-red-100 text-red-800 border-red-200'
                      }`}
                    >
                      {availabilityInfo.available > 0 ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {availabilityInfo.available} spots available
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          Fully booked
                        </>
                      )}
                    </Badge>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {availabilityInfo.total - availabilityInfo.available} of {availabilityInfo.total} spots booked
                    </span>
                  </div>
                ) : null}
              </Card>
            )}

            {/* Time Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dropOffTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drop-off Time</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-dropoff-time">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeSlots.slice(0, 12).map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pickUpTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pick-up Time</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-pickup-time">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeSlots.slice(8).map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Special Requests */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Requests or Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any special instructions, dietary requirements, or notes about your dog..."
                      className="min-h-[100px]"
                      {...field}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              disabled={!availabilityInfo || availabilityInfo.available === 0 || selectedDogs.length === 0}
              data-testid="button-submit-booking"
            >
              Continue to Payment
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}