import type { Request, Response, NextFunction } from 'express';
import {
  uploadResumeFile,
  listResumes,
  deleteResume,
  getResumeBuffer
} from '../config/gcpStorage.js';
import { AppError } from '@projectq/middleware';

function ownerFromRequest(req: Request): 'quynh' | 'thuan' {
  const cookie = req.headers.cookie?.match(/projectq_allowed_user=([^;]+)/)?.[1] || '';
  const email = decodeURIComponent(cookie).slice(0, decodeURIComponent(cookie).lastIndexOf('.')).toLowerCase();
  return email === (process.env.QUYNH_EMAIL || 'nguyenquynh11102005@gmail.com').toLowerCase() ? 'quynh' : 'thuan';
}

export async function uploadResume(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError('Please select a resume file to upload (PDF, DOC, DOCX).', 400);
    }

    const savedResume = await uploadResumeFile(req.file, ownerFromRequest(req));

    res.status(201).json({
      success: true,
      message: 'Resume uploaded successfully to Cloud Storage!',
      data: savedResume
    });
  } catch (error) {
    next(error);
  }
}

export async function getResumes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const resumes = await listResumes(ownerFromRequest(req));
    res.json({
      success: true,
      data: resumes
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteResumeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawFilename = req.params.filename;
    const filename = Array.isArray(rawFilename) ? rawFilename[0] : rawFilename;
    if (!filename) {
      throw new AppError('Resume filename parameter is required.', 400);
    }

    await deleteResume(filename, ownerFromRequest(req));

    res.json({
      success: true,
      message: `Resume "${filename}" has been deleted.`
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadResumeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawFilename = req.params.filename;
    const filename = Array.isArray(rawFilename) ? rawFilename[0] : rawFilename;
    if (!filename) {
      throw new AppError('Resume filename parameter is required.', 400);
    }

    const { buffer, originalName, contentType } = await getResumeBuffer(filename, ownerFromRequest(req));

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}
