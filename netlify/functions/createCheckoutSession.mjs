// Netlify Function - Create Stripe Checkout Session
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { bookingId, serviceType, amount, currency = 'eur' } = JSON.parse(event.body);

    if (!bookingId || !serviceType || !amount) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Missing required fields: bookingId, serviceType, amount' 
        })
      };
    }

    const serviceName = serviceType === 'daycare' ? 'Daycare Booking' : 'Boarding Booking';
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
              description: `Premium ${serviceType} service for your furry friend`
            },
            unit_amount: amount // amount in cents
          },
          quantity: 1
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
        'Access-Control-Allow-Origin': '*',
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
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to create checkout session',
        details: error.message
      })
    };
  }
};