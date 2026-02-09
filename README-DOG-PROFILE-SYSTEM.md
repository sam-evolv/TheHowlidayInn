# Dog Profile System Implementation

This document covers the setup and usage of the new Dog Profile wizard system integrated into The Howliday Inn booking platform.

## Overview

The system provides:
- 3-step dog registration wizard
- Vaccination compliance checking
- Admin dashboard for dog approval
- Booking validation before payment
- Daily vaccination expiry scanning

## Database Setup

### 1. Push Schema to Database
```bash
npm run db:push
```

### 2. Seed Initial Settings
```bash
node server/db/seed.ts
```

### 3. Make Sam an Admin (one-time)
```bash
node server/scripts/makeAdmin.ts
```

## Environment Variables

Required environment variables (see `.env.example`):

```bash
# Database
DATABASE_URL=postgresql://username:password@host:5432/database

# Upload Provider
UPLOADS_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_PRESET=dog_docs_unsigned

# Admin & Security
ADMIN_CRON_TOKEN=change_me_to_secure_random_string

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## Daily Vaccination Scan (Cron)

### Endpoint
```
POST /api/admin/tasks/daily-vaccine-scan
```

### Required Header
```
X-Admin-Cron: [ADMIN_CRON_TOKEN]
```

### Example cURL Command
```bash
curl -X POST https://your-site.com/api/admin/tasks/daily-vaccine-scan \
  -H "X-Admin-Cron: your_admin_cron_token"
```

### Scheduling
Set up a daily cron job or use your hosting provider's scheduled functions:

- **Netlify Functions**: Create `netlify/functions/daily-scan.js`
- **Vercel Cron**: Add to `vercel.json` cron configuration
- **Traditional Cron**: Add to server crontab

Example cron schedule (daily at 6 AM):
```
0 6 * * * curl -X POST https://your-site.com/api/admin/tasks/daily-vaccine-scan -H "X-Admin-Cron: your_token"
```

## API Endpoints

### User Routes
- `GET /api/me/dogs` - List user's dogs
- `POST /api/me/dogs` - Create new dog profile
- `PATCH /api/me/dogs/:id` - Update dog profile
- `POST /api/me/dogs/:id/vaccinations` - Add/update vaccination
- `GET /api/me/dogs/:id/health` - Get health profile
- `PATCH /api/me/dogs/:id/health` - Update health profile

### Admin Routes
- `GET /api/admin/dogs` - List all dogs with filters
- `GET /api/admin/dogs/:id` - Get dog details
- `PATCH /api/admin/dogs/:id/status` - Approve/reject dog

### Booking Validation
- `GET /api/booking/validate` - Validate dog eligibility for dates
- `POST /api/checkout/create-intent` - Create payment intent with validation

### Upload Configuration
- `GET /api/uploads/config` - Get Cloudinary upload configuration

## Frontend Integration

### Routes
- `/dogs/new` - Dog registration wizard
- `/account/dogs` - User's dog list
- `/admin/dogs` - Admin dog management

### Wizard Steps
1. **About Rover**: Basic dog information and photo
2. **Vaccinations**: Required vaccine records with proof upload
3. **Health & Contacts**: Health profile and emergency contacts

## Dog Status Logic

### Status Types
- `pending` - Awaiting vaccination records or admin review
- `verified` - All requirements met, eligible for booking
- `expired` - Vaccinations expired, needs updates
- `rejected` - Not eligible (breed restrictions, admin decision)

### Required Vaccinations
Default requirements (configurable in admin settings):
- Core - DHPP
- Kennel Cough
- Leptospirosis

## Development Notes

- Uses Drizzle ORM with PostgreSQL (Neon)
- Cloudinary for file uploads (vaccination proofs, dog photos)
- Stripe integration with pre-booking validation
- React Hook Form + Zod for form validation
- Progressive enhancement with localStorage draft saving

## Production Checklist

1. ✅ Set up database and run migrations
2. ✅ Configure environment variables
3. ✅ Test upload functionality
4. ✅ Set up daily cron job
5. ✅ Configure admin users
6. ✅ Test booking validation flow
7. ✅ Verify email notifications (if implemented)

## Troubleshooting

### Common Issues

**Database Connection**: Check `DATABASE_URL` format and network access
**Upload Failures**: Verify Cloudinary credentials and preset configuration
**Authentication**: Ensure Firebase/session integration is working
**Cron Not Running**: Check token and endpoint accessibility

### Logs
Monitor application logs for:
- Environment variable warnings on startup
- Upload errors
- Database connection issues
- Authentication failures