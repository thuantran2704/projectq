import { Router } from 'express';
import { sendEmail, getTemplates, previewEmail } from '../controllers/emailController.js';

const router = Router();

router.get('/templates', getTemplates);
router.post('/preview', previewEmail);
router.post('/send', sendEmail);

export default router;
