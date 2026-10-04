import type { Request, Response, NextFunction } from 'express';
import {
  uploadResumeFile,
  listResumes,
  deleteResume,
  getResumeBuffer
} from '../config/gcpStorage.js';
import { AppError } from '@projectq/middleware';

export async function uploadResume(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError('Please select a resume file to upload (PDF, DOC, DOCX).', 400);
    }

    const savedResume = await uploadResumeFile(req.file);

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
    const resumes = await listResumes();
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

    await deleteResume(filename);

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

    const { buffer, originalName, contentType } = await getResumeBuffer(filename);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}
