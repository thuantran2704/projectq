import { Router } from 'express';
import { ingestJob } from '../controllers/jobController.js';
import { requireScraperAuth } from '../middleware/scraperAuth.js';
const router = Router();
router.post('/v1/jobs', requireScraperAuth, ingestJob);
export default router;
