export interface Resume {
  name: string;
  originalName: string;
  size: number;
  contentType: string;
  updatedAt: string;
  downloadUrl?: string;
  isLocalFallback?: boolean;
}

export interface HospitalEmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  description: string;
}

export interface SendEmailPayload {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  resumeFilename?: string;
}

export interface BackendHealth {
  status: string;
  timestamp: string;
  gcpConfigured: boolean;
  mailerConfigured: boolean;
}
