import nodemailer from 'nodemailer';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getResumeBuffer } from './gcpStorage.js';
import { getGoogleAccessToken } from './googleAuth.js';
export function renderEmailHtml(body: string, bannerSrc: string): string {
  const content = body.trim().split(/\n\s*\n/).filter(Boolean).map((block) => `<p style="margin:0 0 16px;line-height:1.6">${block.split(/\r?\n/).map((line) => line.replace(/[&<>\"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c] || c))).join('<br>')}</p>`).join('');
  return `<!doctype html><html><body style="margin:0;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#202124;font-size:15px;line-height:1.55"><div style="width:100%">${content}<div style="margin-top:24px"><img src="${bannerSrc}" alt="University of South Florida College of Nursing" width="330" height="66" style="display:block;width:330px;height:66px;max-width:100%"></div></div></body></html>`;
}

const BANNER = fileURLToPath(new URL('../../../frontend/public/usf-nursing-banner.png', import.meta.url));
export async function sendGmailEmail(options: { accessToken: string; to: string; cc?: string; bcc?: string; subject: string; body: string; resumeFilename?: string; resumeOwner?: 'quynh' | 'thuan' }) {
  const attachments: Array<Record<string, unknown>> = [{ filename: 'usf-nursing-banner.png', content: readFileSync(BANNER), contentType: 'image/png', cid: 'usf-nursing-banner@projectq', contentDisposition: 'inline' }];
  if (options.resumeFilename) { const resume = await getResumeBuffer(options.resumeFilename, options.resumeOwner || 'quynh'); attachments.push({ filename: resume.originalName, content: resume.buffer, contentType: resume.contentType }); }
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
  const info = await transport.sendMail({
    from: 'me',
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    text: options.body,
    html: renderEmailHtml(options.body, 'cid:usf-nursing-banner@projectq'),
    attachments
  });
  const raw = (info as { message?: Buffer }).message;
  if (!raw) throw new Error('Could not build Gmail message');
  const encoded = raw.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: `Bearer ${options.accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: encoded }) });
  const json = await response.json() as { id?: string; error?: { message?: string } };
  if (!response.ok) throw new Error(json.error?.message || `Gmail API returned ${response.status}`);
  return { messageId: json.id || `gmail-${Date.now()}`, accepted: options.to.split(',').map((e) => e.trim()), rejected: [], response: 'Accepted by Gmail API' };
}
