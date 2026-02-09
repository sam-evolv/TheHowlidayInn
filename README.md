# The Howliday Inn - Dog Daycare & Boarding Platform

A production-ready web application for The Howliday Inn, a premium dog daycare and boarding business in Cork, Ireland.

## 🏗️ Architecture

**Frontend**: Vanilla HTML/CSS/JS (no bundlers)  
**Backend**: Netlify Functions (serverless)  
**Database**: Firebase Firestore  
**Authentication**: Firebase Auth  
**Storage**: Firebase Storage  
**Payments**: Stripe Checkout  
**Emails**: SendGrid  
**Hosting**: Netlify  

## 📁 Project Structure

```
/public                    # Static frontend files
  index.html              # Homepage with hero, about, services, gallery, FAQ
  booking.html            # Service selection (daycare/boarding)
  daycare.html           # Daycare booking form
  boarding.html          # Boarding booking form
  login.html             # Authentication (sign in/up)
  account.html           # User dashboard (dog profiles)
  portal.html            # Admin dashboard
  success.html           # Payment success page
  cancel.html            # Payment cancelled page
  styles.css             # Global styles
  /assets                # Images and media
  /js                    # JavaScript modules
    firebase-config.js   # Firebase initialization
    auth.js              # Authentication logic
    firestore.js         # Database operations
    storage.js           # File uploads
    breeds.js            # Breed validation
    booking-common.js    # Shared booking utilities
    daycare.js           # Daycare form logic
    boarding.js          # Boarding form logic
    account.js           # Dog profile management
    portal.js            # Admin dashboard
    email-templates.js   # Email content

/netlify                   # Serverless functions
  /functions
    createCheckoutSession.mjs  # Create Stripe payment session
    stripeWebhook.mjs         # Handle Stripe webhooks
    sendEmail.mjs             # Send transactional emails

/config
  firestore.rules       # Firebase security rules

/data
  bannedBreeds.json     # Restricted dog breeds list

netlify.toml             # Netlify configuration
```

## 🔧 Environment Variables

Set these in your Netlify dashboard:

### Required
- `STRIPE_SECRET_KEY` - Stripe secret key (live or test)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `SENDGRID_API_KEY` - SendGrid API key for transactional emails
- `SITE_BASE_URL` - Your domain (e.g., https://www.thehowlidayinn.ie)

### Optional
- `ADMIN_EMAILS` - Comma-separated admin emails (default: admin@thehowlidayinn.ie)
- `COMPANY_NAME` - Business name (default: The Howliday Inn)
- `COMPANY_FROM_EMAIL` - From email address (default: bookings@thehowlidayinn.ie)

### Firebase Configuration
Update `/public/js/firebase-config.js` with your Firebase project credentials:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

## 📊 Data Model

### Firestore Collections

**users/{uid}**
```javascript
{
  name: string,
  email: string,
  phone: string,
  role: 'user' | 'admin',
  createdAt: timestamp
}
```

**users/{uid}/dogs/{dogId}**
```javascript
{
  name: string,
  breed: string,
  sex: 'male' | 'female',
  dob?: string,
  photoUrl?: string,
  temperamentNotes?: string,
  vaccination: {
    date: string (YYYY-MM-DD),
    type: string,
    documentUrl?: string
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**bookings/{bookingId}**
```javascript
{
  userId: string,
  dogId: string,
  dogName: string,
  breed: string,
  serviceType: 'daycare' | 'boarding',
  date: string (YYYY-MM-DD),
  endDate?: string, // for boarding
  dropOffSlot: '8-10' | '16-18',
  pickUpSlot: '8-10' | '16-18' | 'same-day',
  vaccinationProvided: boolean,
  vaccinationChecked: boolean, // admin use
  restrictedBreedBlocked: boolean,
  amount: number, // in cents
  currency: 'eur',
  stripeSessionId?: string,
  paymentStatus: 'unpaid' | 'paid' | 'refunded',
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired',
  createdAt: timestamp
}
```

**capacity/{YYYY-MM-DD}**
```javascript
{
  maxSpotsDaycare: number (default: 40),
  bookedDaycare: number,
  maxSpotsBoarding: number (default: 20),
  bookedBoarding: number,
  updatedAt: timestamp
}
```

**settings/breeds**
```javascript
{
  banned: string[] // lowercase breed names
}
```

## 🚀 Deployment

### 1. Firebase Setup
1. Create a Firebase project
2. Enable Firestore, Authentication (Email/Password), and Storage
3. Deploy security rules: `firebase deploy --only firestore:rules`
4. Update Firebase config in `/public/js/firebase-config.js`

### 2. Stripe Setup
1. Create Stripe account and get API keys
2. Set up webhook endpoint: `https://yoursite.netlify.app/.netlify/functions/stripeWebhook`
3. Configure webhook events: `checkout.session.completed`, `checkout.session.expired`

### 3. SendGrid Setup
1. Create SendGrid account and verify sender identity
2. Generate API key with Mail Send permissions

### 4. Netlify Deployment
1. Connect your Git repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy site (build command: none, publish directory: `public`)

### 5. Domain & DNS
1. Configure custom domain in Netlify
2. Update `SITE_BASE_URL` environment variable

## 🧪 Local Development

### Using Netlify CLI (Recommended)
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Clone repository
git clone <your-repo>
cd howliday-inn

# Install dependencies for functions
cd netlify/functions
npm install

# Start local development server
netlify dev
```

### Static File Server
```bash
# Simple HTTP server
python -m http.server 8000 --directory public
# or
npx serve public
```

## ✅ Testing Checklist

### User Flow Testing
- [ ] Homepage loads with proper navigation
- [ ] User can sign up and sign in
- [ ] User can add dog profiles with photos
- [ ] Daycare booking shows available spots
- [ ] Breed restriction prevents banned breeds
- [ ] Stripe Checkout processes payments
- [ ] Success page shows after payment
- [ ] Confirmation email received
- [ ] Admin can view bookings in portal
- [ ] Admin can toggle vaccination status
- [ ] Capacity management works correctly

### Technical Testing
- [ ] Firebase Auth persistence works
- [ ] Firestore security rules enforced
- [ ] File uploads to Firebase Storage
- [ ] Stripe webhook signature verification
- [ ] Email delivery via SendGrid
- [ ] Mobile responsive design
- [ ] Page load performance
- [ ] Error handling and user feedback

## 📧 Business Contact

**The Howliday Inn**  
Kilgarvan, Curraghbinny  
Carrigaline, Co. Cork  
Ireland  

Phone: +353 555 123 456  
Email: bookings@thehowlidayinn.ie  

---

## 🔒 Security Notes

- All API keys are server-side only (Netlify Functions)
- Firestore security rules prevent unauthorized access
- Stripe webhooks use signature verification
- File uploads are authenticated and validated
- Admin access controlled via email whitelist

## 📱 Browser Support

- Chrome 80+
- Firefox 75+  
- Safari 13+
- Edge 80+

## 🐛 Common Issues

**Firebase connection errors**: Check config values and project permissions  
**Stripe webhook failures**: Verify endpoint URL and signing secret  
**Email delivery issues**: Check SendGrid sender verification and API key  
**Authentication problems**: Ensure Firebase Auth is enabled for email/password  

## 📄 License

Proprietary - The Howliday Inn. All rights reserved.