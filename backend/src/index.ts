import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { requestLogger, errorHandler, apiKeyAuth } from '@projectq/middleware';
import resumeRoutes from './routes/resumeRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { googleConfigured } from './config/googleAuth.js';
import { isGcpConfigured } from './config/gcpStorage.js';
import internalRoutes from './routes/internalRoutes.js';
import { initializeDatabase } from './config/database.js';
import peopleRoutes from './routes/peopleRoutes.js';

// Load environment variables from backend/.env or root .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const rootEnvPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnvPath)) {
  const rootEnv = dotenv.parse(fs.readFileSync(rootEnvPath));
  for (const key of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM_NAME', 'SMTP_FROM_EMAIL']) {
    if (rootEnv[key] !== undefined) process.env[key] = rootEnv[key];
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Enable CORS for frontend Vite dev server & production
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware from @projectq/middleware
app.use(requestLogger);
app.use(apiKeyAuth);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    gcpConfigured: isGcpConfigured(),
    gmailConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN),
  });
});

// Mount modular routes
app.use('/api/resumes', resumeRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/internal', internalRoutes);
app.use('/api/people', peopleRoutes);

// Serve frontend static build in production (single web-service deployment)
const frontendDistCandidates = [
  path.resolve(process.cwd(), 'frontend', 'dist'),
  path.resolve(process.cwd(), 'dist'),
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../../../frontend/dist')
];

let frontendDistPath: string | null = null;
for (const cand of frontendDistCandidates) {
  if (fs.existsSync(cand)) {
    frontendDistPath = cand;
    break;
  }
}

if (frontendDistPath) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath!, 'index.html'));
  });
}

// Centralized error handling middleware
app.use(errorHandler);

initializeDatabase().then(() => app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`ðŸ¥ Hospital Job Dispatcher Backend running on port ${PORT}`);
  console.log(`   API URL: http://localhost:${PORT}/api`);
  console.log(`   GCP Cloud Storage: ${isGcpConfigured() ? 'âœ… Configured' : 'âš ï¸ Local fallback active'}`);
  console.log(`=======================================================`);
})).catch((error) => { console.error('Database initialization failed:', error); process.exit(1); });
