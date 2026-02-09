# Maintenance Mode System

## Overview

The Howliday Inn now has a maintenance page system that lets you put up a branded "We'll be back soon" page while you work on updates behind the scenes.

## Quick Start

### Turn Maintenance Mode ON/OFF

**Method 1: Using the helper script (easiest)**
```bash
node maintenance.mjs on      # Turn ON
node maintenance.mjs off     # Turn OFF  
node maintenance.mjs status  # Check status
```

**Method 2: Using URL endpoints**
```
https://www.thehowlidayinn.ie/_maint/on?token=YOUR_TOKEN
https://www.thehowlidayinn.ie/_maint/off?token=YOUR_TOKEN
```

**Method 3: Directly edit `.maintenance` file**
```bash
echo "on" > .maintenance   # Turn ON
echo "off" > .maintenance  # Turn OFF
```

## Staff Bypass

When maintenance mode is ON, staff/admin can still access the real site:

1. **Set the bypass cookie once:**
   Visit: `https://www.thehowlidayinn.ie/?admin=YOUR_TOKEN`
   
2. **Cookie lasts 30 days** - you won't see the maintenance page for that period

3. **Clear bypass:** Delete your cookies or use private/incognito mode

## Security

### Set a Strong Bypass Token

1. In Replit Secrets, create:
   - Key: `MAINTENANCE_BYPASS_TOKEN`
   - Value: Your strong token (e.g., `howli-maint-2025-SECRET`)

2. If not set, defaults to `letmein-123` (insecure - change this!)

## What Happens When ON

✅ Public visitors see: `/public/maintenance.html` (branded Howliday Inn page)
✅ Staff with bypass cookie see: The real working site
✅ You can continue development and testing normally
✅ Search engines won't index (noindex meta tag)

## Files

- `/public/maintenance.html` - The maintenance page visitors see
- `/public/maintenance.css` - Branded styling (Howliday Inn colors)
- `/public/logo.png` - Your logo on the maintenance page
- `.maintenance` - Controls ON/OFF state (git ignored)
- `maintenance.mjs` - Helper script for toggling (ES module)
- `server/index.ts` - Contains the maintenance logic

## Customization

### Update Contact Info

Edit `/public/maintenance.html`:
- Email: Currently `info@thehowlidayinn.ie`
- Phone: Currently `+353 (0)21 000 0000`

### Change Colors/Styling

Edit `/public/maintenance.css`:
- Uses Howliday Inn brand colors (charcoal, cream, gold, beige)
- Responsive design already included

## Typical Workflow

1. **Before making major changes:**
   ```bash
   node maintenance.mjs on
   ```

2. **Work on your updates**
   - Visit `/?admin=YOUR_TOKEN` once to set bypass cookie
   - Continue working as normal
   - Test everything thoroughly

3. **When ready to go public again:**
   ```bash
   node maintenance.mjs off
   ```
   
   **Note:** Changes to `.maintenance` file are detected automatically by the middleware - no server restart required!

## Console Output

When the server starts, you'll see:
```
[maintenance] state: off
[maintenance] bypass URL: /?admin=YOUR_TOKEN
[maintenance] toggle ON: /_maint/on?token=YOUR_TOKEN
[maintenance] toggle OFF: /_maint/off?token=YOUR_TOKEN
```

## Troubleshooting

**Can't access the site at all?**
- Use incognito mode and visit `/_maint/off?token=YOUR_TOKEN`

**Changes to .maintenance not taking effect?**
- Restart the server (`npm run dev` or restart workflow)

**Token not working?**
- Check your `MAINTENANCE_BYPASS_TOKEN` secret in Replit
- Make sure you're using the exact token (case-sensitive)

## Production Deployment

The system works automatically in production. After deploying:

1. Check the console logs for your bypass URLs
2. Save the bypass token securely
3. Toggle maintenance as needed via URL endpoints

---

**Need help?** Check the console logs when the server starts - they show all the URLs you need.
