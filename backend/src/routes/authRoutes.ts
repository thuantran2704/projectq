import { Router } from 'express';
import { exchangeGoogleCode, googleAuthorizationUrl, googleConfigured } from '../config/googleAuth.js';
import { userCookie, requireAllowedUser } from '../middleware/allowedUser.js';

const router = Router();

router.get('/me', requireAllowedUser, (req, res) => {
  const value = req.headers.cookie?.match(/projectq_allowed_user=([^;]+)/)?.[1] || '';
  const decoded = decodeURIComponent(value);
  const email = decoded.slice(0, decoded.lastIndexOf('.')).toLowerCase();
  const quynhEmail = (process.env.QUYNH_EMAIL || 'nguyenquynh11102005@gmail.com').toLowerCase();
  res.json({ email, workspace: email === quynhEmail ? 'quynh' : 'job-applications' });
});

router.get('/google/start', (_req, res) => {
  if (!googleConfigured()) return res.status(503).send('Google OAuth is not configured.');
  res.redirect(googleAuthorizationUrl(false));
});
router.get('/google/connect', (_req, res) => {
  if (!googleConfigured()) return res.status(503).send('Google OAuth is not configured.');
  res.redirect(googleAuthorizationUrl(true));
});

router.get('/google/callback', async (req, res) => {
  const error = typeof req.query.error === 'string' ? req.query.error : '';
  const description = typeof req.query.error_description === 'string' ? req.query.error_description : '';
  if (error) return res.status(400).send(`Google authorization failed: ${error}${description ? `: ${description}` : ''}`);

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  if (!code) return res.status(400).send('Google returned no authorization code. Start at /api/auth/google/start.');

  try {
    const tokens = await exchangeGoogleCode(code);
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    const profile = await profileResponse.json() as { email?: string };
    const allowed = (process.env.ALLOWED_USER_EMAIL || '').split(',').map((item) => item.trim().toLowerCase());
    if (!profile.email || !allowed.includes(profile.email.toLowerCase())) return res.status(403).send('This app is restricted to its authorized users.');
    res.setHeader('Set-Cookie', `projectq_allowed_user=${encodeURIComponent(userCookie(profile.email))}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`);
    if (req.query.state !== 'connect') return res.redirect('/');
    if (!tokens.refresh_token) return res.status(400).send('Google did not return a refresh token. Use the Connect Gmail link and approve access.');
    res.type('html').send(`<h2>Gmail connected</h2><p>Copy this refresh token into <code>GOOGLE_REFRESH_TOKEN</code> on the backend.</p><textarea style="width:100%;height:100px">${tokens.refresh_token}</textarea>`);
  } catch (caught) {
    res.status(500).send(caught instanceof Error ? caught.message : 'Google authorization failed.');
  }
});

export default router;
