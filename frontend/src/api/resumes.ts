import type { Resume } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function fetchResumes(): Promise<Resume[]> {
  const res = await fetch(`${API_BASE}/resumes`);
  if (!res.ok) {
    throw new Error(`Failed to fetch resumes: ${res.statusText}`);
  }
  const json = await res.json();
  return json.data || [];
}

export async function uploadResume(file: File): Promise<Resume> {
  const formData = new FormData();
  formData.append('resume', file);

  const res = await fetch(`${API_BASE}/resumes/upload`, {
    method: 'POST',
    body: formData
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to upload resume');
  }

  return json.data;
}

export async function deleteResume(filename: string): Promise<void> {
  const res = await fetch(`${API_BASE}/resumes/${encodeURIComponent(filename)}`, {
    method: 'DELETE'
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error?.message || 'Failed to delete resume');
  }
}
