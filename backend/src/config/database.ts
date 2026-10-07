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
  `);
}
