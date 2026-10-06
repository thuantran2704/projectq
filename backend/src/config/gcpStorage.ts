import { Storage } from '@google-cloud/storage';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface ResumeMetadata {
  name: string;
  originalName: string;
  size: number;
  contentType: string;
  updatedAt: string;
  downloadUrl?: string;
  isLocalFallback?: boolean;
}

function getProjectId(): string | undefined {
  return process.env.GCP_PROJECT_ID;
}

function getBucketName(): string | undefined {
  return process.env.GCP_BUCKET_NAME;
}

function getInlineCredentials(): Record<string, unknown> | null {
  const raw = process.env.GCP_SERVICE_ACCOUNT_KEY;
  if (!raw?.trim()) return null;
  try {
    const credentials = JSON.parse(raw.trim()) as Record<string, unknown>;
    if (typeof credentials.private_key === 'string') {
      credentials.private_key = credentials.private_key
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .trim();
    }
    return credentials;
  } catch (err) {
    console.error('Failed to parse GCP_SERVICE_ACCOUNT_KEY JSON string:', err);
    return null;
  }
}

function getResolvedKeyPath(): string | null {
  const configured = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account-key.json';
  const candidates = [
    path.resolve(process.cwd(), configured),
    path.resolve(process.cwd(), 'backend', configured),
    path.resolve(process.cwd(), 'service-account-key.json'),
    path.resolve(process.cwd(), 'backend', 'service-account-key.json'),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../service-account-key.json'),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../service-account-key.json')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

// Local fallback storage directory when GCP credentials are not yet supplied
const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), 'local_storage', 'resumes');
if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
}

export function isGcpConfigured(): boolean {
  return Boolean(
    getProjectId() &&
    getBucketName() &&
    (getInlineCredentials() !== null || getResolvedKeyPath() !== null)
  );
}

let storageClient: Storage | null = null;

function getStorageClient(): Storage {
  if (!storageClient) {
    const inlineCreds = getInlineCredentials();
    if (inlineCreds) {
      storageClient = new Storage({
        projectId: getProjectId(),
        credentials: inlineCreds
      });
    } else {
      const keyFilename = getResolvedKeyPath();
      storageClient = new Storage({
        projectId: getProjectId(),
        keyFilename: keyFilename || undefined
      });
    }
  }
  return storageClient;
}

export async function uploadResumeFile(file: Express.Multer.File, owner = 'quynh'): Promise<ResumeMetadata> {
  const timestamp = Date.now();
  const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const destinationName = `${timestamp}-${safeOriginalName}`;
  const bucketName = getBucketName();

  if (isGcpConfigured() && bucketName) {
    const bucket = getStorageClient().bucket(bucketName);
    const gcsFile = bucket.file(`resumes/${owner}/${destinationName}`);

    await gcsFile.save(file.buffer, {
      contentType: file.mimetype,
      metadata: {
        metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString()
        }
      }
    });

    const [url] = await gcsFile.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 // 24 hours
    }).catch(() => ['']);

    return {
      name: destinationName,
      originalName: file.originalname,
      size: file.size,
      contentType: file.mimetype,
      updatedAt: new Date().toISOString(),
      downloadUrl: url,
      isLocalFallback: false
    };
  }

  // Local fallback when GCP is not yet configured
  console.warn('[GCP Storage] GCP credentials not found. Storing resume in local fallback storage.');
  const localFilePath = path.join(LOCAL_STORAGE_DIR, destinationName);
  await fs.promises.writeFile(localFilePath, file.buffer);

  // Store metadata
  const metaPath = `${localFilePath}.meta.json`;
  const metaData: ResumeMetadata = {
    name: destinationName,
    originalName: file.originalname,
    size: file.size,
    contentType: file.mimetype,
    updatedAt: new Date().toISOString(),
    isLocalFallback: true
  };
  await fs.promises.writeFile(metaPath, JSON.stringify(metaData, null, 2));

  return metaData;
}

export async function listResumes(owner = 'quynh'): Promise<ResumeMetadata[]> {
  const bucketName = getBucketName();
  if (isGcpConfigured() && bucketName) {
    const bucket = getStorageClient().bucket(bucketName);
    const [files] = await bucket.getFiles({ prefix: `resumes/${owner}/` });

    const results: ResumeMetadata[] = [];
    for (const file of files) {
      if (file.name === 'resumes/') continue;
      const [metadata] = await file.getMetadata();
      const customMeta = metadata.metadata || {};
      const cleanName = path.basename(file.name);

      let downloadUrl = '';
      try {
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 1000 * 60 * 60 * 12 // 12 hours
        });
        downloadUrl = url;
      } catch {
        // Ignored if permissions don't allow signed URLs
      }

      results.push({
        name: cleanName,
        originalName: String(customMeta.originalName || cleanName),
        size: Number(metadata.size) || 0,
        contentType: metadata.contentType || 'application/pdf',
        updatedAt: metadata.updated || new Date().toISOString(),
        downloadUrl,
        isLocalFallback: false
      });
    }

    return results;
  }

  // Fallback: list from local fallback folder
  const files = await fs.promises.readdir(LOCAL_STORAGE_DIR);
  const results: ResumeMetadata[] = [];

  for (const fileName of files) {
    if (fileName.endsWith('.meta.json')) continue;
    const metaPath = path.join(LOCAL_STORAGE_DIR, `${fileName}.meta.json`);
    const filePath = path.join(LOCAL_STORAGE_DIR, fileName);

    let originalName = fileName;
    let updatedAt = new Date().toISOString();
    let size = 0;

    try {
      const stat = await fs.promises.stat(filePath);
      size = stat.size;
      updatedAt = stat.mtime.toISOString();
    } catch {
      // Ignore
    }

    if (fs.existsSync(metaPath)) {
      try {
        const savedMeta = JSON.parse(await fs.promises.readFile(metaPath, 'utf-8'));
        originalName = savedMeta.originalName || originalName;
      } catch {
        // Ignore
      }
    }

    results.push({
      name: fileName,
      originalName,
      size,
      contentType: fileName.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf',
      updatedAt,
      downloadUrl: `/api/resumes/${fileName}/download`,
      isLocalFallback: true
    });
  }

  return results;
}

export async function deleteResume(filename: string, owner = 'quynh'): Promise<void> {
  const cleanName = path.basename(filename);
  const bucketName = getBucketName();

  if (isGcpConfigured() && bucketName) {
    const bucket = getStorageClient().bucket(bucketName);
    const gcsFile = bucket.file(`resumes/${owner}/${cleanName}`);
    await gcsFile.delete();
    return;
  }

  // Local fallback delete
  const localFilePath = path.join(LOCAL_STORAGE_DIR, cleanName);
  const metaPath = `${localFilePath}.meta.json`;

  if (fs.existsSync(localFilePath)) {
    await fs.promises.unlink(localFilePath);
  }
  if (fs.existsSync(metaPath)) {
    await fs.promises.unlink(metaPath);
  }
}

export async function getResumeBuffer(filename: string, owner = 'quynh'): Promise<{ buffer: Buffer; originalName: string; contentType: string }> {
  const cleanName = path.basename(filename);
  const bucketName = getBucketName();

  if (isGcpConfigured() && bucketName) {
    const bucket = getStorageClient().bucket(bucketName);
    const gcsFile = bucket.file(`resumes/${owner}/${cleanName}`);
    const [fileBuffer] = await gcsFile.download();
    const [metadata] = await gcsFile.getMetadata();
    const customMeta = metadata.metadata || {};

    return {
      buffer: fileBuffer,
      originalName: String(customMeta.originalName || cleanName),
      contentType: metadata.contentType || 'application/pdf'
    };
  }

  // Local fallback
  const localFilePath = path.join(LOCAL_STORAGE_DIR, cleanName);
  if (!fs.existsSync(localFilePath)) {
    throw new Error(`Resume file "${cleanName}" not found.`);
  }

  const buffer = await fs.promises.readFile(localFilePath);
  const metaPath = `${localFilePath}.meta.json`;
  let originalName = cleanName;

  if (fs.existsSync(metaPath)) {
    try {
      const savedMeta = JSON.parse(await fs.promises.readFile(metaPath, 'utf-8'));
      originalName = savedMeta.originalName || originalName;
    } catch {
      // Ignore
    }
  }

  return {
    buffer,
    originalName,
    contentType: cleanName.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf'
  };
}
