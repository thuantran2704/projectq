import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getResumeBuffer } from './gcpStorage.js';

let transporterInstance: Transporter | null = null;

export function isMailerConfigured(): boolean {
  return Boolean(
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_PASS !== 'abcd-efgh-ijkl-mnop'
  );
}

export function getTransporter(): Transporter {
  if (!transporterInstance) {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 465;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    transporterInstance = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  return transporterInstance;
}

export interface SendHospitalEmailOptions {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  resumeFilename?: string;
}

export async function sendHospitalEmail(options: SendHospitalEmailOptions): Promise<{ messageId: string }> {
  const fromName = process.env.SMTP_FROM_NAME || 'Applicant';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'no-reply@example.com';
  const from = `"${fromName}" <${fromEmail}>`;

  const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [];

  if (options.resumeFilename) {
    const resume = await getResumeBuffer(options.resumeFilename);
    attachments.push({
      filename: resume.originalName,
      content: resume.buffer,
      contentType: resume.contentType
    });
  }

  if (!isMailerConfigured()) {
    console.warn('[Mailer] SMTP credentials not fully configured in .env. Logging email preview:');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Attachment: ${options.resumeFilename || 'None'}`);
    console.log(`Body: \n${options.body}`);

    return {
      messageId: `simulated-${Date.now()}`
    };
  }

  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    text: options.body,
    html: options.body.replace(/\n/g, '<br />'),
    attachments
  });

  return { messageId: info.messageId };
}
