/**
 * Artillery Processor for Capacity Stress Testing
 * 
 * This file contains custom functions used by Artillery to:
 * - Generate realistic test data
 * - Manipulate requests before sending
 * - Validate and log responses
 * - Track capacity metrics during load testing
 */

const { addDays, format } = require('date-fns');

// Tracking metrics across scenarios
const metrics = {
  reservationAttempts: 0,
  reservationSuccesses: 0,
  reservationFailures: 0,
  capacityExceeded: 0,
  paymentsCompleted: 0,
  paymentsReleased: 0,
};

/**
 * Set a random future date for availability checks
 */
function setAvailabilityDate(requestParams, context, ee, next) {
  // Generate a random date within next 30 days
  const daysAhead = Math.floor(Math.random() * 30);
  const targetDate = addDays(new Date(), daysAhead);
  const dateString = format(targetDate, 'yyyy-MM-dd');
  
  // Random service type
  const serviceTypes = ['daycare', 'boarding', 'trial'];
  const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
  
  // Update URL with actual values
  requestParams.url = `/api/availability?date=${dateString}&serviceType=${serviceType}`;
  
  context.vars.checkDate = dateString;
  context.vars.checkServiceType = serviceType;
  
  return next();
}

/**
 * Capture availability data from response
 */
function captureAvailability(requestParams, response, context, ee, next) {
  if (response.statusCode === 200 && response.body) {
    try {
      const data = JSON.parse(response.body);
      context.vars.availableSpots = data.available;
      context.vars.totalCapacity = data.capacity;
      context.vars.utilizationPercent = ((data.capacity - data.available) / data.capacity * 100).toFixed(1);
      
      // Log interesting availability states
      if (data.available === 0) {
        console.log(`[CAPACITY FULL] ${context.vars.checkServiceType} on ${context.vars.checkDate} - 0 spots available`);
      } else if (data.available <= 3) {
        console.log(`[LOW CAPACITY] ${context.vars.checkServiceType} on ${context.vars.checkDate} - only ${data.available} spots left`);
      }
    } catch (err) {
      console.error('Failed to parse availability response:', err.message);
    }
  }
  return next();
}

/**
 * Set today's date for race condition tests
 */
function setTodayDate(requestParams, context, ee, next) {
  const today = format(new Date(), 'yyyy-MM-dd');
  context.vars.todayDate = today;
  requestParams.url = `/api/availability?date=${today}&serviceType=daycare`;
  return next();
}

/**
 * Reset context variables at start of flow to prevent cross-iteration pollution
 */
function resetContextVariables(requestParams, context, ee, next) {
  // Clear all reservation-related variables from previous iterations
  context.vars.reservationId = null;
  context.vars.shouldRelease = false;
  context.vars.clientSecret = null;
  context.vars.raceReservationId = null;
  
  return next();
}

/**
 * Generate realistic reservation payload
 */
function generateReservationPayload(requestParams, context, ee, next) {
  // Generate random date within next 14 days (realistic booking window)
  const daysAhead = Math.floor(Math.random() * 14) + 1;
  const targetDate = addDays(new Date(), daysAhead);
  const dateString = format(targetDate, 'yyyy-MM-dd');
  
  // Random service type (weighted towards daycare as it's most common)
  const rand = Math.random();
  let serviceType;
  if (rand < 0.6) {
    serviceType = 'daycare';
  } else if (rand < 0.9) {
    serviceType = 'boarding';
  } else {
    serviceType = 'trial';
  }
  
  // Generate unique identifiers
  const userId = `load-test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const dogId = `load-test-dog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Set context variables for use in subsequent requests
  context.vars.serviceType = serviceType;
  context.vars.bookingDate = dateString;
  context.vars.dogId = dogId;
  context.vars.userId = userId;
  
  // Update request body
  requestParams.json = {
    serviceType,
    date: dateString,
    dogId,
    userId,
  };
  
  metrics.reservationAttempts++;
  
  return next();
}

/**
 * Log reservation result and track metrics
 * Also clears context variables on failure to prevent stale data
 */
function logReservationResult(requestParams, response, context, ee, next) {
  const serviceType = context.vars.serviceType;
  const date = context.vars.bookingDate;
  
  if (response.statusCode === 200) {
    metrics.reservationSuccesses++;
    try {
      const data = JSON.parse(response.body);
      console.log(`[RESERVATION SUCCESS] ${serviceType} on ${date} - ID: ${data.reservationId} (expires: ${data.expiresAt})`);
    } catch (err) {
      console.log(`[RESERVATION SUCCESS] ${serviceType} on ${date}`);
    }
  } else {
    // Clear reservationId on any non-200 response to prevent downstream steps
    context.vars.reservationId = null;
    context.vars.shouldRelease = false;
    
    if (response.statusCode === 409) {
      metrics.capacityExceeded++;
      console.log(`[CAPACITY EXCEEDED] ${serviceType} on ${date} - No availability`);
    } else if (response.statusCode === 400) {
      metrics.reservationFailures++;
      console.log(`[RESERVATION FAILED] ${serviceType} on ${date} - Bad request`);
    } else {
      metrics.reservationFailures++;
      console.log(`[RESERVATION ERROR] ${serviceType} on ${date} - Status: ${response.statusCode}`);
    }
  }
  
  // Log metrics every 50 attempts
  if (metrics.reservationAttempts % 50 === 0) {
    logMetrics();
  }
  
  return next();
}

/**
 * Decide whether to complete payment or release reservation
 * Sets context variable to control flow in YAML
 */
function decidePaymentOutcome(requestParams, context, ee, next) {
  // 50% chance to abandon (release), 50% to complete (leave pending for webhook)
  const shouldRelease = Math.random() < 0.5;
  context.vars.shouldRelease = shouldRelease;
  
  if (shouldRelease) {
    console.log(`[PAYMENT DECISION] Will release reservation: ${context.vars.reservationId}`);
  } else {
    // Increment completed metric immediately for kept reservations
    metrics.paymentsCompleted++;
    console.log(`[PAYMENT DECISION] Will keep reservation pending: ${context.vars.reservationId}`);
  }
  
  return next();
}

/**
 * Clear state if payment intent creation fails
 */
function clearStateOnPaymentIntentFailure(requestParams, response, context, ee, next) {
  if (response.statusCode !== 200) {
    // Payment intent failed - clear state to prevent downstream execution
    console.log(`[PAYMENT INTENT FAILED] Status ${response.statusCode} for reservation ${context.vars.reservationId}`);
    context.vars.reservationId = null;
    context.vars.shouldRelease = false;
    context.vars.clientSecret = null;
  }
  return next();
}

/**
 * Track successful release for metrics
 */
function trackReleaseResult(requestParams, response, context, ee, next) {
  if (response.statusCode === 200) {
    metrics.paymentsReleased++;
    console.log(`[RELEASE CONFIRMED] Reservation ${context.vars.reservationId} released`);
  } else if (response.statusCode === 404) {
    console.log(`[RELEASE WARNING] Reservation ${context.vars.reservationId} not found (may have expired)`);
  }
  return next();
}


/**
 * Log accumulated metrics
 */
function logMetrics() {
  const successRate = (metrics.reservationSuccesses / metrics.reservationAttempts * 100).toFixed(1);
  const capacityExceededRate = (metrics.capacityExceeded / metrics.reservationAttempts * 100).toFixed(1);
  
  console.log('\n========== CAPACITY TEST METRICS ==========');
  console.log(`Total Attempts:        ${metrics.reservationAttempts}`);
  console.log(`Successful:            ${metrics.reservationSuccesses} (${successRate}%)`);
  console.log(`Capacity Exceeded:     ${metrics.capacityExceeded} (${capacityExceededRate}%)`);
  console.log(`Other Failures:        ${metrics.reservationFailures}`);
  console.log(`Payments Completed:    ${metrics.paymentsCompleted}`);
  console.log(`Payments Released:     ${metrics.paymentsReleased}`);
  console.log('===========================================\n');
}

/**
 * Print final metrics at end of test
 */
function afterScenario(context, ee, next) {
  return next();
}

// Export functions for Artillery
module.exports = {
  resetContextVariables,
  setAvailabilityDate,
  captureAvailability,
  setTodayDate,
  generateReservationPayload,
  logReservationResult,
  clearStateOnPaymentIntentFailure,
  decidePaymentOutcome,
  trackReleaseResult,
  afterScenario,
};
