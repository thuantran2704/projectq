import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

const COOKIE = 'projectq_allowed_user';
const secret = () => process.env.GOOGLE_CLIENT_SECRET || 'projectq-development-secret';
export function userCookie(email: string) { return `${email}.${crypto.createHmac('sha256', secret()).update(email).digest('hex')}`; }
export function requireAllowedUser(req: Request, res: Response, next: NextFunction) {
  const value = req.headers.cookie?.match(new RegExp(`${COOKIE}=([^;]+)`))?.[1];
  const decoded = value ? decodeURIComponent(value) : '';
  const separator = decoded.lastIndexOf('.');
  const email = separator > 0 ? decoded.slice(0, separator) : '';
  const signature = separator > 0 ? decoded.slice(separator + 1) : '';
  const expected = email ? crypto.createHmac('sha256', secret()).update(email).digest('hex') : '';
  const allowed = (process.env.ALLOWED_USER_EMAIL || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (allowed.includes(email.toLowerCase()) && signature && signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return next();
  res.status(401).json({ error: { message: 'Sign in with the authorized Google account first.', statusCode: 401 } });
}
