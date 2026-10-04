import multer from 'multer';
import type { Request } from 'express';
import { AppError } from './errorHandler.js';

// Use in-memory storage so we can stream directly to Google Cloud Storage
const storage = multer.memoryStorage();

// Allowed MIME types and extensions for resumes
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const isAllowedMime = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const isAllowedExt = /\.(pdf|doc|docx)$/i.test(file.originalname);

  if (isAllowedMime || isAllowedExt) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'Invalid file type. Only PDF (.pdf) and Word documents (.doc, .docx) are accepted as resumes.',
        400
      )
    );
  }
};

export const resumeUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB limit
  },
  fileFilter
});
