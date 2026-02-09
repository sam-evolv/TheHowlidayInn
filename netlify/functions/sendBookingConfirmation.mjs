import { sendEmail } from './sendEmail.mjs';

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { bookingData, ownerData } = JSON.parse(event.body);

    // Email to customer
    const customerEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center;">
          <h1>Booking Confirmation - The Howliday Inn</h1>
        </div>
        
        <div style="padding: 20px;">
          <h2>Dear ${ownerData.name},</h2>
          
          <p>Thank you for choosing The Howliday Inn! Your booking has been confirmed.</p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Booking Details:</h3>
            <p><strong>Service:</strong> ${bookingData.serviceType === 'daycare' ? 'Daycare' : 'Boarding'}</p>
            <p><strong>Check-in Date:</strong> ${bookingData.checkInDate}</p>
            ${bookingData.checkOutDate ? `<p><strong>Check-out Date:</strong> ${bookingData.checkOutDate}</p>` : ''}
            <p><strong>Drop-off Time:</strong> ${bookingData.dropOffTime}</p>
            <p><strong>Pick-up Time:</strong> ${bookingData.pickUpTime}</p>
            <p><strong>Dogs:</strong> ${bookingData.dogNames.join(', ')}</p>
            <p><strong>Total Amount:</strong> €${(bookingData.totalAmount / 100).toFixed(2)}</p>
            ${bookingData.notes ? `<p><strong>Special Notes:</strong> ${bookingData.notes}</p>` : ''}
          </div>

          <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Important Reminders:</h3>
            <ul>
              <li>Please ensure your dogs have current vaccination records</li>
              <li>Bring your dog's regular food to maintain their routine</li>
              <li>Include any comfort items like blankets or toys</li>
              <li>Provide clear medication instructions if applicable</li>
            </ul>
          </div>

          <p>If you have any questions or need to make changes, please contact us at:</p>
          <p>📞 +353 1 234 5678<br>
          📧 hello@thehowlidayinn.ie</p>

          <p>We look forward to welcoming your furry family members!</p>
          
          <p>Best regards,<br>
          The Howliday Inn Team</p>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
          <p>The Howliday Inn | Premium Dog Daycare & Boarding | Cork, Ireland</p>
        </div>
      </div>
    `;

    // Email to business
    const businessEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #059669; color: white; padding: 20px; text-align: center;">
          <h1>New Booking Received</h1>
        </div>
        
        <div style="padding: 20px;">
          <h2>New ${bookingData.serviceType === 'daycare' ? 'Daycare' : 'Boarding'} Booking</h2>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Customer Information:</h3>
            <p><strong>Name:</strong> ${ownerData.name}</p>
            <p><strong>Email:</strong> ${ownerData.email}</p>
            <p><strong>Phone:</strong> ${ownerData.phone || 'Not provided'}</p>
          </div>

          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Booking Details:</h3>
            <p><strong>Service:</strong> ${bookingData.serviceType === 'daycare' ? 'Daycare' : 'Boarding'}</p>
            <p><strong>Check-in Date:</strong> ${bookingData.checkInDate}</p>
            ${bookingData.checkOutDate ? `<p><strong>Check-out Date:</strong> ${bookingData.checkOutDate}</p>` : ''}
            <p><strong>Drop-off Time:</strong> ${bookingData.dropOffTime}</p>
            <p><strong>Pick-up Time:</strong> ${bookingData.pickUpTime}</p>
            <p><strong>Dogs:</strong> ${bookingData.dogNames.join(', ')}</p>
            <p><strong>Total Amount:</strong> €${(bookingData.totalAmount / 100).toFixed(2)}</p>
            <p><strong>Status:</strong> ${bookingData.status}</p>
            ${bookingData.notes ? `<p><strong>Special Notes:</strong> ${bookingData.notes}</p>` : ''}
          </div>

          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.URL}/admin" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View in Admin Dashboard
            </a>
          </div>
        </div>
      </div>
    `;

    // Send emails
    await Promise.all([
      sendEmail({
        to: ownerData.email,
        subject: `Booking Confirmation - The Howliday Inn`,
        html: customerEmailContent,
      }),
      sendEmail({
        to: process.env.BUSINESS_EMAIL || 'hello@thehowlidayinn.ie',
        subject: `New ${bookingData.serviceType} Booking - ${ownerData.name}`,
        html: businessEmailContent,
      }),
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Booking confirmation emails sent successfully' 
      }),
    };
  } catch (error) {
    console.error('Error sending booking confirmation:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to send booking confirmation emails',
        details: error.message 
      }),
    };
  }
};