import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export function requireScraperAuth(req: Request, res: Response, next: NextFunction): void {
  const configured = process.env.SCRAPER_INGEST_SECRET;
  const provided = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
  if (!configured || !provided || provided.length !== configured.length || !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(configured))) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid scraper credentials.' } });
    return;
  }
  next();
}
