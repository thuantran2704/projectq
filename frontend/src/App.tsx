import { useState, useEffect, useCallback } from 'react';
import { ResumeManager } from './components/ResumeManager';
import { EmailDispatcher } from './components/EmailDispatcher';
import { fetchResumes } from './api/resumes';
import { fetchTemplates, fetchHealth } from './api/email';
import type { Resume, HospitalEmailTemplate, BackendHealth } from './types';
import { HeartPulse, Cloud, MailCheck } from 'lucide-react';

export function App() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [templates, setTemplates] = useState<HospitalEmailTemplate[]>([]);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [resumesData, templatesData, healthData] = await Promise.all([
        fetchResumes().catch(() => []),
        fetchTemplates().catch(() => []),
        fetchHealth().catch(() => null)
      ]);

      setResumes(resumesData);
      setTemplates(templatesData);
      setHealth(healthData);

      // Auto-select the first resume if none selected
      if (resumesData.length > 0 && !selectedResume) {
        setSelectedResume(resumesData[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedResume]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation / Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-hospital-600 text-white flex items-center justify-center shadow-sm">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                Hospital Career Dispatcher
              </h1>
              <p className="text-xs text-slate-500">
                GCP Cloud Storage & Email Application Assistant
              </p>
            </div>
          </div>

          {/* System status tags */}
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium border ${
                health?.gcpConfigured
                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>GCP Storage: {health?.gcpConfigured ? 'Connected' : 'Local Fallback'}</span>
            </div>

            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium border ${
                health?.mailerConfigured
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <MailCheck className="w-3.5 h-3.5" />
              <span>Email: {health?.mailerConfigured ? 'SMTP Ready' : 'Simulated'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-500">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-hospital-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">Loading resumes and hospital templates...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Resume Manager (5 cols) */}
            <div className="lg:col-span-5 h-full">
              <ResumeManager
                resumes={resumes}
                selectedResume={selectedResume}
                onSelectResume={setSelectedResume}
                onResumesUpdated={loadData}
              />
            </div>

            {/* Right Column: Email Dispatcher (7 cols) */}
            <div className="lg:col-span-7 h-full">
              <EmailDispatcher
                templates={templates}
                selectedResume={selectedResume}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-400">
        ProjectQ • Hospital Application & Resume Dispatcher with Tailwind, Node, and GCP Cloud Storage
      </footer>
    </div>
  );
}

export default App;
