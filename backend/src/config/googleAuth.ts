import crypto from 'node:crypto';
import { getPool } from './database.js';

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';

export function googleConfigured() { return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET); }
export function googleRedirectUri() { return process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'; }
export function googleAuthorizationUrl(connect = false) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent select_account',
    scope: 'openid email https://www.googleapis.com/auth/gmail.send',
    state: connect ? 'connect' : 'login'
  });
  return `${GOOGLE_AUTH}?${params}`;
}

export async function exchangeGoogleCode(code: string) {
  const response = await fetch(GOOGLE_TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: googleRedirectUri(), grant_type: 'authorization_code' }) });
  const json = await response.json() as { access_token?: string; refresh_token?: string; error?: string };
  if (!response.ok) throw new Error(json.error || 'Google authorization failed.');
  return json;
}

function encryptionKey(): Buffer {
  const configured = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || process.env.GOOGLE_CLIENT_SECRET;
  if (!configured) throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY is required to store Gmail connections securely.');
  return crypto.createHash('sha256').update(configured).digest();
}

function encryptRefreshToken(refreshToken: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(refreshToken, 'utf8'), cipher.final()]);
  return [iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

function decryptRefreshToken(value: string): string {
  const [ivValue, tagValue, encryptedValue] = value.split('.');
  if (!ivValue || !tagValue || !encryptedValue) throw new Error('Stored Gmail connection is malformed.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8');
}

export async function saveGoogleConnection(email: string, refreshToken: string): Promise<void> {
  await getPool().query(`
    INSERT INTO google_connections (email, encrypted_refresh_token, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (email) DO UPDATE SET encrypted_refresh_token = EXCLUDED.encrypted_refresh_token, updated_at = NOW()
  `, [email.toLowerCase(), encryptRefreshToken(refreshToken)]);
}

async function getStoredRefreshToken(email: string): Promise<string | undefined> {
  const result = await getPool().query<{ encrypted_refresh_token: string }>(
    'SELECT encrypted_refresh_token FROM google_connections WHERE email = $1', [email.toLowerCase()]
  );
  const stored = result.rows[0]?.encrypted_refresh_token;
  return stored ? decryptRefreshToken(stored) : undefined;
}

export async function getGoogleAccessToken(email?: string) {
  const normalizedEmail = email?.toLowerCase();
  const quynhEmail = (process.env.QUYNH_EMAIL || 'nguyenquynh11102005@gmail.com').toLowerCase();
  const thuanEmail = (process.env.THUAN_EMAIL || 'thuantran2704@gmail.com').toLowerCase();
  if (!normalizedEmail || ![quynhEmail, thuanEmail].includes(normalizedEmail)) {
    throw new Error('Unknown sender account. Configure QUYNH_EMAIL or THUAN_EMAIL.');
  }
  let refreshToken: string | undefined;
  try {
    refreshToken = await getStoredRefreshToken(normalizedEmail);
  } catch (error) {
    console.warn('Could not read stored Gmail connection; using legacy environment token:', error instanceof Error ? error.message : error);
  }
  refreshToken ||= normalizedEmail === quynhEmail ? process.env.GOOGLE_REFRESH_TOKEN : process.env.THUAN_GOOGLE_REFRESH_TOKEN;
  if (!refreshToken) throw new Error(`Gmail is not connected for ${normalizedEmail}. Sign in with Google and approve Gmail access.`);
  const response = await fetch(GOOGLE_TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, refresh_token: refreshToken, grant_type: 'refresh_token' }) });
  const json = await response.json() as { access_token?: string; error?: string };
  if (!response.ok || !json.access_token) throw new Error(json.error || 'Could not refresh Google access token. Sign in again to reconnect Gmail.');
  return json.access_token;
}
