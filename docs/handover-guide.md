# Handover Guide - The Howliday Inn

## Document Information
**Created:** October 5, 2025  
**Prepared For:** The Howliday Inn Owner/Administrator  
**Application:** Dog Kennel Booking System  
**Domain:** https://www.thehowlidayinn.ie

---

## Table of Contents
1. [Getting Started](#getting-started)
2. [Admin Dashboard Access](#admin-dashboard-access)
3. [Managing Bookings](#managing-bookings)
4. [Managing Dog Profiles](#managing-dog-profiles)
5. [System Settings](#system-settings)
6. [Email & Notifications](#email--notifications)
7. [Payment & Stripe](#payment--stripe)
8. [Security & Password Management](#security--password-management)
9. [Troubleshooting](#troubleshooting)
10. [Support & Maintenance](#support--maintenance)

---

## Getting Started

### What Is This Application?

The Howliday Inn booking system is a complete web application that allows dog owners to:
- Book daycare, boarding, or trial day services online
- Make secure payments via Stripe
- Register their dogs with vaccination information
- Receive confirmation emails

As the owner/admin, you can:
- View and manage all bookings
- Review dog profile applications
- Export booking data to CSV
- Configure system settings
- Change your admin password

### How to Access Your Dashboard

1. **Visit Admin Login:**  
   Navigate to: `https://www.thehowlidayinn.ie/admin/login`

2. **Enter Your Credentials:**
   - Email: `howlidayinn1@gmail.com`
   - Password: [Your secure password]

3. **Access Dashboard:**  
   After successful login, you'll see the admin dashboard with booking statistics.

---

## Admin Dashboard Access

### First-Time Login

**Your Initial Credentials:**
- **Email:** howlidayinn1@gmail.com
- **Password:** [Provided separately for security]

**⚠️ Important First Step:**  
After your first login, immediately change your password following the instructions in [Security & Password Management](#security--password-management).

### Dashboard Overview

When you log in, you'll see:

**Statistics Cards (Top Row):**
- **Total Bookings:** All bookings in the system
- **Confirmed:** Paid and confirmed bookings
- **Pending:** Bookings awaiting payment or review
- **Completed:** Past bookings that have been completed
- **Total Revenue:** Sum of all paid bookings (in euros)

**Tabs:**
1. **Bookings** - View and manage all bookings
2. **Dogs** - Review dog profile applications
3. **Settings** - Configure capacity and change password
4. **Reminders** - Configure automated email reminders

---

## Managing Bookings

### Viewing Bookings

**Access:** Click the "Bookings" tab (default view)

**Table Columns:**
- **Booking ID:** Unique reference number
- **Customer:** Owner's name and email
- **Dog(s):** Dog name(s) for this booking
- **Service:** Daycare, Boarding, or Trial Day
- **Date(s):** Service date or date range
- **Time(s):** Drop-off and pickup times
- **Status:** Pending, Confirmed, Completed, or Cancelled
- **Amount:** Total charge in euros

### Filtering Bookings

**Filter by Date:**
1. Click the date picker
2. Select a specific date to see only bookings for that day
3. Click "Clear" to remove date filter

**Filter by Service Type:**
- Select "All Services", "Daycare", "Boarding", or "Trial"

**Filter by Status:**
- Select "All Status", "Pending", "Confirmed", "Completed", or "Cancelled"

**Search:**
- Type in the search box to find bookings by:
  - Customer name
  - Dog name
  - Booking ID
  - Email

### Viewing Booking Details

1. Find the booking in the table
2. Click the "View" (eye icon) button
3. A details panel will show:
   - Full customer information
   - Dog details and vaccination records
   - Emergency contact
   - Payment information
   - Status

### Exporting Booking Data

**To Export to CSV:**
1. Click the "Export CSV" button (top right of Bookings tab)
2. Choose filters if you want to export specific bookings:
   - Date range
   - Service type
   - Status
3. Click "Export"
4. The file `bookings-export.csv` will download to your computer

**CSV Contents:**
- All booking details
- Customer information
- Dog information
- Payment details
- Timestamps

**Uses:**
- Accounting and bookkeeping
- Monthly/yearly reports
- Customer records
- Business analytics

---

## Managing Dog Profiles

### Understanding Dog Profiles

When customers book services, they must register their dog's information including:
- Name, breed, age, weight
- Vaccination records
- Health information
- Emergency contacts

The system validates against restricted breeds for insurance compliance.

### Viewing Dog Applications

**Access:** Click the "Dogs" tab

**Table Shows:**
- Dog photo (if provided)
- Dog name and breed
- Owner name
- Sex, age, weight
- Status (Approved, Pending, Disallowed)
- Next vaccination expiry date

### Reviewing a Dog Profile

1. Find the dog in the table
2. Click "View Details"
3. Review the detailed information:
   - **Basic Info:** Name, breed, sex, age, weight
   - **Vaccinations:** Types, dates, expiry, documents
   - **Health:** Medical conditions, medications, special needs
   - **Vet Details:** Vet clinic contact information
   - **Emergency Contacts:** Primary and secondary

### Filtering Dogs

**Search:** Type dog name, breed, or owner name

**Status Filter:**
- All
- Approved
- Pending
- Disallowed

**Pagination:** Use Previous/Next buttons to navigate multiple pages

### Restricted Breeds

The following breeds are automatically flagged due to insurance restrictions:
- Pit Bull Terrier
- Japanese Tosa
- Dogo Argentino
- Fila Brasileiro
- American Bulldog
- Akita
- Rottweiler
- Doberman
- German Shepherd (sometimes)
- Any wolf hybrid

Dogs of these breeds will have status "Disallowed" with a reason explanation.

---

## System Settings

### Access Settings

**Location:** Click the "Settings" tab

### Daily Capacity Limits

**Purpose:** Control how many dogs you can accommodate per day.

**To Update Capacity:**
1. Go to Settings tab
2. Find "Daily Capacity Limits" card
3. Enter numbers for:
   - **Daycare Capacity:** Maximum dogs per day (default: 40)
   - **Boarding Capacity:** Maximum overnight dogs (default: 20)
4. Click "Update Capacity Settings"

**Effect:**
- When capacity is reached for a date, new bookings for that date will be prevented
- Existing bookings are not affected

### Viewing Restricted Breeds

**Location:** Settings tab → "Restricted Breeds" card

This shows the current list of breeds that cannot be accommodated. This list is managed in the application code for insurance compliance.

---

## Email & Notifications

### Automated Emails

**Booking Confirmation:**
- Sent automatically when payment is successful
- Contains:
  - The Howliday Inn logo
  - Booking reference number
  - Service details (type, dates, times)
  - Dog name
  - Amount paid
  - Contact information

**Email Sender:**  
Emails are sent from your configured email address (via Resend or SMTP).

### Reminder Settings

**Access:** Click the "Reminders" tab

**Configure:**
1. **Days Before Booking:** How many days before the booking date to send reminder
   - Default: 1 day
   - Range: 0-7 days

2. **Enable/Disable:** Toggle reminders on or off

**Reminder Content:**
- Reminds customers of upcoming booking
- Includes booking details
- Provides contact information for changes

### Email Troubleshooting

**If customers aren't receiving emails:**

1. **Check Spam Folders:** Ask customers to check spam/junk
2. **Verify Email Configuration:**
   - Ensure EMAIL_USER and EMAIL_PASS are set (if using SMTP)
   - Or verify Resend API key is active
3. **Check System Logs:** Contact technical support if issues persist

**Logo Not Displaying:**
- The logo is embedded inline in emails
- Should display in Gmail, Outlook, Apple Mail
- If not visible, it may be an email client issue

---

## Payment & Stripe

### How Payments Work

1. Customer fills out booking form
2. Clicks "Continue to Payment"
3. Redirected to Stripe secure checkout
4. Enters card details (4242 4242 4242 4242 for testing)
5. Payment processed
6. Customer redirected to success page
7. Confirmation email sent
8. Booking appears in admin dashboard as "Confirmed"

### Stripe Dashboard

**Access:** https://dashboard.stripe.com

**Use Stripe Dashboard to:**
- View all transactions
- Issue refunds
- See payment disputes
- Download financial reports
- Verify webhook status

### Test Mode vs Live Mode

**Current Status:** Application is in **TEST MODE**

**Test Mode:**
- Uses test card numbers (4242 4242 4242 4242)
- No real money processed
- Good for testing the system

**⚠️ Going Live:**
When ready to accept real payments:
1. Complete Stripe account verification
2. Update environment variables:
   - `STRIPE_SECRET_KEY` → live key (starts with `sk_live_`)
   - `VITE_STRIPE_PUBLIC_KEY` → live key (starts with `pk_live_`)
3. Test with real card
4. Announce to customers

### Refund Process

**To Issue a Refund:**
1. Log into Stripe Dashboard
2. Find the payment
3. Click "Refund"
4. Enter refund amount
5. Confirm

**In Your Application:**
- Booking will remain in database
- Consider changing status to "Cancelled" manually
- Update customer via email

### Pricing

**Current Prices:**
- **Daycare:** €30 per day
- **Boarding:** €40 per night
- **Trial Day:** €20 (fixed price)

**To Change Prices:**
- Requires code update (contact technical support)
- Or adjust manually in database (not recommended)

---

## Security & Password Management

### Changing Your Admin Password

**⚠️ Important:** Change your password after first login and periodically (every 3-6 months).

**Steps:**
1. Log into admin dashboard
2. Click the "Settings" tab
3. Scroll to "Change Password" section
4. Fill in the form:
   - **Current Password:** Your current password
   - **New Password:** Your new password (minimum 8 characters)
   - **Confirm New Password:** Type new password again
5. Click "Change Password"
6. You'll see a success message

**Password Requirements:**
- Minimum 8 characters
- Recommended: 12+ characters with mix of:
  - Uppercase letters
  - Lowercase letters
  - Numbers
  - Special characters (!@#$%^&*)

**Example Strong Password:**  
`Howliday2025!Secure`

### If You Forget Your Password

**⚠️ Important:** Password reset requires database access or technical support.

**Steps:**
1. Contact your technical support
2. They will reset your password securely
3. You'll receive new temporary password
4. Login and change password immediately

### Logout

**To Log Out:**
1. Look for "Sign Out" or "Logout" button in the header
2. Click to log out
3. You'll be redirected to login page

**Auto-Logout:**
- Session expires after 8 hours of inactivity
- You'll need to log in again

### Security Best Practices

✅ **DO:**
- Use a strong, unique password
- Log out when done
- Change password every 3-6 months
- Keep credentials private

❌ **DON'T:**
- Share your password
- Write password down
- Use same password for other sites
- Stay logged in on shared computers

---

## Troubleshooting

### Common Issues & Solutions

#### "Cannot access admin dashboard"

**Symptoms:** Redirected to login page when visiting /admin

**Solution:**
1. Make sure you're logged in
2. Try clearing browser cache and cookies
3. Log in again
4. Check that your session hasn't expired (8-hour limit)

---

#### "Bookings not showing up"

**Symptoms:** Dashboard is empty or missing recent bookings

**Solutions:**
1. Check date filters - clear all filters
2. Check status filter - set to "All Status"
3. Refresh the page (F5 or Cmd+R)
4. Check if customer completed payment (pending bookings won't show as confirmed)

---

#### "Email not sending"

**Symptoms:** Customers not receiving confirmation emails

**Solutions:**
1. Ask customer to check spam/junk folder
2. Verify email credentials are set correctly
3. Check Resend dashboard for delivery status
4. Contact technical support to verify SMTP settings

---

#### "CSV export not working"

**Symptoms:** Export button doesn't download file

**Solutions:**
1. Check browser popup blocker settings
2. Try different browser (Chrome, Firefox, Edge)
3. Ensure you have bookings to export
4. Check browser downloads folder

---

#### "Cannot change password"

**Symptoms:** Error when trying to change password

**Solutions:**
1. Verify current password is correct
2. Ensure new password is at least 8 characters
3. Check that new password and confirm password match
4. Try logging out and back in
5. Contact technical support if issue persists

---

### Getting Help

**For Technical Issues:**
- Document the error message (screenshot helpful)
- Note what you were trying to do
- Contact technical support with details

**For Business Questions:**
- Review this guide
- Check relevant section
- Contact support if still unclear

---

## Support & Maintenance

### System Maintenance

**Automatic:**
- Database backups: Daily (handled by Neon)
- Security updates: Automatic via Replit
- SSL certificates: Auto-renewed

**Manual:**
- Password changes: Your responsibility
- Content updates: As needed
- Price changes: Requires code update

### Monitoring

**What to Watch:**
- Booking volume (capacity planning)
- Payment success rate (Stripe dashboard)
- Customer inquiries (email/phone)
- System performance (loading speed)

### Updates & Improvements

**Future Enhancements May Include:**
- Customer portal (view booking history)
- Booking modifications (change date/time)
- Loyalty program
- Mobile app
- Advanced reporting

### Contact Information

**Technical Support:**
- For bugs, errors, or system issues
- For password reset
- For configuration changes
- For going live with Stripe

**Your Business Contact:**
- **Phone:** (087) 334-5702
- **Email:** howlidayinn1@gmail.com
- **Website:** https://www.thehowlidayinn.ie

---

## Quick Reference

### Daily Tasks
- [ ] Check new bookings
- [ ] Review payment confirmations
- [ ] Respond to customer inquiries

### Weekly Tasks
- [ ] Review dog profile applications
- [ ] Export bookings for records
- [ ] Check capacity for upcoming week

### Monthly Tasks
- [ ] Export monthly booking report
- [ ] Review Stripe dashboard
- [ ] Check reminder settings

### Quarterly Tasks
- [ ] Change admin password
- [ ] Review system performance
- [ ] Plan capacity adjustments

---

## Conclusion

This system is designed to simplify your booking process and provide a professional experience for your customers. The admin dashboard gives you full control and visibility over all operations.

**Remember:**
- Keep your password secure and change it regularly
- Export bookings regularly for your records
- Monitor capacity to avoid overbooking
- Check Stripe dashboard for payment issues

**For any questions or assistance, contact technical support.**

---

**Document Version:** 1.0  
**Last Updated:** October 5, 2025  
**Next Review:** As needed based on system updates
