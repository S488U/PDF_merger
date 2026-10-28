'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePdfStore } from '@/lib/store/usePdfStore';
import { renderHighResPage } from '@/lib/pdf/pdf-renderer';
import { extractSinglePagePdf } from '@/lib/pdf/pdf-assembler';
import { savePdfFile } from '@/lib/pdf/download-helpers';
import { X, RotateCw, Download, Loader2 } from 'lucide-react';

export function PreviewModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const {
    activePreviewPageId,
    setActivePreviewPageId,
    pages,
    getFileBuffer,
    rotatePage,
    downloadDirectoryHandle,
    settings,
  } = usePdfStore();

  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const activePage = pages.find((p) => p.id === activePreviewPageId);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activePreviewPageId && activePage) {
      if (!dialog.open) {
        dialog.showModal();
      }
      setIsLoading(true);
      const buffer = getFileBuffer(activePage.fileId);
      if (buffer) {
        renderHighResPage(buffer, activePage.pageIndex, activePage.rotation, 1.8)
          .then((res) => {
            setPreviewSrc(res.dataUrl);
            setIsLoading(false);
          })
          .catch((err) => {
            console.error('High res preview failed:', err);
            setIsLoading(false);
          });
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
      setPreviewSrc(null);
    }
  }, [activePreviewPageId, activePage?.rotation]);

  const handleClose = () => {
    setActivePreviewPageId(null);
  };

  const handleDownload = async () => {
    if (!activePage) return;
    const buffer = getFileBuffer(activePage.fileId);
    if (!buffer) return;

    try {
      const bytes = await extractSinglePagePdf(activePage, buffer);
      const filename = `page-${activePage.displayPageNumber}-${activePage.fileName}`;
      await savePdfFile(bytes, filename, downloadDirectoryHandle, settings.individualPageSaveAs);
    } catch (err) {
      console.error('Download single page failed:', err);
    }
  };

  if (!activePage) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      className="p-0 rounded-2xl glass shadow-2xl max-w-4xl w-[92vw] border border-slate-300 dark:border-slate-800 backdrop:bg-black/75 m-auto text-slate-900 dark:text-slate-100 overflow-hidden"
    >
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-sm font-bold">
              {activePage.fileName} - Page {activePage.displayPageNumber}
            </h3>
            {activePage.sectionLabel && (
              <span className="text-xs text-amber-500 font-medium">
                {activePage.sectionLabel}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => rotatePage(activePage.id, 90)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate 90°</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview viewport */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/20 min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-xs">Generating high-resolution view...</span>
            </div>
          ) : previewSrc ? (
            <img
              src={previewSrc}
              alt={`Page ${activePage.displayPageNumber}`}
              className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-xl bg-white"
            />
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
