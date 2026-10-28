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
      const percent = Math.max(5, Math.min(95, (relativeY / rect.height) * 100));
      setSplitPercent(Math.round(percent));
    } else {
      const relativeX = e.clientX - rect.left;
      const percent = Math.max(5, Math.min(95, (relativeX / rect.width) * 100));
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
      className="p-0 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-5xl w-[95vw] backdrop:bg-black/75 m-auto text-zinc-900 dark:text-zinc-100 overflow-hidden"
    >
      <div className="flex flex-col h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h3 id="split-dialog-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Split Page Into 2 Sections
              </h3>
              <p className="text-xs text-zinc-500">
                {activePage.fileName} • Page {activePage.displayPageNumber}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveSplitPageId(null)}
            className="h-8 w-8 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Canvas Preview + Aside Controls */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
          {/* Interactive Split Canvas */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
            {isLoading ? (
              <div className="flex flex-col items-center gap-3 text-zinc-400">
                <Loader2 className="w-7 h-7 animate-spin" />
                <span className="text-xs font-medium">Preparing split view...</span>
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
                    <div
                      style={{ top: `${splitPercent}%` }}
                      onPointerDown={handlePointerDown}
                      className="absolute left-0 right-0 h-7 -translate-y-1/2 cursor-row-resize z-20 flex items-center group"
                    >
                      <div className="w-full h-0.5 bg-red-500 shadow-md group-hover:h-1 transition-all" />
                      <div className="absolute right-3 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold shadow-md tracking-wider">
                        SPLIT {splitPercent}%
                      </div>
                    </div>

                    <div className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-900/80 text-white backdrop-blur-xs pointer-events-none">
                      Top ({splitPercent}%)
                    </div>
                    <div className="absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-900/80 text-white backdrop-blur-xs pointer-events-none">
                      Bottom ({100 - splitPercent}%)
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      style={{ left: `${splitPercent}%` }}
                      onPointerDown={handlePointerDown}
                      className="absolute top-0 bottom-0 w-7 -translate-x-1/2 cursor-col-resize z-20 flex flex-col items-center group"
                    >
                      <div className="h-full w-0.5 bg-red-500 shadow-md group-hover:w-1 transition-all" />
                      <div className="absolute top-3 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold shadow-md tracking-wider whitespace-nowrap">
                        SPLIT {splitPercent}%
                      </div>
                    </div>

                    <div className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-900/80 text-white backdrop-blur-xs pointer-events-none">
                      Left ({splitPercent}%)
                    </div>
                    <div className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-900/80 text-white backdrop-blur-xs pointer-events-none">
                      Right ({100 - splitPercent}%)
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>

          {/* Control Panel Aside */}
          <div className="w-full lg:w-76 p-5 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 flex flex-col justify-between gap-5 bg-white dark:bg-zinc-950 shrink-0">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Cut Direction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection('horizontal')}
                    className={`h-9 flex items-center justify-center gap-1.5 rounded-md text-xs font-semibold border transition ${
                      direction === 'horizontal'
                        ? 'border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <SplitSquareHorizontal className="w-4 h-4" />
                    <span>Horizontal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDirection('vertical')}
                    className={`h-9 flex items-center justify-center gap-1.5 rounded-md text-xs font-semibold border transition ${
                      direction === 'vertical'
                        ? 'border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <SplitSquareVertical className="w-4 h-4" />
                    <span>Vertical</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-zinc-500">Split Ratio:</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {splitPercent}% / {100 - splitPercent}%
                  </span>
                </div>

                <input
                  type="range"
                  min="5"
                  max="95"
                  value={splitPercent}
                  onChange={(e) => setSplitPercent(parseInt(e.target.value, 10))}
                  className="w-full accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                />

                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-xs text-zinc-500">Presets:</span>
                  {[25, 50, 75].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSplitPercent(val)}
                      className={`px-2 py-0.5 rounded text-xs font-mono transition ${
                        splitPercent === val
                          ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 font-bold'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-1.5 text-xs bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
                  <span className="font-medium">
                    Part 1 ({direction === 'horizontal' ? 'Top' : 'Left'}):
                  </span>
                  <span className="font-mono font-semibold">0% – {splitPercent}%</span>
                </div>
                <div className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
                  <span className="font-medium">
                    Part 2 ({direction === 'horizontal' ? 'Bottom' : 'Right'}):
                  </span>
                  <span className="font-mono font-semibold">{splitPercent}% – 100%</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleApplySplit}
                className="w-full h-9 flex items-center justify-center gap-2 rounded-md text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 transition"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Confirm & Split</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSplitPageId(null)}
                className="w-full h-9 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
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
