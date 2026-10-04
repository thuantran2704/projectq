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

export async function sendHospitalEmail(payload: SendEmailPayload): Promise<{ success: boolean; message: string; messageId?: string }> {
  const res = await fetch(`${API_BASE}/email/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to dispatch email');
  }

  return json;
}

export async function fetchHealth(): Promise<BackendHealth> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error('Backend health check failed');
  }
  return res.json();
}
