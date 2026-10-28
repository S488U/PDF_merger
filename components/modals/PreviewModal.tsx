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
      className="p-0 rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl max-w-5xl w-[95vw] backdrop:bg-black/80 m-auto text-zinc-100 overflow-hidden"
    >
      <div className="flex flex-col h-[90vh]">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <h3 id="preview-dialog-title" className="text-xs sm:text-sm font-bold truncate max-w-[200px] sm:max-w-md text-zinc-100">
                {activePage.fileName}
              </h3>
              <p className="text-[11px] text-zinc-400">
                Page {activePage.displayPageNumber} of source • Sequence #{activeIndex + 1} of {pages.length}
                {activePage.sectionLabel && ` • ${activePage.sectionLabel}`}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-zinc-800/80 p-1 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoomScale <= 0.5}
                className="p-1 rounded-lg hover:bg-zinc-700 disabled:opacity-30 text-zinc-400 hover:text-zinc-200 transition"
                title="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-semibold px-1 text-zinc-300 min-w-[34px] text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={zoomIn}
                disabled={zoomScale >= 2.5}
                className="p-1 rounded-lg hover:bg-zinc-700 disabled:opacity-30 text-zinc-400 hover:text-zinc-200 transition"
                title="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={zoomReset}
                className="p-1 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition"
                title="Reset zoom"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Split Page Button */}
            <button
              type="button"
              onClick={handleSplit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition shadow-xs"
              title="Split this page into 2 sections (S)"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Split Page</span>
            </button>

            {/* Rotate */}
            <button
              type="button"
              onClick={() => rotatePage(activePage.id, 90)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-white/10 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-200 transition"
              title="Rotate 90° clockwise (R)"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rotate</span>
            </button>

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xs shadow-indigo-500/20 transition"
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
              className="p-1.5 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition"
              title="Delete this page"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Canvas Area with Prev / Next Navigation Arrows */}
        <div className="relative flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-zinc-950 min-h-0">
          {/* Previous Arrow */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={activeIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-zinc-900/90 shadow-xl border border-white/10 flex items-center justify-center text-zinc-200 hover:scale-105 disabled:opacity-20 disabled:hover:scale-100 transition"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Rendered Page */}
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 text-zinc-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
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
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-zinc-900/90 shadow-xl border border-white/10 flex items-center justify-center text-zinc-200 hover:scale-105 disabled:opacity-20 disabled:hover:scale-100 transition"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Footer info pill */}
        <div className="px-4 py-2 border-t border-white/10 bg-zinc-950 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <span>Shortcuts: <strong>←</strong> / <strong>→</strong> navigate • <strong>R</strong> rotate • <strong>S</strong> split • <strong>Del</strong> delete</span>
          <span className="font-mono text-[11px] text-zinc-300">
            {activeIndex + 1} / {pages.length}
          </span>
        </div>
      </div>
    </dialog>
  );
}
