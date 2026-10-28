'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePdfStore } from '@/lib/store/usePdfStore';
import { renderHighResPage } from '@/lib/pdf/pdf-renderer';
import { X, Scissors, Loader2, SplitSquareVertical, SplitSquareHorizontal } from 'lucide-react';

export function SplitToolModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    activeSplitPageId,
    setActiveSplitPageId,
    pages,
    getFileBuffer,
    splitPage,
  } = usePdfStore();

  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal');
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
      setDirection('horizontal');
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

    if (direction === 'horizontal') {
      const relativeY = e.clientY - rect.top;
      const percent = Math.max(10, Math.min(90, (relativeY / rect.height) * 100));
      setSplitPercent(Math.round(percent));
    } else {
      const relativeX = e.clientX - rect.left;
      const percent = Math.max(10, Math.min(90, (relativeX / rect.width) * 100));
      setSplitPercent(Math.round(percent));
    }
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
    await splitPage(activePage.id, splitPercent / 100, direction);
    setActiveSplitPageId(null);
  };

  if (!activePage) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={() => setActiveSplitPageId(null)}
      aria-labelledby="split-dialog-title"
      className="p-0 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl max-w-5xl w-[95vw] border border-slate-200 dark:border-slate-800 backdrop:bg-black/80 m-auto text-slate-900 dark:text-slate-100 overflow-hidden"
    >
      <div className="flex flex-col h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h3 id="split-dialog-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Split Page Into 2 Sections
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {activePage.fileName} • Page {activePage.displayPageNumber}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveSplitPageId(null)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
            aria-label="Close split modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Canvas Preview + Aside Controls */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
          {/* Interactive Split Canvas */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-slate-100/70 dark:bg-slate-950">
            {isLoading ? (
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <span className="text-xs font-medium">Preparing visual split guide...</span>
              </div>
            ) : previewSrc ? (
              <div
                ref={containerRef}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="relative inline-flex justify-center select-none shadow-2xl rounded-sm overflow-hidden bg-white touch-none"
              >
                <img
                  src={previewSrc}
                  alt="Page split canvas"
                  className="max-h-[66vh] max-w-full object-contain pointer-events-none"
                />

                {direction === 'horizontal' ? (
                  <>
                    {/* Horizontal Draggable Divider */}
                    <div
                      style={{ top: `${splitPercent}%` }}
                      onPointerDown={handlePointerDown}
                      className="absolute left-0 right-0 h-7 -translate-y-1/2 cursor-row-resize z-20 flex items-center group"
                    >
                      <div className="w-full h-0.5 bg-red-500 shadow-md group-hover:h-1 transition-all" />
                      <div className="absolute right-3 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold shadow-md tracking-wider">
                        SPLIT {splitPercent}%
                      </div>
                    </div>

                    {/* Section Badges */}
                    <div className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-600/90 text-white backdrop-blur-xs pointer-events-none shadow-xs">
                      Part 1 (Top: {splitPercent}%)
                    </div>
                    <div className="absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-600/90 text-white backdrop-blur-xs pointer-events-none shadow-xs">
                      Part 2 (Bottom: {100 - splitPercent}%)
                    </div>
                  </>
                ) : (
                  <>
                    {/* Vertical Draggable Divider */}
                    <div
                      style={{ left: `${splitPercent}%` }}
                      onPointerDown={handlePointerDown}
                      className="absolute top-0 bottom-0 w-7 -translate-x-1/2 cursor-col-resize z-20 flex flex-col items-center group"
                    >
                      <div className="h-full w-0.5 bg-red-500 shadow-md group-hover:w-1 transition-all" />
                      <div className="absolute top-3 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold shadow-md tracking-wider whitespace-nowrap">
                        SPLIT {splitPercent}%
                      </div>
                    </div>

                    {/* Section Badges */}
                    <div className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-600/90 text-white backdrop-blur-xs pointer-events-none shadow-xs">
                      Part 1 (Left: {splitPercent}%)
                    </div>
                    <div className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-600/90 text-white backdrop-blur-xs pointer-events-none shadow-xs">
                      Part 2 (Right: {100 - splitPercent}%)
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>

          {/* Control Panel Aside */}
          <div className="w-full lg:w-80 p-5 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-5 bg-white dark:bg-slate-900/80 shrink-0">
            <div className="space-y-5">
              {/* Split Orientation Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Cut Direction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection('horizontal')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                      direction === 'horizontal'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <SplitSquareHorizontal className="w-4 h-4" />
                    <span>Horizontal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDirection('vertical')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                      direction === 'vertical'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <SplitSquareVertical className="w-4 h-4" />
                    <span>Vertical</span>
                  </button>
                </div>
              </div>

              {/* Slider & Quick Presets */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-600 dark:text-slate-400">Divider Ratio:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {splitPercent}% / {100 - splitPercent}%
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

                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400">Presets:</span>
                  {[50, 33, 67].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSplitPercent(val)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                        splitPercent === val
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2 text-xs bg-slate-50/50 dark:bg-slate-850/50">
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Part 1 ({direction === 'horizontal' ? 'Top' : 'Left'}):
                  </span>
                  <span className="font-mono font-semibold">0% – {splitPercent}%</span>
                </div>
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                    Part 2 ({direction === 'horizontal' ? 'Bottom' : 'Right'}):
                  </span>
                  <span className="font-mono font-semibold">{splitPercent}% – 100%</span>
                </div>
              </div>
            </div>

            {/* Commit Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleApplySplit}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-98 transition"
              >
                <Scissors className="w-4 h-4" />
                Confirm & Split Page
              </button>

              <button
                type="button"
                onClick={() => setActiveSplitPageId(null)}
                className="w-full py-2 px-4 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
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
