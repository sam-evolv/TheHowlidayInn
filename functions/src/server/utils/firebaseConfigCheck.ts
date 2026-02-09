import type { Request, Response } from "express";

type Env = Record<string, string | undefined>;

const REQUIRED = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

const OPTIONAL = ["VITE_FIREBASE_MEASUREMENT_ID"];

function isLikelyApiKey(v?: string) {
  return !!v && v.startsWith("AIza") && v.length >= 30;
}
function isLikelySender(v?: string) {
  return !!v && /^\d{6,}$/.test(v);
}
function isLikelyAppId(v?: string) {
  return !!v && /^1:\d+:web:[a-f0-9]+$/i.test(v);
}
function isLikelyMeasurementId(v?: string) {
  return !v || /^G-[A-Z0-9]+$/.test(v);
}
function looksLikeBucket(v?: string) {
  // Firebase Storage default bucket ends with appspot.com (most projects)
  return !!v && (v.endsWith(".appspot.com") || v.endsWith(".firebasestorage.app"));
}
function looksLikeAuthDomain(v?: string) {
  return !!v && (v.endsWith(".firebaseapp.com") || v.includes("."));
}

export function checkFirebaseEnv(env: Env) {
  const report: any = {
    ok: true,
    missing: [] as string[],
    warnings: [] as string[],
    diagnostics: {} as Record<string, string>,
    presence: {} as Record<string, boolean>,
  };

  for (const k of REQUIRED) {
    const present = !!env[k];
    report.presence[k] = present;
    if (!present) {
      report.ok = false;
      report.missing.push(k);
    }
  }
  for (const k of OPTIONAL) {
    report.presence[k] = !!env[k];
  }

  // Heuristics (no values logged)
  if (!isLikelyApiKey(env.VITE_FIREBASE_API_KEY)) {
    report.ok = false;
    report.diagnostics.VITE_FIREBASE_API_KEY = "Invalid format (should start with AIza and ~39 chars).";
  }
  if (!looksLikeAuthDomain(env.VITE_FIREBASE_AUTH_DOMAIN)) {
    report.ok = false;
    report.diagnostics.VITE_FIREBASE_AUTH_DOMAIN = "Unexpected domain format (usually <project>.firebaseapp.com).";
  }
  if (!looksLikeBucket(env.VITE_FIREBASE_STORAGE_BUCKET)) {
    report.warnings.push("VITE_FIREBASE_STORAGE_BUCKET unusual; most projects use <project>.appspot.com.");
  }
  if (!isLikelySender(env.VITE_FIREBASE_MESSAGING_SENDER_ID)) {
    report.ok = false;
    report.diagnostics.VITE_FIREBASE_MESSAGING_SENDER_ID = "Sender ID must be numeric.";
  }
  if (!isLikelyAppId(env.VITE_FIREBASE_APP_ID)) {
    report.ok = false;
    report.diagnostics.VITE_FIREBASE_APP_ID = "Unexpected format (should look like 1:<digits>:web:<hex>).";
  }
  if (!isLikelyMeasurementId(env.VITE_FIREBASE_MEASUREMENT_ID)) {
    report.warnings.push("VITE_FIREBASE_MEASUREMENT_ID format unusual (should be G-XXXX...).");
  }

  return report;
}

// Express handler (no secrets returned)
export function firebaseHealthHandler(req: Request, res: Response) {
  const report = checkFirebaseEnv(process.env as Env);
  return res.json({
    ok: report.ok,
    missing: report.missing,
    warnings: report.warnings,
    diagnostics: report.diagnostics,
    presence: report.presence, // booleans only
  });
}
