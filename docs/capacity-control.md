# Capacity Management System

## Overview

The Howliday Inn booking system implements an atomic capacity management system to prevent overbooking and ensure a controlled, safe environment for all dogs. The system enforces hard limits on the number of dogs that can be accommodated per day for each service type.

**Hard Capacity Limits:**
- **Daycare**: 40 dogs per day
- **Boarding**: 20 dogs per stay period
- **Trial Day**: 40 dogs per day

These limits are enforced at the database level using atomic operations, ensuring no race conditions can cause overbooking even under high concurrent load.

## Architecture

### Three-Layer Capacity Control

The system uses a three-layer approach to prevent overbooking:

1. **Availability Table** (Primary Control)
   - PostgreSQL table with atomic row-level locking
   - Tracks `available` and `capacity` for each service-type-date combination
   - Uses `FOR UPDATE` locks during reservation creation
   - Single source of truth for capacity state

2. **Reservation System** (Temporary Holds)
   - Time-limited reservations (10-minute TTL by default)
   - Holds capacity during payment flow
   - Automatically released on expiry or explicit release
   - Committed to confirmed bookings on payment success

3. **Background Sweeper** (Cleanup)
   - Runs every 1 minute
   - Auto-releases expired reservations
   - Prevents capacity starvation from abandoned carts
   - Logs cleanup activity for monitoring

### Database Schema

**Availability Table:**
```sql
CREATE TABLE availability (
  id SERIAL PRIMARY KEY,
  service_type VARCHAR NOT NULL CHECK (service_type IN ('daycare', 'boarding', 'trial')),
  date DATE NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity >= 0),
  available INTEGER NOT NULL CHECK (available >= 0 AND available <= capacity),
  UNIQUE(service_type, date)
);
```

**Reservations Table:**
```sql
CREATE TABLE reservations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type VARCHAR NOT NULL,
  date DATE NOT NULL,
  dog_id VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL,
  status VARCHAR NOT NULL CHECK (status IN ('pending', 'confirmed', 'expired', 'released')),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Reservation Lifecycle

### 1. Check Availability
```
GET /api/availability?date=2025-10-15&serviceType=daycare
```

**Response:**
```json
{
  "date": "2025-10-15",
  "serviceType": "daycare",
  "capacity": 40,
  "available": 12,
  "booked": 25,
  "reserved": 3
}
```

- `available`: Spots that can be reserved right now
- `booked`: Confirmed bookings (payment completed)
- `reserved`: Temporary holds (payment in progress)

### 2. Create Reservation
```
POST /api/reservations
{
  "serviceType": "daycare",
  "date": "2025-10-15",
  "dogId": "dog_abc123",
  "userId": "user_xyz789"
}
```

**Atomic Operation:**
1. Begin database transaction
2. Lock availability row: `SELECT * FROM availability WHERE ... FOR UPDATE`
3. Check if `available > 0`
4. If yes: Decrement `available`, create reservation, commit
5. If no: Rollback, return 409 Conflict

**Success Response (200):**
```json
{
  "reservationId": "res_abc123",
  "expiresAt": "2025-10-15T10:10:00Z",
  "ttl": 600
}
```

**Capacity Exceeded (409):**
```json
{
  "error": "CAPACITY_EXCEEDED",
  "message": "No availability for daycare on 2025-10-15",
  "available": 0,
  "capacity": 40
}
```

### 3. Create Payment Intent
```
POST /api/reservations/res_abc123/payment-intent
{
  "amount": 3500,
  "currency": "eur"
}
```

**Response:**
```json
{
  "clientSecret": "pi_abc123_secret_xyz",
  "reservationId": "res_abc123"
}
```

### 4. Payment Completion (via Webhook)

**On Stripe `payment_intent.succeeded`:**
1. Webhook receives event with `metadata.reservationId`
2. Update reservation status to `confirmed`
3. Move from `reserved` to `booked` in availability table
4. Update booking record to `confirmed` and `paid`
5. Send receipt email to customer

**On Payment Failure:**
- Reservation automatically expires after TTL
- TTL sweeper releases capacity back to available pool
- Customer can try again

### 5. Manual Release (User Abandonment)
```
POST /api/reservations/res_abc123/release
```

**Response:**
```json
{
  "message": "Reservation released",
  "reservationId": "res_abc123"
}
```

Capacity immediately returned to available pool.

## Client-Side Integration

### React Hook: useReservationFlow

All three booking forms (daycare, boarding, trial) use a unified reservation flow:

```typescript
const { reserve, release, isReserving } = useReservationFlow({
  onReserved: (data) => {
    // Reservation successful, proceed to payment
    setReservationId(data.reservationId);
    setExpiresAt(data.expiresAt);
  },
  onError: (error) => {
    // Handle capacity exceeded or other errors
    if (error.code === 'CAPACITY_EXCEEDED') {
      toast.error('No availability for selected date');
    }
  },
});
```

**Key Features:**
- Automatic cleanup on component unmount
- Releases reservation if user navigates away
- Handles payment errors by releasing reservation
- Prevents capacity starvation from abandoned flows

### Error Handling

**Client-Side Mutation Error Handler:**
```typescript
onError: () => {
  // CRITICAL: Release reservation on booking failure
  if (reservationId) {
    releaseReservation(reservationId);
  }
}
```

This ensures that if booking creation fails after payment, the reserved capacity is immediately returned to the available pool.

## Configuration

### Environment Variables

```bash
# Capacity limits per service type
CAPACITY_DAYCARE=40
CAPACITY_BOARDING=20
CAPACITY_TRIAL=40

# Reservation TTL in milliseconds (default: 10 minutes)
RESERVATION_TTL=600000

# TTL sweeper interval in milliseconds (default: 1 minute)
SWEEPER_INTERVAL=60000
```

### Deployment Checklist

1. **Database Setup:**
   ```bash
   npm run db:push
   ```
   Creates `availability` and `reservations` tables

2. **Environment Variables:**
   Set capacity limits in `.env` or hosting platform

3. **Verify Sweeper:**
   Check logs for `[sweeper] Starting TTL sweeper` message

4. **Initial Seed (Optional):**
   Pre-create availability records for next 90 days:
   ```bash
   npm run seed:availability
   ```

## Monitoring & Observability

### Key Metrics to Monitor

1. **Capacity Utilization:**
   - Query: `SELECT date, service_type, (capacity - available) as used, capacity FROM availability`
   - Alert if utilization > 90% for upcoming dates

2. **Reservation Expiry Rate:**
   - Count: Reservations with status='expired'
   - High rate indicates payment flow issues or user friction

3. **Sweeper Performance:**
   - Log: `[sweeper] Released N expired reservations`
   - Should complete in < 1 second under normal load

4. **409 Error Rate:**
   - Monitor `POST /api/reservations` 409 responses
   - Spike indicates high demand or capacity misconfiguration

5. **Stale Reservations:**
   - Query: Pending reservations older than TTL + sweeper interval
   - Should be 0 (indicates sweeper not running)

### Health Check Queries

**Check for capacity violations:**
```sql
SELECT * FROM availability 
WHERE available < 0 OR available > capacity;
```

**Find stale reservations:**
```sql
SELECT * FROM reservations 
WHERE status = 'pending' 
  AND expires_at < NOW() - INTERVAL '2 minutes';
```

**Daily utilization report:**
```sql
SELECT 
  service_type,
  date,
  capacity,
  available,
  capacity - available as occupied,
  ROUND(((capacity - available)::NUMERIC / capacity) * 100, 1) as utilization_pct
FROM availability
WHERE date >= CURRENT_DATE
  AND date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY date, service_type;
```

## Testing

### Unit Tests
- Atomic availability check and decrement
- Reservation creation and expiry
- TTL sweeper cleanup logic
- Webhook commit/release operations

### Integration Tests
See `tests/capacity-race.spec.ts` for Playwright race condition tests:
- Multiple users competing for last spot
- Exactly N users for N spots
- N+1 users for N spots
- Heavy concurrent load
- Expiry and re-reservation
- Rapid churn (create/release cycles)

### Load Tests
See `tests/artillery-capacity-stress.yml` for Artillery stress tests:
- Warm-up: 2 req/s baseline
- Standard: 10 req/s normal operations
- Peak: 25 req/s high demand
- Stress: 50 req/s overbooking attempts

**Success Criteria:**
- No 500 errors (server crashes)
- Capacity never exceeded (no overbooking)
- p95 response time < 1000ms
- Proper 409 responses when full

## Troubleshooting

### Problem: Capacity shows negative available spots

**Cause:** Database inconsistency (should never happen with atomic operations)

**Fix:**
```sql
UPDATE availability 
SET available = GREATEST(0, available)
WHERE available < 0;
```

**Prevention:** Review transaction rollback logic

### Problem: Reservations not expiring

**Cause:** TTL sweeper not running or crashing

**Diagnosis:**
1. Check server logs for `[sweeper] Starting TTL sweeper`
2. Check for sweeper error messages
3. Verify `SWEEPER_INTERVAL` environment variable

**Fix:**
1. Restart server to restart sweeper
2. Manually release stuck reservations:
```sql
UPDATE reservations 
SET status = 'expired' 
WHERE status = 'pending' 
  AND expires_at < NOW();
```
3. Recalculate availability:
```sql
-- Count actual confirmed bookings
UPDATE availability a
SET available = capacity - (
  SELECT COUNT(*) 
  FROM bookings b 
  WHERE b.service_date = a.date 
    AND b.service_type = a.service_type
    AND b.status = 'confirmed'
)
WHERE a.date >= CURRENT_DATE;
```

### Problem: High 409 error rate

**Cause:** Genuine high demand or capacity too low

**Diagnosis:**
1. Check utilization metrics
2. Review booking patterns (time of day, specific dates)
3. Analyze user feedback

**Options:**
1. Increase capacity limits (if facility allows)
2. Add waiting list feature
3. Implement dynamic pricing for peak periods
4. Send availability alerts to users

### Problem: Payment completed but reservation not committed

**Cause:** Webhook delivery failure or processing error

**Diagnosis:**
1. Check Stripe webhook logs in dashboard
2. Search server logs for `[wh]` messages
3. Query for orphaned reservations:
```sql
SELECT r.* 
FROM reservations r
LEFT JOIN bookings b ON r.id = b.id
WHERE r.status = 'confirmed' 
  AND b.id IS NULL;
```

**Fix:**
1. Manually create booking record
2. Retry webhook delivery from Stripe dashboard
3. Implement webhook retry logic with exponential backoff

## Performance Optimization

### Database Indexes

Required indexes for optimal performance:

```sql
CREATE INDEX idx_availability_service_date ON availability(service_type, date);
CREATE INDEX idx_reservations_expires_at ON reservations(expires_at) WHERE status = 'pending';
CREATE INDEX idx_reservations_status ON reservations(status);
```

### Query Optimization

**Availability Check (Hot Path):**
```sql
SELECT available, capacity 
FROM availability 
WHERE service_type = $1 AND date = $2
LIMIT 1;
```
- Should use `idx_availability_service_date`
- Execution time: < 1ms
- No sequential scans

**Sweeper Cleanup (Background):**
```sql
SELECT id FROM reservations 
WHERE status = 'pending' 
  AND expires_at < NOW()
LIMIT 100;
```
- Should use `idx_reservations_expires_at`
- Execution time: < 10ms
- Batch size limits impact

### Connection Pooling

Recommended Neon/PostgreSQL settings:
- Min connections: 5
- Max connections: 20
- Idle timeout: 30 seconds
- Connection timeout: 5 seconds

## Security Considerations

### Rate Limiting

Apply rate limits to reservation endpoints:
- `POST /api/reservations`: 10 requests/minute per IP
- `GET /api/availability`: 60 requests/minute per IP

Prevents abuse and reservation hoarding.

### User Authentication

Reservations require authenticated user:
- `userId` from Firebase Auth token
- `dogId` must belong to authenticated user
- Prevents reservation spoofing

### CSRF Protection

All mutation endpoints use CSRF tokens:
- Generated per session
- Validated on POST requests
- Prevents cross-site attacks

## Future Enhancements

### Priority Queue System
- VIP customers get priority access to last spots
- Implemented via separate reservation pools
- Requires schema changes to support tiers

### Dynamic Capacity
- Adjust capacity based on staff availability
- Holiday hours with reduced capacity
- Requires capacity override system

### Waiting List
- Auto-notify when spots become available
- Implement via event system on release
- Requires notification service integration

### Capacity Forecasting
- Predict busy periods based on historical data
- Recommend optimal booking times
- Machine learning integration

### Multi-Location Support
- Different capacity per location
- Location-aware availability checks
- Requires location_id in schema

## Related Documentation

- [Testing Matrix](./test-matrix.md) - Comprehensive test cases
- [Artillery Stress Tests](../tests/README-ARTILLERY.md) - Load testing guide
- [API Documentation](./api.md) - Complete API reference
- [Deployment Guide](./deployment.md) - Production deployment steps

## Support

For capacity system issues:
1. Check logs for `[sweeper]` and `[capacity]` messages
2. Run health check queries above
3. Review recent code changes to reservation endpoints
4. Contact development team with reservation IDs and timestamps
