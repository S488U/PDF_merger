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
  Scissors,
} from 'lucide-react';

export function PreviewModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const {
    activePreviewPageId,
    setActivePreviewPageId,
    setActiveSplitPageId,
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

  const handleSplit = useCallback(() => {
    if (!activePage) return;
    const pageId = activePage.id;
    setActivePreviewPageId(null);
    setActiveSplitPageId(pageId);
  }, [activePage, setActivePreviewPageId, setActiveSplitPageId]);

  // Keyboard navigation inside modal
  useEffect(() => {
    if (!activePreviewPageId || !activePage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSplit();
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
  }, [activePreviewPageId, activePage, activeIndex, pages, handlePrev, handleNext, rotatePage, handleSplit, deletePage, setActivePreviewPageId]);

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
      className="p-0 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-5xl w-[95vw] backdrop:bg-black/75 m-auto text-zinc-900 dark:text-zinc-100 overflow-hidden"
    >
      <div className="flex flex-col h-[90vh]">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <div>
            <h3 id="preview-dialog-title" className="text-sm font-semibold truncate max-w-[200px] sm:max-w-md text-zinc-900 dark:text-zinc-100">
              {activePage.fileName}
            </h3>
            <p className="text-xs text-zinc-500">
              Page {activePage.displayPageNumber} of source • Sequence #{activeIndex + 1} of {pages.length}
              {activePage.sectionLabel && ` • ${activePage.sectionLabel}`}
            </p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-md border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoomScale <= 0.5}
                className="h-7 w-7 rounded flex items-center justify-center hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 text-zinc-600 dark:text-zinc-400 transition"
                title="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-medium px-1 text-zinc-700 dark:text-zinc-300 min-w-[34px] text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={zoomIn}
                disabled={zoomScale >= 2.5}
                className="h-7 w-7 rounded flex items-center justify-center hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 text-zinc-600 dark:text-zinc-400 transition"
                title="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={zoomReset}
                className="h-7 w-7 rounded flex items-center justify-center hover:bg-white dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition"
                title="Reset zoom"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Split Page Button */}
            <button
              type="button"
              onClick={handleSplit}
              className="h-8 px-3 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition flex items-center gap-1.5"
              title="Split this page (S)"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>

            {/* Rotate */}
            <button
              type="button"
              onClick={() => rotatePage(activePage.id, 90)}
              className="h-8 px-3 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition flex items-center gap-1.5"
              title="Rotate 90° (R)"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rotate</span>
            </button>

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="h-8 px-3 rounded-md text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 transition flex items-center gap-1.5 shadow-2xs"
              title="Download page"
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
              className="h-8 w-8 rounded-md flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              title="Delete page"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={handleClose}
              className="h-8 w-8 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport Canvas Area */}
        <div className="relative flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 min-h-0">
          {/* Previous Arrow */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={activeIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white dark:bg-zinc-900 shadow-md border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:scale-105 disabled:opacity-25 disabled:hover:scale-100 transition"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Rendered Page */}
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 text-zinc-400">
              <Loader2 className="w-7 h-7 animate-spin" />
              <span className="text-xs font-medium">Rendering preview...</span>
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
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white dark:bg-zinc-900 shadow-md border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:scale-105 disabled:opacity-25 disabled:hover:scale-100 transition"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Footer info pill */}
        <div className="px-5 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <span>Shortcuts: <strong>←</strong> / <strong>→</strong> navigate • <strong>R</strong> rotate • <strong>S</strong> split • <strong>Del</strong> delete</span>
          <span className="font-mono text-zinc-600 dark:text-zinc-400">
            {activeIndex + 1} / {pages.length}
          </span>
        </div>
      </div>
    </dialog>
  );
}
