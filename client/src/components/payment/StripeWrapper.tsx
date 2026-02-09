import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { useEffect, useState, useCallback } from 'react';
import { CheckoutForm } from './CheckoutForm';
import { auth } from '@/lib/firebase';
import { createPaymentIntent } from '@/api/createPaymentIntent';
import { getStripePublishableKey, inferStripeMode } from '@/lib/stripeEnv';

interface StripeWrapperProps {
  bookingId: string;
  reservationId?: string;
  serviceType: string;
  amount: number;
  dogAge?: string;
  phoneNumber?: string;
  ownerName?: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function StripeWrapper({ bookingId, reservationId, serviceType, amount, dogAge, phoneNumber, ownerName, onSuccess, onError }: StripeWrapperProps) {
  const defaultEmail = auth?.currentUser?.email ?? '';
  const [email, setEmail] = useState(defaultEmail);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [success, setSuccess] = useState(false);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [stripeKeyLoading, setStripeKeyLoading] = useState(true);

  // Load Stripe publishable key on mount
  useEffect(() => {
    async function loadStripeKey() {
      try {
        const pk = await getStripePublishableKey();
        if (pk) {
          console.log("[stripe] Successfully loaded publishable key, initializing Stripe");
          console.log("[stripe] Mode:", inferStripeMode(pk));
          setStripePromise(loadStripe(pk));
        } else {
          console.error("[stripe] No publishable key available");
          setError('MISSING_KEY');
        }
      } catch (err) {
        console.error("[stripe] Error loading key:", err);
        setError('MISSING_KEY');
      } finally {
        setStripeKeyLoading(false);
      }
    }
    loadStripeKey();
  }, []);

  // Branded success screen
  if (success) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-green-600 font-semibold text-lg">🎉 Booking Confirmed!</p>
        <p className="text-muted-foreground text-sm">
          Thank you for booking with The Howliday Inn. A confirmation email has been sent.
        </p>
        <p className="text-2xl">🐾</p>
      </div>
    );
  }

  // Branded error screen with retry
  if (error === "PAYMENT_FAILED") {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-red-600 font-semibold text-lg">⚠️ Payment could not be processed</p>
        <p className="text-muted-foreground text-sm">
          Something went wrong while connecting to our payment system.
          Please try again or contact The Howliday Inn team directly.
        </p>
        <button
          onClick={() => {
            setError(undefined);
            initPayment();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          data-testid="button-retry-payment"
        >
          Retry Payment
        </button>
        <a href="mailto:howlidayinn1@gmail.com" className="block text-blue-600 underline" data-testid="link-contact-support">
          Contact Support
        </a>
      </div>
    );
  }

  // Error if no publishable key
  if (error === 'MISSING_KEY' || (!stripeKeyLoading && !stripePromise)) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-red-600 text-sm font-medium">MISSING_PUBLISHABLE_KEY</p>
        <p className="text-sm text-muted-foreground">
          Stripe publishable key not configured. Please contact support.
        </p>
      </div>
    );
  }

  // Loading state while fetching Stripe key
  if (stripeKeyLoading || !stripePromise) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-sm text-muted-foreground">Initializing payment...</p>
      </div>
    );
  }

  // Unified payment initialization using the new helper
  const initPayment = useCallback(async () => {
    try {
      setError(undefined);
      setLoading(true);
      
      const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
      const trimmed = (email || '').trim();

      if (import.meta.env.DEV) {
        console.log("[dev] checkout email ->", trimmed || "(none)");
      }

      if (!trimmed) {
        setError('Please enter an email for the receipt.');
        setLoading(false);
        return;
      }
      
      console.log("[initPayment] amount:", amount, "bookingId:", bookingId, "hasToken:", !!idToken);
      
      const payload = {
        amount,
        currency: 'eur',
        bookingId,
        reservationId: reservationId || undefined,
        email: trimmed,
        dogAge: dogAge || undefined,
        phoneNumber: phoneNumber || undefined,
        ownerName: ownerName || undefined,
        serviceType,
        idToken,
      };
      
      if (import.meta.env.DEV) {
        console.log("[dev] booking payload:", payload);
      }

      const cs = await createPaymentIntent(payload);

      console.log("[initPayment] Success - got clientSecret");
      setClientSecret(cs);
    } catch (error: any) {
      console.error('[initPayment] Error:', error?.message);
      setError('PAYMENT_FAILED');
      onError('Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  }, [amount, bookingId, email, dogAge, phoneNumber, ownerName, serviceType, onError, reservationId]);

  useEffect(() => {
    if (!stripeKeyLoading && stripePromise && email) {
      void initPayment();
    }
  }, [stripeKeyLoading, stripePromise, email, initPayment]);

  if (!clientSecret) {
    return (
      <div className="space-y-4 max-w-md mx-auto py-8">
        {!email && (
          <div className="space-y-2">
            <label htmlFor="receipt-email" className="text-sm font-medium block">
              Receipt email
            </label>
            <input
              id="receipt-email"
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Receipt email"
              data-testid="input-receipt-email"
            />
            <p className="text-xs text-muted-foreground">
              We'll email your Stripe receipt here.
            </p>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={initPayment}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="button-init-payment"
        >
          {loading ? 'Preparing…' : email ? 'Continue to payment' : 'Continue'}
        </button>
        {import.meta.env.DEV && (
          <p className="mt-2 text-xs text-muted-foreground text-center">
            Test card 4242 4242 4242 4242, any future date, CVC 123.
          </p>
        )}
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#3b82f6',
          },
        },
      }}
    >
      <CheckoutForm
        onSuccess={() => {
          setSuccess(true);
          setTimeout(() => onSuccess(), 2000);
        }}
        onError={(err) => {
          setError('PAYMENT_FAILED');
          onError(err);
        }}
        amount={amount}
        serviceType={serviceType}
      />
    </Elements>
  );
}
