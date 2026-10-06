import type { Request, Response, NextFunction } from 'express';
import { getPool } from '../config/database.js';
import { AppError } from '@projectq/middleware';

const MAX = { source: 100, sourceJobId: 200, company: 200, title: 300, location: 500, jobUrl: 2000, description: 100000, team: 300 };
function text(value: unknown, name: string, max: number, required = false): string | null {
  if (value === undefined || value === null || value === '') { if (required) throw new AppError(`${name} is required.`, 400); return null; }
  if (typeof value !== 'string' || value.trim().length > max) throw new AppError(`${name} must be a string of at most ${max} characters.`, 400);
  return value.trim();
}
function dateValue(value: unknown, name: string, required = false): string | null {
  const result = text(value, name, 80, required); if (!result) return null;
  if (Number.isNaN(Date.parse(result))) throw new AppError(`${name} must be a valid ISO date.`, 400);
  return new Date(result).toISOString();
}
export async function ingestJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body || {};
    const source = text(body.source, 'source', MAX.source, true)!;
    const sourceJobId = text(body.sourceJobId, 'sourceJobId', MAX.sourceJobId, true)!;
    const company = text(body.company, 'company', MAX.company, true)!;
    const title = text(body.title, 'title', MAX.title, true)!;
    const jobUrl = text(body.jobUrl, 'jobUrl', MAX.jobUrl, true)!;
    if (!/^https:\/\//i.test(jobUrl)) throw new AppError('jobUrl must use HTTPS.', 400);
    const location = text(body.location, 'location', MAX.location);
    const description = text(body.description, 'description', MAX.description);
    const team = text(body.team, 'team', MAX.team);
    const datePosted = dateValue(body.datePosted, 'datePosted');
    const discoveredAt = dateValue(body.discoveredAt, 'discoveredAt', true)!;
    const result = await getPool().query(`INSERT INTO jobs (source, source_job_id, company, title, location, job_url, description, team, date_posted, discovered_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (source, source_job_id) DO NOTHING RETURNING id`, [source, sourceJobId, company, title, location, jobUrl, description, team, datePosted, discoveredAt]);
    if (result.rowCount) { res.status(201).json({ success: true, status: 'created', jobId: String(result.rows[0].id) }); return; }
    const existing = await getPool().query('SELECT id FROM jobs WHERE source = $1 AND source_job_id = $2', [source, sourceJobId]);
    res.status(200).json({ success: true, status: 'duplicate', jobId: String(existing.rows[0].id) });
  } catch (error) { next(error); }
}
