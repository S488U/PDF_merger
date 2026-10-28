'use client';

import React, { useState } from 'react';
import { usePdfStore } from '@/lib/store/usePdfStore';
import { FileText, X, Filter } from 'lucide-react';

export function SourceFileList() {
  const { sourceFiles, removeSourceFile, filterPages, pages } = usePdfStore();
  const [rangeInput, setRangeInput] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'odd' | 'even' | 'range'>('all');

  if (sourceFiles.length === 0) return null;

  const handleFilter = (type: 'all' | 'odd' | 'even' | 'range') => {
    setActiveFilter(type);
    if (type !== 'range') {
      filterPages(type);
    } else if (rangeInput.trim()) {
      filterPages('range', rangeInput.trim());
    }
  };

  const applyRange = () => {
    if (rangeInput.trim()) {
      filterPages('range', rangeInput.trim());
    }
  };

  return (
    <div className="w-full glass rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            Uploaded Documents ({sourceFiles.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {pages.length} total active pages in arrangement
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
          <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          <button
            type="button"
            onClick={() => handleFilter('all')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => handleFilter('odd')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeFilter === 'odd'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Odd
          </button>
          <button
            type="button"
            onClick={() => handleFilter('even')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeFilter === 'even'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Even
          </button>
        </div>
      </div>

      {/* Range filter input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter range, e.g. 1-3, 5, 8-10"
          value={rangeInput}
          onChange={(e) => setRangeInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applyRange();
          }}
          className="flex-1 max-w-xs px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={applyRange}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition"
        >
          Apply
        </button>
      </div>

      {/* Source file badges */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
        {sourceFiles.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white/60 dark:bg-slate-800/60 shadow-xs text-xs"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: file.colorCode }}
            />
            <span className="font-medium truncate max-w-[160px] sm:max-w-[220px]" title={file.name}>
              {file.name}
            </span>
            <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700">
              {file.pageCount}p
            </span>
            <button
              type="button"
              onClick={() => removeSourceFile(file.id)}
              className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
              title={`Remove ${file.name}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
