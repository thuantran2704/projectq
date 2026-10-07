import { useState } from 'react';

type Person = { id: string; name: string; title?: string; company: string; professional_email?: string; confidence_score: string };
type Job = { id: string; company: string; title: string; job_url: string };

export function PeopleLookup() {
  const [company, setCompany] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [candidate, setCandidate] = useState({ jobId: '', name: '', title: '', email: '' });
  const [message, setMessage] = useState('');

  async function search(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(''); setMessage('');
    try { const response = await fetch(`/api/people/lookup?company=${encodeURIComponent(company)}`); const data = await response.json(); if (!response.ok) throw new Error(data.error?.message || 'Lookup failed'); setPeople(data.people); setJobs(data.jobs); } catch (err) { setError(err instanceof Error ? err.message : 'Lookup failed'); } finally { setLoading(false); }
  }
  async function addCandidate(event: React.FormEvent) {
    event.preventDefault(); setMessage('');
    const response = await fetch(`/api/people/jobs/${candidate.jobId}/people`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: candidate.name, title: candidate.title, email: candidate.email, company }) });
    const data = await response.json(); if (!response.ok) { setError(data.error?.message || 'Could not add candidate'); return; }
    setMessage('Candidate added and draft placed in the review queue.'); setCandidate({ jobId: '', name: '', title: '', email: '' }); search({ preventDefault: () => undefined } as unknown as React.FormEvent);
  }
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-lg font-semibold text-slate-900">Relevant people lookup</h2>
    <p className="mt-1 text-sm text-slate-500">Search public results by company for likely recruiters, hiring managers, and relevant engineers. You can also paste an email below, and the company is inferred from its domain.</p>
    <form onSubmit={search} className="mt-4 flex gap-2"><input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Tesla or tesla.com" className="flex-1 rounded border border-slate-300 px-3 py-2" required /><button className="rounded bg-indigo-600 px-4 py-2 text-white" disabled={loading}>{loading ? 'Searching...' : 'Search'}</button></form>
    {error && <p className="mt-3 text-sm text-red-600">{error}</p>}{message && <p className="mt-3 text-sm text-green-700">{message}</p>}
    {jobs.length > 0 && <form onSubmit={addCandidate} className="mt-5 grid gap-2 rounded bg-slate-50 p-4 md:grid-cols-2"><select value={candidate.jobId} onChange={(e) => setCandidate({ ...candidate, jobId: e.target.value })} className="rounded border px-3 py-2" required><option value="">Attach to a job...</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.title} at {job.company}</option>)}</select><input placeholder="Person name" value={candidate.name} onChange={(e) => setCandidate({ ...candidate, name: e.target.value })} className="rounded border px-3 py-2" required /><input placeholder="Title, for ranking" value={candidate.title} onChange={(e) => setCandidate({ ...candidate, title: e.target.value })} className="rounded border px-3 py-2" /><input placeholder="Email, optional" value={candidate.email} onChange={(e) => setCandidate({ ...candidate, email: e.target.value })} className="rounded border px-3 py-2" /><button className="rounded bg-slate-900 px-4 py-2 text-white md:col-span-2">Add candidate and create draft</button></form>}
    <div className="mt-5 space-y-2">{people.map((person) => <div key={person.id} className="rounded border border-slate-200 p-3"><div className="font-medium">{person.name}</div><div className="text-sm text-slate-600">{person.title || 'Title unknown'} {person.professional_email ? `• ${person.professional_email}` : ''}</div><div className="text-xs text-slate-500">Confidence: {person.confidence_score}</div></div>)}{people.length === 0 && company && !loading && <p className="text-sm text-slate-500">No results. Confirm SERPAPI_API_KEY is configured in Render, then search again.</p>}</div>
  </section>;
}
