import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { v4 as uuidv4 } from "uuid";

// Service type mapping: frontend → backend
const SERVICE_TYPE_MAP: Record<string, string> = {
  daycare: "Daycare",
  boarding: "Boarding", // Legacy
  "boarding:small": "Boarding Small",
  "boarding:large": "Boarding Large",
  trial: "Trial Day",
};

type ReservationStatus = "idle" | "checking" | "reserving" | "reserved" | "error";

interface ReservationInput {
  serviceType: "daycare" | "boarding" | "boarding:small" | "boarding:large" | "trial";
  date: string; // YYYY-MM-DD
  slot?: string | null;
  userEmail: string;
  dogId?: string;
}

interface ReservationFlowReturn {
  status: ReservationStatus;
  error: string | null;
  reservationId: string | null;
  reserve: (input: ReservationInput) => Promise<string>;
  release: (reservationId: string) => Promise<void>;
  reset: () => void;
}

export function useReservationFlow(): ReservationFlowReturn {
  const [status, setStatus] = useState<ReservationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState<string | null>(null);

  const reset = () => {
    setStatus("idle");
    setError(null);
    setReservationId(null);
  };

  const reserve = async (input: ReservationInput): Promise<string> => {
    try {
      setStatus("checking");
      setError(null);

      const service = SERVICE_TYPE_MAP[input.serviceType];
      if (!service) {
        throw new Error(`Invalid service type: ${input.serviceType}`);
      }

      // Check availability first
      const availParams = new URLSearchParams({
        service,
        date: input.date,
      });
      if (input.slot) {
        availParams.append("slot", input.slot);
      }

      const availResponse = await apiRequest(`/api/availability?${availParams.toString()}`, {
        method: "GET",
      });

      // Check if there's remaining capacity (API returns: { success: true, data: { remaining: number } })
      const remaining = availResponse?.data?.remaining ?? 0;
      if (remaining <= 0) {
        setStatus("error");
        const errorMsg = "This service is fully booked for the selected date. Please choose another date.";
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      // Create reservation
      setStatus("reserving");
      const idempotencyKey = uuidv4();
      
      const reservationPayload = {
        service,
        date: input.date,
        slot: input.slot || null,
        userEmail: input.userEmail,
        dogId: input.dogId || null,
        idempotencyKey,
      };

      const reservationResponse = await apiRequest("/api/reservations", {
        method: "POST",
        body: JSON.stringify(reservationPayload),
      });

      const resId = reservationResponse.data.reservationId;
      setReservationId(resId);
      setStatus("reserved");

      return resId;
    } catch (err: any) {
      setStatus("error");
      
      // Handle specific error codes
      if (err.message?.includes("FULL") || err.message?.includes("fully booked")) {
        const friendlyError = "Sorry, we're fully booked for this date. Please select a different date.";
        setError(friendlyError);
        throw new Error(friendlyError);
      }
      
      const errorMsg = err.message || "Failed to reserve your spot. Please try again.";
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const release = async (resId: string): Promise<void> => {
    try {
      await apiRequest(`/api/reservations/${resId}/release`, {
        method: "POST",
      });
      reset();
    } catch (err: any) {
      console.error("[reservation] Failed to release reservation:", err);
      // Don't throw - release is best-effort cleanup
    }
  };

  return {
    status,
    error,
    reservationId,
    reserve,
    release,
    reset,
  };
}
