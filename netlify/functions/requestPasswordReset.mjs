import sgMail from '@sendgrid/mail';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function ensureFirebaseAuth() {
  if (!getApps().length) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountJson) {
      throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY');
    }
    initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  }
  return getAuth();
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const sendgridKey = process.env.SENDGRID_API_KEY;
    if (!sendgridKey) {
      throw new Error('Missing SENDGRID_API_KEY');
    }
    sgMail.setApiKey(sendgridKey);

    const auth = ensureFirebaseAuth();
    const { email } = JSON.parse(event.body || '{}');
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) return { statusCode: 200, body: JSON.stringify({ ok: true }) };

    const continueUrl = process.env.PASSWORD_RESET_REDIRECT_URL || 'https://www.thehowlidayinn.ie/login';
    const link = await auth.generatePasswordResetLink(normalized, { url: continueUrl, handleCodeInApp: false });

    await sgMail.send({
      to: normalized,
      from: process.env.COMPANY_FROM_EMAIL || 'bookings@thehowlidayinn.ie',
      subject: 'Reset your password',
      html: `<p>Click to reset your password:</p><p><a href="${link}">Reset password</a></p>`
    });
  } catch (e) {
    console.error('requestPasswordReset error:', e?.message || e);
  }

  // Always return OK to avoid email-enumeration leaks
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
