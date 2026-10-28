'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PageItem } from '@/types/pdf';
import { usePdfStore } from '@/lib/store/usePdfStore';
import { extractSinglePagePdf } from '@/lib/pdf/pdf-assembler';
import { savePdfFile } from '@/lib/pdf/download-helpers';
import {
  GripVertical,
  RotateCw,
  Scissors,
  Eye,
  Trash2,
  Download,
  Loader2,
  Check,
} from 'lucide-react';

interface PageCardProps {
  page: PageItem;
  sourceColor?: string;
  index: number;
}

export function PageCard({ page, sourceColor = '#6366f1', index }: PageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const {
    rotatePage,
    deletePage,
    setActivePreviewPageId,
    setActiveSplitPageId,
    getFileBuffer,
    settings,
    downloadDirectoryHandle,
    selectedPageIds,
    togglePageSelection,
    addToast,
  } = usePdfStore();

  const isSelected = selectedPageIds.includes(page.id);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleDownloadSingle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const buffer = getFileBuffer(page.fileId);
    if (!buffer) return;

    try {
      const singleBytes = await extractSinglePagePdf(page, buffer);
      const filename = `page-${page.displayPageNumber}-${page.fileName.replace(/\.pdf$/i, '')}.pdf`;
      await savePdfFile(
        singleBytes,
        filename,
        downloadDirectoryHandle,
        settings.individualPageSaveAs
      );
      addToast(`Downloaded page ${page.displayPageNumber}`, 'success');
    } catch (err: any) {
      console.error('Failed to download single page:', err);
      addToast('Failed to download page', 'error');
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col rounded-2xl bg-white dark:bg-[#111422] border transition-all duration-200 select-none overflow-hidden ${
        isSelected
          ? 'ring-2 ring-indigo-500 border-indigo-400 dark:border-indigo-500 shadow-xl shadow-indigo-500/10'
          : isDragging
          ? 'shadow-2xl ring-2 ring-indigo-400 border-indigo-400 scale-[1.03]'
          : 'hover:shadow-xl hover:shadow-indigo-500/5 border-slate-200 dark:border-white/[0.08] hover:border-indigo-400/50 dark:hover:border-indigo-500/40'
      }`}
    >
      {/* Top Header Strip: Index badge, selection checkbox, source tag, drag handle */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/70 dark:bg-white/[0.02]">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Multi-select checkbox */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePageSelection(page.id, true);
            }}
            className={`w-4 h-4 rounded-md flex items-center justify-center transition border ${
              isSelected
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'border-slate-300 dark:border-white/20 hover:border-indigo-400 bg-white dark:bg-zinc-800'
            }`}
            aria-label={`Select page ${page.displayPageNumber}`}
          >
            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
          </button>

          <span
            className="w-2 h-2 rounded-full shrink-0 shadow-xs"
            style={{ backgroundColor: sourceColor }}
            title={page.fileName}
          />

          <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 truncate max-w-[85px] sm:max-w-[110px]">
            {page.sectionLabel ? page.sectionLabel : `P.${page.displayPageNumber}`}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-zinc-500 px-1 py-0.2 rounded bg-slate-100 dark:bg-white/[0.04]">
            #{index + 1}
          </span>

          {/* Grab Handle */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 cursor-grab active:cursor-grabbing touch-none transition"
            aria-label="Drag to rearrange page"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Thumbnail Area */}
      <div
        onClick={() => setActivePreviewPageId(page.id)}
        className="relative aspect-3/4 w-full flex items-center justify-center p-2.5 bg-slate-100/50 dark:bg-[#090b12] cursor-pointer overflow-hidden group-hover:bg-slate-100/80 dark:group-hover:bg-[#0c0e17] transition"
      >
        {page.thumbnailUrl ? (
          <img
            src={page.thumbnailUrl}
            alt={`Page ${page.displayPageNumber}`}
            className="max-h-full max-w-full object-contain rounded-sm shadow-xs transition-transform duration-200 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400 dark:text-zinc-500">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            <span className="text-[10px] font-medium">Rendering...</span>
          </div>
        )}

        {/* Rotation pill badge */}
        {page.rotation > 0 && (
          <span className="absolute bottom-1.5 left-1.5 text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-black/80 text-white backdrop-blur-xs">
            {page.rotation}°
          </span>
        )}

        {/* Section crop pill badge */}
        {page.sectionLabel && (
          <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-600 text-white shadow-xs">
            {page.sectionLabel}
          </span>
        )}

        {/* Hover preview hint */}
        <div className="absolute inset-0 bg-black/30 dark:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="text-white text-[11px] font-semibold flex items-center gap-1 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md shadow-md border border-white/10">
            <Eye className="w-3 h-3" /> Inspect
          </span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center justify-around p-1 border-t border-slate-100 dark:border-white/[0.06] bg-white dark:bg-[#111422]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            rotatePage(page.id, 90);
          }}
          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
          title="Rotate 90° clockwise (R)"
          aria-label="Rotate 90°"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveSplitPageId(page.id);
          }}
          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
          title="Split page into 2 sections"
          aria-label="Split page"
        >
          <Scissors className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleDownloadSingle}
          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
          title="Download this page"
          aria-label="Download page"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deletePage(page.id);
          }}
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
          title="Delete page"
          aria-label="Delete page"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
