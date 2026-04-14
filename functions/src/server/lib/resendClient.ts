import { Resend } from 'resend';

async function getCredentials() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Resend API key not configured. Set the RESEND_API_KEY environment variable.');
  }

  return {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
  };
}

export async function getUncachableResendClient() {
  const credentials = await getCredentials();
  return {
    client: new Resend(credentials.apiKey),
    fromEmail: credentials.fromEmail,
  };
}
