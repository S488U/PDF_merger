'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePdfStore } from '@/lib/store/usePdfStore';
import { renderHighResPage } from '@/lib/pdf/pdf-renderer';
import { X, Scissors, Loader2 } from 'lucide-react';

export function SplitToolModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeSplitPageId, setActiveSplitPageId, pages, getFileBuffer, splitPage } = usePdfStore();

  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [isDraggingLine, setIsDraggingLine] = useState(false);

  const activePage = pages.find((p) => p.id === activeSplitPageId);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activeSplitPageId && activePage) {
      if (!dialog.open) {
        dialog.showModal();
      }
      setIsLoading(true);
      setSplitPercent(50);
      const buffer = getFileBuffer(activePage.fileId);
      if (buffer) {
        renderHighResPage(buffer, activePage.pageIndex, activePage.rotation, 1.8)
          .then((res) => {
            setPreviewSrc(res.dataUrl);
            setIsLoading(false);
          })
          .catch((err) => {
            console.error('High res preview for split failed:', err);
            setIsLoading(false);
          });
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
      setPreviewSrc(null);
    }
  }, [activeSplitPageId]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingLine(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingLine || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const percent = Math.max(10, Math.min(90, (relativeY / rect.height) * 100));
    setSplitPercent(Math.round(percent));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingLine) {
      setIsDraggingLine(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleApplySplit = async () => {
    if (!activePage) return;
    await splitPage(activePage.id, splitPercent / 100);
    setActiveSplitPageId(null);
  };

  if (!activePage) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={() => setActiveSplitPageId(null)}
      className="p-0 rounded-2xl glass shadow-2xl max-w-5xl w-[94vw] border border-slate-300 dark:border-slate-800 backdrop:bg-black/80 m-auto text-slate-900 dark:text-slate-100 overflow-hidden"
    >
      <div className="flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Split Page Into 2 Sections</h3>
              <p className="text-[11px] text-slate-500">
                {activePage.fileName} - Page {activePage.displayPageNumber}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveSplitPageId(null)}
            className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Preview with Draggable Split Line + Control Panel */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
          {/* Canvas Preview Area */}
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/30">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-xs">Loading page preview...</span>
              </div>
            ) : previewSrc ? (
              <div
                ref={containerRef}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="relative inline-flex justify-center select-none shadow-2xl rounded-md overflow-hidden bg-white touch-none"
              >
                <img
                  src={previewSrc}
                  alt="Page for splitting"
                  className="max-h-[65vh] max-w-full object-contain pointer-events-none"
                />

                {/* Draggable Split Line */}
                <div
                  style={{ top: `${splitPercent}%` }}
                  onPointerDown={handlePointerDown}
                  className="absolute left-0 right-0 h-6 -translate-y-1/2 cursor-row-resize z-20 flex items-center group"
                >
                  <div className="w-full h-0.5 bg-red-500 shadow-md group-hover:h-1 transition-all" />
                  <div className="absolute right-3 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold shadow-lg tracking-wider">
                    SPLIT {splitPercent}%
                  </div>
                </div>

                {/* Section Labels */}
                <div className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-600/80 text-white backdrop-blur-xs pointer-events-none">
                  Part 1 (Top: {splitPercent}%)
                </div>
                <div className="absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-600/80 text-white backdrop-blur-xs pointer-events-none">
                  Part 2 (Bottom: {100 - splitPercent}%)
                </div>
              </div>
            ) : null}
          </div>

          {/* Control Aside */}
          <div className="w-full lg:w-72 p-5 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4 bg-slate-50/40 dark:bg-slate-900/40">
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Split Position
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Drag the red divider on the page or adjust the slider below.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                  <span>Top height:</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                    {splitPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={splitPercent}
                  onChange={(e) => setSplitPercent(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Top section:</span>
                  <span className="font-semibold">0% – {splitPercent}%</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Bottom section:</span>
                  <span className="font-semibold">{splitPercent}% – 100%</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleApplySplit}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 transition"
              >
                <Scissors className="w-4 h-4" />
                Apply Split
              </button>
              <button
                type="button"
                onClick={() => setActiveSplitPageId(null)}
                className="w-full py-2 px-4 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
