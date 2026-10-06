import { Router } from 'express';
import { sendEmail, getTemplates, previewEmail } from '../controllers/emailController.js';
import { requireAllowedUser } from '../middleware/allowedUser.js';

const router = Router();

router.get('/templates', getTemplates);
router.post('/preview', previewEmail);
router.post('/send', requireAllowedUser, sendEmail);

export default router;
