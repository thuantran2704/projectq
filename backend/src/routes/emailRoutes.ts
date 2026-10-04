import { Router } from 'express';
import { sendEmail, getTemplates } from '../controllers/emailController.js';

const router = Router();

router.get('/templates', getTemplates);
router.post('/send', sendEmail);

export default router;
