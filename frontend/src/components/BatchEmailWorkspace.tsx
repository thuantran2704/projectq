import React, { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { HospitalEmailTemplate, Resume } from '../types';
import { renderEmailPreview, sendHospitalEmail } from '../api/email';
import { AlertCircle, Check, ChevronDown, FileCheck2, Globe, Loader2, Mail, Plus, Search, Send, Trash2 } from 'lucide-react';

interface HospitalProfile {
  id: string;
  hospitalName: string;
  recipientEmail: string;
  hiringTeam: string;
  personalNote: string;
  includeVisaQuestion: boolean;
  selectedForSend: boolean;
  status: 'new' | 'sent';
  sentCount: number;
  lastSentAt?: string;
  lastAttemptAt?: string;
  lastAttemptStatus?: 'simulated' | 'failed';
  lastAttemptMessage?: string;
}

interface EmailOverride {
  subject: string;
  body: string;
}

interface ProfileSendState {
  status: 'queued' | 'sending' | 'sent' | 'simulated' | 'failed';
  message: string;
}

interface BatchEmailWorkspaceProps {
  templates: HospitalEmailTemplate[];
  selectedResume: Resume | null;
  resumeManager: ReactNode;
}

const MAX_PROFILES = 20;
const SEND_CONCURRENCY = 3;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROFILES_STORAGE_KEY = 'projectq.hospitalProfiles.v1';

type SendFilter = 'new' | 'sent' | 'all' | 'custom';

function normalizeSearchText(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function matchesSearch(profile: HospitalProfile, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const searchable = normalizeSearchText([
    profile.hospitalName,
    profile.recipientEmail,
    profile.hiringTeam,
    profile.personalNote
  ].join(' '));
  const compactSearchable = searchable.replace(/\s/g, '');

  return normalizedQuery.split(/\s+/).every((term) =>
    searchable.includes(term) || compactSearchable.includes(term.replace(/\s/g, ''))
  );
}

function createHospitalProfile(): HospitalProfile {
  return {
    id: crypto.randomUUID(),
    hospitalName: '',
    recipientEmail: '',
    hiringTeam: 'Nurse Residency Hiring Team',
    personalNote: '',
    includeVisaQuestion: true,
    selectedForSend: true,
    status: 'new',
    sentCount: 0
  };
}

function loadHospitalProfiles(): HospitalProfile[] {
  try {
    const stored = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!stored) return [createHospitalProfile()];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [createHospitalProfile()];

    const profiles = parsed.filter((profile): profile is HospitalProfile =>
      typeof profile === 'object' && profile !== null &&
      typeof profile.id === 'string' &&
      typeof profile.hospitalName === 'string' &&
      typeof profile.recipientEmail === 'string'
    ).slice(0, MAX_PROFILES).map((profile) => ({
      id: profile.id,
      hospitalName: profile.hospitalName,
      recipientEmail: profile.recipientEmail,
      hiringTeam: typeof profile.hiringTeam === 'string' ? profile.hiringTeam : 'Nurse Residency Hiring Team',
      personalNote: typeof profile.personalNote === 'string' ? profile.personalNote : '',
      includeVisaQuestion: profile.includeVisaQuestion !== false,
      selectedForSend: profile.selectedForSend !== false,
      status: profile.status === 'sent' ? 'sent' as const : 'new' as const,
      sentCount: Number.isFinite(profile.sentCount) ? profile.sentCount : 0,
      lastSentAt: typeof profile.lastSentAt === 'string' ? profile.lastSentAt : undefined,
      lastAttemptAt: typeof profile.lastAttemptAt === 'string' ? profile.lastAttemptAt : undefined,
      lastAttemptStatus: profile.lastAttemptStatus === 'simulated' || profile.lastAttemptStatus === 'failed' ? profile.lastAttemptStatus : undefined,
      lastAttemptMessage: typeof profile.lastAttemptMessage === 'string' ? profile.lastAttemptMessage : undefined
    }));

    return profiles.length > 0 ? profiles : [createHospitalProfile()];
  } catch {
    return [createHospitalProfile()];
  }
}

export const BatchEmailWorkspace: React.FC<BatchEmailWorkspaceProps> = ({
  templates,
  selectedResume,
  resumeManager
}) => {
  const [profiles, setProfiles] = useState<HospitalProfile[]>(loadHospitalProfiles);
  const [activeProfileId, setActiveProfileId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('nurse-residency-2027');
  const [sendFilter, setSendFilter] = useState<SendFilter>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [attachResume, setAttachResume] = useState(true);
  const [manualOverrides, setManualOverrides] = useState<Record<string, EmailOverride>>({});
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isSending, setIsSending] = useState(false);
  const [sendBatchTotal, setSendBatchTotal] = useState(0);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendStates, setSendStates] = useState<Record<string, ProfileSendState>>({});
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [loveSubject, setLoveSubject] = useState('I miss you <33');
  const [loveBody, setLoveBody] = useState('I miss you <33');
  const [isSendingLove, setIsSendingLove] = useState(false);
  const [loveStatus, setLoveStatus] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
      setStorageError(null);
    } catch {
      setStorageError('Hospital profiles could not be saved in this browser.');
    }
  }, [profiles]);

  useEffect(() => {
    if (!profiles.some((profile) => profile.id === activeProfileId) && profiles[0]) {
      setActiveProfileId(profiles[0].id);
    }
  }, [profiles, activeProfileId]);

  const activeTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) || templates[0],
    [templates, selectedTemplateId]
  );

  const applicant = activeTemplate?.defaultApplicant;
  const applicantName = applicant?.name || 'Quynh Nguyen';
  const school = applicant?.school || 'University of South Florida College of Nursing';
  const program = applicant?.program || '2027 Graduate Nurse Residency Program';
  const nclexDate = applicant?.nclexDate || 'May 2027';
  const applicantPhone = applicant?.phone || '813-834-8336';
  const applicantEmail = applicant?.email || 'nguyenquynh11102005@gmail.com';
  const applicantLinkedin = applicant?.linkedin || 'www.linkedin.com/in/quynhnhat-ngn';
  const experienceUnits = applicant?.experienceUnits || '';

  const generatedEmails = useMemo(() => {
    const rawSubject = activeTemplate?.subject || 'Application | {{applicantName}}';
    const rawBody = activeTemplate?.body || '';

    return Object.fromEntries(profiles.map((profile) => {
      const visaSection = profile.includeVisaQuestion
        ? "2. Does your hospital offer visa sponsorship for new graduate nurses, and in which units or programs? I'm an international candidate."
        : '';
      const deadlineQuestion = profile.includeVisaQuestion
        ? '3. What are the application deadlines and next steps?'
        : '2. What are the application deadlines and next steps?';
      const resumeSentence = selectedResume && attachResume
        ? 'My resume is attached for your review.'
        : 'I can provide my resume upon request.';
      const hospitalName = profile.hospitalName.trim() || '[Hospital Name]';

      const subject = rawSubject
        .replace(/{{applicantName}}/g, applicantName)
        .replace(/{{hospitalName}}/g, hospitalName);
      const body = rawBody
        .replace(/{{hiringTeam}}/g, profile.hiringTeam.trim() || 'Nurse Residency Hiring Team')
        .replace(/{{applicantName}}/g, applicantName)
        .replace(/{{school}}/g, school)
        .replace(/{{program}}/g, program)
        .replace(/{{position}}/g, 'New Graduate Nurse')
        .replace(/{{hospitalName}}/g, hospitalName)
        .replace(/{{nclexDate}}/g, nclexDate)
        .replace(/{{experienceUnits}}/g, experienceUnits)
        .replace(/{{visaSection}}/g, visaSection)
        .replace(/{{deadlineQuestion}}/g, deadlineQuestion)
        .replace(/{{customNote}}/g, profile.personalNote.trim() ? `${profile.personalNote.trim()}\n\n` : '')
        .replace(/{{resumeSentence}}/g, resumeSentence)
        .replace(/{{applicantPhone}}/g, applicantPhone)
        .replace(/{{applicantEmail}}/g, applicantEmail)
        .replace(/{{applicantLinkedin}}/g, applicantLinkedin)
        .replace(/\n\s*\n\s*\n/g, '\n\n');

      return [profile.id, { subject, body }];
    }));
  }, [
    activeTemplate,
    profiles,
    applicantName,
    school,
    program,
    nclexDate,
    applicantPhone,
    applicantEmail,
    applicantLinkedin,
    experienceUnits,
    selectedResume,
    attachResume
  ]);

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || profiles[0];
  const generatedActiveEmail = generatedEmails[activeProfile.id] || { subject: '', body: '' };
  const activeOverride = manualOverrides[activeProfile.id];
  const currentSubject = activeOverride?.subject ?? generatedActiveEmail.subject;
  const currentBody = activeOverride?.body ?? generatedActiveEmail.body;
  const newCount = profiles.filter((profile) => profile.status === 'new').length;
  const sentProfileCount = profiles.filter((profile) => profile.status === 'sent').length;
  const visibleProfiles = profiles.filter((profile) => {
    if (sendFilter === 'new' && profile.status !== 'new') return false;
    if (sendFilter === 'sent' && profile.status !== 'sent') return false;
    return matchesSearch(profile, searchQuery);
  });
  const sendProfiles = visibleProfiles.filter((profile) => profile.selectedForSend);
  const selectedCount = sendProfiles.length;
  const sentCount = profiles.filter((profile) => sendStates[profile.id]?.status === 'sent').length;
  const simulatedCount = profiles.filter((profile) => sendStates[profile.id]?.status === 'simulated').length;
  const failedCount = profiles.filter((profile) => sendStates[profile.id]?.status === 'failed').length;

  useEffect(() => {
    const controller = new AbortController();
    setIsPreviewLoading(true);
    setPreviewError(null);

    const timeoutId = window.setTimeout(() => {
      renderEmailPreview(currentBody, controller.signal)
        .then(setPreviewHtml)
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setPreviewError(error instanceof Error ? error.message : 'Email preview is unavailable.');
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsPreviewLoading(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [currentBody]);

  const updateProfile = (profileId: string, changes: Partial<HospitalProfile>) => {
    setProfiles((current) => current.map((profile) =>
      profile.id === profileId ? { ...profile, ...changes } : profile
    ));
    setSendError(null);
  };

  const addProfile = () => {
    if (profiles.length >= MAX_PROFILES) return;
    const profile = createHospitalProfile();
    setProfiles((current) => [...current, profile]);
    setActiveProfileId(profile.id);
    setExpandedProfileId(profile.id);
    setSendFilter('new');
    setSearchQuery('');
    setActiveTab('edit');
    setSendError(null);
  };

  const removeProfile = (profileId: string) => {
    if (profiles.length === 1) {
      const replacement = createHospitalProfile();
      setProfiles([replacement]);
      setActiveProfileId(replacement.id);
      setExpandedProfileId(replacement.id);
      setSendFilter('new');
      setSearchQuery('');
      setManualOverrides({});
      setSendStates({});
      return;
    }

    const remaining = profiles.filter((profile) => profile.id !== profileId);
    setProfiles(remaining);
    if (activeProfileId === profileId) setActiveProfileId(remaining[0].id);
    if (expandedProfileId === profileId) setExpandedProfileId(remaining[0].id);
    setManualOverrides((current) => {
      const next = { ...current };
      delete next[profileId];
      return next;
    });
    setSendStates((current) => {
      const next = { ...current };
      delete next[profileId];
      return next;
    });
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setManualOverrides({});
    setSendStates({});
  };

  const sendLove = async () => {
    setIsSendingLove(true); setLoveStatus(null);
    try {
      const result = await sendHospitalEmail({ to: 'thuantran2704@gmail.com', subject: loveSubject, body: loveBody });
      setLoveStatus(result.message || 'Love sent through Gmail.');
    } catch (error) { setLoveStatus(error instanceof Error ? error.message : 'Love message failed to send.'); }
    finally { setIsSendingLove(false); }
  };

  const handleSendSelected = async (event: React.FormEvent) => {
    event.preventDefault();
    const selectedProfiles = sendProfiles;
    if (selectedProfiles.length === 0) {
      setSendError('Select at least one hospital to send to.');
      return;
    }

    const incomplete = selectedProfiles.find((profile) => !profile.hospitalName.trim() || !profile.recipientEmail.trim());
    if (incomplete) {
      setSendError(`Add a hospital name and recipient email for ${incomplete.hospitalName || 'every selected profile'}.`);
      setActiveProfileId(incomplete.id);
      setActiveTab('edit');
      return;
    }

    const invalidAddress = selectedProfiles.find((profile) => !EMAIL_PATTERN.test(profile.recipientEmail.trim()));
    if (invalidAddress) {
      setSendError(`Check the recipient email for ${invalidAddress.hospitalName}.`);
      setActiveProfileId(invalidAddress.id);
      setActiveTab('edit');
      return;
    }

    const emailCounts = new Map<string, number>();
    selectedProfiles.forEach((profile) => {
      const address = profile.recipientEmail.trim().toLowerCase();
      emailCounts.set(address, (emailCounts.get(address) || 0) + 1);
    });
    if ([...emailCounts.values()].some((count) => count > 1)) {
      setSendError('A recipient email appears more than once. Remove duplicate profiles before sending.');
      return;
    }

    setSendError(null);
    setIsSending(true);
    setSendBatchTotal(selectedProfiles.length);
    setSendStates((current) => ({
      ...current,
      ...Object.fromEntries(selectedProfiles.map((profile) => [profile.id, { status: 'queued', message: 'Waiting to send' }]))
    }));

    let nextIndex = 0;
    const sendNext = async () => {
      while (nextIndex < selectedProfiles.length) {
        const profile = selectedProfiles[nextIndex++];
        const email = generatedEmails[profile.id];
        const override = manualOverrides[profile.id];
        setSendStates((current) => ({ ...current, [profile.id]: { status: 'sending', message: 'Sending' } }));

        try {
          const result = await sendHospitalEmail({
            to: profile.recipientEmail.trim(),
            subject: override?.subject ?? email.subject,
            body: override?.body ?? email.body,
            resumeFilename: attachResume ? selectedResume?.name : undefined
          });
          const simulated = result.message.includes('Simulated mode');
          const relayMessage = simulated
            ? 'Preview only; no email was sent.'
            : `${result.message || 'Accepted by Gmail.'}${result.messageId ? ` ID: ${result.messageId}` : ''}`;
          setSendStates((current) => ({
            ...current,
            [profile.id]: {
              status: simulated ? 'simulated' : 'sent',
              message: relayMessage
            }
          }));
          if (!simulated) {
            setProfiles((current) => current.map((item) =>
              item.id === profile.id ? {
                ...item,
                status: 'sent',
                sentCount: item.sentCount + 1,
                lastSentAt: new Date().toISOString(),
                lastAttemptAt: new Date().toISOString(),
                lastAttemptStatus: undefined,
                lastAttemptMessage: 'Sent successfully',
                selectedForSend: false
              } : item
            ));
          } else {
            setProfiles((current) => current.map((item) =>
              item.id === profile.id ? {
                ...item,
                lastAttemptAt: new Date().toISOString(),
                lastAttemptStatus: 'simulated',
                lastAttemptMessage: 'Preview only; no email was sent'
              } : item
            ));
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Send failed';
          setSendStates((current) => ({
            ...current,
            [profile.id]: {
              status: 'failed',
              message
            }
          }));
          setProfiles((current) => current.map((item) =>
            item.id === profile.id ? {
              ...item,
              lastAttemptAt: new Date().toISOString(),
              lastAttemptStatus: 'failed',
              lastAttemptMessage: message
            } : item
          ));
        }
      }
    };

    await Promise.all(Array.from(
      { length: Math.min(SEND_CONCURRENCY, selectedProfiles.length) },
      () => sendNext()
    ));
    setIsSending(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-hospital-600">Application outreach</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Send personalized emails</h2>
          <p className="mt-1 text-sm text-slate-500">Choose recipients, tailor the message, then review it before sending.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-slate-500"><span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700">{newCount} new</span><span className="rounded-full bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700">{sentProfileCount} sent</span></div>
      </div>

      <section className="love-note rounded-xl border border-[#8d4054] bg-[#6f2338] p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Personal note</p><h3 className="mt-1 text-base font-semibold text-slate-900">Send a little love to Thuan</h3><p className="mt-1 text-xs text-slate-600">This is separate from hospital outreach. Edit it before sending if you want.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-rose-600">To: thuantran2704@gmail.com</span></div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_2fr_auto] md:items-end"><label className="block text-xs font-medium text-slate-700">Subject<input value={loveSubject} onChange={(event) => setLoveSubject(event.target.value)} disabled={isSendingLove} className="mt-1 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-slate-800" /></label><label className="block text-xs font-medium text-slate-700">Message<textarea rows={2} value={loveBody} onChange={(event) => setLoveBody(event.target.value)} disabled={isSendingLove} className="mt-1 w-full resize-y rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-slate-800" /></label><button type="button" onClick={() => void sendLove()} disabled={isSendingLove || !loveSubject.trim() || !loveBody.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-600 disabled:opacity-50">{isSendingLove ? <Loader2 className="h-4 w-4 animate-spin" /> : '❤️'} Send love</button></div>
        {loveStatus && <p className="mt-3 text-xs text-rose-700">{loveStatus}</p>}
      </section>

      <form onSubmit={handleSendSelected} className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          {resumeManager}

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 1</p>
                <h3 className="mt-1 text-base font-semibold text-slate-900">Choose recipients</h3>
                <p className="mt-1 text-xs text-slate-500">{newCount} new, {sentProfileCount} sent · up to {MAX_PROFILES} saved</p>
              </div>
              <button
                type="button"
                onClick={addProfile}
                disabled={isSending || profiles.length >= MAX_PROFILES}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-200 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add hospital
              </button>
            </div>

            <div>
              <label htmlFor="email-template" className="mb-1 block text-xs font-semibold text-slate-700">Email template</label>
              <select
                id="email-template"
                value={selectedTemplateId}
                onChange={(event) => handleTemplateChange(event.target.value)}
                disabled={isSending}
                className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500"
              >
                {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
              </select>
            </div>

            <div className="space-y-3">
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-700">Who should receive this?</p>
                <div className="flex overflow-x-auto rounded-lg border border-slate-200 bg-slate-100 p-1" role="tablist" aria-label="Recipient groups">
                  {([
                    ['new', 'New', newCount],
                    ['sent', 'Follow-ups', sentProfileCount],
                    ['all', 'Everyone', profiles.length],
                    ['custom', 'Choose', profiles.filter((profile) => profile.selectedForSend).length]
                  ] as const).map(([value, label, count]) => (
                    <button key={value} role="tab" aria-selected={sendFilter === value} type="button" disabled={isSending} onClick={() => setSendFilter(value)} className={`min-w-[92px] flex-1 rounded-md px-3 py-2 text-left transition ${sendFilter === value ? 'bg-white text-hospital-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                      <span className="block text-xs font-semibold">{label}</span><span className="mt-0.5 block text-[11px] opacity-75">{count}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{sendFilter === 'custom' ? 'Use the checkboxes below to choose exactly who receives it.' : 'Search below to narrow this group.'}</p>
              </div>
              <div>
                <label htmlFor="hospital-search" className="mb-1 block text-xs font-medium text-slate-700">Find a hospital</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    id="hospital-search"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by hospital, contact, or email"
                    className="w-full rounded-md border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-hospital-500"
                  />
                </div>
              </div>
            </div>

            {visibleProfiles.length > 0 && (
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={visibleProfiles.every((profile) => profile.selectedForSend)}
                  onChange={(event) => {
                    const selectedForSend = event.target.checked;
                    const visibleIds = new Set(visibleProfiles.map((profile) => profile.id));
                    setProfiles((current) => current.map((profile) => visibleIds.has(profile.id) ? { ...profile, selectedForSend } : profile));
                  }}
                  className="h-4 w-4 accent-blue-500"
                />
                Select all visible
              </label>
            )}

            {storageError && <p role="alert" className="text-xs text-red-600">{storageError}</p>}

            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {visibleProfiles.map((profile, index) => {
                const sendState = sendStates[profile.id];
                const isActive = activeProfileId === profile.id;
                const isExpanded = expandedProfileId === profile.id;
                const profileTitle = profile.hospitalName.trim() || `Hospital ${index + 1}`;
                const status = sendState?.status === 'sent' ? 'sent'
                  : sendState?.status === 'simulated' ? 'simulated'
                    : sendState?.status === 'failed' ? 'failed'
                      : profile.lastAttemptStatus || profile.status;
                const stateTone = sendState?.status === 'sent' ? 'text-emerald-700'
                  : sendState?.status === 'simulated' ? 'text-amber-600'
                    : sendState?.status === 'failed' || profile.lastAttemptStatus === 'failed' ? 'text-red-600'
                      : profile.status === 'sent' ? 'text-emerald-700' : 'text-slate-500';

                return (
                  <div key={profile.id} className={`rounded-lg border p-3 transition-colors ${isActive ? 'border-hospital-400 bg-hospital-50/40 shadow-sm' : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white'}`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        aria-label={`Select ${profileTitle} for sending`}
                        checked={profile.selectedForSend}
                        disabled={isSending}
                        onChange={(event) => updateProfile(profile.id, { selectedForSend: event.target.checked })}
                        className="h-4 w-4 accent-blue-500"
                      />
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-pressed={isActive}
                        onClick={() => {
                          setActiveProfileId(profile.id);
                          setExpandedProfileId(isExpanded ? null : profile.id);
                          setActiveTab('edit');
                        }}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{profileTitle}</span>
                        <span className="hidden max-w-[42%] truncate text-xs text-slate-500 sm:inline">{profile.recipientEmail || 'Add recipient email'}</span>
                        <span className={`shrink-0 text-[11px] ${stateTone}`}>
                          {sendState?.status === 'sending' ? 'sending' : status === 'sent' ? `accepted${profile.sentCount > 1 ? ` · ${profile.sentCount}` : ''}` : status}
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${profileTitle}`}
                        title={`Remove ${profileTitle}`}
                        disabled={isSending}
                        onClick={() => removeProfile(profile.id)}
                        className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-red-500 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 space-y-3 border-t border-slate-200 pt-3 sm:pl-6">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <input
                            aria-label={`Hospital name ${index + 1}`}
                            type="text"
                            value={profile.hospitalName}
                            disabled={isSending}
                            onChange={(event) => updateProfile(profile.id, { hospitalName: event.target.value })}
                            placeholder="Hospital name"
                            className="min-w-0 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-hospital-500 disabled:opacity-60"
                          />
                          <input
                            aria-label={`Recipient email ${index + 1}`}
                            type="email"
                            value={profile.recipientEmail}
                            disabled={isSending}
                            onChange={(event) => updateProfile(profile.id, { recipientEmail: event.target.value })}
                            placeholder="Recipient email"
                            className="min-w-0 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-hospital-500 disabled:opacity-60"
                          />
                        </div>

                        <details className="text-xs text-slate-600">
                          <summary className="cursor-pointer py-1">Optional personalization</summary>
                          <div className="mt-2 space-y-2">
                            <input
                              aria-label={`Hiring team ${index + 1}`}
                              type="text"
                              value={profile.hiringTeam}
                              disabled={isSending}
                              onChange={(event) => updateProfile(profile.id, { hiringTeam: event.target.value })}
                              placeholder="Hiring team / addressee"
                              className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-hospital-500 disabled:opacity-60"
                            />
                            <textarea
                              aria-label={`Personal note ${index + 1}`}
                              rows={2}
                              value={profile.personalNote}
                              disabled={isSending}
                              onChange={(event) => updateProfile(profile.id, { personalNote: event.target.value })}
                              placeholder="Add a detail specific to this hospital"
                              className="w-full resize-y rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-hospital-500 disabled:opacity-60"
                            />
                          </div>
                        </details>

                        {selectedTemplateId === 'nurse-residency-2027' && (
                          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                            <input
                              type="checkbox"
                              checked={profile.includeVisaQuestion}
                              disabled={isSending}
                              onChange={(event) => updateProfile(profile.id, { includeVisaQuestion: event.target.checked })}
                              className="h-3.5 w-3.5 accent-blue-500"
                            />
                            Ask about visa sponsorship
                          </label>
                        )}

                        {(sendState || profile.lastAttemptMessage) && (
                          <p className={`text-xs ${stateTone}`}>
                            {sendState?.message || profile.lastAttemptMessage}
                            {profile.lastSentAt ? ` · Last sent ${new Date(profile.lastSentAt).toLocaleDateString()}` : ''}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {visibleProfiles.length === 0 && (
                <p className="py-5 text-center text-sm text-slate-500">
                  {profiles.length === 0 ? 'No hospital profiles saved yet.' : 'No profiles match this search and send group.'}
                </p>
              )}
            </div>

            {sendFilter === 'all' && (
              <p className="text-xs text-amber-600">All saved hospitals includes previously sent addresses. Review before sending duplicates.</p>
            )}

            <label className={`flex items-start gap-2 text-sm ${selectedResume ? 'cursor-pointer text-slate-700' : 'text-slate-500'}`}>
              <input
                type="checkbox"
                checked={Boolean(selectedResume && attachResume)}
                disabled={!selectedResume || isSending}
                onChange={(event) => setAttachResume(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-blue-500 disabled:opacity-50"
              />
              <span className="flex min-w-0 items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 shrink-0" />
                <span className="break-all">{selectedResume ? `Attach ${selectedResume.originalName} to selected emails` : 'Select a resume to attach it to selected emails'}</span>
              </span>
            </label>

          </section>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-hospital-500" />
              <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 2</p><h3 className="text-base font-semibold text-slate-900">Write and review</h3></div>
            </div>
            <div className="flex rounded-md border border-slate-300 bg-slate-50 p-1" role="tablist" aria-label="Email view">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'edit'}
                onClick={() => setActiveTab('edit')}
                className={`rounded px-3 py-1.5 text-xs font-medium ${activeTab === 'edit' ? 'bg-slate-300 text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
              >Edit</button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'preview'}
                onClick={() => setActiveTab('preview')}
                className={`rounded px-3 py-1.5 text-xs font-medium ${activeTab === 'preview' ? 'bg-slate-300 text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
              >Live view</button>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="preview-profile" className="mb-1 block text-xs font-medium text-slate-600">Editing email for</label>
            <select
              id="preview-profile"
              value={activeProfileId}
              onChange={(event) => setActiveProfileId(event.target.value)}
              disabled={isSending}
              className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500 disabled:opacity-60"
            >
              {profiles.map((profile, index) => <option key={profile.id} value={profile.id}>{profile.hospitalName.trim() || `Hospital ${index + 1}`}</option>)}
            </select>
          </div>

          {activeTab === 'edit' ? (
            <div role="tabpanel" className="space-y-4">
              <div>
                <label htmlFor="email-subject" className="mb-1 block text-sm font-medium text-slate-700">Subject</label>
                <input
                  id="email-subject"
                  type="text"
                  value={currentSubject}
                  onChange={(event) => setManualOverrides((current) => ({
                    ...current,
                    [activeProfile.id]: { subject: event.target.value, body: current[activeProfile.id]?.body ?? generatedActiveEmail.body }
                  }))}
                  className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="email-message" className="text-sm font-medium text-slate-700">Message</label>
                {manualOverrides[activeProfile.id] && (
                  <button
                    type="button"
                    onClick={() => setManualOverrides((current) => {
                      const next = { ...current };
                      delete next[activeProfile.id];
                      return next;
                    })}
                    className="text-xs text-hospital-500 hover:text-hospital-700"
                  >Reset to template</button>
                )}
              </div>
              <textarea
                id="email-message"
                rows={22}
                value={currentBody}
                onChange={(event) => setManualOverrides((current) => ({
                  ...current,
                  [activeProfile.id]: { subject: current[activeProfile.id]?.subject ?? generatedActiveEmail.subject, body: event.target.value }
                }))}
                className="w-full resize-y rounded-md border border-slate-300 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500"
              />
            </div>
          ) : (
            <div role="tabpanel" className="overflow-hidden rounded-md border border-[#e5e7eb] bg-[#f8f7f4]" aria-busy={isPreviewLoading}>
              <div className="space-y-2 border-b border-[#e3e8f2] bg-[#f5f7fb] px-4 py-3 text-xs">
                <div className="flex gap-3"><span className="w-14 shrink-0 font-semibold text-indigo-600">To</span><span className="break-all text-slate-800">{activeProfile.recipientEmail || 'Add a recipient email'}</span></div>
                <div className="flex gap-3"><span className="w-14 shrink-0 font-semibold text-indigo-600">Subject</span><span className="break-words text-slate-800">{currentSubject}</span></div>
                <div className="flex gap-3"><span className="w-14 shrink-0 font-semibold text-indigo-600">Attach</span><span className="break-all text-slate-800">{selectedResume && attachResume ? selectedResume.originalName : 'No resume attached'}</span></div>
              </div>
              {previewError ? (
                <div role="status" className="p-4 text-sm text-red-700">Live view unavailable: {previewError}</div>
              ) : previewHtml ? (
                <div className="bg-[#f8f7f4] p-4 sm:p-6">
                  <iframe
                    title="Live sent-email view"
                    srcDoc={previewHtml}
                    sandbox="allow-same-origin"
                    onLoad={(event) => {
                      const frame = event.currentTarget;
                      const document = frame.contentDocument;
                      if (document) {
                        const height = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0);
                        frame.style.height = `${height + 24}px`;
                      }
                    }}
                    className="block min-h-[820px] w-full rounded-md border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
                  />
                </div>
              ) : (
                <div className="p-4 text-sm text-slate-600">{isPreviewLoading ? 'Rendering email...' : 'Email view will appear here.'}</div>
              )}
            </div>
          )}

          {sendError && <p role="alert" className="mt-4 text-sm text-red-600">{sendError}</p>}
          {(sentCount > 0 || simulatedCount > 0 || failedCount > 0) && (
            <p role="status" className="mt-4 text-sm text-slate-700">
              {sentCount > 0 && `${sentCount} accepted by relay`}
              {sentCount > 0 && (simulatedCount > 0 || failedCount > 0) ? ', ' : ''}
              {simulatedCount > 0 && `${simulatedCount} simulated`}
              {simulatedCount > 0 && failedCount > 0 ? ', ' : ''}
              {failedCount > 0 && `${failedCount} failed; still selected`}
              .
            </p>
          )}
          <button
            type="submit"
            disabled={isSending || selectedCount === 0}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-hospital-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-hospital-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isSending ? `Sending ${sendBatchTotal} selected...` : `Send ${selectedCount} selected application${selectedCount === 1 ? '' : 's'}`}
          </button>
          <p className="mt-2 text-center text-xs text-slate-500">Sends up to {SEND_CONCURRENCY} emails at a time.</p>
        </section>
      </form>
    </div>
  );
};
