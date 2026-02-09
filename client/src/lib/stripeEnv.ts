// Cache for the publishable key fetched from server
let cachedPublishableKey: string | null = null;
let keyFetched = false;

export async function getStripePublishableKey(): Promise<string | null> {
  // Return cached value if already fetched
  if (keyFetched) {
    return cachedPublishableKey;
  }

  try {
    const response = await fetch('/api/stripe/config');
    if (!response.ok) {
      console.error("[stripe] Failed to fetch Stripe config from server (HTTP", response.status, ")");
      // Don't cache failures - allow retry
      return null;
    }
    
    const data = await response.json();
    const pk = data.publishableKey || null;
    
    // Only cache and mark as fetched if we got a valid response (even if pk is null)
    cachedPublishableKey = pk;
    keyFetched = true;
    
    if (pk) {
      console.log("[stripe] Successfully loaded publishable key from server");
    } else {
      console.error("[stripe] Server returned empty publishable key");
    }
    
    return pk;
  } catch (error) {
    console.error("[stripe] Network error fetching publishable key:", error);
    // Don't cache network errors - allow retry
    return null;
  }
}

export function inferStripeMode(pk: string | null): "live" | "test" | "unknown" {
  if (!pk) return "unknown";
  if (pk.startsWith("pk_test_")) return "test";
  if (pk.startsWith("pk_live_")) return "live";
  return "unknown";
}
