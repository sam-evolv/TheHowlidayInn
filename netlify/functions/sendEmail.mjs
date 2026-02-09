// Netlify Function - Send Email via SendGrid
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendEmail({ to, subject, html, bookingId, serviceType, bookingData }) {
  if (!to || !subject) {
    throw new Error('Missing required fields: to, subject');
  }

  let emailHtml = html;

  if (!emailHtml && bookingId && serviceType) {
    emailHtml = generateBookingConfirmationHTML({ bookingId, serviceType, bookingData });
  }

  const msg = {
    to,
    from: {
      email: process.env.COMPANY_FROM_EMAIL || 'bookings@thehowlidayinn.ie',
      name: process.env.COMPANY_NAME || 'The Howliday Inn',
    },
    subject,
    html: emailHtml || '<p>Thank you for your booking with The Howliday Inn!</p>',
  };

  await sgMail.send(msg);
  return { success: true };
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    await sendEmail(payload);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Email sent successfully' }),
    };
  } catch (error) {
    console.error('SendGrid error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to send email',
        details: error.message,
      }),
    };
  }
};

function generateBookingConfirmationHTML({ bookingId, serviceType, bookingData }) {
  const serviceName = serviceType === 'daycare' ? 'Daycare' : 'Boarding';

  return `
    <h2>Booking Confirmed</h2>
    <p>Booking ID: ${bookingId}</p>
    <p>Service: ${serviceName}</p>
    ${bookingData?.dogName ? `<p>Dog: ${bookingData.dogName}</p>` : ''}
    ${bookingData?.date ? `<p>Date: ${bookingData.date}</p>` : ''}
  `;
}
