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
  Sparkles,
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
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 max-w-3xl w-[92vw] pointer-events-auto">
      <div className="bg-white/95 dark:bg-[#111422]/95 backdrop-blur-xl border border-slate-200 dark:border-white/[0.1] rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 shadow-2xl shadow-black/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Output filename */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 whitespace-nowrap">
            <FileEdit className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Name:</span>
          </div>
          <div className="relative flex-1 sm:w-60">
            <input
              type="text"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              placeholder="merged-document.pdf"
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {downloadDirectoryHandle && (
            <span
              className="hidden lg:flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60"
              title={`Direct destination: ${downloadDirectoryHandle.name}`}
            >
              <FolderCheck className="w-3 h-3" />
              <span className="truncate max-w-[90px]">{downloadDirectoryHandle.name}</span>
            </span>
          )}
        </div>

        {/* Right: Page Count & Primary Merge CTA */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              <strong>{pages.length}</strong> {pages.length === 1 ? 'page' : 'pages'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleMergeAndDownload}
            disabled={isMerging}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xl transition-all active:scale-98 select-none ${
              isMerging
                ? 'bg-indigo-600/70 cursor-not-allowed shadow-none'
                : downloadSuccess
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/30 hover:shadow-indigo-500/40'
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
                <span>Downloaded Successfully!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export Merged PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
