const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';

export function googleConfigured() { return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET); }
export function googleRedirectUri() { return process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'; }
export function googleAuthorizationUrl(connect = false) {
  const params = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: googleRedirectUri(), response_type: 'code', access_type: connect ? 'offline' : 'online', prompt: connect ? 'consent select_account' : 'select_account', scope: connect ? 'openid email https://www.googleapis.com/auth/gmail.send' : 'openid email', state: connect ? 'connect' : 'login' });
  return `${GOOGLE_AUTH}?${params}`;
}
export async function exchangeGoogleCode(code: string) {
  const response = await fetch(GOOGLE_TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: googleRedirectUri(), grant_type: 'authorization_code' }) });
  const json = await response.json() as { access_token?: string; refresh_token?: string; error?: string };
  if (!response.ok) throw new Error(json.error || 'Google authorization failed.');
  return json;
}
export async function getGoogleAccessToken(email?: string) {
  const normalizedEmail = email?.toLowerCase();
  const refreshToken = normalizedEmail === (process.env.QUYNH_EMAIL || 'nguyenquynh11102005@gmail.com').toLowerCase()
    ? process.env.GOOGLE_REFRESH_TOKEN
    : (process.env.THUAN_GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN);
  if (!refreshToken) throw new Error('Connect Gmail first, then set GOOGLE_REFRESH_TOKEN on the backend.');
  const response = await fetch(GOOGLE_TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, refresh_token: refreshToken, grant_type: 'refresh_token' }) });
  const json = await response.json() as { access_token?: string; error?: string };
  if (!response.ok || !json.access_token) throw new Error(json.error || 'Could not refresh Google access token.');
  return json.access_token;
}
