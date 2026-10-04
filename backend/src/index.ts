import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requestLogger, errorHandler, apiKeyAuth } from '@projectq/middleware';
import resumeRoutes from './routes/resumeRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import { isGcpConfigured } from './config/gcpStorage.js';
import { isMailerConfigured } from './config/mailer.js';

// Load environment variables from backend/.env or root .env
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
    mailerConfigured: isMailerConfigured()
  });
});

// Mount modular routes
app.use('/api/resumes', resumeRoutes);
app.use('/api/email', emailRoutes);

// Centralized error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🏥 Hospital Job Dispatcher Backend running on port ${PORT}`);
  console.log(`   API URL: http://localhost:${PORT}/api`);
  console.log(`   GCP Cloud Storage: ${isGcpConfigured() ? '✅ Configured' : '⚠️ Local fallback active'}`);
  console.log(`   SMTP / Nodemailer: ${isMailerConfigured() ? '✅ Configured' : '⚠️ Test/simulated mode'}`);
  console.log(`=======================================================`);
});
