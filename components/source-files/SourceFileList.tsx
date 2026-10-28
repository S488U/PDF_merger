'use client';

import React, { useState, useMemo } from 'react';
import { usePdfStore } from '@/lib/store/usePdfStore';
import {
  FileText,
  X,
  Filter,
  Check,
  AlertCircle,
  RotateCw,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function SourceFileList() {
  const {
    sourceFiles,
    removeSourceFile,
    filterPages,
    pages,
    selectedPageIds,
    selectAllPages,
    clearSelection,
    rotateSelectedPages,
    deleteSelectedPages,
  } = usePdfStore();

  const [rangeInput, setRangeInput] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'odd' | 'even' | 'range'>('all');
  const [rangeError, setRangeError] = useState<string | null>(null);

  // Validate range and calculate match count in real-time
  const rangeMatchCount = useMemo(() => {
    if (!rangeInput.trim()) return null;

    const validNumbers = new Set<number>();
    const parts = rangeInput.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (isNaN(start) || isNaN(end) || start < 1 || end < 1) {
          return { error: 'Invalid range syntax (e.g. 1-4, 7)' };
        }
        for (let num = Math.min(start, end); num <= Math.max(start, end); num++) {
          validNumbers.add(num);
        }
      } else {
        const num = parseInt(trimmed, 10);
        if (isNaN(num) || num < 1) {
          return { error: 'Invalid page number' };
        }
        validNumbers.add(num);
      }
    }

    const count = pages.filter((p) => validNumbers.has(p.displayPageNumber)).length;
    return { count, error: null };
  }, [rangeInput, pages]);

  if (sourceFiles.length === 0) return null;

  const handlePresetFilter = (type: 'all' | 'odd' | 'even') => {
    setActiveFilter(type);
    setRangeError(null);
    if (type !== 'all') {
      filterPages(type);
    }
  };

  const applyCustomRange = () => {
    if (!rangeInput.trim()) {
      setRangeError('Please enter a page range');
      return;
    }
    if (rangeMatchCount?.error) {
      setRangeError(rangeMatchCount.error);
      return;
    }
    if (rangeMatchCount?.count === 0) {
      setRangeError('No pages matched this range');
      return;
    }
    setRangeError(null);
    setActiveFilter('range');
    filterPages('range', rangeInput.trim());
  };

  const hasSelectedPages = selectedPageIds.length > 0;
  const allSelected = pages.length > 0 && selectedPageIds.length === pages.length;

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-xs">
      {/* Top Bar: Source Files Header & Batch Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Source Documents ({sourceFiles.length})
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              • {pages.length} canvas pages
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Color badges link pages to their source document below
          </p>
        </div>

        {/* Batch Selection Bar (shown when pages exist) */}
        {hasSelectedPages ? (
          <div className="flex flex-wrap items-center gap-2 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 px-3 py-1.5 rounded-xl">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
              {selectedPageIds.length} {selectedPageIds.length === 1 ? 'page' : 'pages'} selected
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => rotateSelectedPages(90)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 shadow-2xs transition"
                title="Rotate selected pages 90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete ${selectedPageIds.length} selected pages?`)) {
                    deleteSelectedPages();
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 shadow-2xs transition"
                title="Delete selected pages"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button
                type="button"
                onClick={clearSelection}
                className="px-2 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
              >
                Deselect
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={allSelected ? clearSelection : selectAllPages}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            >
              {allSelected ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5" />
                  <span>Select All Pages</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Source File Badges */}
      <div className="flex flex-wrap gap-2">
        {sourceFiles.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800/80 transition"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
              style={{ backgroundColor: file.colorCode }}
            />
            <span
              className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[150px] sm:max-w-[200px]"
              title={file.name}
            >
              {file.name}
            </span>
            <span className="text-[10px] text-slate-500 font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">
              {file.pageCount}p • {formatFileSize(file.size)}
            </span>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Remove all pages from "${file.name}"?`)) {
                  removeSourceFile(file.id);
                }
              }}
              className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              title={`Remove ${file.name}`}
              aria-label={`Remove ${file.name}`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Filter Toolbar & Range input */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Presets */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
          <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          <button
            type="button"
            onClick={() => handlePresetFilter('all')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Pages
          </button>
          <button
            type="button"
            onClick={() => handlePresetFilter('odd')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeFilter === 'odd'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Keep only odd-numbered pages"
          >
            Odd Only
          </button>
          <button
            type="button"
            onClick={() => handlePresetFilter('even')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeFilter === 'even'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Keep only even-numbered pages"
          >
            Even Only
          </button>
        </div>

        {/* Custom Range Input */}
        <div className="flex-1 max-w-md space-y-1">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Custom range, e.g. 1-3, 5, 8-12"
              value={rangeInput}
              onChange={(e) => {
                setRangeInput(e.target.value);
                setRangeError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyCustomRange();
              }}
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <button
              type="button"
              onClick={applyCustomRange}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 transition shrink-0"
            >
              Filter Range
            </button>
          </div>

          {/* Real-time Match / Error feedback */}
          {rangeError ? (
            <p className="text-[11px] text-red-500 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3 h-3" /> {rangeError}
            </p>
          ) : rangeMatchCount?.count !== undefined && rangeMatchCount.count !== null ? (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> {rangeMatchCount.count} pages will be kept
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
