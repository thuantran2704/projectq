import pg from 'pg';

const { Pool } = pg;
let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.');
    // Use the AWS RDS CA certificate so Render verifies the database identity.
    const connectionString = process.env.DATABASE_URL.replace(/([?&])sslmode=[^&]+&?/i, '$1').replace(/[?&]$/, '');
    const ca = process.env.RDS_CA_CERT?.trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
    if (process.env.NODE_ENV === 'production' && !ca) throw new Error('RDS_CA_CERT is required in production. Add the AWS RDS global CA certificate to Render.');
    pool = new Pool({ connectionString, ssl: process.env.NODE_ENV === 'production' ? { ca, rejectUnauthorized: true } : undefined, max: 5 });
  }
  return pool;
}

export async function initializeDatabase(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (process.env.NODE_ENV === 'production' && !process.env.RDS_CA_CERT) {
    const response = await fetch('https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem');
    if (!response.ok) throw new Error(`Could not download AWS RDS CA bundle: HTTP ${response.status}`);
    process.env.RDS_CA_CERT = await response.text();
  }
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id BIGSERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      source_job_id TEXT NOT NULL,
      company TEXT NOT NULL,
      title TEXT NOT NULL,
      location TEXT,
      job_url TEXT NOT NULL,
      description TEXT,
      team TEXT,
      date_posted TIMESTAMPTZ,
      discovered_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      people_discovery_status TEXT NOT NULL DEFAULT 'NOT_STARTED',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (source, source_job_id)
    );
    CREATE TABLE IF NOT EXISTS people (
      id BIGSERIAL PRIMARY KEY,
      company TEXT NOT NULL,
      name TEXT NOT NULL,
      title TEXT,
      profile_url TEXT,
      professional_email TEXT,
      email_verification_status TEXT NOT NULL DEFAULT 'UNKNOWN',
      source TEXT NOT NULL DEFAULT 'MANUAL',
      confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS people_company_email_idx
      ON people (LOWER(company), LOWER(professional_email))
      WHERE professional_email IS NOT NULL;
    CREATE TABLE IF NOT EXISTS job_people (
      id BIGSERIAL PRIMARY KEY,
      job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      person_id BIGINT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      relevance_score NUMERIC(5,2) NOT NULL DEFAULT 0,
      ranking_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'CANDIDATE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (job_id, person_id)
    );
    CREATE TABLE IF NOT EXISTS outreach (
      id BIGSERIAL PRIMARY KEY,
      job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      person_id BIGINT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      approved_at TIMESTAMPTZ,
      sent_at TIMESTAMPTZ,
      UNIQUE (job_id, person_id)
    );
    CREATE INDEX IF NOT EXISTS people_company_lookup_idx ON people (LOWER(company));
    CREATE INDEX IF NOT EXISTS outreach_review_idx ON outreach (status, created_at);
    CREATE TABLE IF NOT EXISTS people_searches (
      company_key TEXT PRIMARY KEY,
      searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}
