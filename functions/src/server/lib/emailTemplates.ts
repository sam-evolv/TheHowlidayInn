import { format } from 'date-fns';

interface BookingReminderData {
  ownerName: string;
  dogName: string;
  serviceType: string;
  startDate: Date;
  endDate: Date;
  dropoffTime?: string;
  pickupTime?: string;
  bookingId: string;
  notes?: string;
}

export function generateBookingReminderEmail(data: BookingReminderData) {
  const {
    ownerName,
    dogName,
    serviceType,
    startDate,
    endDate,
    dropoffTime,
    pickupTime,
    bookingId,
    notes
  } = data;

  const formattedStartDate = format(startDate, 'EEEE, MMMM d, yyyy');
  const formattedEndDate = format(endDate, 'EEEE, MMMM d, yyyy');
  const isSingleDay = format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd');

  const serviceTitle = {
    daycare: 'Daycare',
    boarding: 'Boarding',
    trial: 'Trial Day'
  }[serviceType] || serviceType;

  const subject = `Reminder: ${dogName}'s ${serviceTitle} Appointment Tomorrow`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #8B7355 0%, #D4AF37 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #FAF8F3;
      padding: 30px;
      border: 2px solid #D4AF37;
      border-top: none;
      border-radius: 0 0 8px 8px;
    }
    .detail-box {
      background: white;
      padding: 20px;
      margin: 20px 0;
      border-left: 4px solid #D4AF37;
      border-radius: 4px;
    }
    .detail-row {
      margin: 10px 0;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: bold;
      color: #8B7355;
      display: inline-block;
      width: 120px;
    }
    .value {
      color: #333;
    }
    .important-note {
      background: #FFF8DC;
      border: 2px solid #D4AF37;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #D4AF37;
      color: #666;
      font-size: 14px;
    }
    .contact-info {
      margin: 15px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🐾 The Howliday Inn</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px;">Booking Reminder</p>
  </div>
  
  <div class="content">
    <p>Dear ${ownerName},</p>
    
    <p>This is a friendly reminder that <strong>${dogName}</strong> has a ${serviceTitle.toLowerCase()} appointment scheduled for tomorrow!</p>
    
    <div class="detail-box">
      <h3 style="margin-top: 0; color: #8B7355;">Booking Details</h3>
      
      <div class="detail-row">
        <span class="label">Service:</span>
        <span class="value">${serviceTitle}</span>
      </div>
      
      <div class="detail-row">
        <span class="label">Dog:</span>
        <span class="value">${dogName}</span>
      </div>
      
      ${isSingleDay ? `
        <div class="detail-row">
          <span class="label">Date:</span>
          <span class="value">${formattedStartDate}</span>
        </div>
      ` : `
        <div class="detail-row">
          <span class="label">Check-in:</span>
          <span class="value">${formattedStartDate}</span>
        </div>
        <div class="detail-row">
          <span class="label">Check-out:</span>
          <span class="value">${formattedEndDate}</span>
        </div>
      `}
      
      ${dropoffTime ? `
        <div class="detail-row">
          <span class="label">Drop-off Time:</span>
          <span class="value">${dropoffTime}</span>
        </div>
      ` : ''}
      
      ${pickupTime ? `
        <div class="detail-row">
          <span class="label">Pick-up Time:</span>
          <span class="value">${pickupTime}</span>
        </div>
      ` : ''}
      
      <div class="detail-row">
        <span class="label">Booking ID:</span>
        <span class="value">${bookingId.substring(0, 8)}</span>
      </div>
    </div>
    
    ${notes ? `
      <div class="detail-box">
        <h4 style="margin-top: 0; color: #8B7355;">Special Notes:</h4>
        <p style="margin: 0;">${notes}</p>
      </div>
    ` : ''}
    
    <div class="important-note">
      <strong>⏰ Please remember:</strong>
      <ul style="margin: 10px 0 0 0; padding-left: 20px;">
        <li>Ensure ${dogName}'s vaccinations are up to date</li>
        <li>Bring any necessary medications and feeding instructions</li>
        <li>Arrive during our operating hours</li>
        <li>Late pick-ups may incur additional charges</li>
      </ul>
    </div>
    
    <p>If you need to make any changes to your booking or have questions, please contact us as soon as possible.</p>
    
    <p>We're looking forward to seeing ${dogName} tomorrow!</p>
    
    <p>Best regards,<br/>
    <strong>The Howliday Inn Team</strong></p>
  </div>
  
  <div class="footer">
    <div class="contact-info">
      📞 <strong>(087) 334-5702</strong><br/>
      📧 <strong>info@thehowlidayinn.ie</strong>
    </div>
    <p style="font-size: 12px; color: #999; margin-top: 15px;">
      This is an automated reminder for your upcoming booking.<br/>
      Please do not reply to this email.
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
The Howliday Inn - Booking Reminder

Dear ${ownerName},

This is a friendly reminder that ${dogName} has a ${serviceTitle.toLowerCase()} appointment scheduled for tomorrow!

BOOKING DETAILS:
Service: ${serviceTitle}
Dog: ${dogName}
${isSingleDay ? `Date: ${formattedStartDate}` : `Check-in: ${formattedStartDate}\nCheck-out: ${formattedEndDate}`}
${dropoffTime ? `Drop-off Time: ${dropoffTime}` : ''}
${pickupTime ? `Pick-up Time: ${pickupTime}` : ''}
Booking ID: ${bookingId.substring(0, 8)}

${notes ? `\nSPECIAL NOTES:\n${notes}\n` : ''}

PLEASE REMEMBER:
- Ensure ${dogName}'s vaccinations are up to date
- Bring any necessary medications and feeding instructions
- Arrive during our operating hours
- Late pick-ups may incur additional charges

If you need to make any changes to your booking or have questions, please contact us as soon as possible.

We're looking forward to seeing ${dogName} tomorrow!

Best regards,
The Howliday Inn Team

Contact: (087) 334-5702 | info@thehowlidayinn.ie

---
This is an automated reminder for your upcoming booking.
Please do not reply to this email.
  `.trim();

  return { subject, html, text };
}
