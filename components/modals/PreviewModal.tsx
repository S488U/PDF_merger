'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePdfStore } from '@/lib/store/usePdfStore';
import { renderHighResPage } from '@/lib/pdf/pdf-renderer';
import { extractSinglePagePdf } from '@/lib/pdf/pdf-assembler';
import { savePdfFile } from '@/lib/pdf/download-helpers';
import {
  X,
  RotateCw,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
} from 'lucide-react';

export function PreviewModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const {
    activePreviewPageId,
    setActivePreviewPageId,
    pages,
    getFileBuffer,
    rotatePage,
    deletePage,
    downloadDirectoryHandle,
    settings,
    addToast,
  } = usePdfStore();

  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(1);

  const activeIndex = pages.findIndex((p) => p.id === activePreviewPageId);
  const activePage = activeIndex !== -1 ? pages[activeIndex] : null;

  const loadPreview = useCallback(async () => {
    if (!activePage) return;
    setIsLoading(true);
    const buffer = getFileBuffer(activePage.fileId);
    if (buffer) {
      try {
        const res = await renderHighResPage(buffer, activePage.pageIndex, activePage.rotation, 2.0);
        setPreviewSrc(res.dataUrl);
      } catch (err) {
        console.error('High res preview failed:', err);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [activePage?.id, activePage?.rotation, activePage?.fileId, activePage?.pageIndex, getFileBuffer]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activePreviewPageId && activePage) {
      if (!dialog.open) {
        dialog.showModal();
      }
      setZoomScale(1);
      loadPreview();
    } else {
      if (dialog.open) {
        dialog.close();
      }
      setPreviewSrc(null);
    }
  }, [activePreviewPageId, activePage?.rotation, loadPreview]);

  const handleClose = () => {
    setActivePreviewPageId(null);
  };

  const handlePrev = useCallback(() => {
    if (activeIndex > 0) {
      setActivePreviewPageId(pages[activeIndex - 1].id);
    }
  }, [activeIndex, pages, setActivePreviewPageId]);

  const handleNext = useCallback(() => {
    if (activeIndex < pages.length - 1) {
      setActivePreviewPageId(pages[activeIndex + 1].id);
    }
  }, [activeIndex, pages, setActivePreviewPageId]);

  // Keyboard navigation inside modal
  useEffect(() => {
    if (!activePreviewPageId || !activePage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        rotatePage(activePage.id, 90);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const nextId =
          activeIndex < pages.length - 1
            ? pages[activeIndex + 1].id
            : activeIndex > 0
            ? pages[activeIndex - 1].id
            : null;
        deletePage(activePage.id);
        setActivePreviewPageId(nextId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePreviewPageId, activePage, activeIndex, pages, handlePrev, handleNext, rotatePage, deletePage, setActivePreviewPageId]);

  const handleDownload = async () => {
    if (!activePage) return;
    const buffer = getFileBuffer(activePage.fileId);
    if (!buffer) return;

    try {
      const bytes = await extractSinglePagePdf(activePage, buffer);
      const filename = `page-${activePage.displayPageNumber}-${activePage.fileName.replace(/\.pdf$/i, '')}.pdf`;
      await savePdfFile(bytes, filename, downloadDirectoryHandle, settings.individualPageSaveAs);
      addToast(`Downloaded page ${activePage.displayPageNumber}`, 'success');
    } catch (err) {
      console.error('Download single page failed:', err);
      addToast('Download failed', 'error');
    }
  };

  const zoomIn = () => setZoomScale((prev) => Math.min(2.5, prev + 0.25));
  const zoomOut = () => setZoomScale((prev) => Math.max(0.5, prev - 0.25));
  const zoomReset = () => setZoomScale(1);

  if (!activePage) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      aria-labelledby="preview-dialog-title"
      className="p-0 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl max-w-5xl w-[95vw] border border-slate-200 dark:border-slate-800 backdrop:bg-black/75 m-auto text-slate-900 dark:text-slate-100 overflow-hidden"
    >
      <div className="flex flex-col h-[90vh]">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <h3 id="preview-dialog-title" className="text-xs sm:text-sm font-bold truncate max-w-[200px] sm:max-w-md">
                {activePage.fileName}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Page {activePage.displayPageNumber} of source • Sequence #{activeIndex + 1} of {pages.length}
                {activePage.sectionLabel && ` • ${activePage.sectionLabel}`}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoomScale <= 0.5}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 text-slate-600 dark:text-slate-300 transition"
                title="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-semibold px-1 text-slate-600 dark:text-slate-300 min-w-[34px] text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={zoomIn}
                disabled={zoomScale >= 2.5}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 text-slate-600 dark:text-slate-300 transition"
                title="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={zoomReset}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                title="Reset zoom"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Rotate */}
            <button
              type="button"
              onClick={() => rotatePage(activePage.id, 90)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Rotate 90° clockwise (R)"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rotate</span>
            </button>

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition"
              title="Download this page"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => {
                const nextId =
                  activeIndex < pages.length - 1
                    ? pages[activeIndex + 1].id
                    : activeIndex > 0
                    ? pages[activeIndex - 1].id
                    : null;
                deletePage(activePage.id);
                setActivePreviewPageId(nextId);
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              title="Delete this page"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Canvas Area with Prev / Next Navigation Arrows */}
        <div className="relative flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-slate-100/70 dark:bg-slate-950 min-h-0">
          {/* Previous Arrow */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={activeIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:scale-105 disabled:opacity-20 disabled:hover:scale-100 transition"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Rendered Page */}
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-xs font-medium">Generating high-definition view...</span>
            </div>
          ) : previewSrc ? (
            <div
              style={{
                transform: `scale(${zoomScale})`,
                transition: 'transform 0.15s ease',
              }}
              className="origin-center shadow-2xl rounded-sm overflow-hidden bg-white max-h-[76vh] flex items-center justify-center"
            >
              <img
                src={previewSrc}
                alt={`Page ${activePage.displayPageNumber}`}
                className="max-h-[76vh] max-w-full object-contain pointer-events-none"
              />
            </div>
          ) : null}

          {/* Next Arrow */}
          <button
            type="button"
            onClick={handleNext}
            disabled={activeIndex === pages.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:scale-105 disabled:opacity-20 disabled:hover:scale-100 transition"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Footer info pill */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <span>Shortcuts: <strong>←</strong> / <strong>→</strong> navigate • <strong>R</strong> rotate • <strong>Del</strong> delete</span>
          <span className="font-mono text-[11px]">
            {activeIndex + 1} / {pages.length}
          </span>
        </div>
      </div>
    </dialog>
  );
}
