# Firebase Deploy Guide (Hosting + Functions v2)

## Overview

This guide covers deploying The Howliday Inn to Firebase with:
- **Firebase Hosting**: Serves the React/Vite SPA
- **Firebase Functions v2**: Runs the Express API server and scheduled jobs
- **Region**: europe-west1 (Ireland)
- **Runtime**: Node.js 20

## Architecture

```
┌─────────────────────────────────────┐
│     Firebase Hosting (SPA)          │
│     /                                │
│     /daycare                         │
│     /boarding                        │
│     /admin                           │
└─────────────────────────────────────┘
                 │
                 │ /api/** requests
                 ↓
┌─────────────────────────────────────┐
│  Firebase Function: web              │
│  - Express.js API server             │
│  - All /api/* endpoints              │
│  - Stripe webhook (raw body)         │
│  - Authentication                    │
│  - Database operations               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Firebase Function: sweepReservations│
│  - Scheduled (every minute)          │
│  - TTL cleanup for reservations      │
└─────────────────────────────────────┘
```

## One-Time Setup

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Select Firebase Project

Your project is already configured in `.firebaserc`:

```bash
firebase use the-howliday-inn-a471f
```

Or to add a different project:

```bash
firebase use --add YOUR_PROJECT_ID
```

### 4. Install Functions Dependencies

```bash
cd functions
npm install
cd ..
```

## Environment Variables & Secrets

Firebase Functions uses Google Secret Manager for sensitive data.

### Set Secrets (One-Time)

Run these commands to store your secrets securely:

```bash
# Database
firebase functions:secrets:set DATABASE_URL
# Paste your Neon PostgreSQL connection string (must include ?sslmode=require)

# Stripe
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase functions:secrets:set VITE_STRIPE_PUBLIC_KEY

# Authentication
firebase functions:secrets:set AUTH_SECRET
# Generate: openssl rand -base64 32

# Admin Owner Account
firebase functions:secrets:set OWNER_EMAIL
firebase functions:secrets:set OWNER_PASSWORD
# Set the initial admin password

# Email (Resend)
firebase functions:secrets:set RESEND_API_KEY

# Firebase Configuration
firebase functions:secrets:set VITE_FIREBASE_API_KEY
firebase functions:secrets:set VITE_FIREBASE_AUTH_DOMAIN
firebase functions:secrets:set VITE_FIREBASE_PROJECT_ID
firebase functions:secrets:set VITE_FIREBASE_STORAGE_BUCKET
firebase functions:secrets:set VITE_FIREBASE_MESSAGING_SENDER_ID
firebase functions:secrets:set VITE_FIREBASE_APP_ID

# Capacity Settings (Optional - defaults apply if not set)
firebase functions:secrets:set MAX_CAPACITY_DAYCARE      # Default: 40
firebase functions:secrets:set MAX_CAPACITY_BOARDING     # Default: 20
firebase functions:secrets:set MAX_CAPACITY_TRIAL        # Default: 40
firebase functions:secrets:set RESERVATION_TTL_MIN       # Default: 10 (minutes)

# Cloudinary (if using file uploads)
firebase functions:secrets:set CLOUDINARY_CLOUD_NAME
firebase functions:secrets:set CLOUDINARY_API_KEY
firebase functions:secrets:set CLOUDINARY_API_SECRET
firebase functions:secrets:set CLOUDINARY_UPLOAD_PRESET

# Cron token for admin endpoints
firebase functions:secrets:set ADMIN_CRON_TOKEN
```

### View Configured Secrets

```bash
firebase functions:secrets:access --list
```

### Update a Secret

```bash
firebase functions:secrets:set SECRET_NAME
# Enter new value when prompted
```

## Build & Deploy

### Full Deployment (Hosting + Functions)

```bash
# Build frontend
npm run build

# Build functions
cd functions && npm run build && cd ..

# Deploy everything
firebase deploy --only hosting,functions
```

### Deploy Hosting Only

```bash
npm run build
firebase deploy --only hosting
```

### Deploy Functions Only

```bash
cd functions
npm run build
npm run deploy
```

Or from root:

```bash
cd functions && npm run deploy
```

### Deploy Specific Function

```bash
firebase deploy --only functions:web
firebase deploy --only functions:sweepReservations
```

## Testing Locally

### Emulators

```bash
# Build functions first
cd functions && npm run build && cd ..

# Start emulators (functions + hosting)
firebase emulators:start --only functions,hosting
```

Access locally at:
- **Hosting**: http://localhost:5000
- **Functions**: http://localhost:5001

### Test Stripe Webhook Locally

Use Stripe CLI to forward webhooks to local emulator:

```bash
stripe listen --forward-to http://localhost:5001/the-howliday-inn-a471f/europe-west1/web/api/stripe/webhook
```

## Post-Deployment Configuration

### 1. Update Stripe Webhook URL

In Stripe Dashboard:
1. Go to **Developers → Webhooks**
2. Add endpoint: `https://www.thehowlidayinn.ie/api/stripe/webhook`
3. Select events to listen for:
   - `payment_intent.succeeded`
   - `checkout.session.completed`
4. Copy the **Signing secret**
5. Update secret:
   ```bash
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
   # Paste the signing secret
   ```

### 2. Verify Deployment

#### Check Hosting
```bash
curl https://www.thehowlidayinn.ie/
# Should return HTML for the React app
```

#### Check Functions
```bash
curl https://www.thehowlidayinn.ie/api/health
# Should return: {"ok":true,"projectId":"the-howliday-inn-a471f","hasDbUrl":true}
```

#### Check Firebase Health
```bash
curl https://www.thehowlidayinn.ie/api/ops/health/firebase
# Should return: {"ok":true,"mode":"live",...}
```

#### Check Stripe Health
```bash
curl https://www.thehowlidayinn.ie/api/ops/health/stripe
# Should return: {"stripe":"ok","mode":"live"}
```

### 3. Test Payment Flow

1. Navigate to https://www.thehowlidayinn.ie/daycare
2. Fill out booking form
3. Use test card: `4242 4242 4242 4242`
4. Complete payment
5. Verify:
   - Success page shows
   - Receipt email sent
   - Booking appears in admin dashboard
   - Webhook logs show `payment_intent.succeeded`

View webhook logs:
```bash
firebase functions:log --only web
```

### 4. Verify Scheduled Sweeper

The `sweepReservations` function runs every minute. Check logs:

```bash
firebase functions:log --only sweepReservations
```

You should see entries like:
```
[sweeper] Starting scheduled sweep at 2025-10-07T18:00:00Z
[sweeper] Found 3 expired reservations to clean up
[sweeper] Sweep completed successfully
```

## Monitoring & Logs

### View Logs

**All functions:**
```bash
firebase functions:log
```

**Specific function:**
```bash
firebase functions:log --only web
firebase functions:log --only sweepReservations
```

**Live tail:**
```bash
firebase functions:log --follow
```

**Filter by severity:**
```bash
firebase functions:log --only web --severity ERROR
```

### Performance Monitoring

View in Firebase Console:
- **Functions** → Performance tab
- **Hosting** → Usage tab

Key metrics to monitor:
- Function execution time (should be < 10s)
- Memory usage (512MB allocated)
- Error rate (should be < 1%)
- Request count

## Rollback & Versioning

### View Hosting Versions

```bash
firebase hosting:versions:list
```

### Rollback Hosting

```bash
firebase hosting:rollback <versionId>
```

### Rollback Functions

Functions don't support direct rollback. To revert:

1. Checkout previous version of code:
   ```bash
   git checkout <previous-commit>
   ```

2. Rebuild and redeploy:
   ```bash
   cd functions && npm run build
   firebase deploy --only functions
   ```

## Troubleshooting

### Functions Not Deploying

**Error: "Missing required secret"**

Solution: Set all required secrets:
```bash
firebase functions:secrets:access --list
# Ensure all secrets from the list above are set
```

**Error: "Build failed"**

Solution: Test build locally:
```bash
cd functions
npm run build
# Fix any TypeScript errors
```

### Webhook Signature Verification Failed

**Symptom:** Webhook returns 400 error

Solution:
1. Ensure `STRIPE_WEBHOOK_SECRET` matches the signing secret from Stripe Dashboard
2. Verify webhook URL is exactly: `https://www.thehowlidayinn.ie/api/stripe/webhook`
3. Check logs for detailed error:
   ```bash
   firebase functions:log --only web | grep webhook
   ```

### Email Logo Not Showing

**Symptom:** Receipt email shows broken image

Solution:
1. Verify logo file exists in `functions/src/server/assets/logo-email.png`
2. Check build output includes assets:
   ```bash
   ls -la functions/lib/server/assets/
   ```
3. Logo should be there after `npm run build`

### Scheduled Sweeper Not Running

**Symptom:** Expired reservations not being cleaned up

Solution:
1. Check scheduler is deployed:
   ```bash
   firebase functions:list
   # Should show: sweepReservations
   ```
2. View logs:
   ```bash
   firebase functions:log --only sweepReservations
   ```
3. Manually invoke to test:
   ```bash
   firebase functions:shell
   > sweepReservations()
   ```

### Database Connection Issues

**Symptom:** API returns 500 errors about database

Solution:
1. Verify `DATABASE_URL` secret is set correctly
2. Ensure connection string includes `?sslmode=require`
3. Test connection from Functions:
   ```bash
   firebase functions:log --only web | grep -i "database\|db"
   ```

### CORS Errors

**Symptom:** Browser shows CORS policy errors

Solution:
1. CORS is configured in `functions/src/index.ts` and `functions/src/server/app.ts`
2. For production, ensure origin is allowed
3. Check CORS headers in response:
   ```bash
   curl -I https://www.thehowlidayinn.ie/api/health
   ```

## Cost Optimization

### Free Tier Limits
- **Functions**: 2M invocations/month, 400K GB-sec, 200K CPU-sec
- **Hosting**: 10 GB storage, 360 MB/day transfer

### Cost-Saving Tips
1. Set `maxInstances: 10` to prevent runaway costs (already configured)
2. Use appropriate memory allocation:
   - `web` function: 512MiB (moderate traffic)
   - `sweepReservations`: 256MiB (light job)
3. Monitor usage in Firebase Console → Usage tab
4. Set up billing alerts in Google Cloud Console

## Security Checklist

- [x] All secrets stored in Google Secret Manager (not env vars)
- [x] Stripe webhook signature verification enabled
- [x] HTTPS only (enforced by Firebase Hosting)
- [x] Secure cookies (httpOnly, sameSite=lax)
  - **Note**: Cookie security uses `K_SERVICE` environment variable for Firebase Functions detection
  - `K_SERVICE` is automatically set by Cloud Run/Firebase Functions in production
  - Ensures secure cookies in production while preserving HTTP development workflows
- [x] Rate limiting on sensitive endpoints
- [x] Database connection uses SSL (`?sslmode=require`)
- [x] Admin authentication required for protected routes
- [x] Firebase Auth token verification on user routes
- [x] No secrets logged to console

## Support Resources

- **Firebase Console**: https://console.firebase.google.com/project/the-howliday-inn-a471f
- **Firebase Docs**: https://firebase.google.com/docs/functions
- **Stripe Dashboard**: https://dashboard.stripe.com/
- **Neon Console**: https://console.neon.tech/

## Quick Reference Commands

```bash
# Deploy everything
npm run build && cd functions && npm run build && cd .. && firebase deploy --only hosting,functions

# View logs
firebase functions:log --follow

# Set a secret
firebase functions:secrets:set SECRET_NAME

# List functions
firebase functions:list

# Delete a function
firebase functions:delete FUNCTION_NAME

# Emulate locally
firebase emulators:start --only functions,hosting
```

## Production Deployment Checklist

Before deploying to production:

- [ ] All secrets configured in Secret Manager
- [ ] Frontend built successfully (`npm run build`)
- [ ] Functions built successfully (`cd functions && npm run build`)
- [ ] Stripe webhook URL updated to production URL
- [ ] Database connection string includes `?sslmode=require`
- [ ] Test payment flow in staging environment first
- [ ] Admin account created and tested
- [ ] Email sending works (check receipt delivery)
- [ ] Capacity limits configured correctly
- [ ] Scheduled sweeper tested and running
- [ ] Monitoring and alerts set up in Firebase Console
- [ ] Billing alerts configured in Google Cloud Console
- [ ] Backup strategy in place for database
- [ ] Documentation updated with production URLs

## Migration from Replit to Firebase

The server code has been moved from `server/` to `functions/src/server/` with the following changes:

1. **Entry Point**: `functions/src/index.ts` exports `web` function and `sweepReservations` scheduler
2. **App Builder**: `functions/src/server/app.ts` builds the Express app
3. **Static Assets**: Logo moved to `functions/src/server/assets/` and path updated to use `__dirname`
4. **Dependencies**: All server dependencies added to `functions/package.json`
5. **Imports**: All imports use relative paths (no `@/` aliases in Functions)

The original Replit server (`server/index.ts`) remains for local development. For production, Firebase Functions is the deployment target.

