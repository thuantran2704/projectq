import React, { useState, useEffect, useMemo } from 'react';
import type { HospitalEmailTemplate, Resume } from '../types';
import { sendHospitalEmail } from '../api/email';
import {
  Send,
  Mail,
  FileCheck2,
  FileX,
  Sparkles,
  Building2,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  Edit3,
  Globe
} from 'lucide-react';

interface EmailDispatcherProps {
  templates: HospitalEmailTemplate[];
  selectedResume: Resume | null;
}

export const EmailDispatcher: React.FC<EmailDispatcherProps> = ({
  templates,
  selectedResume
}) => {
  // Active template
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('nurse-residency-2027');

  // Fillable form state (Pre-populated with Quynh Nguyen's information)
  const [recipientEmail, setRecipientEmail] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [hiringTeam, setHiringTeam] = useState('Nurse Residency Hiring Team');
  const [program, setProgram] = useState('2027 Graduate Nurse Residency Program');
  const [school, setSchool] = useState('University of South Florida College of Nursing');
  const [nclexDate, setNclexDate] = useState('May 2027');
  const [applicantName, setApplicantName] = useState('Quynh Nguyen');
  const [applicantPhone, setApplicantPhone] = useState('813-834-8336');
  const [applicantEmail, setApplicantEmail] = useState('nguyenquynh11102005@gmail.com');
  const [applicantLinkedin, setApplicantLinkedin] = useState('www.linkedin.com/in/quynhnhat-ngn');
  const [includeVisaQuestion, setIncludeVisaQuestion] = useState(true);
  const [customNote, setCustomNote] = useState('');
  const [experienceUnits, setExperienceUnits] = useState(
    'PICU, NICU, ICU, ER, PACU, PCU, Labor & Delivery, Postpartum, Newborn Nursery, Med-Surg, Inpatient Psychiatric, Nephrology, Dialysis, and CT'
  );

  // View mode: 'visual' (Live filling preview) vs 'raw' (manual text editor)
  const [editorMode, setEditorMode] = useState<'visual' | 'raw'>('visual');
  const [manualSubject, setManualSubject] = useState('');
  const [manualBody, setManualBody] = useState('');

  // Status state
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0];
  }, [templates, selectedTemplateId]);

  // When switching templates, populate defaults
  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl?.defaultApplicant) {
      setApplicantName(tpl.defaultApplicant.name || applicantName);
      setSchool(tpl.defaultApplicant.school || school);
      setProgram(tpl.defaultApplicant.program || program);
      setNclexDate(tpl.defaultApplicant.nclexDate || nclexDate);
      setApplicantPhone(tpl.defaultApplicant.phone || applicantPhone);
      setApplicantEmail(tpl.defaultApplicant.email || applicantEmail);
      setApplicantLinkedin(tpl.defaultApplicant.linkedin || applicantLinkedin);
      setExperienceUnits(tpl.defaultApplicant.experienceUnits || experienceUnits);
    }
  };

  // Generate resolved text for subject and body
  const { generatedSubject, generatedBody } = useMemo(() => {
    const rawSubj = activeTemplate?.subject || '2027 Graduate Nurse Residency Applicant | USF Nursing | NCLEX May 2027 | {{applicantName}}';
    let rawB = activeTemplate?.body || '';

    const visaText = includeVisaQuestion
      ? `2. Does your hospital offer visa sponsorship for new graduate nurses, and in which units or programs? I'm an international candidate.`
      : '';

    const customText = customNote.trim() ? `${customNote.trim()}\n` : '';

    const resolvedSubj = rawSubj
      .replace(/{{applicantName}}/g, applicantName.trim() || 'Quynh Nguyen')
      .replace(/{{hospitalName}}/g, hospitalName.trim() || '[Hospital Name]');

    let resolvedB = rawB
      .replace(/{{hiringTeam}}/g, hiringTeam.trim() || 'Nurse Residency Hiring Team')
      .replace(/{{applicantName}}/g, applicantName.trim() || 'Quynh Nguyen')
      .replace(/{{school}}/g, school.trim() || 'University of South Florida College of Nursing')
      .replace(/{{program}}/g, program.trim() || '2027 Graduate Nurse Residency Program')
      .replace(/{{hospitalName}}/g, hospitalName.trim() || '[Hospital Name]')
      .replace(/{{nclexDate}}/g, nclexDate.trim() || 'May 2027')
      .replace(/{{experienceUnits}}/g, experienceUnits.trim())
      .replace(/{{visaSection}}/g, visaText)
      .replace(/{{customNote}}/g, customText)
      .replace(/{{applicantPhone}}/g, applicantPhone.trim() || '813-834-8336')
      .replace(/{{applicantEmail}}/g, applicantEmail.trim() || 'nguyenquynh11102005@gmail.com')
      .replace(/{{applicantLinkedin}}/g, applicantLinkedin.trim() || 'www.linkedin.com/in/quynhnhat-ngn');

    resolvedB = resolvedB.replace(/\n\s*\n\s*\n/g, '\n\n');

    return {
      generatedSubject: resolvedSubj,
      generatedBody: resolvedB
    };
  }, [
    activeTemplate,
    hospitalName,
    hiringTeam,
    program,
    school,
    nclexDate,
    applicantName,
    applicantPhone,
    applicantEmail,
    applicantLinkedin,
    includeVisaQuestion,
    customNote,
    experienceUnits
  ]);

  // Keep manual editor in sync unless user deliberately edits in raw mode
  useEffect(() => {
    if (editorMode === 'visual') {
      setManualSubject(generatedSubject);
      setManualBody(generatedBody);
    }
  }, [generatedSubject, generatedBody, editorMode]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientEmail.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter the hospital recipient email address.' });
      return;
    }

    const finalSubject = editorMode === 'raw' ? manualSubject : generatedSubject;
    const finalBody = editorMode === 'raw' ? manualBody : generatedBody;

    if (!finalSubject.trim()) {
      setStatusMessage({ type: 'error', text: 'Email subject cannot be empty.' });
      return;
    }
    if (!finalBody.trim()) {
      setStatusMessage({ type: 'error', text: 'Email body cannot be empty.' });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);

    try {
      const res = await sendHospitalEmail({
        to: recipientEmail.trim(),
        subject: finalSubject,
        body: finalBody,
        resumeFilename: selectedResume?.name
      });

      setStatusMessage({
        type: 'success',
        text: res.message || `Application email sent successfully to ${recipientEmail}!`
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send email';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-hospital-600" />
            Hospital Application & Email Dispatcher
          </h2>
          <p className="text-sm text-slate-500">
            Fill in the hospital details below and watch the application letter update in real-time.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start shrink-0">
          <button
            type="button"
            onClick={() => setEditorMode('visual')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              editorMode === 'visual'
                ? 'bg-white text-hospital-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Live Preview
          </button>
          <button
            type="button"
            onClick={() => {
              setManualSubject(generatedSubject);
              setManualBody(generatedBody);
              setEditorMode('raw');
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              editorMode === 'raw'
                ? 'bg-white text-hospital-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Custom Text Edit
          </button>
        </div>
      </div>

      <form onSubmit={handleSend} className="space-y-5">
        {/* Template Selector Dropdown */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Active Template
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-hospital-500 focus:bg-white"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Inputs Form */}
        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/90 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-hospital-600" />
              1. Hospital Details (Fills In Live)
            </span>
            <span className="text-[11px] text-hospital-600 font-medium bg-hospital-50 px-2 py-0.5 rounded-full border border-hospital-200">
              ⚡ Real-time Sync
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Hospital Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Tampa General Hospital or Johns Hopkins All Children's"
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500 placeholder:text-slate-400 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Hospital Recipient Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="e.g. residency@tgh.org or nurse.careers@hopkins.org"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500 placeholder:text-slate-400 font-medium"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">
                Hiring Team / Addressee
              </label>
              <input
                type="text"
                placeholder="e.g. Nurse Residency Hiring Team"
                value={hiringTeam}
                onChange={(e) => setHiringTeam(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">
                Residency Program / Cohort
              </label>
              <input
                type="text"
                placeholder="e.g. 2027 Graduate Nurse Residency Program"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500"
              />
            </div>
          </div>

          {/* Visa sponsorship toggle & optional note */}
          <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 select-none">
              <input
                type="checkbox"
                checked={includeVisaQuestion}
                onChange={(e) => setIncludeVisaQuestion(e.target.checked)}
                className="w-4 h-4 text-hospital-600 rounded border-slate-300 focus:ring-hospital-500 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-hospital-600" />
                Include Question #2: International Candidate Visa Sponsorship
              </span>
            </label>

            <span className="text-[11px] text-slate-400">
              NCLEX Target: <span className="font-semibold text-slate-600">{nclexDate}</span>
            </span>
          </div>

          {/* Optional personalized hospital note */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Personalized Hospital Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. I have long admired your level 1 trauma PICU unit and commitment to community wellness."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* 2. Live Letter View or Raw Text Editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-hospital-600" />
              2. Live Email Letter (Fills Out As You Type)
            </label>
            <span className="text-xs text-slate-500">
              {editorMode === 'visual' ? 'Dynamic Real-time Letter' : 'Direct Editable Text'}
            </span>
          </div>

          {editorMode === 'visual' ? (
            <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xs">
              {/* Email Client Top Bar */}
              <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 text-xs space-y-1.5 font-sans">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold w-16">To:</span>
                  <span className={recipientEmail ? 'text-slate-900 font-medium' : 'text-amber-600 font-medium'}>
                    {recipientEmail || '[Enter hospital email address above]'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold w-16">Subject:</span>
                  <span className="text-slate-900 font-semibold">
                    {generatedSubject}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold w-16">Attach:</span>
                  {selectedResume ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                      <FileCheck2 className="w-3.5 h-3.5" />
                      {selectedResume.originalName}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-medium">
                      <FileX className="w-3.5 h-3.5" />
                      No resume selected (Select one on the left)
                    </span>
                  )}
                </div>
              </div>

              {/* Rendered Letter Body with Real-time Highlights */}
              <div className="p-5 font-sans text-sm text-slate-800 leading-relaxed whitespace-pre-line bg-white space-y-3 max-h-96 overflow-y-auto">
                <p>
                  Dear{' '}
                  <span className="bg-sky-50 text-sky-900 px-1 py-0.5 rounded font-semibold border border-sky-200">
                    {hiringTeam || 'Nurse Residency Hiring Team'}
                  </span>
                  ,
                </p>

                <p>
                  I'm{' '}
                  <span className="bg-sky-50 text-sky-900 px-1 py-0.5 rounded font-semibold border border-sky-200">
                    {applicantName || 'Quynh Nguyen'}
                  </span>
                  , a nursing student at the{' '}
                  <span className="bg-sky-50 text-sky-900 px-1 py-0.5 rounded font-semibold border border-sky-200">
                    {school}
                  </span>
                  , and I'm writing to apply for your{' '}
                  <span className="bg-sky-50 text-sky-900 px-1 py-0.5 rounded font-semibold border border-sky-200">
                    {program}
                  </span>{' '}
                  at{' '}
                  <span
                    className={
                      hospitalName
                        ? 'bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold border border-amber-300'
                        : 'bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold border border-red-300 animate-pulse'
                    }
                  >
                    {hospitalName || '[Enter Hospital Name Above]'}
                  </span>
                  . I'm anticipated to take the NCLEX in{' '}
                  <span className="bg-sky-50 text-sky-900 px-1 py-0.5 rounded font-semibold border border-sky-200">
                    {nclexDate}
                  </span>
                  , and I would be honored to begin my nursing career with your hospital.
                </p>

                <p>If you can help, I'd be grateful to know:</p>

                <ol className="list-decimal pl-5 space-y-1">
                  <li>Which units expect openings for new graduates in the 2027 cohort?</li>
                  {includeVisaQuestion && (
                    <li className="bg-emerald-50 text-emerald-950 px-1.5 py-0.5 rounded border border-emerald-200">
                      Does your hospital offer visa sponsorship for new graduate nurses, and in which units or programs? I'm an international candidate.
                    </li>
                  )}
                  <li>What are the application deadlines and next steps?</li>
                </ol>

                {customNote && (
                  <p className="bg-purple-50 text-purple-950 p-2 rounded-lg border border-purple-200">
                    {customNote}
                  </p>
                )}

                <p>
                  My experience spans{' '}
                  <span className="font-medium text-slate-700">
                    {experienceUnits}
                  </span>
                  . I'm open to any unit where I'm needed, and I will bring heart, hard work, and a real hunger to learn wherever you place me.
                </p>

                <p>
                  My resume is attached, and I'm happy to send anything else you need. Thank you for your time and for the care your team gives every day.
                </p>

                <div className="pt-2 text-slate-700">
                  <p>With sincere gratitude,</p>
                  <p className="font-bold text-slate-900 mt-2">{applicantName}</p>
                  <p className="text-xs text-slate-500">Fall 2025 - Upper Division | USF College of Nursing, Tampa</p>
                  <p className="text-xs text-slate-600 mt-1">{applicantPhone} | {applicantEmail}</p>
                  <p className="text-xs text-hospital-700">{applicantLinkedin}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Subject</label>
                <input
                  type="text"
                  value={manualSubject}
                  onChange={(e) => setManualSubject(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Body</label>
                <textarea
                  rows={12}
                  value={manualBody}
                  onChange={(e) => setManualBody(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm text-slate-800 font-sans focus:outline-none focus:ring-2 focus:ring-hospital-500 leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>

        {/* Selected Resume Status Box */}
        <div className="p-3.5 rounded-xl border flex items-center justify-between text-xs bg-slate-50">
          <div className="flex items-center gap-2.5">
            {selectedResume ? (
              <>
                <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800">Attached Resume:</span>{' '}
                  <span className="text-emerald-700 font-bold">{selectedResume.originalName}</span>
                </div>
              </>
            ) : (
              <>
                <FileX className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="text-amber-800 font-medium">
                  No resume attached! Upload or pick her resume on the left to attach it with this email.
                </span>
              </>
            )}
          </div>
        </div>

        {/* Status Message (Success / Error) */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}

        {/* Submit / Send Button */}
        <button
          type="submit"
          disabled={isSending}
          className="w-full py-3.5 px-4 bg-hospital-600 hover:bg-hospital-700 active:bg-hospital-800 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md cursor-pointer text-sm"
        >
          {isSending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Sending Application Email to Hospital...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Send 2027 Nurse Residency Application</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
