import { appLogger } from '@/services/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: any = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  // Only create transporter if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  try {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    return transporter;
  } catch (error) {
    appLogger.warn('Failed to create email transporter', error);
    return null;
  }
};

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  const mailer = await getTransporter();

  if (!mailer) {
    // In development without SMTP, log the email content
    appLogger.info('Email would be sent (no SMTP configured)', {
      to: options.to,
      subject: options.subject,
      // Log full HTML in dev so developers can extract reset links
      html: process.env.NODE_ENV !== 'production' ? options.html : '[redacted]'
    });
    return true; // Return true in dev so the flow continues
  }

  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || `"StudentLens" <noreply@studentlens.app>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    });
    appLogger.info('Email sent successfully', { to: options.to, subject: options.subject });
    return true;
  } catch (error: any) {
    appLogger.error('Failed to send email', error, { to: options.to, subject: options.subject });
    return false;
  }
};

export const sendPasswordResetEmail = async (email: string, resetToken: string): Promise<boolean> => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

  return sendEmail({
    to: email,
    subject: 'StudentLens - Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested a password reset for your StudentLens account.</p>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #4a90e2; color: white; padding: 12px 30px;
                    text-decoration: none; border-radius: 5px; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          If you didn't request this, you can safely ignore this email.
        </p>
        <p style="color: #999; font-size: 12px;">
          Or copy this link: ${resetUrl}
        </p>
      </div>
    `,
    text: `Password Reset Request\n\nYou requested a password reset. Visit this link to reset your password (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`
  });
};
