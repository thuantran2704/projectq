import type { Request, Response, NextFunction } from 'express';
import { renderEmailHtml, sendGmailEmail } from '../config/gmailMailer.js';
import { getResumeBuffer } from '../config/gcpStorage.js';
import { HOSPITAL_EMAIL_TEMPLATES } from '../templates/hospitalTemplates.js';
import { getGoogleAccessToken } from '../config/googleAuth.js';
import { AppError } from '@projectq/middleware';

export async function sendEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { to, cc, bcc, subject, body, resumeFilename, useGmail, senderWorkspace } = req.body;
    if (!to || typeof to !== 'string') {
      throw new AppError('Recipient hospital email ("to") is required.', 400);
    }
    if (!subject || typeof subject !== 'string') {
      throw new AppError('Email subject is required.', 400);
    }
    if (!body || typeof body !== 'string') {
      throw new AppError('Email body content is required.', 400);
    }

    // Determine which service to use
    if (!useGmail) throw new AppError('Gmail sending is required.', 400);
    const senderEmail = senderWorkspace === 'quynh' ? (process.env.QUYNH_EMAIL || 'nguyenquynh11102005@gmail.com') : (process.env.THUAN_EMAIL || 'thuantran2704@gmail.com');
    const result = await sendGmailEmail({ accessToken: await getGoogleAccessToken(senderEmail), to, cc, bcc, subject, body, resumeFilename });
    res.json({ success: true, message: 'Email sent through Gmail API.', messageId: result.messageId, accepted: result.accepted, rejected: result.rejected, smtpResponse: result.response, sentWithResume: Boolean(resumeFilename), service: 'Gmail API' });
  } catch (error) {
    next(error);
  }
}

export function getTemplates(req: Request, res: Response): void {
  res.json({
    success: true,
    data: HOSPITAL_EMAIL_TEMPLATES
  });
}

export function previewEmail(req: Request, res: Response): void {
  const { body } = req.body;
  if (typeof body !== 'string') {
    throw new AppError('Email body content is required.', 400);
  }

  const requestOrigin = req.get('origin');
  const bannerSrc = requestOrigin
    ? new URL('/usf-nursing-banner.png', requestOrigin).toString()
    : '/usf-nursing-banner.png';

  res.json({ html: renderEmailHtml(body, bannerSrc) });
}
