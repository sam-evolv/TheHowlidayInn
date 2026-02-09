import nodemailer from "nodemailer";
export async function sendConfirmationEmail(to, bookingId, amount) {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        const mailOptions = {
            from: `"The Howliday Inn" <${process.env.EMAIL_USER}>`,
            to,
            subject: "Booking Confirmation – The Howliday Inn",
            html: `
        <h2>🐾 Thank you for your booking!</h2>
        <p>Your booking (ID: <b>${bookingId}</b>) has been confirmed.</p>
        <p><b>Amount Paid:</b> €${(amount / 100).toFixed(2)}</p>
        <p>We look forward to welcoming your dog soon!</p>
        <hr />
        <p><b>The Howliday Inn Team</b><br/>
        📞 (087) 334-5702<br/>
        ✉️ howlidayinn1@gmail.com</p>
      `,
        };
        await transporter.sendMail(mailOptions);
        console.log("✅ Confirmation email sent to", to);
    }
    catch (error) {
        console.error("❌ Failed to send confirmation email:", error);
    }
}
