import { useState, useEffect } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FirebaseDog } from "@/lib/firebase";
import { CreditCard, Lock } from "lucide-react";
import { getStripePublishableKey, inferStripeMode } from "@/lib/stripeEnv";
import { api } from "@/lib/api";

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://www.thehowlidayinn.ie';

interface BookingData {
  serviceType: "daycare" | "boarding";
  checkInDate: string;
  checkOutDate: string;
  dropOffTime: string;
  pickUpTime: string;
  selectedDogs: string[];
  dogs: FirebaseDog[];
  notes?: string;
}

interface StripeCheckoutProps {
  bookingData: BookingData;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}

function CheckoutForm({ bookingData, onSuccess, onCancel }: StripeCheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate pricing
  const calculateAmount = () => {
    const basePrice = bookingData.serviceType === "daycare" ? 35 : 55; // €35 for daycare, €55 for boarding per day
    const numDogs = bookingData.dogs.length;
    
    let days = 1;
    if (bookingData.serviceType === "boarding" && bookingData.checkOutDate) {
      const checkIn = new Date(bookingData.checkInDate);
      const checkOut = new Date(bookingData.checkOutDate);
      days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    }

    return basePrice * numDogs * days;
  };

  const totalAmount = calculateAmount();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // The PaymentElement is already initialized with clientSecret in the parent component
      // This code path is no longer used since we initialize payment on component mount

      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${SITE_URL}/success`,
        },
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        toast({
          title: "Payment Successful",
          description: "Your booking has been confirmed!",
        });
        onSuccess(paymentIntent.id);
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Error",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Booking Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Booking Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Service:</span>
              <span className="capitalize">{bookingData.serviceType}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Date(s):</span>
              <span>
                {bookingData.checkInDate}
                {bookingData.serviceType === "boarding" && bookingData.checkOutDate && 
                  ` to ${bookingData.checkOutDate}`}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Time:</span>
              <span>{bookingData.dropOffTime} - {bookingData.pickUpTime}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Dogs:</span>
              <div className="text-right">
                {bookingData.dogs.map((dog, index) => (
                  <div key={dog.id}>{dog.name}</div>
                ))}
              </div>
            </div>

            {bookingData.notes && (
              <div className="flex justify-between">
                <span className="font-medium">Notes:</span>
                <span className="text-right max-w-xs">{bookingData.notes}</span>
              </div>
            )}
          </div>

          <hr className="my-4" />
          
          <div className="flex justify-between text-lg font-semibold">
            <span>Total Amount:</span>
            <span>€{totalAmount.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Secure Payment
          </CardTitle>
          <CardDescription>
            Your payment information is secure and encrypted. We use Stripe for safe and reliable payment processing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement 
              options={{
                layout: "tabs"
              }}
            />
            
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isProcessing}
                className="flex-1"
                data-testid="button-cancel-payment"
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                disabled={!stripe || isProcessing}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
                data-testid="button-complete-payment"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Pay €{totalAmount.toFixed(2)}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        <p className="flex items-center justify-center gap-2">
          <Lock className="w-4 h-4" />
          Your payment is secured with 256-bit SSL encryption
        </p>
      </div>
    </div>
  );
}

export default function StripeCheckout({ bookingData, onSuccess, onCancel }: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [stripeKeyLoading, setStripeKeyLoading] = useState(true);

  // Load Stripe publishable key on mount
  useEffect(() => {
    async function loadStripeKey() {
      try {
        const pk = await getStripePublishableKey();
        if (pk) {
          console.log("[StripeCheckout] Successfully loaded publishable key");
          console.log("[StripeCheckout] Mode:", inferStripeMode(pk));
          setStripePromise(loadStripe(pk));
        } else {
          console.error("[StripeCheckout] No publishable key available");
          setError('MISSING_KEY');
        }
      } catch (err) {
        console.error("[StripeCheckout] Error loading key:", err);
        setError('MISSING_KEY');
      } finally {
        setStripeKeyLoading(false);
      }
    }
    loadStripeKey();
  }, []);

  const initPayment = async () => {
    try {
      setError(undefined);
      setIsLoading(true);
      
      const basePrice = bookingData.serviceType === "daycare" ? 35 : 55;
      const numDogs = bookingData.dogs.length;
      
      let days = 1;
      if (bookingData.serviceType === "boarding" && bookingData.checkOutDate) {
        const checkIn = new Date(bookingData.checkInDate);
        const checkOut = new Date(bookingData.checkOutDate);
        days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      }

      const amount = Math.round(basePrice * numDogs * days * 100);

      const response = await api.post('/api/checkout/create-intent', {
        amount,
        currency: "eur"
      });

      const data = response.data;
      
      if (!data?.clientSecret) {
        throw new Error("NO_CLIENT_SECRET");
      }

      setClientSecret(data.clientSecret);
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      setError("NO_CLIENT_SECRET");
      toast({
        title: "Payment Setup Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!stripeKeyLoading && stripePromise) {
      initPayment().catch(() => setError("NO_CLIENT_SECRET"));
    }
  }, [stripeKeyLoading, stripePromise]);

  if (error === 'MISSING_KEY' || (!stripeKeyLoading && !stripePromise)) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="text-center py-12 space-y-4">
          <p className="text-red-600 text-sm font-medium">MISSING_PUBLISHABLE_KEY</p>
          <p className="text-sm text-muted-foreground">
            Stripe publishable key not configured. Please contact support.
          </p>
          <Button onClick={onCancel} variant="outline" data-testid="button-cancel-retry">
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (stripeKeyLoading || isLoading) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Setting up secure payment...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="text-center py-12 space-y-4">
          {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={() => initPayment().catch(() => setError("NO_CLIENT_SECRET"))} 
              variant="default" 
              data-testid="button-retry-payment"
            >
              Retry
            </Button>
            <Button onClick={onCancel} variant="outline" data-testid="button-cancel-retry">
              Go Back
            </Button>
          </div>
          {import.meta.env.DEV && (
            <p className="mt-2 text-xs text-muted-foreground">
              Test card 4242 4242 4242 4242, any future date, CVC 123.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!stripePromise) {
    return null;
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Elements stripe={stripePromise} options={options}>
        <CheckoutForm 
          bookingData={bookingData} 
          onSuccess={onSuccess} 
          onCancel={onCancel} 
        />
      </Elements>
    </div>
  );
}
