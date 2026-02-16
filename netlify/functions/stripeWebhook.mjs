// Netlify Function - Stripe Webhook Handler
import Stripe from 'stripe';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function getDb() {
  if (!getApps().length) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountJson) {
      throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY');
    }
    initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  }
  return getFirestore();
}

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const sig = event.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Webhook signature verification failed' })
    };
  }

  try {
    const db = getDb();
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(db, stripeEvent.data.object);
        break;
      
      case 'checkout.session.expired':
        await handleCheckoutExpired(db, stripeEvent.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };

  } catch (error) {
    console.error('Webhook handling error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook handling failed' })
    };
  }
};

async function handleCheckoutCompleted(db, session) {
  const { bookingId, serviceType } = session.metadata;
  
  if (!bookingId) {
    console.error('No booking ID in session metadata');
    return;
  }

  try {
    // Update booking status
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();
    
    if (!bookingDoc.exists) {
      console.error('Booking not found:', bookingId);
      return;
    }

    const bookingData = bookingDoc.data();
    
    await bookingRef.update({
      paymentStatus: 'paid',
      status: 'confirmed',
      stripeSessionId: session.id,
      updatedAt: FieldValue.serverTimestamp()
    });

    // Increment capacity for the booking date
    const date = bookingData.date;
    if (date) {
      await incrementCapacity(date, serviceType);
    }

    // Send confirmation email
    await sendConfirmationEmail({
      bookingId,
      customerEmail: session.customer_email,
      serviceType,
      bookingData
    });

    console.log(`Payment confirmed for booking ${bookingId}`);

  } catch (error) {
    console.error('Error processing completed checkout:', error);
    throw error;
  }
}

async function handleCheckoutExpired(db, session) {
  const { bookingId } = session.metadata;
  
  if (!bookingId) {
    return;
  }

  try {
    // Update booking to expired status
    await db.collection('bookings').doc(bookingId).update({
      status: 'expired',
      updatedAt: FieldValue.serverTimestamp()
    });

    console.log(`Booking ${bookingId} marked as expired due to payment timeout`);

  } catch (error) {
    console.error('Error handling expired checkout:', error);
  }
}

async function incrementCapacity(date, serviceType) {
  const capacityRef = db.collection('capacity').doc(date);
  const field = serviceType === 'daycare' ? 'bookedDaycare' : 'bookedBoarding';
  
  try {
    await db.runTransaction(async (transaction) => {
      const capacityDoc = await transaction.get(capacityRef);
      const currentData = capacityDoc.exists ? capacityDoc.data() : {
        maxSpotsDaycare: 40,
        bookedDaycare: 0,
        maxSpotsBoarding: 20,
        bookedBoarding: 0
      };
      
      const newValue = (currentData[field] || 0) + 1;
      transaction.set(capacityRef, {
        ...currentData,
        [field]: newValue,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    });
    
    console.log(`Incremented ${field} for ${date}`);
    
  } catch (error) {
    console.error('Error incrementing capacity:', error);
    throw error;
  }
}

async function sendConfirmationEmail({ bookingId, customerEmail, serviceType, bookingData }) {
  if (!customerEmail) {
    console.log('No customer email provided, skipping confirmation email');
    return;
  }

  try {
    const emailData = {
      to: customerEmail,
      subject: `Booking Confirmed - The Howliday Inn`,
      bookingId,
      serviceType,
      bookingData
    };

    // Call sendEmail function
    const sendEmailUrl = `${process.env.SITE_BASE_URL}/.netlify/functions/sendEmail`;
    const response = await fetch(sendEmailUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    if (response.ok) {
      console.log('Confirmation email sent successfully');
    } else {
      console.error('Failed to send confirmation email:', response.status);
    }

  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }
}
