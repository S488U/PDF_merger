'use client';

import React, { useState } from 'react';
import { usePdfStore } from '@/lib/store/usePdfStore';
import { assemblePdf } from '@/lib/pdf/pdf-assembler';
import { formatFilename, savePdfFile } from '@/lib/pdf/download-helpers';
import {
  Download,
  Loader2,
  CheckCircle2,
  FileCheck,
  FolderCheck,
  FileEdit,
  AlertCircle,
} from 'lucide-react';

export function StickyFooter() {
  const {
    pages,
    sourceFiles,
    outputName,
    setOutputName,
    settings,
    clearAll,
    downloadDirectoryHandle,
    getFileBuffer,
    addToast,
  } = usePdfStore();

  const [isMerging, setIsMerging] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);

  if (pages.length === 0) return null;

  const handleMergeAndDownload = async () => {
    if (isMerging) return;
    setIsMerging(true);
    setDownloadSuccess(false);
    setLastErrorMessage(null);

    try {
      const bufferMap = new Map<string, ArrayBuffer>();
      for (const sf of sourceFiles) {
        const buf = getFileBuffer(sf.id);
        if (buf) {
          bufferMap.set(sf.id, buf);
        }
      }

      const mergedBytes = await assemblePdf(pages, bufferMap);
      const filename = formatFilename(outputName || settings.pattern);

      await savePdfFile(
        mergedBytes,
        filename,
        downloadDirectoryHandle,
        false
      );

      setDownloadSuccess(true);
      addToast(`Successfully merged ${pages.length} pages into ${filename}`, 'success');
      setTimeout(() => setDownloadSuccess(false), 4500);

      if (settings.autoResetAfterMerge) {
        clearAll();
      }
    } catch (err: any) {
      console.error('Merge download failed:', err);
      const errorMsg = err.message || 'Unknown processing error';
      setLastErrorMessage(errorMsg);
      addToast(`Merge failed: ${errorMsg}`, 'error');
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 px-4 py-2.5 sm:px-6 shadow-xl transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Output filename field */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
            <FileEdit className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Filename:</span>
          </div>
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              placeholder="merged-document.pdf"
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {downloadDirectoryHandle && (
            <span
              className="hidden lg:flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60"
              title={`Direct destination: ${downloadDirectoryHandle.name}`}
            >
              <FolderCheck className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{downloadDirectoryHandle.name}</span>
            </span>
          )}
        </div>

        {/* Action Button & Document Summary */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <FileCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>
              <strong>{pages.length}</strong> {pages.length === 1 ? 'page' : 'pages'} ready
            </span>
          </div>

          {lastErrorMessage && (
            <span className="text-[11px] text-red-500 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3 h-3" /> Error during merge
            </span>
          )}

          <button
            type="button"
            onClick={handleMergeAndDownload}
            disabled={isMerging}
            className={`flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all active:scale-98 select-none ${
              isMerging
                ? 'bg-blue-600/70 cursor-not-allowed shadow-none'
                : downloadSuccess
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
            }`}
          >
            {isMerging ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Assembling PDF...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Merge & Download PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </footer>
  );
}
