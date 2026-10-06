import { Router } from 'express';
import { exchangeGoogleCode, googleAuthorizationUrl, googleConfigured } from '../config/googleAuth.js';
import { userCookie } from '../middleware/allowedUser.js';

const router = Router();

router.get('/google/start', (_req, res) => {
  if (!googleConfigured()) return res.status(503).send('Google OAuth is not configured.');
  res.redirect(googleAuthorizationUrl());
});

router.get('/google/callback', async (req, res) => {
  const error = typeof req.query.error === 'string' ? req.query.error : '';
  const description = typeof req.query.error_description === 'string' ? req.query.error_description : '';
  if (error) return res.status(400).send(`Google authorization failed: ${error}${description ? ` — ${description}` : ''}`);

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  if (!code) return res.status(400).send('Google returned no authorization code. Start at /api/auth/google/start.');

  try {
    const tokens = await exchangeGoogleCode(code);
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    const profile = await profileResponse.json() as { email?: string };
    const allowed = (process.env.ALLOWED_USER_EMAIL || '').split(',').map((item) => item.trim().toLowerCase());
    if (!profile.email || !allowed.includes(profile.email.toLowerCase())) return res.status(403).send('This app is restricted to its authorized users.');
    res.setHeader('Set-Cookie', `projectq_allowed_user=${encodeURIComponent(userCookie(profile.email))}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`);
    res.type('html').send(`<h2>Gmail connected</h2><p>Copy this refresh token into <code>GOOGLE_REFRESH_TOKEN</code> on the backend, restart it, and close this page.</p><textarea style="width:100%;height:100px">${tokens.refresh_token}</textarea>`);
  } catch (caught) {
    res.status(500).send(caught instanceof Error ? caught.message : 'Google authorization failed.');
  }
});

export default router;
