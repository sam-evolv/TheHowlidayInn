# Replit Deployment Secrets Checklist

**Location**: Replit → Tools → Secrets → **Deployment** Tab

⚠️ **IMPORTANT**: Set these in the **Deployment** secrets, not Development secrets!

---

## 🔴 CRITICAL SECRETS (Required for Deployment)

### 1. Node Environment
```
NODE_ENV=production
```
**Purpose**: Enables production mode (canonical redirects, optimized builds)  
**Status**: ❌ NOT SET - Must add for deployment

### 2. Session Secret
```
SESSION_SECRET=<long random string>
```
**Purpose**: JWT token signing for admin authentication  
**Status**: ✅ EXISTS in development  
**Action**: Copy to deployment or generate new random string (32+ characters)

### 3. Base URL
```
BASE_URL=https://www.thehowlidayinn.ie
```
**Purpose**: Used for email links and redirects  
**Status**: ❌ NOT SET - Must add for deployment

### 4. Stripe Payment Keys
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
**Purpose**: Process payments and verify webhook signatures  
**Status**: ✅ BOTH EXIST  
**Note**: Use `sk_test_...` for testing, switch to `sk_live_...` for production

---

## 🟡 AUTO-PROVIDED SECRETS (Replit manages these)

### Database Connection
```
DATABASE_URL=<auto-provided>
PGHOST=<auto-provided>
PGPORT=<auto-provided>
PGUSER=<auto-provided>
PGPASSWORD=<auto-provided>
PGDATABASE=<auto-provided>
```
**Purpose**: PostgreSQL database connection  
**Status**: ✅ Auto-provided by Replit for both dev and deployment

---

## 🟢 BOOTSTRAP SECRETS (Owner Account Creation)

### Owner Account Setup
```
OWNER_EMAIL=howlidayinn1@gmail.com
OWNER_PASSWORD=TempOwnerPass123!
```
**Purpose**: Automatically creates admin account on first deployment  
**Status**: ✅ BOTH EXIST  
**Security**: Remove these after first successful login and password change

---

## 🔵 FRONTEND SECRETS (VITE_ prefixed)

### Firebase Authentication
```
VITE_FIREBASE_API_KEY=<from Firebase Console>
VITE_FIREBASE_AUTH_DOMAIN=<from Firebase Console>
VITE_FIREBASE_PROJECT_ID=<from Firebase Console>
VITE_FIREBASE_STORAGE_BUCKET=<from Firebase Console>
VITE_FIREBASE_MESSAGING_SENDER_ID=<from Firebase Console>
VITE_FIREBASE_APP_ID=<from Firebase Console>
```
**Purpose**: Firebase client-side authentication  
**Status**: ✅ All exist

### Stripe Public Key
```
VITE_STRIPE_PUBLIC_KEY=pk_live_...
```
**Purpose**: Stripe client-side payment processing  
**Status**: ❌ NOT SET - Must add for deployment  
**Note**: Use `pk_test_...` for testing, `pk_live_...` for production

### Cloudinary (Image Uploads)
```
VITE_CLOUDINARY_CLOUD_NAME=dgr7hsi23
```
**Purpose**: Vaccination document uploads  
**Status**: ✅ EXISTS

---

## 📋 COMPLETE DEPLOYMENT CHECKLIST

### Step 1: Core Secrets (MUST SET)
- [ ] `NODE_ENV=production`
- [ ] `SESSION_SECRET=<copy from dev or generate new>`
- [ ] `BASE_URL=https://www.thehowlidayinn.ie`

### Step 2: Payment Keys (Already Set)
- [x] `STRIPE_SECRET_KEY=sk_live_...` (or sk_test_ for testing)
- [x] `STRIPE_WEBHOOK_SECRET=whsec_...` (from Stripe Dashboard)

### Step 3: Frontend Keys (Check These)
- [x] `VITE_FIREBASE_API_KEY`
- [x] `VITE_FIREBASE_AUTH_DOMAIN`
- [x] `VITE_FIREBASE_PROJECT_ID`
- [x] `VITE_FIREBASE_STORAGE_BUCKET`
- [x] `VITE_FIREBASE_MESSAGING_SENDER_ID`
- [x] `VITE_FIREBASE_APP_ID`
- [ ] `VITE_STRIPE_PUBLIC_KEY=pk_live_...` (or pk_test_ for testing)
- [x] `VITE_CLOUDINARY_CLOUD_NAME`

### Step 4: Bootstrap (Already Set)
- [x] `OWNER_EMAIL=howlidayinn1@gmail.com`
- [x] `OWNER_PASSWORD=TempOwnerPass123!`

### Step 5: Database (Auto-Provided)
- [x] `DATABASE_URL` (Replit auto-provides)

---

## 🎯 QUICK SETUP GUIDE

### For Testing (Use Test Keys)
```bash
NODE_ENV=production
SESSION_SECRET=<random-string-32-chars>
BASE_URL=https://www.thehowlidayinn.ie
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (from test webhook)
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

### For Production (Use Live Keys)
```bash
NODE_ENV=production
SESSION_SECRET=<random-string-32-chars>
BASE_URL=https://www.thehowlidayinn.ie
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (from live webhook)
VITE_STRIPE_PUBLIC_KEY=pk_live_...
```

---

## ⚠️ IMPORTANT NOTES

### Stripe Key Matching
**CRITICAL**: `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLIC_KEY` must be from the same mode:
- Test: `sk_test_...` + `pk_test_...`
- Live: `sk_live_...` + `pk_live_...`

### Webhook Secret
The `STRIPE_WEBHOOK_SECRET` must match the webhook endpoint:
- Test webhook → whsec from test endpoint
- Live webhook → whsec from live endpoint
- Update in Stripe Dashboard: https://dashboard.stripe.com/webhooks

### Session Secret Generation
Generate a secure random string:
```bash
# Option 1: Using openssl
openssl rand -base64 32

# Option 2: Using node
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Post-Deployment Security
After first successful login:
1. Change admin password from `TempOwnerPass123!`
2. Remove `OWNER_EMAIL` and `OWNER_PASSWORD` from deployment secrets
3. Verify all payments are using correct Stripe mode (test vs live)

---

## 🔍 VERIFICATION

After setting all secrets and deploying:

1. **Check Deployment Logs**: Verify no "Missing environment variable" errors
2. **Test Admin Login**: https://www.thehowlidayinn.ie/admin-login
3. **Test Payment Flow**: Complete a test booking with Stripe
4. **Check Webhook**: Verify webhook events in Stripe Dashboard

---

## 🆘 TROUBLESHOOTING

### "SESSION_SECRET is required" error
→ Add `SESSION_SECRET` to deployment secrets

### Stripe payment fails
→ Verify `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLIC_KEY` are from same mode (both test or both live)

### Webhook signature verification failed
→ Check `STRIPE_WEBHOOK_SECRET` matches the endpoint in Stripe Dashboard

### Cannot login to admin
→ Verify `OWNER_EMAIL` and `OWNER_PASSWORD` are set (for first-time bootstrap)

### Custom domain not working
→ Verify `BASE_URL=https://www.thehowlidayinn.ie` is set
