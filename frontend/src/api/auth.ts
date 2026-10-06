type GoogleTokenClient = { requestAccessToken: (override?: { prompt?: string }) => void };
type GoogleAccounts = { oauth2: { initTokenClient: (config: { client_id: string; scope: string; callback: (response: { access_token?: string; error?: string }) => void }) => GoogleTokenClient } };
declare global { interface Window { google?: { accounts: GoogleAccounts }; } }
let scriptPromise: Promise<void> | undefined;
function loadGoogleScript(): Promise<void> { if (window.google) return Promise.resolve(); if (scriptPromise) return scriptPromise; scriptPromise = new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true; script.onload = () => resolve(); script.onerror = () => reject(new Error('Could not load Google sign-in.')); document.head.appendChild(script); }); return scriptPromise; }
export async function getDelegatedAccessToken(): Promise<string> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (!clientId) throw new Error('Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID.');
  const cached = sessionStorage.getItem('gmail_access_token');
  const expiresAt = Number(sessionStorage.getItem('gmail_access_token_expires_at') || 0);
  if (cached && expiresAt > Date.now() + 60_000) return cached;
  await loadGoogleScript();
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({ client_id: clientId, scope: 'https://www.googleapis.com/auth/gmail.send', callback: (response) => { if (!response.access_token) { reject(new Error(response.error || 'Google sign-in failed.')); return; } sessionStorage.setItem('gmail_access_token', response.access_token); sessionStorage.setItem('gmail_access_token_expires_at', String(Date.now() + 3_500_000)); resolve(response.access_token); } });
    client.requestAccessToken({ prompt: cached ? '' : 'consent' });
  });
}
