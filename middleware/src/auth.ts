import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';

/**
 * Optional API key protection middleware.
 * If API_SECRET_KEY is configured in .env, requires 'x-api-key' header.
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const secretKey = process.env.API_SECRET_KEY;
  if (!secretKey) {
    // If not set, pass through in development
    return next();
  }

  const clientKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!clientKey || clientKey !== secretKey) {
    return next(new AppError('Unauthorized: Invalid or missing API key', 401));
  }

  next();
}
