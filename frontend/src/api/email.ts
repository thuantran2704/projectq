import type { HospitalEmailTemplate, SendEmailPayload, BackendHealth } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function fetchTemplates(): Promise<HospitalEmailTemplate[]> {
  const res = await fetch(`${API_BASE}/email/templates`);
  if (!res.ok) {
    throw new Error(`Failed to fetch templates: ${res.statusText}`);
  }
  const json = await res.json();
  return json.data || [];
}

export async function sendHospitalEmail(payload: SendEmailPayload): Promise<{
  success: boolean;
  message: string;
  messageId?: string;
  accepted?: string[];
  rejected?: string[];
  smtpResponse?: string;
}> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${API_BASE}/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // The backend sends using its stored Gmail refresh token.
      body: JSON.stringify({ ...payload, useGmail: true }),
      signal: controller.signal
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to dispatch email');
    }

    return json;
  } catch (error: unknown) {
    if (controller.signal.aborted) {
      throw new Error('Send timed out. Check the mailbox before retrying to avoid duplicates.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function renderEmailPreview(body: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(`${API_BASE}/email/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
    signal
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to render email preview');
  }
  return json.html;
}

export async function fetchHealth(): Promise<BackendHealth> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error('Backend health check failed');
  }
  return res.json();
}
