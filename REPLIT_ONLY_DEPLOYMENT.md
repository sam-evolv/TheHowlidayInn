# Replit-Only Deployment Implementation

## Objective
Switched from Firebase Hosting + Functions proxy architecture to Replit-only deployment where Replit serves both the SPA frontend and API backend from the same origin, eliminating all CORS issues.

## Architecture Change

### Before (Firebase-based)
- Firebase Hosting → Firebase Functions → Replit backend
- CORS issues when API calls went directly to replit.dev
- Complex dual-environment setup

### After (Replit-only)
- Replit serves everything from same origin
- No CORS needed - true same-origin
- Simpler single-server architecture
- Works on both replit.dev preview and custom domain

## Changes Made

### 1. Updated API Client (client/src/lib/api.ts)
**Change:** Updated baseURL from `/api` to empty string for true same-origin
```typescript
export const api = axios.create({
  baseURL: '',  // same-origin, no prefix needed
  withCredentials: true,  // send/receive cookies
});
```

**Why:** With Replit serving everything, we don't need a `/api` prefix. All requests are relative to the current origin.

### 2. Cookie Domain Configuration (server/auth/session.ts)
**Change:** Removed hardcoded domain from cookie settings
```typescript
res.cookie(COOKIE, token, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
  // Do not set domain - browser uses current host
});
```

**Why:** Without specifying domain, cookies work on both:
- Replit preview: *.replit.dev
- Production: www.thehowlidayinn.ie

### 3. Server Configuration (Already Correct)
The server was already properly configured with:

✅ **Trust Proxy:** `app.set('trust proxy', 1)` - Detects HTTPS behind Replit's reverse proxy
✅ **HTTPS Redirect:** Forces HTTPS and www prefix
✅ **Cookie Parser:** Enabled for session management
✅ **Static Serving:** Uses `serveStatic()` in production mode
✅ **SPA Fallback:** Routes all non-API requests to index.html
✅ **No CORS:** No cors() middleware (not needed for same-origin)

### 4. Development vs Production Modes
**Development (NODE_ENV=development):**
- Vite dev server with HMR
- Serves from `client/` directory
- Hot reload for changes

**Production (NODE_ENV=production):**
- Serves built static files from `dist/public`
- SPA fallback to index.html
- All requests on port 5000

### 5. Build Process (Already Correct)
```json
{
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "NODE_ENV=production node dist/index.js"
}
```

**Build outputs:**
- Frontend: `dist/public/` (served by Express)
- Backend: `dist/index.js` (Node server)

## Verification Checklist

✅ API client uses empty baseURL (same-origin)
✅ No CORS middleware in server
✅ Cookies don't specify domain (works on all hosts)
✅ Server serves static files in production
✅ SPA fallback configured correctly
✅ HTTPS and www redirect enabled
✅ Trust proxy enabled for secure cookies
✅ No absolute URLs in client code (except external links)
✅ Build script outputs to correct directories

## Deployment Process

### For Replit Preview (Development)
1. Start the development workflow
2. Server runs on port 5000 with Vite dev server
3. Access via replit.dev domain

### For Production (Custom Domain)
1. Build: `npm run build`
2. Start: `npm run start` (or `NODE_ENV=production node dist/index.js`)
3. Point DNS: www.thehowlidayinn.ie → Replit
4. Server automatically redirects to HTTPS + www

### DNS Configuration
1. Add custom domain in Replit settings
2. Update DNS A/CNAME records to point to Replit
3. Optionally redirect apex (thehowlidayinn.ie) → www at DNS level

## Key Benefits

1. **No CORS Issues:** Everything same-origin
2. **Simpler Architecture:** One server, one deployment
3. **Better Performance:** No proxy overhead
4. **Easier Debugging:** Single environment to troubleshoot
5. **Works Everywhere:** replit.dev preview AND custom domain

## Files Modified

1. `client/src/lib/api.ts` - Updated baseURL to empty string
2. `server/auth/session.ts` - Removed domain from cookie settings

## Files Verified (No Changes Needed)

1. `server/index.ts` - Already configured correctly
2. `server/vite.ts` - Static serving already implemented
3. `package.json` - Build scripts already correct
4. Client code - No absolute URLs (except external links)

## Testing Required

Before going live, test:
1. ✅ Development mode works
2. ⏳ Production build works (npm run build && npm start)
3. ⏳ All booking flows (daycare, boarding, trial)
4. ⏳ Payment integration with Stripe
5. ⏳ Admin authentication and dashboard
6. ⏳ Cookies persist across requests
7. ⏳ HTTPS redirect works
8. ⏳ Custom domain routing

## Environment Variables

Required for production:
- `DATABASE_URL` - PostgreSQL connection
- `STRIPE_SECRET_KEY` - Stripe API key
- `SESSION_SECRET` or `AUTH_SECRET` - JWT signing
- `VITE_STRIPE_PUBLIC_KEY` - Stripe publishable key (client)
- Firebase config vars (VITE_FIREBASE_*)

Optional:
- `ADMIN_CRON_TOKEN` - Admin cron jobs
- `UPLOADS_PROVIDER=cloudinary` - File uploads
- Cloudinary vars if uploads enabled

## Migration from Firebase

If currently using Firebase Hosting:
1. Build the app: `npm run build`
2. Test locally: `npm run start`
3. Deploy to Replit
4. Update DNS to point to Replit instead of Firebase
5. Remove Firebase Hosting deployment

The Firebase Authentication still works - only the hosting changes.
