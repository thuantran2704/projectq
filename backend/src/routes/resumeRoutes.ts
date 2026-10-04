import { Router } from 'express';
import { resumeUpload } from '@projectq/middleware';
import {
  uploadResume,
  getResumes,
  deleteResumeHandler,
  downloadResumeHandler
} from '../controllers/resumeController.js';

const router = Router();

router.get('/', getResumes);
router.post('/upload', resumeUpload.single('resume'), uploadResume);
router.delete('/:filename', deleteResumeHandler);
router.get('/:filename/download', downloadResumeHandler);

export default router;
