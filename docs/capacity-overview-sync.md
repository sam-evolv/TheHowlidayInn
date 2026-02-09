# Capacity Overview Synchronization

## Overview

The Capacity Overview system provides real-time, server-authoritative capacity data for the admin dashboard. This document explains the data flow, query invalidation rules, and how the system ensures the UI always displays current capacity information without requiring page reloads.

## Architecture

### Server-Side Authority

The server is the single source of truth for all capacity data. The frontend never calculates or derives capacity values locally - all data comes from API endpoints.

### Key Endpoints

#### GET /api/capacity/overview?date=YYYY-MM-DD

Returns unified capacity data for a specific date:

```json
{
  "date": "2025-10-09",
  "resources": {
    "daycare": { "capacity": 10, "booked": 0, "reserved": 0 },
    "boarding:small": { "capacity": 10, "booked": 0, "reserved": 0 },
    "boarding:large": { "capacity": 8, "booked": 0, "reserved": 0 },
    "trial:day": { "capacity": 10, "booked": 0, "reserved": 0 }
  },
  "aggregate": {
    "boarding": { "capacity": 18, "booked": 0, "reserved": 0 }
  },
  "totals": {
    "capacity": 38,
    "available": 38,
    "occupied": 0,
    "utilisationPct": 0
  }
}
```

**Effective Capacity Calculation:**
- For each resource and date, the server computes: `effectiveCapacity = override(date, resource) ?? default(resource)`
- Overrides take precedence over defaults
- Booking counts come from the reservations table (booked = committed, reserved = active)

#### PUT /api/capacity/defaults

Updates global capacity defaults:

```json
{
  "daycare": 10,
  "boardingSmall": 10,
  "boardingLarge": 8,
  "trial": 10
}
```

Returns the updated defaults and triggers query invalidation.

#### POST/DELETE /api/admin/capacity

Create or delete date-specific capacity overrides. These operations trigger query invalidation for affected dates.

## Frontend Query Management

### Query Keys

The frontend uses a hierarchical query key structure for precise cache invalidation:

```typescript
// Capacity Overview - primary query
["capacityOverview", date]

// Admin capacity data (defaults + overrides)
["/api/admin/capacity"]

// Individual service availability (legacy, being phased out)
["/api/availability", service, date]
```

### Query Invalidation Rules

After any capacity mutation (defaults update, override create/delete/reset), the following queries are invalidated:

1. **`["capacityOverview"]`** - Invalidates all capacity overview queries across all dates
2. **`["/api/admin/capacity"]`** - Invalidates the admin capacity management data
3. **`/api/availability*`** - Invalidates legacy availability queries (for backwards compatibility)

### React Query Implementation

**CapacityOverview Component:**

```typescript
const { data } = useQuery<CapacityOverviewResponse>({
  queryKey: ["capacityOverview", selectedDate],
  queryFn: () => apiRequest(`/api/capacity/overview?date=${selectedDate}`),
});
```

**Mutation with Invalidation:**

```typescript
const updateDefaultsMutation = useMutation({
  mutationFn: async (data) => {
    return apiRequest('/api/capacity/defaults', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/capacity'] });
    queryClient.invalidateQueries({ queryKey: ['capacityOverview'] });
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey[0] as string;
        return key?.startsWith('/api/availability');
      }
    });
  },
});
```

## Data Flow

### 1. Initial Load

1. User navigates to admin dashboard
2. CapacityOverview component mounts
3. React Query fetches `/api/capacity/overview?date=<today>`
4. Server computes effective capacity (defaults + overrides + booking counts)
5. UI renders cards with server data

### 2. Update Capacity Defaults

1. User clicks "Edit Capacity Settings"
2. User modifies defaults (e.g., daycare=20, boarding small=15)
3. User clicks "Update Capacity Settings"
4. Mutation fires: `PUT /api/capacity/defaults`
5. Server updates database
6. Mutation onSuccess invalidates queries:
   - `["capacityOverview"]` → refetches overview for current date
   - `["/api/admin/capacity"]` → refetches admin data
7. UI updates instantly with new values

### 3. Create Date-Specific Override

1. User selects service, date, and capacity
2. User clicks "Create Override"
3. Mutation fires: `POST /api/admin/capacity`
4. Server creates override in database
5. Mutation onSuccess invalidates queries (same as above)
6. If Overview is showing the affected date, it refetches and updates instantly

### 4. Change Date in Overview

1. User changes date picker to different date
2. Query key changes from `["capacityOverview", "2025-10-09"]` to `["capacityOverview", "2025-10-10"]`
3. React Query automatically fetches new date's data
4. UI updates with new date's capacity (may show defaults or overrides depending on what's configured)

## Boarding Aggregate

Boarding capacity is split into two resources:
- `boarding:small` (default: 10)
- `boarding:large` (default: 8)

The Overview shows an aggregate "Boarding" card:
- Capacity = boarding:small capacity + boarding:large capacity
- Booked = boarding:small booked + boarding:large booked
- Reserved = boarding:small reserved + boarding:large reserved

This aggregation happens server-side in the `/api/capacity/overview` endpoint to maintain server authority.

## Testing

### Playwright Tests

Three comprehensive test suites verify the synchronization:

**`capacity-overview-defaults.spec.ts`**
- Verifies defaults update reflects instantly in Overview
- Tests different default combinations
- Verifies loading states and no page reload required

**`capacity-overview-overrides.spec.ts`**
- Verifies overrides update Overview for specific dates
- Tests date switching between override and default dates
- Verifies override deletion reverts to defaults

**`capacity-overview-refresh.spec.ts`**
- Verifies query invalidation after all mutation types
- Confirms no page reload is required
- Tests multiple operations in sequence

### Running Tests

```bash
# Run all capacity overview tests
npx playwright test capacity-overview

# Run specific test file
npx playwright test capacity-overview-defaults.spec.ts

# Run in UI mode for debugging
npx playwright test --ui
```

## Troubleshooting

### Overview Not Updating

1. Check browser console for React Query errors
2. Verify mutation onSuccess is calling invalidateQueries
3. Check network tab for successful API responses
4. Ensure query key matches exactly: `["capacityOverview", date]`

### Stale Data Showing

1. Verify server is computing effective capacity correctly
2. Check database for correct defaults and overrides
3. Ensure no client-side calculations are overriding server data
4. Clear React Query cache: `queryClient.clear()`

### Boarding Aggregate Wrong

1. Verify both boarding:small and boarding:large are configured
2. Check server aggregation logic in `/api/capacity/overview`
3. Ensure booking counts are summed for both resources

## Maintenance

### Adding New Resource Types

1. Update `GET /api/capacity/overview` to include new resource
2. Update capacity defaults schema
3. Update CapacityOverview component to display new resource
4. Add tests for new resource

### Modifying Invalidation Rules

All invalidation logic is centralized in mutation onSuccess handlers in `CapacityManagement.tsx`. Update all mutations when changing invalidation rules to maintain consistency.

## Key Principles

1. **Server Authority**: Server is always the source of truth
2. **No Client Calculation**: UI never derives capacity values locally
3. **Immediate Feedback**: Mutations trigger instant refetch via query invalidation
4. **No Page Reloads**: React Query handles all updates automatically
5. **Precise Invalidation**: Invalidate only affected queries for optimal performance
