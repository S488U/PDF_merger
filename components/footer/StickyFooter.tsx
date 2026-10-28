'use client';

import React, { useState } from 'react';
import { usePdfStore } from '@/lib/store/usePdfStore';
import { assemblePdf } from '@/lib/pdf/pdf-assembler';
import { formatFilename, savePdfFile } from '@/lib/pdf/download-helpers';
import {
  Download,
  Loader2,
  CheckCircle2,
  FolderCheck,
  FileEdit,
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

  if (pages.length === 0) return null;

  const handleMergeAndDownload = async () => {
    if (isMerging) return;
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
      addToast(`Successfully merged ${pages.length} pages into ${filename}`, 'success');
      setTimeout(() => setDownloadSuccess(false), 4000);

      if (settings.autoResetAfterMerge) {
        clearAll();
      }
    } catch (err: any) {
      console.error('Merge download failed:', err);
      const errorMsg = err.message || 'Unknown processing error';
      addToast(`Merge failed: ${errorMsg}`, 'error');
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-2xl w-[92vw] pointer-events-auto">
      <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Output filename input */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 whitespace-nowrap">
            <FileEdit className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filename:</span>
          </div>
          <div className="relative flex-1 sm:w-56">
            <input
              type="text"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              placeholder="merged-document.pdf"
              className="w-full h-8 px-2.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100 font-mono focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-400 font-medium"
            />
          </div>

          {downloadDirectoryHandle && (
            <span
              className="hidden lg:flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400 font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
              title={`Direct destination: ${downloadDirectoryHandle.name}`}
            >
              <FolderCheck className="w-3 h-3" />
              <span className="truncate max-w-[80px]">{downloadDirectoryHandle.name}</span>
            </span>
          )}
        </div>

        {/* Page Count & Primary Action Button */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <div className="text-xs text-zinc-500 font-medium">
            <strong className="text-zinc-900 dark:text-zinc-100">{pages.length}</strong> {pages.length === 1 ? 'page' : 'pages'} ready
          </div>

          <button
            type="button"
            onClick={handleMergeAndDownload}
            disabled={isMerging}
            className={`h-9 px-4 rounded-md text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition select-none ${
              isMerging
                ? 'bg-zinc-400 text-white cursor-not-allowed dark:bg-zinc-700'
                : downloadSuccess
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200'
            }`}
          >
            {isMerging ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Assembling...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Merge & Export</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
