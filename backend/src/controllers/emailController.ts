import type { Request, Response, NextFunction } from 'express';
import { sendHospitalEmail, isMailerConfigured } from '../config/mailer.js';
import { HOSPITAL_EMAIL_TEMPLATES } from '../templates/hospitalTemplates.js';
import { AppError } from '@projectq/middleware';

export async function sendEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { to, cc, bcc, subject, body, resumeFilename } = req.body;

    if (!to || typeof to !== 'string') {
      throw new AppError('Recipient hospital email ("to") is required.', 400);
    }
    if (!subject || typeof subject !== 'string') {
      throw new AppError('Email subject is required.', 400);
    }
    if (!body || typeof body !== 'string') {
      throw new AppError('Email body content is required.', 400);
    }

    const result = await sendHospitalEmail({
      to,
      cc,
      bcc,
      subject,
      body,
      resumeFilename
    });

    res.json({
      success: true,
      message: isMailerConfigured()
        ? `Email sent successfully to ${to}!`
        : `Email dispatched (Simulated mode: update SMTP in .env to send live emails).`,
      messageId: result.messageId,
      sentWithResume: Boolean(resumeFilename)
    });
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
