// Netlify Function - Create Stripe Checkout Session
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': process.env.SITE_BASE_URL || 'https://www.thehowlidayinn.ie',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': process.env.SITE_BASE_URL || 'https://www.thehowlidayinn.ie'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { bookingId, serviceType, nights, currency = 'eur' } = JSON.parse(event.body);

    if (!bookingId || !serviceType) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': process.env.SITE_BASE_URL || 'https://www.thehowlidayinn.ie'
        },
        body: JSON.stringify({
          error: 'Missing required fields: bookingId, serviceType'
        })
      };
    }

    // Server-side price calculation - never trust client-sent amounts
    const PRICES = {
      daycare: 3500,   // €35 in cents
      boarding: 5500,  // €55 per night in cents
      'boarding:small': 5500,
      'boarding:large': 5500,
      trial: 2000      // €20 in cents
    };

    const unitPrice = PRICES[serviceType];
    if (!unitPrice) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': process.env.SITE_BASE_URL || 'https://www.thehowlidayinn.ie'
        },
        body: JSON.stringify({ error: 'Invalid service type' })
      };
    }

    // For boarding, multiply by number of nights
    const quantity = (serviceType.startsWith('boarding') && nights > 1) ? nights : 1;

    const serviceNames = {
      daycare: 'Daycare Booking',
      boarding: 'Boarding Booking',
      'boarding:small': 'Boarding (Small Dog)',
      'boarding:large': 'Boarding (Large Dog)',
      trial: 'Trial Day'
    };
    const serviceName = serviceNames[serviceType] || 'Booking';
    const baseUrl = process.env.SITE_BASE_URL || 'https://localhost:8888';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: `${serviceName} - The Howliday Inn`,
              description: `Premium ${serviceType.replace(':', ' ')} service for your furry friend`
            },
            unit_amount: unitPrice
          },
          quantity: quantity
        }
      ],
      metadata: {
        bookingId: bookingId,
        serviceType: serviceType
      },
      success_url: `${baseUrl}/success.html?bookingId=${bookingId}`,
      cancel_url: `${baseUrl}/cancel.html?bookingId=${bookingId}`,
      customer_email: null, // Will be filled by customer
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60) // 30 minutes
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': process.env.SITE_BASE_URL || 'https://www.thehowlidayinn.ie',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: session.id,
        url: session.url
      })
    };

  } catch (error) {
    console.error('Stripe session creation error:', error);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': process.env.SITE_BASE_URL || 'https://www.thehowlidayinn.ie'
      },
      body: JSON.stringify({
        error: 'Failed to create checkout session',
        details: error.message
      })
    };
  }
};