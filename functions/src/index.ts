// Export proxy function for API requests to Replit backend
export { api } from './proxy.js';

// TODO: Re-enable web and sweepReservations functions after fixing build errors
// import { onRequest } from "firebase-functions/v2/https";
// import { onSchedule } from "firebase-functions/v2/scheduler";
// import { setGlobalOptions } from "firebase-functions/v2";
// import express from "express";
// import cookieParser from "cookie-parser";
// import bodyParser from "body-parser";
// import cors from "cors";

// // Set global options for all functions
// setGlobalOptions({ region: "europe-west1", maxInstances: 10 });

// // Import server modules
// import { buildApp } from "./server/app.js";
// import { expireStaleReservations } from "./server/jobs/sweeper.js";

// // Create Express app
// const app = express();

// // Trust proxy for secure cookies
// app.set("trust proxy", 1);

// // Cookie parser
// app.use(cookieParser());

// // CORS configuration for Firebase Functions
// app.use(cors({
//   origin: true, // Allow all origins in Firebase Functions (configure in hosting)
//   credentials: true
// }));

// // Stripe webhook MUST use raw body BEFORE any JSON middleware
// app.use(
//   "/api/stripe/webhook",
//   bodyParser.raw({ type: "application/json" }),
//   (req, _res, next) => {
//     // Mark request as having raw body for webhook handler
//     (req as any)._isStripeRaw = true;
//     next();
//   }
// );

// // Global middlewares AFTER raw webhook
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));

// // Build app routes (auth, admin, availability, reservations, receipts, etc.)
// buildApp(app);

// // Export HTTPS function (single entrypoint)
// export const web = onRequest(
//   { 
//     region: "europe-west1",
//     cors: false, // Already handled by Express CORS middleware
//     timeoutSeconds: 60,
//     memory: "512MiB"
//   },
//   app
// );

// // Scheduled job: capacity TTL sweeper (every minute)
// export const sweepReservations = onSchedule(
//   { 
//     schedule: "* * * * *", 
//     region: "europe-west1", 
//     timeZone: "Europe/Dublin",
//     memory: "256MiB"
//   },
//   async (event) => {
//     console.log("[sweeper] Starting scheduled sweep at", event.scheduleTime);
//     try {
//       await expireStaleReservations();
//       console.log("[sweeper] Sweep completed successfully");
//     } catch (error: any) {
//       console.error("[sweeper] Sweep failed:", error?.message);
//       throw error;
//     }
//   }
// );
