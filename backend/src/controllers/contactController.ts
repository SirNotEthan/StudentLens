import { Request, Response } from 'express';
import { sendEmail } from '@/services/email';
import { appLogger } from '@/services/logger';

export const submitContactForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      res.status(400).json({ success: false, message: 'All fields are required.' });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, message: 'Invalid email address.' });
      return;
    }

    const adminEmail = process.env.CONTACT_EMAIL || process.env.SMTP_USER || 'contact@studentlens.com';

    const sent = await sendEmail({
      to: adminEmail,
      subject: `[Contact Form] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Contact Form Submission</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Name:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Email:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Subject:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${subject}</td>
            </tr>
          </table>
          <h3 style="margin-top: 20px;">Message:</h3>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${message}</div>
        </div>
      `,
      text: `New Contact Form Submission\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`
    });

    if (!sent) {
      appLogger.error('Failed to send contact form email');
      res.status(500).json({ success: false, message: 'Failed to send message. Please try again later.' });
      return;
    }

    appLogger.info('Contact form submitted', { name, email, subject });
    res.json({ success: true, message: 'Message sent successfully.' });
  } catch (error: any) {
    appLogger.error('Contact form error', error);
    res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
  }
};
