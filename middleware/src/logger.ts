import type { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const method = req.method;
  const url = req.originalUrl || req.url;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    console.log(`[${new Date().toISOString()}] ${method} ${url} ${status} - ${duration}ms`);
  });

  next();
}
