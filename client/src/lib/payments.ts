export async function createCheckoutSession(payload: {
  ownerUid: string; bookingId: string;
  lineItems: any[]; successUrl: string; cancelUrl: string;
  serviceType: string; checkInDate: string; checkOutDate: string;
  dogIds: string[]; currency?: string;
}) {
  const endpoint = import.meta.env.VITE_FUNCTION_CREATE_CHECKOUT_URL;
  if (!endpoint) throw new Error("VITE_FUNCTION_CREATE_CHECKOUT_URL not set");
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error("Failed to create checkout session");
  const { url } = await r.json();
  window.location.href = url;
}