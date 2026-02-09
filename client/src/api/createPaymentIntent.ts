import { api } from '@/lib/api';

export type CreateIntentPayload = {
  amount?: number;
  currency?: string;
  bookingId?: string;
  reservationId?: string;
  email?: string;
  dogAge?: string;
  phoneNumber?: string;
  serviceType?: string;
  idToken?: string | null; // optional Firebase token (handled by axios interceptor)
};

export async function createPaymentIntent(payload: CreateIntentPayload = {}) {
  const body = {
    amount: payload.amount ?? 3500,
    currency: payload.currency ?? "eur",
    bookingId: payload.bookingId ?? null,
    reservationId: payload.reservationId ?? null,
    email: payload.email ?? null,
    dogAge: payload.dogAge ?? undefined,
    phoneNumber: payload.phoneNumber ?? undefined,
    serviceType: payload.serviceType ?? undefined,
  };

  if (import.meta.env.DEV) {
    console.log("[dev] createPaymentIntent payload:", body);
  }

  try {
    const response = await api.post('/checkout/create-intent-by-booking', body);
    const json = response.data;
    if (!json?.clientSecret) {
      throw new Error("NO_CLIENT_SECRET");
    }
    return json.clientSecret as string;
  } catch (error: any) {
    const status = error.response?.status || 500;
    const errorCode = error.response?.data?.error || "UNKNOWN";
    throw new Error(`INTENT_HTTP_${status}_${errorCode}`);
  }
}

async function safeJson(r: Response) {
  try { return await r.json(); } catch { return null; }
}
