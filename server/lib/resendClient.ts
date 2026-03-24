import { Resend } from 'resend';

async function getCredentials() {
  // Primary: standard environment variable (Netlify, local dev, etc.)
  if (process.env.RESEND_API_KEY) {
    return {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    };
  }

  // Fallback: Replit connector (legacy)
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (hostname && xReplitToken) {
    const connectionSettings = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken,
        },
      }
    )
      .then((res) => res.json())
      .then((data) => data.items?.[0]);

    if (connectionSettings?.settings?.api_key) {
      return {
        apiKey: connectionSettings.settings.api_key,
        fromEmail: connectionSettings.settings.from_email || 'onboarding@resend.dev',
      };
    }
  }

  throw new Error('Resend API key not configured. Set the RESEND_API_KEY environment variable.');
}

export async function getUncachableResendClient() {
  const credentials = await getCredentials();
  return {
    client: new Resend(credentials.apiKey),
    fromEmail: credentials.fromEmail,
  };
}
