import { Resend } from 'resend';
import { env } from '../config/env';

const resend = new Resend(env.RESEND_API_KEY);

export const sendVerificationEmail = async (to: string, token: string) => {
  // Construct the verification URL
  // We use CORS_ORIGIN as the base URL assuming it's the frontend URL
  const verificationUrl = `${env.CORS_ORIGIN}/verify-email?token=${token}`;

  console.log('\n==================================================');
  console.log(`✉️  EMAIL VERIFICATION LINK FOR: ${to}`);
  console.log(verificationUrl);
  console.log('==================================================\n');

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to,
      subject: 'Verify your HRMS Email',
      html: `
        <h2>Welcome to HRMS!</h2>
        <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}" target="_blank">Verify Email</a>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });
  } catch (err: any) {
    console.error(`⚠️  Failed to send email via Resend: ${err.message || err}`);
    if (env.NODE_ENV === 'production') {
      throw err;
    }
  }
};
