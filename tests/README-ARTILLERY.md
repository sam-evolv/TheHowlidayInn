# Artillery Capacity Stress Testing

This directory contains Artillery load testing configuration to verify the capacity management system can handle concurrent bookings without overbooking.

## Overview

The Artillery stress tests simulate realistic high-load scenarios to validate:
- **Atomic capacity checking**: Only the configured number of dogs can be booked per day
- **Race condition handling**: Multiple concurrent users competing for the last spot
- **Reservation TTL**: Expired reservations are automatically released
- **System stability**: No crashes, data corruption, or undefined behavior under load

## Prerequisites

### Install Artillery

```bash
npm install -g artillery@latest
```

Or use npx (no installation required):

```bash
npx artillery@latest ...
```

### Environment Setup

Ensure your development server is running:

```bash
npm run dev
```

The tests target `http://localhost:5000` by default.

## Test Files

- `artillery-capacity-stress.yml` - Main test configuration with 4 load phases
- `artillery-processor.js` - Custom JavaScript functions for realistic test data
- `README-ARTILLERY.md` - This documentation

## Running Tests

### Full Stress Test (4 phases, ~3 minutes)

This is the comprehensive test covering warm-up, standard load, peak load, and stress conditions:

```bash
artillery run tests/artillery-capacity-stress.yml
```

### Quick Smoke Test (30 seconds)

For rapid validation during development:

```bash
artillery run tests/artillery-capacity-stress.yml --phases.0.duration 30 --phases.1.duration 0 --phases.2.duration 0 --phases.3.duration 0
```

### Custom Configuration

Override any config parameter:

```bash
# Test against different target
artillery run tests/artillery-capacity-stress.yml --target http://staging.example.com

# Increase load
artillery run tests/artillery-capacity-stress.yml --phases.2.arrivalRate 50

# Custom duration
artillery run tests/artillery-capacity-stress.yml --phases.0.duration 60
```

## Test Phases

The full test runs 4 sequential phases:

### Phase 1: Warm-up (30s)
- **Arrival Rate**: 2 users/second
- **Purpose**: Establish baseline, warm up caches
- **Expected**: All reservations succeed, low utilization

### Phase 2: Standard Load (60s)
- **Arrival Rate**: 10 users/second
- **Purpose**: Simulate normal business operations
- **Expected**: Most reservations succeed, some capacity exceeded errors as days fill up

### Phase 3: Peak Load (60s)
- **Arrival Rate**: 25 users/second
- **Purpose**: Simulate high-demand periods (holidays, weekends)
- **Expected**: Higher capacity exceeded rate, system remains stable

### Phase 4: Stress Test (30s)
- **Arrival Rate**: 50 users/second
- **Purpose**: Intentional overbooking attempt, verify hard limits
- **Expected**: Many capacity exceeded errors, no system crashes, no overbooking

## Test Scenarios

The test executes 4 weighted scenarios:

### 1. Check Availability (30% of traffic)
- GET `/api/availability`
- Validates availability endpoint under load
- Tests random dates and service types

### 2. Create Reservation Only (25% of traffic)
- POST `/api/reservations`
- Tests atomic capacity checking
- Validates 409 Conflict responses when full

### 3. Complete Booking Flow (35% of traffic)
- POST `/api/reservations`
- POST `/api/reservations/:id/payment-intent`
- POST `/api/reservations/:id/release` (50% of time)
- Most realistic user journey
- Tests full reservation lifecycle

### 4. Race Condition Test (10% of traffic)
- GET `/api/availability` (check current)
- POST `/api/reservations` (attempt to reserve)
- POST `/api/reservations/:id/release` (release immediately)
- Validates atomic operations on last available spot

## Interpreting Results

### Key Metrics to Monitor

**Request Metrics**:
- `http.response_time`: Should remain under 500ms for p95
- `http.request_rate`: Should match configured arrival rate
- `http.codes.200`: Successful operations
- `http.codes.409`: Expected when capacity is full (not an error!)
- `http.codes.500`: Server errors (should be 0)

**Custom Metrics** (logged by processor):
- `Reservation Success Rate`: Should be high during warm-up, decrease as capacity fills
- `Capacity Exceeded Rate`: Should increase during peak/stress phases
- `Payment Completion Rate`: Should be ~50% (randomized in test)

### Success Criteria

✅ **Test passes if**:
- No 500 errors (server crashes)
- No overbooking (capacity exceeded errors work correctly)
- Response times remain reasonable (p95 < 1000ms)
- System recovers gracefully after stress phase

❌ **Test fails if**:
- Server crashes (500 errors)
- More bookings confirmed than capacity allows
- Response times exceed acceptable thresholds
- Database deadlocks or connection pool exhaustion

### Example Output

```
Phase started: Warm-up: Baseline traffic (index: 0, duration: 30s)
[RESERVATION SUCCESS] daycare on 2025-10-15 - ID: res_abc123
[RESERVATION SUCCESS] boarding on 2025-10-20 - ID: res_def456
[CAPACITY EXCEEDED] daycare on 2025-10-15 - No availability

========== CAPACITY TEST METRICS ==========
Total Attempts:        500
Successful:            387 (77.4%)
Capacity Exceeded:     105 (21.0%)
Other Failures:        8
Payments Completed:    194
Payments Released:     193
===========================================

Summary report @ 21:45:32(+0000)
────────────────────────────────────────
http.codes.200: .................................... 1547
http.codes.409: .................................... 421
http.request_rate: .................................. 25/sec
http.response_time:
  min: .............................................. 23
  max: .............................................. 487
  p95: .............................................. 312
  p99: .............................................. 398
```

## Troubleshooting

### Issue: High 500 error rate

**Cause**: Server crashes or database errors
**Solution**: Check server logs, verify database connection pool size

### Issue: All requests return 409 (Capacity Exceeded)

**Cause**: Database not cleared between test runs
**Solution**: Either:
1. Clear the database before running tests
2. Run tests with longer date ranges (tests already randomize dates within 30 days)
3. Accept this as realistic behavior - system is protecting capacity limits

### Issue: Response times very high (p95 > 2000ms)

**Cause**: Database queries slow under load or N+1 query problems
**Solution**: Add database indexes, optimize queries, increase connection pool

### Issue: Processor functions not executing

**Cause**: Artillery can't find the processor file
**Solution**: Run from project root: `artillery run tests/artillery-capacity-stress.yml`

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Run Capacity Stress Tests
  run: |
    npm run dev &
    sleep 10
    npx artillery run tests/artillery-capacity-stress.yml --output test-results/artillery-report.json
    npx artillery report test-results/artillery-report.json
```

## Advanced Configuration

### Custom Capacity Limits

Edit the processor file to match your deployment config:

```javascript
// tests/artillery-processor.js
const CAPACITY_DAYCARE = 40;
const CAPACITY_BOARDING = 20;
const CAPACITY_TRIAL = 40;
```

### Load Profiles

Modify `artillery-capacity-stress.yml` phases to match your traffic patterns:

```yaml
phases:
  # Black Friday rush
  - duration: 120
    arrivalRate: 100
    name: "Black Friday simulation"
```

### Distributed Load Testing

Run tests from multiple locations:

```bash
# Artillery Pro (cloud-based)
artillery run-fargate tests/artillery-capacity-stress.yml --count 10 --region us-east-1
```

## Related Documentation

- [Artillery Documentation](https://www.artillery.io/docs)
- [Capacity Control System](../docs/capacity-control.md)
- [Test Matrix](../docs/test-matrix.md)

## Support

For issues with the tests themselves, check:
1. Server is running on `localhost:5000`
2. Database is accessible
3. Artillery is installed and up to date
4. Node.js date-fns is installed (for processor)
