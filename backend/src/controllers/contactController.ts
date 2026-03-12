import { Request, Response } from 'express';
import { sendEmail } from '@/services/email';
import { appLogger } from '@/services/logger';
import { ContactSubmission } from '@/models/ContactSubmission';
import { AuthenticatedRequest, ContactSubmissionStatus } from '@/types';

const SUPPORT_EMAIL = process.env.CONTACT_EMAIL || 'icsnewsubmissions@icsz.ch';

const SPAM_KEYWORDS = [
  'casino', 'poker', 'viagra', 'cialis', 'lottery', 'winner', 'prize', 'free money',
  'crypto investment', 'bitcoin profit', 'make money fast', 'click here', 'buy now',
  'limited offer', 'act now', 'congratulations you', 'you have been selected',
  '100% free', 'earn $', 'earn money', 'work from home', 'weight loss', 'diet pill',
];

const URL_PATTERN = /https?:\/\/[^\s]+/gi;
const MAX_URLS_IN_MESSAGE = 2;
const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_SUBJECT_LENGTH = 200;
const MAX_NAME_LENGTH = 100;

function isSpam(name: string, subject: string, message: string): string | null {
  if (message.length < MIN_MESSAGE_LENGTH) return 'Message is too short.';
  if (message.length > MAX_MESSAGE_LENGTH) return 'Message is too long.';
  if (subject.length > MAX_SUBJECT_LENGTH) return 'Subject is too long.';
  if (name.length > MAX_NAME_LENGTH) return 'Name is too long.';

  const urlMatches = message.match(URL_PATTERN) || [];
  if (urlMatches.length > MAX_URLS_IN_MESSAGE) return 'Message contains too many links.';

  const combined = `${name} ${subject} ${message}`.toLowerCase();
  if (SPAM_KEYWORDS.find(kw => combined.includes(kw))) return 'Message flagged as spam.';

  return null;
}

export const submitContactForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, subject, message, _gotcha } = req.body;

    // Honeypot: bots fill hidden fields, humans don't
    if (_gotcha) {
      res.json({ success: true, message: 'Message sent successfully.' });
      return;
    }

    if (!name || !email || !subject || !message) {
      res.status(400).json({ success: false, message: 'All fields are required.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, message: 'Invalid email address.' });
      return;
    }

    const spamReason = isSpam(name, subject, message);
    if (spamReason) {
      const clientIp = req.ip || 'unknown';
      appLogger.warn('Contact form spam rejected', { ip: clientIp, email, subject, reason: spamReason });
      res.status(400).json({ success: false, message: spamReason });
      return;
    }

    const clientIp = req.ip || '';
    await ContactSubmission.create({ name, email, subject, message, ipAddress: clientIp });

    // Send email best-effort — DB save already succeeded
    sendEmail({
      to: SUPPORT_EMAIL,
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
    }).catch(err => appLogger.error('Contact form email failed', err));

    appLogger.info('Contact form submitted', { name, email, subject });
    res.json({ success: true, message: 'Message sent successfully.' });
  } catch (error: any) {
    appLogger.error('Contact form error', error);
    res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
  }
};

export const getSubmissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const status = req.query.status as ContactSubmissionStatus | undefined;
    const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 100);
    const offset = parseInt(req.query.offset as string || '0', 10);

    const { submissions, total } = await ContactSubmission.findMany({ status, limit, offset });

    res.json({
      success: true,
      data: {
        submissions: submissions.map(s => s.toJSON()),
        total
      }
    });
  } catch (error: any) {
    appLogger.error('Failed to fetch contact submissions', error);
    res.status(500).json({ success: false, message: 'Failed to fetch submissions.' });
  }
};

export const updateSubmissionStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: ContactSubmissionStatus };

    const VALID_STATUSES: ContactSubmissionStatus[] = ['new', 'read', 'archived'];
    if (!status || !VALID_STATUSES.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status.' });
      return;
    }

    const submission = await ContactSubmission.findById(id);
    if (!submission) {
      res.status(404).json({ success: false, message: 'Submission not found.' });
      return;
    }

    await submission.updateStatus(status);
    res.json({ success: true, data: { submission: submission.toJSON() } });
  } catch (error: any) {
    appLogger.error('Failed to update contact submission', error);
    res.status(500).json({ success: false, message: 'Failed to update submission.' });
  }
};

export const deleteSubmission = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const submission = await ContactSubmission.findById(id);
    if (!submission) {
      res.status(404).json({ success: false, message: 'Submission not found.' });
      return;
    }

    await submission.delete();
    res.json({ success: true, message: 'Submission deleted.' });
  } catch (error: any) {
    appLogger.error('Failed to delete contact submission', error);
    res.status(500).json({ success: false, message: 'Failed to delete submission.' });
  }
};
