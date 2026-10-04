import React, { useState, useRef } from 'react';
import type { Resume } from '../types';
import { uploadResume, deleteResume } from '../api/resumes';
import { FileText, Upload, Trash2, CheckCircle2, Download, AlertCircle, Loader2 } from 'lucide-react';

interface ResumeManagerProps {
  resumes: Resume[];
  selectedResume: Resume | null;
  onSelectResume: (resume: Resume | null) => void;
  onResumesUpdated: () => void;
}

export const ResumeManager: React.FC<ResumeManagerProps> = ({
  resumes,
  selectedResume,
  onSelectResume,
  onResumesUpdated
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const uploaded = await uploadResume(file);
      setUploadSuccess(`Uploaded "${uploaded.originalName}" successfully!`);
      // Auto-select the newly uploaded resume
      onSelectResume(uploaded);
      onResumesUpdated();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (resume: Resume) => {
    if (!window.confirm(`Are you sure you want to delete "${resume.originalName}"?`)) {
      return;
    }

    setDeletingName(resume.name);
    try {
      await deleteResume(resume.name);
      if (selectedResume?.name === resume.name) {
        onSelectResume(null);
      }
      onResumesUpdated();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete resume');
    } finally {
      setDeletingName(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-hospital-600" />
            Resume Manager
          </h2>
          <p className="text-sm text-slate-500">
            Upload and select which resume to attach when emailing hospitals.
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="mb-6">
        <label className="relative border-2 border-dashed border-slate-300 hover:border-hospital-500 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-hospital-50/30">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="sr-only"
          />
          {isUploading ? (
            <div className="flex items-center gap-2 text-hospital-600">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="font-medium text-sm">Uploading to Cloud Storage...</span>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-hospital-100 text-hospital-600 flex items-center justify-center mx-auto mb-2">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                Click to upload a new resume
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports PDF, DOC, or DOCX up to 10MB
              </p>
            </div>
          )}
        </label>

        {uploadError && (
          <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2 border border-red-200">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {uploadSuccess && (
          <div className="mt-3 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm flex items-center gap-2 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
        )}
      </div>

      {/* Resume List */}
      <div className="flex-1 overflow-y-auto">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Your Resumes ({resumes.length})
        </h3>

        {resumes.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-lg text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No resumes uploaded yet.</p>
            <p className="text-xs mt-1">Upload a resume above to get started.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {resumes.map((resume) => {
              const isSelected = selectedResume?.name === resume.name;
              const isDeleting = deletingName === resume.name;

              return (
                <div
                  key={resume.name}
                  onClick={() => onSelectResume(resume)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-hospital-500 bg-hospital-50/60 shadow-sm ring-1 ring-hospital-500'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-hospital-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate" title={resume.originalName}>
                        {resume.originalName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span>{formatFileSize(resume.size)}</span>
                        <span>•</span>
                        <span>{new Date(resume.updatedAt).toLocaleDateString()}</span>
                        {resume.isLocalFallback ? (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-medium">
                            Local
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 text-[10px] font-medium">
                            GCP
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onSelectResume(isSelected ? null : resume)}
                      title={isSelected ? 'Resume selected to attach' : 'Click to select this resume'}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors ${
                        isSelected
                          ? 'bg-hospital-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isSelected ? 'Attached' : 'Select'}
                    </button>

                    {resume.downloadUrl && (
                      <a
                        href={resume.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        download={resume.originalName}
                        title="Download or preview resume"
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(resume)}
                      disabled={isDeleting}
                      title="Delete resume"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
