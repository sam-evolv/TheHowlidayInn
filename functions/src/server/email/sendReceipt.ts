import path from "path";
import fs from "fs";
import { getUncachableResendClient } from "../lib/resendClient";

const REPLY_TO = "howlidayinn1@gmail.com";

export async function sendReceiptEmailCID(opts: { 
  to: string; 
  subject: string; 
  html: string;
  bcc?: string;
}) {
  const { client, fromEmail } = await getUncachableResendClient();

  // In Firebase Functions, assets are bundled in lib/server/assets
  const logoPath = path.resolve(__dirname, "../assets/logo-email.png");
  
  let attachments: any[] = [];
  
  if (fs.existsSync(logoPath)) {
    // Read logo and convert to base64 for inline attachment
    const logoBuffer = fs.readFileSync(logoPath);
    const logoBase64 = logoBuffer.toString('base64');
    
    attachments = [{
      filename: "logo-email.png",
      content: logoBase64,
      encoding: "base64",
      contentId: "howliday-logo",
      contentType: "image/png",
    }];
  } else {
    console.warn("[email] logo not found at", logoPath, "— email will send without image.");
  }

  const emailResponse = await client.emails.send({
    from: fromEmail,
    to: opts.to,
    replyTo: REPLY_TO,
    subject: opts.subject,
    html: opts.html,
    attachments,
  });

  console.log("[email] receipt sent (inline logo)", { 
    emailId: emailResponse?.data?.id || emailResponse,
    to: opts.to 
  });
  
  return emailResponse;
}
