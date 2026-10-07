import { Router } from 'express';
import { requireAllowedUser } from '../middleware/allowedUser.js';
import { addPersonForJob, lookupPeople, reviewQueue, serpApiUsage } from '../controllers/peopleController.js';

const router = Router();
router.use(requireAllowedUser);
router.get('/lookup', lookupPeople);
router.get('/review-queue', reviewQueue);
router.get('/usage', serpApiUsage);
router.post('/jobs/:jobId/people', addPersonForJob);
export default router;
