import React, { useState } from"react";
import type { CoordinatorshipFile, FileCategory, FileVisibility } from"../../types";
import { uploadCoordinatorshipFile } from"../../services/coordinatorshipService";
import {
  UploadCloud,
  X,
  AlertTriangle,
  Paperclip,
} from"lucide-react";

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  unitName: string;
  uploaderId: string;
  onFileUploaded: (newFile: CoordinatorshipFile) => void;
}

export const UploadFileModal: React.FC<UploadFileModalProps> = ({
  isOpen,
  onClose,
  unitId,
  unitName,
  uploaderId,
  onFileUploaded,
}) => {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [category, setCategory] = useState<FileCategory>("Action Plan");
  const [visibility, setVisibility] = useState<FileVisibility>("Internal");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (uploaded) {
      if (uploaded.size > 25 * 1024 * 1024) {
        setErrorMessage("File exceeds the maximum limit of 25MB.");
        return;
      }
      setFile(uploaded);
      if (!title) {
        const cleanName = uploaded.name.replace(/\.[^/.]+$/,"");
        setTitle(cleanName);
      }
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !file) {
      setErrorMessage("Please specify a document title and select a valid file.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await uploadCoordinatorshipFile({
        unit_id: unitId,
        uploader_id: uploaderId,
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        visibility,
        file,
      });

      if (!result.success || !result.data) {
        setErrorMessage(result.error ||"Failed to upload document.");
        return;
      }

      onFileUploaded(result.data);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message :"Error uploading file.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-sand-200 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-sand-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyprus-900 text-white flex items-center justify-center shadow-xs">
              <UploadCloud className="w-5 h-5 text-sand-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-cyprus-900 font-display">
                Upload Document to Vault
              </h2>
              <p className="text-xs text-sand-700 truncate max-w-sm">
                Target Unit: <strong>{unitName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 rounded-xl text-sand-600 hover:text-cyprus-900 hover:bg-sand-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-crimson-50 border border-crimson-200 text-crimson-900 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-crimson-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Picker */}
          <div>
            <label htmlFor="coord-file-input" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Select Document (.pdf, .docx, .xlsx, .pptx, images)
            </label>
            <div className="border-2 border-dashed border-sand-300 rounded-2xl p-5 text-center bg-sand-50/50 hover:bg-sand-50 transition-colors relative cursor-pointer">
              <input
                id="coord-file-input"
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none">
                <Paperclip className="w-6 h-6 text-cyprus-700" />
                <div className="text-xs font-semibold text-cyprus-900">
                  {file ? file.name :"Click or drag document file here"}
                </div>
                <p className="text-[11px] text-sand-600">
                  PDF reports, templates, attendance sheets, photo evidence (up to 25MB)
                </p>
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="coord-file-title-input" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Document Title
            </label>
            <input
              id="coord-file-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual School Disaster Contingency Plan (2026)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
            />
          </div>

          {/* Category & Visibility */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="coord-file-category-select" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Document Category
              </label>
              <select
                id="coord-file-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as FileCategory)}
                className="w-full px-3 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              >
                <option value="Action Plan">Action Plan / Project Proposal</option>
                <option value="Accomplishment Report">Accomplishment Report</option>
                <option value="Attendance / Minutes">Attendance & Meeting Minutes</option>
                <option value="Photo Documentation">Photo Documentation</option>
                <option value="Financial / Inventory">Financial / Inventory Ledger</option>
                <option value="Other">Other Ancillary Document</option>
              </select>
            </div>

            <div>
              <label htmlFor="coord-file-visibility-select" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Access Visibility
              </label>
              <select
                id="coord-file-visibility-select"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as FileVisibility)}
                className="w-full px-3 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              >
                <option value="Internal">Internal (All FTNHS Staff)</option>
                <option value="Public">Public (Accessible to Community/Stakeholders)</option>
                <option value="Confidential">Confidential (Coordinator & Principal Only)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="coord-file-desc-textarea" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              id="coord-file-desc-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of the report contents, key findings, or event dates..."
              className="w-full px-3.5 py-2 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700 leading-relaxed"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-sand-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-sand-300 text-sand-800 hover:bg-sand-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !file}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-crimson-600 hover:bg-crimson-700 disabled:opacity-50 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Uploading...</span>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload to Vault</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
