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
} from 'lucide-react';

interface PageCardProps {
  page: PageItem;
  sourceColor?: string;
  index: number;
}

export function PageCard({ page, sourceColor = '#3b82f6', index }: PageCardProps) {
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
  } = usePdfStore();

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  const handleDownloadSingle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const buffer = getFileBuffer(page.fileId);
    if (!buffer) return;

    try {
      const singleBytes = await extractSinglePagePdf(page, buffer);
      const filename = `page-${page.displayPageNumber}-${page.fileName}`;
      await savePdfFile(
        singleBytes,
        filename,
        downloadDirectoryHandle,
        settings.individualPageSaveAs
      );
    } catch (err) {
      console.error('Failed to download single page:', err);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col rounded-2xl glass overflow-hidden border transition-all duration-200 select-none ${
        isDragging
          ? 'shadow-2xl ring-2 ring-blue-500 scale-105 border-blue-400'
          : 'hover:shadow-lg border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Top Bar with file badge, drag handle, and order index */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: sourceColor }}
            title={page.fileName}
          />
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[110px]">
            {page.sectionLabel ? `${page.sectionLabel}` : `Page ${page.displayPageNumber}`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-200/50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded">
            #{index + 1}
          </span>
          {/* Explicit isolated drag handle for both mobile and desktop */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 cursor-grab active:cursor-grabbing touch-none"
            aria-label="Drag to rearrange"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Thumbnail Area */}
      <div
        onClick={() => setActivePreviewPageId(page.id)}
        className="relative aspect-3/4 w-full flex items-center justify-center p-3 bg-slate-100/60 dark:bg-slate-950/60 cursor-pointer overflow-hidden group-hover:bg-slate-100 dark:group-hover:bg-slate-950 transition"
      >
        {page.thumbnailUrl ? (
          <img
            src={page.thumbnailUrl}
            alt={`Page ${page.displayPageNumber}`}
            className="max-h-full max-w-full object-contain rounded shadow-sm transition-transform duration-200 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-[10px]">Rendering...</span>
          </div>
        )}

        {/* Rotation indicator if rotated */}
        {page.rotation > 0 && (
          <span className="absolute bottom-2 left-2 text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-black/70 text-white backdrop-blur-xs">
            {page.rotation}°
          </span>
        )}

        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="text-white text-xs font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs shadow-sm">
            <Eye className="w-3.5 h-3.5" /> Preview
          </span>
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="flex items-center justify-around p-1.5 border-t border-slate-100 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            rotatePage(page.id, 90);
          }}
          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition"
          title="Rotate 90° clockwise"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveSplitPageId(page.id);
          }}
          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition"
          title="Split page into 2 sections"
        >
          <Scissors className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleDownloadSingle}
          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition"
          title="Download this single page"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deletePage(page.id);
          }}
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
          title="Delete page"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
