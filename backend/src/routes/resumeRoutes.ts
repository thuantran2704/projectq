import { Router } from 'express';
import { resumeUpload } from '@projectq/middleware';
import {
  uploadResume,
  getResumes,
  deleteResumeHandler,
  downloadResumeHandler
} from '../controllers/resumeController.js';
import { requireAllowedUser } from '../middleware/allowedUser.js';

const router = Router();

router.get('/', requireAllowedUser, getResumes);
router.post('/upload', requireAllowedUser, resumeUpload.single('resume'), uploadResume);
router.delete('/:filename', requireAllowedUser, deleteResumeHandler);
router.get('/:filename/download', requireAllowedUser, downloadResumeHandler);

export default router;
