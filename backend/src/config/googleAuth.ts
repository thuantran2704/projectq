const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';

export function googleConfigured() { return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET); }
export function googleRedirectUri() { return process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'; }
export function googleAuthorizationUrl() {
  const params = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: googleRedirectUri(), response_type: 'code', access_type: 'offline', prompt: 'consent', scope: 'https://www.googleapis.com/auth/gmail.send' });
  return `${GOOGLE_AUTH}?${params}`;
}
export async function exchangeGoogleCode(code: string) {
  const response = await fetch(GOOGLE_TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: googleRedirectUri(), grant_type: 'authorization_code' }) });
  const json = await response.json() as { access_token?: string; refresh_token?: string; error?: string };
  if (!response.ok || !json.refresh_token) throw new Error(json.error || 'Google did not return a refresh token. Revoke the app and connect again.');
  return json;
}
export async function getGoogleAccessToken() {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!refreshToken) throw new Error('Connect Gmail first, then set GOOGLE_REFRESH_TOKEN on the backend.');
  const response = await fetch(GOOGLE_TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, refresh_token: refreshToken, grant_type: 'refresh_token' }) });
  const json = await response.json() as { access_token?: string; error?: string };
  if (!response.ok || !json.access_token) throw new Error(json.error || 'Could not refresh Google access token.');
  return json.access_token;
}
