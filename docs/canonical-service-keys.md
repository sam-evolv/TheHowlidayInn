# Canonical Service Keys Documentation

## Overview

The Howliday Inn booking system uses **canonical service keys** to uniquely identify different service types and their variants. This document explains the canonical key system and how it's implemented throughout the application.

## Service Key Format

Canonical service keys follow these patterns:

### Simple Services
- `daycare` - Dog daycare service
- `trial` - Trial day service

### Variant Services (with colons)
- `boarding:small` - Boarding with small kennel
- `boarding:large` - Boarding with large kennel

The colon (`:`) separator indicates a service variant, allowing for specific pricing, capacity, and handling logic.

## Implementation Details

### Frontend Constants
Located in `client/src/lib/constants.ts`:

```typescript
export const SERVICE_TYPES = {
  DAYCARE: 'daycare',
  BOARDING: 'boarding',           // Legacy - use BOARDING_SMALL or BOARDING_LARGE
  BOARDING_SMALL: 'boarding:small',
  BOARDING_LARGE: 'boarding:large',
  TRIAL: 'trial'
} as const;
```

### Backend Pricing Map
Located in `server/routes/booking.ts`:

```typescript
const servicePricing = {
  daycare: 3500,           // €35 per day
  'boarding:small': 5500,  // €55 per day  
  'boarding:large': 5500,  // €55 per day
  trial: 2000,             // €20 flat rate
};
```

### Service Type Validation

**Pattern Matching:**
- Use `serviceType === 'daycare'` for exact match
- Use `serviceType === 'trial'` for exact match
- Use `serviceType.startsWith('boarding')` for any boarding variant

**Example:**
```typescript
// Email template logic
if (booking.serviceType.startsWith('boarding') && booking.checkinDate && booking.checkoutDate) {
  serviceDates = `${booking.checkinDate} to ${booking.checkoutDate}`;
} else if (booking.serviceType === 'daycare' && booking.serviceDate) {
  serviceDates = booking.serviceDate;
} else if (booking.serviceType === 'trial' && booking.trialDate) {
  serviceDates = booking.trialDate;
}
```

## Capacity Management

Canonical service keys are used for capacity tracking:

- `daycare` - Separate capacity pool
- `boarding:small` - Small kennel capacity pool
- `boarding:large` - Large kennel capacity pool  
- `trial` - Separate capacity pool

The admin dashboard allows setting default capacities and creating overrides for each canonical service key.

## Database Storage

**Service Type Column:**
- Field: `service_type` (VARCHAR)
- Stores the full canonical key (e.g., 'boarding:small', 'boarding:large')
- Length should accommodate the longest key including colon separator

## Migration Guide

### From Legacy 'boarding' to Canonical Keys

**Old Approach:**
```typescript
serviceType: 'boarding'
// Kennel size stored separately or inferred
```

**New Approach:**
```typescript
// Frontend sends canonical key based on kennel size selection
const canonicalServiceType = kennelSize === 'large' ? 'boarding:small' : 'boarding:small';
serviceType: canonicalServiceType
```

### Backend Service Type Checks

**Before:**
```typescript
if (booking.serviceType === 'boarding') {
  // Boarding-specific logic
}
```

**After:**
```typescript
if (booking.serviceType.startsWith('boarding')) {
  // Boarding-specific logic for any kennel size
}
```

## Files Modified for Canonical Keys

### Frontend
- `client/src/lib/constants.ts` - Added BOARDING_SMALL and BOARDING_LARGE constants
- `client/src/pages/boarding.tsx` - Updated to send canonical keys based on kennel selection

### Backend
- `server/routes/booking.ts` - Updated pricing map with canonical keys
- `server/index.ts` - Updated email templates to handle canonical keys
- `server/storage-pg.ts` - Updated booking creation to handle canonical keys
- `server/routes.ts` - Updated email receipt logic to handle canonical keys

## Testing

Integration tests validate canonical key handling:

**Test File:** `tests/integration/boarding.service.test.ts`

**Coverage:**
1. Availability endpoint accepts canonical keys
2. Pricing map correctly maps canonical keys to prices
3. Backend storage handles canonical keys via startsWith() checks

**Run Tests:**
```bash
npx tsx tests/integration/boarding.service.test.ts
```

## Best Practices

1. **Always use canonical keys** - Don't use display labels like "Boarding Small" as service types
2. **Use constants** - Reference SERVICE_TYPES.BOARDING_SMALL instead of hardcoding strings
3. **Pattern matching** - Use .startsWith('boarding') for variant services
4. **Consistent naming** - Use lowercase with colons for variants
5. **Validation** - Always validate service types against known canonical keys

## Future Extensions

The canonical key system can be extended for new service variants:

```typescript
// Example: Adding size variants to daycare
'daycare:small': price1,
'daycare:medium': price2,
'daycare:large': price3,

// Example: Adding duration variants
'boarding:overnight': price1,
'boarding:weekend': price2,
```

## Troubleshooting

**Issue:** Backend rejects canonical service key
- **Solution:** Ensure pricing map includes the canonical key
- **Check:** Verify backend uses .startsWith() for variant services

**Issue:** Frontend sends wrong service type
- **Solution:** Verify form logic constructs canonical key correctly
- **Check:** Console log the serviceType before API submission

**Issue:** Capacity not tracking correctly
- **Solution:** Ensure availability queries use canonical keys
- **Check:** Verify capacity defaults/overrides use canonical keys

## Support

For questions or issues with canonical service keys:
1. Check this documentation first
2. Review the test files for examples
3. Examine the files listed in "Files Modified" section
4. Contact the development team
