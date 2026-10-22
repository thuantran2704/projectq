import { useCallback, useEffect, useState } from 'react';
import { Activity, ArrowUpRight, Cloud, FileText, HelpCircle, Inbox, LayoutDashboard, LogIn, Mail, Menu, Search, Send, Settings2, ShieldCheck, Sparkles, UserCircle2, Users } from 'lucide-react';
import { ResumeManager } from './components/ResumeManager';
import { BatchEmailWorkspace } from './components/BatchEmailWorkspace';
import { JobApplicationWorkspace } from './components/JobApplicationWorkspace';
import { PeopleLookup } from './components/PeopleLookup';
import { fetchCurrentUser } from './api/currentUser';
import { fetchResumes } from './api/resumes';
import { fetchTemplates, fetchHealth } from './api/email';
import type { BackendHealth, HospitalEmailTemplate, Resume } from './types';

export function App() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [templates, setTemplates] = useState<HospitalEmailTemplate[]>([]);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<'quynh' | 'job-applications'>('quynh');
  const [activeTab, setActiveTab] = useState<'job' | 'quynh'>('job');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [userResult, resumesResult, templatesResult, healthResult] = await Promise.allSettled([
        fetchCurrentUser(), fetchResumes(), fetchTemplates(), fetchHealth()
      ]);
      const errors: string[] = [];
      let resumesData: Resume[] = [];
      if (userResult.status === 'fulfilled') setWorkspace(userResult.value.workspace);
      if (resumesResult.status === 'fulfilled') {
        resumesData = resumesResult.value;
        setResumes(resumesData);
        setSelectedResume((current) => current || resumesData[0] || null);
      } else errors.push('resumes');
      if (templatesResult.status === 'fulfilled' && templatesResult.value.length > 0) setTemplates(templatesResult.value);
      else errors.push('email templates');
      setHealth(healthResult.status === 'fulfilled' ? healthResult.value : null);
      setLoadError(errors.length > 0 ? `Couldn’t load ${errors.join(' and ')}. Check the backend and retry.` : null);
    } catch {
      setLoadError('Workspace data could not be loaded. Check the backend and retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const isJobWorkspace = workspace === 'job-applications';
  const showingJobBoard = isJobWorkspace && activeTab === 'job';
  const title = showingJobBoard ? 'Your outreach command center' : 'Application drafts';
  const subtitle = showingJobBoard
    ? 'Find the right person, shape the message, and send with confidence.'
    : 'Build a thoughtful, personal application pipeline for nurse residency programs.';

  const legalPath = window.location.pathname;
  if (legalPath === '/privacy' || legalPath === '/terms') {
    return <LegalPage type={legalPath === '/privacy' ? 'privacy' : 'terms'} />;
  }

  if (loading) return <div className="app-loading"><div className="loading-mark"><Activity className="h-5 w-5" /></div><div><p>Opening ProjectQ</p><span>Syncing your workspace…</span></div></div>;
  if (loadError) return <div className="auth-screen"><div className="auth-card"><div className="brand-mark large"><Sparkles className="h-6 w-6" /></div><p className="eyebrow">PROJECTQ</p><h1>{loadError.includes('resumes') ? 'Sign in to continue' : 'We hit a small snag'}</h1><p>{loadError.includes('resumes') ? 'Use an approved Google account to open your resume library and outreach workspace.' : loadError}</p>{loadError.includes('resumes') && <a className="primary-button" href="/api/auth/google/start"><LogIn className="h-4 w-4" /> Sign in with Google</a>}<button className="quiet-button" type="button" onClick={() => void loadData()}>Retry connection</button></div></div>;

  return (
    <div className="projectq-app">
      <aside className={`app-sidebar ${mobileNavOpen ? 'is-open' : ''}`}>
        <div className="sidebar-brand"><div className="brand-mark"><Sparkles className="h-4 w-4" /></div><div><strong>ProjectQ</strong><span>Career operations</span></div><button className="icon-button mobile-only" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}>×</button></div>
        <div className="workspace-switcher"><span className="workspace-avatar">{isJobWorkspace ? 'T' : 'Q'}</span><div><strong>{isJobWorkspace ? 'Thuan’s workspace' : 'Quynh’s workspace'}</strong><span>{isJobWorkspace ? 'Personal outreach' : 'Nurse residency'}</span></div><span className="status-dot" /></div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <p className="nav-label">Workspace</p>
          <button className={`nav-item ${showingJobBoard ? 'active' : ''}`} type="button" onClick={() => { setActiveTab('job'); setMobileNavOpen(false); }}><LayoutDashboard className="h-4 w-4" /> Overview</button>
          <button className={`nav-item ${!showingJobBoard ? 'active' : ''}`} type="button" onClick={() => { setActiveTab('quynh'); setMobileNavOpen(false); }}><Send className="h-4 w-4" /> Email drafts <span className="nav-count">{templates.length || '—'}</span></button>
          <button className="nav-item" type="button" onClick={() => document.getElementById('resume-library')?.scrollIntoView({ behavior: 'smooth' })}><FileText className="h-4 w-4" /> Resume library</button>
          {showingJobBoard && <button className="nav-item" type="button" onClick={() => document.getElementById('people-lookup')?.scrollIntoView({ behavior: 'smooth' })}><Users className="h-4 w-4" /> People lookup</button>}
          <p className="nav-label nav-label-spaced">System</p>
          <div className="nav-status"><span className={health?.gmailConfigured ? 'signal good' : 'signal warning'} /><span>Gmail {health?.gmailConfigured ? 'connected' : 'needs setup'}</span></div>
          <div className="nav-status"><span className={health?.gcpConfigured ? 'signal good' : 'signal warning'} /><span>Storage {health?.gcpConfigured ? 'connected' : 'local fallback'}</span></div>
        </nav>
        <div className="sidebar-bottom"><button className="nav-item" type="button"><Settings2 className="h-4 w-4" /> Settings</button><button className="nav-item" type="button"><HelpCircle className="h-4 w-4" /> Help center</button><div className="sidebar-user"><UserCircle2 className="h-7 w-7" /><div><strong>{isJobWorkspace ? 'Thuan' : 'Quynh'}</strong><span>{isJobWorkspace ? 'Personal account' : 'Nursing candidate'}</span></div></div></div>
      </aside>
      {mobileNavOpen && <button className="mobile-overlay" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <main className="app-main">
        <header className="topbar"><button className="icon-button mobile-only" type="button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu className="h-5 w-5" /></button><div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{isJobWorkspace ? 'Personal outreach' : 'Nurse residency'}</strong></div><div className="topbar-actions"><button className="topbar-search" type="button"><Search className="h-4 w-4" /><span>Search workspace</span><kbd>⌘ K</kbd></button><button className="icon-button" type="button" aria-label="Notifications"><Inbox className="h-4 w-4" /></button><div className="topbar-avatar">{isJobWorkspace ? 'T' : 'Q'}</div></div></header>
        <div className="content-wrap">
          <section className="page-intro"><div><p className="eyebrow"><span className="eyebrow-dot" /> {isJobWorkspace ? 'PERSONAL OUTREACH' : 'NURSE RESIDENCY OUTREACH'}</p><h1>{title}</h1><p>{subtitle}</p></div><div className="intro-actions"><span className="secure-badge"><ShieldCheck className="h-4 w-4" /> Private workspace</span><button className="secondary-button" type="button"><ArrowUpRight className="h-4 w-4" /> View activity</button></div></section>
          {isJobWorkspace && <div className="workspace-tabs" role="tablist" aria-label="Workspaces"><button className={activeTab === 'job' ? 'selected' : ''} type="button" role="tab" aria-selected={activeTab === 'job'} onClick={() => setActiveTab('job')}><Mail className="h-4 w-4" /> Job applications</button><button className={activeTab === 'quynh' ? 'selected' : ''} type="button" role="tab" aria-selected={activeTab === 'quynh'} onClick={() => setActiveTab('quynh')}><Sparkles className="h-4 w-4" /> Quynh’s outreach</button></div>}
          {showingJobBoard ? <><section className="metric-grid"><div className="metric-card"><span className="metric-icon blue"><Mail className="h-4 w-4" /></span><div><span>Ready to send</span><strong>{templates.length ? 'Active' : '—'}</strong></div><small>Message templates</small></div><div className="metric-card"><span className="metric-icon violet"><FileText className="h-4 w-4" /></span><div><span>Resume files</span><strong>{resumes.length}</strong></div><small>Available to attach</small></div><div className="metric-card"><span className="metric-icon green"><Cloud className="h-4 w-4" /></span><div><span>Storage status</span><strong>{health?.gcpConfigured ? 'Synced' : 'Local'}</strong></div><small>{health?.gcpConfigured ? 'Cloud Storage' : 'Fallback mode'}</small></div></section><div id="resume-library" className="section-anchor"><ResumeManager resumes={resumes} selectedResume={selectedResume} onSelectResume={setSelectedResume} onResumesUpdated={loadData} /></div><div id="people-lookup" className="section-anchor"><PeopleLookup /></div><JobApplicationWorkspace resumes={resumes} selectedResume={selectedResume} onSelectResume={setSelectedResume} resumeManager={null} /></> : <BatchEmailWorkspace templates={templates} selectedResume={selectedResume} resumeManager={<div id="resume-library"><ResumeManager resumes={resumes} selectedResume={selectedResume} onSelectResume={setSelectedResume} onResumesUpdated={loadData} /></div>} />}
        </div>
        <footer className="app-footer"><span>ProjectQ <span className="muted">/</span> built for focused outreach</span><span className="footer-right"><Activity className="h-3.5 w-3.5" /> All systems operational</span></footer>
      </main>
    </div>
  );
}

export default App;

function LegalPage({ type }: { type: 'privacy' | 'terms' }) {
  const isPrivacy = type === 'privacy';
  return (
    <div className="legal-page">
      <header className="legal-header"><a href="/" className="legal-brand"><span className="brand-mark"><Sparkles className="h-4 w-4" /></span><span><strong>ProjectQ</strong><small>Career operations</small></span></a><a href="/" className="quiet-button">Back to ProjectQ</a></header>
      <main className="legal-card">
        <p className="eyebrow"><span className="eyebrow-dot" /> PROJECTQ</p>
        <h1>{isPrivacy ? 'Privacy policy' : 'Terms of service'}</h1>
        <p className="legal-updated">Effective date: October 21, 2026</p>
        {isPrivacy ? <>
          <p>ProjectQ is a private career-outreach workspace operated by Thuần Trần. This notice explains what information the service uses to provide its resume, job-search, and email features.</p>
          <h2>Information we use</h2>
          <ul><li>Your Google account email address, used to authenticate approved workspace users.</li><li>Gmail permission, used only to send messages from the Google account you select.</li><li>Resume files and related file metadata that you upload for use as email attachments.</li><li>Hospital, recruiter, and job-contact details that you enter or search for in the workspace.</li><li>Browser-saved draft recipient profiles and preferences used to keep your workspace available between visits.</li></ul>
          <h2>How information is used</h2>
          <p>ProjectQ uses this information to authenticate you, store and attach resumes, prepare outreach drafts, search for professional contacts, and send emails that you request. ProjectQ does not sell personal information or use your Gmail data for advertising.</p>
          <h2>Google data</h2>
          <p>When you connect Gmail, ProjectQ requests permission to send email. ProjectQ does not read your inbox or use Gmail content for advertising. You can revoke access at any time from your Google Account security settings.</p>
          <h2>Storage and retention</h2>
          <p>Uploaded resumes may be stored in configured cloud storage. Draft recipient information may be stored in your browser. You can remove uploaded resumes from the workspace, and you can request deletion of other stored information by contacting the address below.</p>
          <h2>Contact</h2>
          <p>For privacy questions or deletion requests, contact <a href="mailto:thuantran2704@gmail.com">thuantran2704@gmail.com</a>.</p>
        </> : <>
          <p>ProjectQ is a private career-outreach workspace operated by Thuần Trần. By using ProjectQ, you agree to use it responsibly and only with accounts and information you are authorized to use.</p>
          <h2>Acceptable use</h2>
          <ul><li>Use ProjectQ only for lawful career research and outreach.</li><li>Do not use the service to send spam, impersonate another person, or contact people without a legitimate professional purpose.</li><li>Keep your Google account and connected credentials secure.</li><li>Review recipients and message content before sending.</li></ul>
          <h2>Email and third-party services</h2>
          <p>ProjectQ uses Google APIs, cloud storage, and other configured services to provide its features. Email delivery depends on Google and recipient mail systems. ProjectQ cannot guarantee delivery, inbox placement, or uninterrupted availability.</p>
          <h2>Your responsibility</h2>
          <p>You are responsible for the files, recipients, and messages you enter or send. You should not upload files or send messages containing information you do not have permission to use.</p>
          <h2>Changes and contact</h2>
          <p>These terms may be updated as ProjectQ changes. Continued use after an update means you accept the revised terms. Questions can be sent to <a href="mailto:thuantran2704@gmail.com">thuantran2704@gmail.com</a>.</p>
        </>}
      </main>
      <footer className="legal-footer">ProjectQ <span>/</span> Private career outreach workspace</footer>
    </div>
  );
}
