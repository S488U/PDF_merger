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

export function PageCard({ page, sourceColor = '#71717a', index }: PageCardProps) {
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
    opacity: isDragging ? 0.35 : 1,
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
      className={`group relative flex flex-col rounded-lg bg-white dark:bg-zinc-900 border transition select-none overflow-hidden ${
        isSelected
          ? 'ring-2 ring-zinc-900 dark:ring-zinc-100 border-zinc-900 dark:border-zinc-100 shadow-md'
          : isDragging
          ? 'shadow-2xl ring-2 ring-zinc-400 border-zinc-400 scale-[1.02]'
          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 shadow-2xs'
      }`}
    >
      {/* Top Header Strip: Checkbox, source tag, index, grab handle */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/80">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePageSelection(page.id, true);
            }}
            className={`w-4 h-4 rounded flex items-center justify-center transition border ${
              isSelected
                ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900'
                : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 bg-white dark:bg-zinc-800'
            }`}
            aria-label={`Select page ${page.displayPageNumber}`}
          >
            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
          </button>

          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: sourceColor }}
            title={page.fileName}
          />

          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[100px]">
            {page.sectionLabel ? page.sectionLabel : `P.${page.displayPageNumber}`}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400 px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800">
            #{index + 1}
          </span>

          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-1 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 cursor-grab active:cursor-grabbing touch-none transition"
            aria-label="Drag to rearrange"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Thumbnail Area */}
      <div
        onClick={() => setActivePreviewPageId(page.id)}
        className="relative aspect-3/4 w-full flex items-center justify-center p-3 bg-zinc-100 dark:bg-zinc-950 cursor-pointer overflow-hidden group-hover:bg-zinc-150 dark:group-hover:bg-zinc-925 transition"
      >
        {page.thumbnailUrl ? (
          <img
            src={page.thumbnailUrl}
            alt={`Page ${page.displayPageNumber}`}
            className="max-h-full max-w-full object-contain rounded-sm shadow-xs transition-transform duration-200 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-medium">Loading...</span>
          </div>
        )}

        {page.rotation > 0 && (
          <span className="absolute bottom-2 left-2 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-zinc-900/80 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs">
            {page.rotation}°
          </span>
        )}

        {page.sectionLabel && (
          <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs">
            {page.sectionLabel}
          </span>
        )}

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="text-white text-xs font-medium flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-900/90 shadow-md">
            <Eye className="w-3.5 h-3.5" /> Inspect
          </span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center justify-around p-1 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            rotatePage(page.id, 90);
          }}
          className="h-8 w-8 rounded-md flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
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
          className="h-8 w-8 rounded-md flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          title="Split page into 2 sections"
          aria-label="Split page"
        >
          <Scissors className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleDownloadSingle}
          className="h-8 w-8 rounded-md flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
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
          className="h-8 w-8 rounded-md flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
          title="Delete page"
          aria-label="Delete page"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
