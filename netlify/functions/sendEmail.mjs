// Netlify Function - Send Email via SendGrid
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { to, subject, html, bookingId, serviceType, bookingData } = JSON.parse(event.body);

    if (!to || !subject) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: to, subject' })
      };
    }

    let emailHtml = html;

    // Generate email content if not provided
    if (!emailHtml && bookingId && serviceType) {
      emailHtml = generateBookingConfirmationHTML({
        bookingId,
        serviceType,
        bookingData
      });
    }

    const msg = {
      to: to,
      from: {
        email: process.env.COMPANY_FROM_EMAIL || 'bookings@thehowlidayinn.ie',
        name: process.env.COMPANY_NAME || 'The Howliday Inn'
      },
      subject: subject,
      html: emailHtml || '<p>Thank you for your booking with The Howliday Inn!</p>'
    };

    await sgMail.send(msg);

    console.log(`Email sent to ${to} for booking ${bookingId || 'N/A'}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Email sent successfully' })
    };

  } catch (error) {
    console.error('SendGrid error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to send email',
        details: error.message
      })
    };
  }
};

function generateBookingConfirmationHTML({ bookingId, serviceType, bookingData }) {
  const serviceName = serviceType === 'daycare' ? 'Daycare' : 'Boarding';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Booking Confirmation - The Howliday Inn</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #3b82f6; margin-bottom: 10px;">The Howliday Inn</h1>
        <p style="color: #666; margin: 0;">Premium Dog Daycare & Boarding</p>
      </div>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #22c55e; margin-top: 0;">Booking Confirmed! 🐾</h2>
        <p>Thank you for choosing The Howliday Inn for your furry friend's care. Your ${serviceName.toLowerCase()} booking has been confirmed and payment processed successfully.</p>
      </div>
      
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #374151;">Booking Details</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="padding: 5px 0;"><strong>Booking ID:</strong> ${bookingId}</li>
          <li style="padding: 5px 0;"><strong>Service:</strong> ${serviceName}</li>
          ${bookingData?.dogName ? `<li style="padding: 5px 0;"><strong>Dog:</strong> ${bookingData.dogName}</li>` : ''}
          ${bookingData?.date ? `<li style="padding: 5px 0;"><strong>Date:</strong> ${bookingData.date}</li>` : ''}
          ${bookingData?.dropOffSlot ? `<li style="padding: 5px 0;"><strong>Drop-off:</strong> ${bookingData.dropOffSlot}</li>` : ''}
          ${bookingData?.pickUpSlot ? `<li style="padding: 5px 0;"><strong>Pick-up:</strong> ${bookingData.pickUpSlot}</li>` : ''}
        </ul>
      </div>
      
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
        <h4 style="margin-top: 0; color: #92400e;">Important Reminders</h4>
        <ul style="margin: 10px 0; padding-left: 20px; color: #92400e;">
          <li>Please arrive during your selected drop-off time</li>
          <li>Ensure your dog's vaccinations are up to date</li>
          <li>Bring any special instructions or medications</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <p style="color: #666;">Questions about your booking?</p>
        <p style="margin: 5px 0;">
          <strong>Phone:</strong> <a href="tel:+353555123456" style="color: #3b82f6;">+353 555 123 456</a><br>
          <strong>Email:</strong> <a href="mailto:bookings@thehowlidayinn.ie" style="color: #3b82f6;">bookings@thehowlidayinn.ie</a>
        </p>
      </div>
      
      <div style="text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; font-size: 14px;">
        <p>The Howliday Inn<br>
        Kilgarvan, Curraghbinny, Carrigaline, Co. Cork</p>
        <p style="margin: 10px 0;">Thank you for trusting us with your beloved companion!</p>
      </div>
    </body>
    </html>
  `;
}