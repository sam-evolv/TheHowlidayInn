import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://www.thehowlidayinn.ie';

interface CheckoutFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
  amount: number;
  serviceType: string;
}

export function CheckoutForm({ onSuccess, onError, amount, serviceType }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${SITE_URL}/success`,
      },
    });

    if (error) {
      console.error('Payment failed:', error);
      onError(error.message || 'Payment failed');
      toast({
        title: "Payment Failed",
        description: error.message || 'An error occurred during payment',
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Your booking has been confirmed!",
      });
      onSuccess();
    }

    setIsLoading(false);
  };

  const serviceName = serviceType === 'daycare' ? 'Daycare' : 'Boarding';
  const formattedAmount = (amount / 100).toFixed(2);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Complete Your Payment</h3>
        <p className="text-gray-600">
          {serviceName} Service - €{formattedAmount}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <PaymentElement 
          options={{
            layout: 'tabs'
          }}
        />
        
        <Button 
          type="submit" 
          disabled={!stripe || isLoading} 
          className="w-full"
          data-testid="button-complete-payment"
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            `Pay €${formattedAmount}`
          )}
        </Button>
      </form>

      <div className="text-xs text-gray-500 text-center">
        <p>Your payment is secured by Stripe</p>
        <p>We accept all major credit and debit cards</p>
      </div>
    </div>
  );
}