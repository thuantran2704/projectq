import type { Request, Response, NextFunction } from 'express';
import { getPool } from '../config/database.js';
import { AppError } from '@projectq/middleware';

function required(value: unknown, name: string, max = 300): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new AppError(`${name} is required and must be at most ${max} characters.`, 400);
  return value.trim();
}

function companyFromEmail(email: string): string {
  const domain = email.toLowerCase().split('@')[1] || '';
  const host = domain.replace(/^www\./, '').split('.')[0];
  return host.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function rank(title: string | null, jobTitle: string): { score: number; reasons: string[] } {
  const normalized = (title || '').toLowerCase();
  const target = jobTitle.toLowerCase();
  let score = 20;
  const reasons: string[] = [];
  if (normalized.includes('university') || normalized.includes('early career')) { score += 65; reasons.push('early-career recruiting role'); }
  else if (normalized.includes('technical recruiter')) { score += 55; reasons.push('technical recruiting role'); }
  else if (normalized.includes('recruiter')) { score += 45; reasons.push('recruiting role'); }
  else if (normalized.includes('hiring manager') || normalized.includes('engineering manager')) { score += 40; reasons.push('likely hiring manager'); }
  else if (normalized.includes('engineer')) { score += 20; reasons.push('engineering role'); }
  const keywords = target.split(/[^a-z0-9]+/).filter((word) => word.length > 3);
  if (keywords.some((word) => normalized.includes(word))) { score += 15; reasons.push('title overlaps with job keywords'); }
  return { score: Math.min(score, 100), reasons };
}

function draft(name: string, personTitle: string | null, job: { company: string; title: string; job_url: string }) {
  const greeting = name.split(/\s+/)[0];
  return {
    subject: `${job.title} at ${job.company}`,
    body: `Hi ${greeting},\n\nI came across the ${job.title} opportunity at ${job.company} and it looks closely aligned with my software engineering and applied machine learning background. ${personTitle ? `I noticed your work as ${personTitle}, ` : ''}so I wanted to reach out directly.\n\nWould you be open to a brief 15-minute conversation about the role and team? I would really appreciate learning from your perspective.\n\nJob posting: ${job.job_url}\n\nBest,\nThuan Tran`
  };
}

export async function lookupPeople(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const company = required(req.query.company, 'company');
    const companyKey = company.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    let result = await getPool().query(`SELECT p.*, COUNT(jp.id)::int AS matched_jobs FROM people p LEFT JOIN job_people jp ON jp.person_id = p.id WHERE LOWER(p.company) LIKE LOWER($1) OR LOWER(p.professional_email) LIKE LOWER($2) GROUP BY p.id ORDER BY p.confidence_score DESC, p.name`, [`%${company}%`, `%@${company.toLowerCase().replace(/\s+/g, '')}%`]);
    if (process.env.SERPAPI_API_KEY) {
      const searched = await getPool().query('SELECT searched_at FROM people_searches WHERE company_key=$1 AND searched_at > NOW() - INTERVAL \'7 days\'', [companyKey]);
      if (!searched.rowCount) {
        const query = `site:linkedin.com/in (${company}) (recruiter OR "hiring manager" OR engineer OR talent)`;
        const response = await fetch(`https://serpapi.com/search.json?engine=google&hl=en&gl=us&num=20&q=${encodeURIComponent(query)}&api_key=${encodeURIComponent(process.env.SERPAPI_API_KEY)}`);
        if (!response.ok) throw new AppError(`People search provider returned HTTP ${response.status}.`, 502);
        const payload = await response.json() as { organic_results?: Array<{ title?: string; snippet?: string; link?: string }> };
        for (const item of payload.organic_results || []) {
          if (!item.title || !item.link) continue;
          const name = item.title.split(' - ')[0].trim();
          const title = item.title.split(' - ').slice(1).join(' - ').trim() || item.snippet?.slice(0, 300) || null;
          const ranking = rank(title, company);
          await getPool().query(`INSERT INTO people (company, name, title, profile_url, source, confidence_score) VALUES ($1,$2,$3,$4,'SERPAPI', $5) ON CONFLICT DO NOTHING`, [company, name, title, item.link, ranking.score]);
        }
        await getPool().query('INSERT INTO people_searches (company_key) VALUES ($1) ON CONFLICT (company_key) DO UPDATE SET searched_at=NOW()', [companyKey]);
      }
      result = await getPool().query(`SELECT p.*, COUNT(jp.id)::int AS matched_jobs FROM people p LEFT JOIN job_people jp ON jp.person_id = p.id WHERE LOWER(p.company) LIKE LOWER($1) AND p.source='SERPAPI' GROUP BY p.id ORDER BY p.confidence_score DESC, p.name`, [`%${company}%`]);
    }
    const jobs = await getPool().query('SELECT id, company, title, job_url, discovered_at FROM jobs WHERE LOWER(company) LIKE LOWER($1) ORDER BY discovered_at DESC LIMIT 50', [`%${company}%`]);
    res.json({ company, people: result.rows, jobs: jobs.rows });
  } catch (error) { next(error); }
}

export async function addPersonForJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const jobId = required(req.params.jobId, 'jobId');
    const name = required(req.body?.name, 'name');
    const email = req.body?.email ? required(req.body.email, 'email', 320).toLowerCase() : null;
    const company = required(req.body?.company || (email ? companyFromEmail(email) : ''), 'company');
    const title = req.body?.title ? required(req.body.title, 'title') : null;
    const profileUrl = req.body?.profileUrl ? required(req.body.profileUrl, 'profileUrl', 1000) : null;
    const pool = getPool();
    const job = await pool.query('SELECT id, company, title, job_url FROM jobs WHERE id = $1', [jobId]);
    if (!job.rowCount) throw new AppError('Job was not found.', 404);
    const person = await pool.query(`INSERT INTO people (company, name, title, profile_url, professional_email, source, confidence_score) VALUES ($1,$2,$3,$4,$5,'MANUAL',80) ON CONFLICT (LOWER(company), LOWER(professional_email)) WHERE professional_email IS NOT NULL DO UPDATE SET name=EXCLUDED.name, title=EXCLUDED.title, profile_url=EXCLUDED.profile_url, updated_at=NOW() RETURNING *`, [company, name, title, profileUrl, email]);
    const personRow = person.rows[0];
    const ranking = rank(personRow.title, job.rows[0].title);
    await pool.query(`INSERT INTO job_people (job_id, person_id, relevance_score, ranking_reasons) VALUES ($1,$2,$3,$4) ON CONFLICT (job_id, person_id) DO UPDATE SET relevance_score=EXCLUDED.relevance_score, ranking_reasons=EXCLUDED.ranking_reasons, updated_at=NOW()`, [jobId, personRow.id, ranking.score, JSON.stringify(ranking.reasons)]);
    const message = draft(personRow.name, personRow.title, job.rows[0]);
    const outreach = await pool.query(`INSERT INTO outreach (job_id, person_id, subject, body) VALUES ($1,$2,$3,$4) ON CONFLICT (job_id, person_id) DO UPDATE SET subject=EXCLUDED.subject, body=EXCLUDED.body, updated_at=NOW() RETURNING *`, [jobId, personRow.id, message.subject, message.body]);
    res.status(201).json({ person: personRow, ranking, outreach: outreach.rows[0] });
  } catch (error) { next(error); }
}

export async function reviewQueue(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getPool().query(`SELECT o.*, p.name, p.title AS person_title, p.professional_email, p.profile_url, j.company, j.title AS job_title, j.job_url, jp.relevance_score, jp.ranking_reasons FROM outreach o JOIN people p ON p.id=o.person_id JOIN jobs j ON j.id=o.job_id JOIN job_people jp ON jp.job_id=o.job_id AND jp.person_id=o.person_id WHERE o.status='NEEDS_REVIEW' ORDER BY jp.relevance_score DESC, o.created_at DESC`);
    res.json({ items: result.rows });
  } catch (error) { next(error); }
}
