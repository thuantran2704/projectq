import React, { useState, useEffect } from 'react';
import type { HospitalEmailTemplate, Resume } from '../types';
import { sendHospitalEmail } from '../api/email';
import {
  Send,
  Mail,
  FileCheck2,
  FileX,
  Sparkles,
  Building2,
  User,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface EmailDispatcherProps {
  templates: HospitalEmailTemplate[];
  selectedResume: Resume | null;
}

export const EmailDispatcher: React.FC<EmailDispatcherProps> = ({
  templates,
  selectedResume
}) => {
  // Hospital and Applicant details
  const [recipientEmail, setRecipientEmail] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [position, setPosition] = useState('Registered Nurse');
  const [department, setDepartment] = useState('Emergency Department');
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');

  // Selected template & message content
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Status
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize with first template if available
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      handleSelectTemplate(templates[0].id);
    }
  }, [templates]);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    applyVariables(template.subject, template.body);
  };

  const applyVariables = (subjectTemplate?: string, bodyTemplate?: string) => {
    const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];
    const sTpl = subjectTemplate ?? activeTemplate?.subject ?? '';
    const bTpl = bodyTemplate ?? activeTemplate?.body ?? '';

    const replaceTokens = (text: string) => {
      return text
        .replace(/{{hospitalName}}/g, hospitalName || '[Hospital Name]')
        .replace(/{{position}}/g, position || '[Position Title]')
        .replace(/{{department}}/g, department || '[Department]')
        .replace(/{{applicantName}}/g, applicantName || '[Your Name]')
        .replace(/{{applicantPhone}}/g, applicantPhone || '[Your Phone]')
        .replace(/{{applicantEmail}}/g, applicantEmail || '[Your Email]');
    };

    setSubject(replaceTokens(sTpl));
    setBody(replaceTokens(bTpl));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail) {
      setStatusMessage({ type: 'error', text: 'Please enter the hospital recipient email address.' });
      return;
    }
    if (!subject.trim()) {
      setStatusMessage({ type: 'error', text: 'Please provide an email subject.' });
      return;
    }
    if (!body.trim()) {
      setStatusMessage({ type: 'error', text: 'Please write or generate an email body.' });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);

    try {
      const res = await sendHospitalEmail({
        to: recipientEmail,
        subject,
        body,
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-hospital-600" />
            Hospital Email Dispatcher
          </h2>
          <p className="text-sm text-slate-500">
            Pick a template, customize hospital details, and dispatch with your resume.
          </p>
        </div>
      </div>

      <form onSubmit={handleSend} className="space-y-4">
        {/* Template Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Choose Email Template
          </label>
          <div className="relative">
            <select
              value={selectedTemplateId}
              onChange={(e) => handleSelectTemplate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500 focus:bg-white"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  [{tpl.category}] {tpl.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Details Grid */}
        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-hospital-600" />
              Hospital & Role Information
            </span>
            <button
              type="button"
              onClick={() => applyVariables()}
              className="text-xs text-hospital-600 hover:text-hospital-700 font-semibold flex items-center gap-1 bg-hospital-50 hover:bg-hospital-100 px-2 py-1 rounded transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              Update Placeholders in Email
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-600 mb-1">Hospital Name</label>
              <input
                type="text"
                placeholder="e.g. Mayo Clinic / St. Jude Hospital"
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Position / Title</label>
              <input
                type="text"
                placeholder="e.g. Registered Nurse, ICU"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Department (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Emergency Department, Pediatrics"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Your Full Name</label>
              <input
                type="text"
                placeholder="e.g. Sarah Connor, BSN, RN"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Your Contact Phone</label>
              <input
                type="text"
                placeholder="e.g. (555) 234-5678"
                value={applicantPhone}
                onChange={(e) => setApplicantPhone(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Your Contact Email</label>
              <input
                type="email"
                placeholder="e.g. sarah.nurse@gmail.com"
                value={applicantEmail}
                onChange={(e) => setApplicantEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500"
              />
            </div>
          </div>
        </div>

        {/* Recipient Hospital Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Hospital Recipient Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            placeholder="e.g. careers@hospital.org or hr@childrensmed.org"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500"
          />
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Email Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500"
          />
        </div>

        {/* Email Body */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Email Body (Editable) <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={9}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500 font-sans leading-relaxed"
          />
        </div>

        {/* Selected Resume Indicator */}
        <div className="p-3 rounded-lg border flex items-center justify-between text-xs bg-slate-50">
          <div className="flex items-center gap-2">
            {selectedResume ? (
              <>
                <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800">Attached Resume:</span>{' '}
                  <span className="text-emerald-700 font-medium">{selectedResume.originalName}</span>
                </div>
              </>
            ) : (
              <>
                <FileX className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="text-amber-800">
                  No resume selected. Select one from the left to attach automatically.
                </span>
              </>
            )}
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-3 rounded-lg text-sm flex items-start gap-2 border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Send Button */}
        <button
          type="submit"
          disabled={isSending}
          className="w-full py-3 px-4 bg-hospital-600 hover:bg-hospital-700 text-white font-semibold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md cursor-pointer"
        >
          {isSending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Sending Email to Hospital...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Send Application Email to Hospital</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
