import { useState, useEffect, useCallback } from 'react';
import { ResumeManager } from './components/ResumeManager';
import { BatchEmailWorkspace } from './components/BatchEmailWorkspace';
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
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [resumesResult, templatesResult, healthResult] = await Promise.allSettled([
        fetchResumes(),
        fetchTemplates(),
        fetchHealth()
      ]);

      const errors: string[] = [];
      let resumesData: Resume[] = [];

      if (resumesResult.status === 'fulfilled') {
        resumesData = resumesResult.value;
        setResumes(resumesData);
      } else {
        errors.push('resumes');
      }

      if (templatesResult.status === 'fulfilled' && templatesResult.value.length > 0) {
        setTemplates(templatesResult.value);
      } else {
        errors.push('email templates');
      }

      setHealth(healthResult.status === 'fulfilled' ? healthResult.value : null);
      setLoadError(errors.length > 0 ? `Couldn't load ${errors.join(' and ')}. Check the backend and retry.` : null);

      // Auto-select the first resume if none selected
      if (resumesData.length > 0 && !selectedResume) {
        setSelectedResume(resumesData[0]);
      }
    } catch {
      setLoadError('Workspace data could not be loaded. Check the backend and retry.');
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
      <header className="bg-slate-100 border-b border-slate-300 sticky top-0 z-20">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-hospital-600 text-white flex items-center justify-center">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900 leading-tight">
                Hospital Career Dispatcher
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Resume library <span className="text-slate-400">/</span> email workspace
              </p>
            </div>
          </div>

          {/* System status tags */}
          <div className="hidden sm:flex items-center gap-4 text-xs">
            <div
              className={`flex items-center gap-1.5 font-medium ${
                health?.gcpConfigured
                  ? 'text-sky-700'
                  : 'text-amber-600'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>GCP Storage: {health?.gcpConfigured ? 'Connected' : 'Local Fallback'}</span>
            </div>

            <div
              className={`flex items-center gap-1.5 font-medium ${
                health?.gmailConfigured
                  ? 'text-emerald-700'
                  : 'text-slate-500'
              }`}
            >
              <MailCheck className="w-3.5 h-3.5" />
              <span>Email: {health?.gmailConfigured ? 'Gmail Connected' : 'Not configured'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-500">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-hospital-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">Loading resumes and hospital templates...</p>
            </div>
          </div>
        ) : loadError ? (
          <section role="alert" className="mx-auto max-w-xl rounded-lg border border-red-200 bg-red-50 p-5 text-center text-red-800">
            <p className="text-sm font-medium">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadData()}
              className="mt-4 rounded-md border border-red-300 px-3 py-2 text-sm font-medium hover:bg-red-100"
            >
              Retry
            </button>
          </section>
        ) : (
          <>
            <div className="flex items-end justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">WORKSPACE</p>
                <h2 className="text-lg font-semibold text-slate-900">Application drafts</h2>
              </div>
            </div>
            <BatchEmailWorkspace
              templates={templates}
              selectedResume={selectedResume}
              resumeManager={(
                <ResumeManager
                  resumes={resumes}
                  selectedResume={selectedResume}
                  onSelectResume={setSelectedResume}
                  onResumesUpdated={loadData}
                />
              )}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-100 border-t border-slate-300 py-3 text-center text-xs text-slate-500">
        ProjectQ <span className="text-slate-400">/</span> Hospital application workspace
      </footer>
    </div>
  );
}

export default App;
