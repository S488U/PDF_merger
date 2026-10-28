'use client';

import React, { useState } from 'react';
import { usePdfStore } from '@/lib/store/usePdfStore';
import { assemblePdf } from '@/lib/pdf/pdf-assembler';
import { formatFilename, savePdfFile } from '@/lib/pdf/download-helpers';
import { Download, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

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
  } = usePdfStore();

  const [isMerging, setIsMerging] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (pages.length === 0) return null;

  const handleMergeAndDownload = async () => {
    setIsMerging(true);
    setDownloadSuccess(false);

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
      setTimeout(() => setDownloadSuccess(false), 4000);

      if (settings.autoResetAfterMerge) {
        clearAll();
      }
    } catch (err: any) {
      console.error('Merge download failed:', err);
      alert(`Merge failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 glass border-t px-4 py-3 sm:px-6 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Output filename input */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Output File:
          </span>
          <input
            type="text"
            value={outputName}
            onChange={(e) => setOutputName(e.target.value)}
            placeholder="merged-document.pdf"
            className="w-full sm:w-64 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        {/* Action Button & Page Count */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            <strong>{pages.length}</strong> {pages.length === 1 ? 'page' : 'pages'} ready
          </span>

          <button
            type="button"
            onClick={handleMergeAndDownload}
            disabled={isMerging}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition select-none ${
              downloadSuccess
                ? 'bg-emerald-600 shadow-emerald-500/25'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-98 shadow-blue-500/25'
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
                <span>Download Merged PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </footer>
  );
}
