export interface TrialEligibility {
  trialRequired: boolean;
  trialCompletedAt: string | null;
  eligibleFrom: string | null;
  eligible: boolean;
}

export function startOfNextDayLocal(d: Date): Date {
  const n = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return n;
}

export function trialEligibility(
  trialRequired: boolean,
  trialCompletedAt?: string | null
): TrialEligibility {
  if (trialRequired) {
    return {
      trialRequired: true,
      trialCompletedAt: null,
      eligibleFrom: null,
      eligible: false
    };
  }
  
  if (!trialCompletedAt) {
    return {
      trialRequired: false,
      trialCompletedAt: null,
      eligibleFrom: null,
      eligible: true
    };
  }
  
  const done = new Date(trialCompletedAt);
  const eligibleFrom = startOfNextDayLocal(done);
  const eligible = new Date() >= eligibleFrom;
  
  return {
    trialRequired: false,
    trialCompletedAt: done.toISOString(),
    eligibleFrom: eligibleFrom.toISOString(),
    eligible
  };
}
