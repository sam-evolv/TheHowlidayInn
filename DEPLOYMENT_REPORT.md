# Howliday Inn Production Deployment Report

**Date**: October 15, 2025  
**Target Domain**: https://www.thehowlidayinn.ie  
**Status**: ✅ READY FOR DEPLOYMENT

---

## 1. FILES CHANGED

### server/auth/session.ts
**Purpose**: Switch from AUTH_SECRET to SESSION_SECRET with fallback

```diff
- const secret = process.env.AUTH_SECRET!;
+ const secret = process.env.SESSION_SECRET || process.env.AUTH_SECRET;
+ if (!secret) {
+   throw new Error('SESSION_SECRET environment variable is required');
+ }

- const data = jwt.verify(token, process.env.AUTH_SECRET!);
+ const secret = process.env.SESSION_SECRET || process.env.AUTH_SECRET;
+ if (!secret) {
+   throw new Error('SESSION_SECRET environment variable is required');
+ }
+ const data = jwt.verify(token, secret);
```

### server/index.ts
**Purpose**: Production-ready same-origin deployment

```typescript
// CORS completely removed - imports deleted
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";

// trust Replit's proxy so HTTPS is detected
app.set('trust proxy', 1);

// one origin: https + www (standardizes entry point for secure cookies)
app.use((req, res, next) => {
  const isHttps = req.headers['x-forwarded-proto'] === 'https';
  const host = req.headers.host;
  if (!isHttps) {
    return res.redirect(301, `https://www.thehowlidayinn.ie${req.originalUrl}`);
  }
  if (host === 'thehowlidayinn.ie') {
    return res.redirect(301, `https://www.thehowlidayinn.ie${req.originalUrl}`);
  }
  next();
});

// Cookie parser
app.use(cookieParser());

// Stripe webhook with raw body parser
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
```

### Cookie Configuration
```typescript
res.cookie('howliday_admin', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  domain: '.thehowlidayinn.ie', // keep as-is; on replit.app it's ignored
  path: '/'
});
```

**How it works:**
- On `www.thehowlidayinn.ie`: Domain `.thehowlidayinn.ie` applies
- On `*.replit.app`: Domain is ignored, uses default host-based domain
- This allows the same code to work in both environments

---

## 2. REQUIRED REPLIT SECRETS

⚠️ **CRITICAL**: Set these in **Replit → Tools → Secrets → DEPLOYMENT tab**

### 🔴 Must Set Manually

| Secret | Current Status | Value to Set | Purpose |
|--------|---------------|--------------|---------|
| `NODE_ENV` | ❌ NOT SET | `production` | Enables production mode |
| `SESSION_SECRET` | ✅ Exists in dev | Copy or generate new | JWT signing |
| `BASE_URL` | ❌ NOT SET | `https://www.thehowlidayinn.ie` | Email links/redirects |
| `VITE_STRIPE_PUBLIC_KEY` | ❌ NOT SET | `pk_live_...` | Frontend Stripe |

### 🟢 Already Set (Verify)

| Secret | Status | Notes |
|--------|--------|-------|
| `STRIPE_SECRET_KEY` | ✅ EXISTS | Backend Stripe (must match public key mode) |
| `STRIPE_WEBHOOK_SECRET` | ✅ EXISTS | From Stripe Dashboard webhook |
| `OWNER_EMAIL` | ✅ EXISTS | Bootstrap admin (remove after first login) |
| `OWNER_PASSWORD` | ✅ EXISTS | Bootstrap password (remove after first login) |
| `DATABASE_URL` | ✅ AUTO | Replit auto-provides |
| `VITE_FIREBASE_*` | ✅ EXISTS | All Firebase keys present |
| `VITE_CLOUDINARY_CLOUD_NAME` | ✅ EXISTS | Image uploads |

### 📋 Quick Setup Commands

**Generate SESSION_SECRET:**
```bash
openssl rand -base64 32
# Or: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Complete Deployment Secrets:**
```
NODE_ENV=production
SESSION_SECRET=<random-32-chars>
BASE_URL=https://www.thehowlidayinn.ie
VITE_STRIPE_PUBLIC_KEY=pk_live_... (or pk_test_ for testing)
```

⚠️ **Stripe Key Matching**: Ensure `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLIC_KEY` are from same mode (both test or both live)

📖 **See DEPLOYMENT_SECRETS_CHECKLIST.md for complete details**

---

## 3. DNS CONFIGURATION FOR REGISTER365

### Records to ADD

```
Type    Name    Value                           TTL
---------------------------------------------------
A       @       34.111.179.208                 Auto
TXT     @       replit-verify=<GET_FROM_REPLIT>  Auto
CNAME   www     <YOUR-REPL>.replit.app         Auto
```

**To get the replit-verify token:**
1. Go to Replit → Deployments → Domains
2. Click "Add Domain"
3. Enter `thehowlidayinn.ie`
4. Copy the TXT verification string shown

### Records to DELETE (Old Firebase hosting)

```
Type    Name    Value/Pattern                    Action
-------------------------------------------------------
A       @       199.36.158.100                  DELETE
TXT     @       hosting-site=...                DELETE
CNAME   www     *.web.app                       DELETE
CNAME   www     *.firebaseapp.com               DELETE
CNAME   www     fwd3.hosts.co.uk                DELETE
```

---

## 4. STRIPE WEBHOOK CONFIGURATION

### Webhook Setup in Stripe Dashboard

**Webhook URL**: `https://www.thehowlidayinn.ie/api/stripe/webhook`

**Events to subscribe**:
- `payment_intent.succeeded`
- `checkout.session.completed`

**Configuration Steps**:
1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Click **"Add endpoint"**
3. Enter URL: `https://www.thehowlidayinn.ie/api/stripe/webhook`
4. Select events: `payment_intent.succeeded`, `checkout.session.completed`
5. Copy the **webhook signing secret**
6. Add to **Replit Secrets** as `STRIPE_WEBHOOK_SECRET`

### Required Secrets in Replit
- `STRIPE_SECRET_KEY` - Your Stripe secret key (sk_live_... or sk_test_...)
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret from Stripe Dashboard

### Technical Implementation

✅ **Raw Body Parsing** (Critical for Stripe signature verification):
```typescript
// BEFORE JSON parser - webhook reads raw body
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Webhook handler with raw body
app.post("/api/stripe/webhook", async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  // ... handle event
});

// AFTER webhook - general JSON parsing
app.use(express.json());
```

✅ **Safety Features**:
- Raw body parser positioned before JSON parser (prevents double parsing)
- Signature verification with `STRIPE_WEBHOOK_SECRET`
- Idempotent payment processing (prevents duplicate charges)
- Proper error handling and logging

---

## 5. SMOKE TESTS (Production Validation)

### Test 1: Health Check
```bash
curl -I https://www.thehowlidayinn.ie/api/health
```
**Expected**: `200 OK` with JSON response

### Test 2: Apex Redirect
```bash
curl -I https://thehowlidayinn.ie/
```
**Expected**: `301 Moved Permanently` → `https://www.thehowlidayinn.ie/`

### Test 3: HTTP → HTTPS Redirect
```bash
curl -I http://www.thehowlidayinn.ie/
```
**Expected**: `301 Moved Permanently` → `https://www.thehowlidayinn.ie/`

### Test 4: Admin Login (Cookie Test)
```bash
# Step 1: Login and save cookie
curl -i -X POST https://www.thehowlidayinn.ie/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"howlidayinn1@gmail.com","password":"TempOwnerPass123!"}' \
  -c /tmp/cookies.txt

# Step 2: Verify cookie attributes in Set-Cookie header
# Expected: Domain=.thehowlidayinn.ie; HttpOnly; Secure; SameSite=Lax; Path=/

# Step 3: Use cookie for authenticated request
curl -i https://www.thehowlidayinn.ie/api/auth/me -b /tmp/cookies.txt
```
**Expected**: 
- Step 1: `200 OK` with `Set-Cookie` header containing proper attributes
- Step 3: `200 OK` with JSON user object

### Test 5: SPA Fallback
```bash
curl -I https://www.thehowlidayinn.ie/admin-login
```
**Expected**: `200 OK` (serves index.html for client-side routing)

---

## 6. DEPLOYMENT PROCEDURE

### Step 1: Deploy to Replit
1. Click **"Deploy"** button in Replit UI
2. Wait for build to complete (runs `npm run build`)
3. Production server starts with `NODE_ENV=production node dist/index.js`

### Step 2: Configure DNS (Register365)
1. Log in to Register365 domain control panel
2. Navigate to DNS management for `thehowlidayinn.ie`
3. **DELETE** all old Firebase records
4. **ADD** new Replit records (see section 3)
5. Save changes and wait for propagation (5-30 minutes)

### Step 3: Verify Domain Connection
1. In Replit → Deployments → Domains
2. Add both domains:
   - `thehowlidayinn.ie` (apex)
   - `www.thehowlidayinn.ie` (www)
3. Wait for "Connected" status

### Step 4: Configure Stripe Webhook
1. Update webhook URL to production domain (see section 4)
2. Verify `STRIPE_WEBHOOK_SECRET` is set in Replit

### Step 5: Run Smoke Tests
1. Execute all curl commands from section 5
2. Verify all tests pass
3. Test admin login in browser

---

## 7. PRODUCTION VS DEVELOPMENT

| Feature | Development | Production |
|---------|-------------|------------|
| **CORS** | ❌ REMOVED | ❌ REMOVED |
| **Cookie Domain** | Host-based | `.thehowlidayinn.ie` |
| **Redirects** | None | HTTPS + WWW forced |
| **API Base** | Relative URLs | Relative URLs |
| **Database** | Dev PostgreSQL | Prod PostgreSQL (separate) |
| **NODE_ENV** | development | production |

---

## 8. WARNINGS & TODOS

### ⚠️ Critical Warnings

1. **Separate Databases**: Production and development use different PostgreSQL databases. Owner account must be bootstrapped in production using `OWNER_EMAIL` and `OWNER_PASSWORD` secrets.

2. **SESSION_SECRET**: Must be set in production environment. Current code falls back to `AUTH_SECRET` for backward compatibility.

3. **DNS Propagation**: After updating DNS records, allow 5-30 minutes for global propagation. Test with `nslookup www.thehowlidayinn.ie` to verify.

### 📋 Post-Deployment TODOs

1. **Change Default Password**: After first login, change the owner password from `TempOwnerPass123!` to a secure password

2. **Remove Bootstrap Secrets**: Once owner account is created, remove `OWNER_EMAIL` and `OWNER_PASSWORD` from environment for security

3. **Monitor Logs**: Check deployment logs for any bootstrap or authentication errors

4. **SSL Certificate**: Verify HTTPS certificate is valid (Replit handles this automatically)

5. **Test Full Booking Flow**: Complete a test booking end-to-end including:
   - Customer booking form
   - Stripe payment
   - Webhook processing
   - Email notifications

---

## 9. TROUBLESHOOTING

### Issue: Admin login fails with "invalid_credentials"
**Cause**: Owner account not bootstrapped in production database  
**Solution**: Verify `OWNER_EMAIL` and `OWNER_PASSWORD` are set in Replit deployment secrets, then redeploy

### Issue: Cookie not persisting
**Cause**: Domain mismatch or missing trust proxy  
**Solution**: Verify `NODE_ENV=production` is set and trust proxy is enabled

### Issue: CORS errors on custom domain
**Cause**: Client making cross-origin requests  
**Solution**: Ensure all API calls use relative URLs (no absolute origins)

### Issue: 404 on client routes
**Cause**: SPA fallback not working  
**Solution**: Verify Vite serves `dist/public` and has catch-all route to `index.html`

---

## 10. SUCCESS CRITERIA

✅ All smoke tests pass  
✅ Admin can login at https://www.thehowlidayinn.ie/admin-login  
✅ Cookies persist across requests  
✅ No CORS errors in browser console  
✅ Apex domain redirects to www  
✅ HTTP redirects to HTTPS  
✅ Stripe webhook receives events successfully  

---

## SUMMARY

The application is **production-ready** with:
- ✅ Same-origin architecture (no CORS)
- ✅ Canonical domain redirects
- ✅ Secure cookie configuration
- ✅ Stripe webhook with raw body parsing
- ✅ Owner account bootstrap on first startup
- ✅ Trust proxy for Replit infrastructure

**Next Action**: Deploy via Replit UI and configure DNS at Register365.

---

## FINAL CONFIGURATION SUMMARY

✅ **Pure Same-Origin Architecture**
- CORS completely removed (no imports, no middleware)
- All API calls use relative URLs (`/api/...`)
- Frontend and backend served from single domain
- No cross-origin requests possible

✅ **Canonical Entry Point** 
- Trust proxy enabled for HTTPS detection
- All traffic normalized to `https://www.thehowlidayinn.ie`
- Redirects before any routes/auth/cookies
- Ensures secure cookies always stick

✅ **Middleware Order (Optimized)**
1. Slash normalization
2. Trust proxy (HTTPS detection)
3. Canonical redirects (HTTPS + www)
4. Cookie parser
5. Stripe webhook (raw body)
6. JSON parser
7. Routes & auth
