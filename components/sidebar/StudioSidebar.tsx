'use client';

import React, { useState, useMemo, useRef } from 'react';
import { usePdfStore } from '@/lib/store/usePdfStore';
import {
  Files,
  Filter,
  Sliders,
  X,
  UploadCloud,
  FileText,
  Trash2,
  Folder,
  Check,
  AlertCircle,
  LayoutGrid,
  Sparkles,
  ChevronRight,
  Plus,
} from 'lucide-react';
import type { GridDensity } from '@/types/pdf';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface StudioSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: 'files' | 'filter' | 'settings';
  onTabChange?: (tab: 'files' | 'filter' | 'settings') => void;
}

export function StudioSidebar({
  isOpen,
  onClose,
  activeTab = 'files',
  onTabChange,
}: StudioSidebarProps) {
  const [tab, setTab] = useState<'files' | 'filter' | 'settings'>(activeTab);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    sourceFiles,
    removeSourceFile,
    filterPages,
    pages,
    clearAll,
    settings,
    updateSettings,
    downloadDirectoryHandle,
    setDownloadDirectoryHandle,
    addSourceFiles,
    isProcessing,
    addToast,
  } = usePdfStore();

  const currentTab = onTabChange ? activeTab : tab;
  const setStudioTab = (t: 'files' | 'filter' | 'settings') => {
    setTab(t);
    onTabChange?.(t);
  };

  const [rangeInput, setRangeInput] = useState('');
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
          return { error: 'Invalid range (e.g. 1-4, 7)' };
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

  const handlePresetFilter = (type: 'all' | 'odd' | 'even') => {
    setRangeError(null);
    filterPages(type);
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
    filterPages('range', rangeInput.trim());
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const filesToLoad: { file: File; buffer: ArrayBuffer }[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        const buffer = await file.arrayBuffer();
        filesToLoad.push({ file, buffer });
      }
    }

    if (filesToLoad.length > 0) {
      await addSourceFiles(filesToLoad);
    }
  };

  const handlePickFolder = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const handle = await (window as any).showDirectoryPicker();
        setDownloadDirectoryHandle(handle);
        addToast(`Target directory set to ${handle.name}`, 'success');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Failed to pick folder:', err);
          addToast('Could not access folder', 'error');
        }
      }
    } else {
      addToast('File System Access API is not supported in this browser', 'warning');
    }
  };

  const densities: { id: GridDensity; label: string }[] = [
    { id: 'compact', label: 'Compact' },
    { id: 'comfortable', label: 'Standard' },
    { id: 'spacious', label: 'Spacious' },
  ];

  if (!isOpen) return null;

  return (
    <aside className="w-80 sm:w-88 shrink-0 flex flex-col bg-white dark:bg-[#0f111a] border-r border-slate-200 dark:border-white/[0.08] h-[calc(100vh-3.5rem)] sticky top-14 z-20 shadow-xl transition-all">
      {/* Sidebar Header with Tabs */}
      <div className="p-3 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-white/[0.02]">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-zinc-800/80 p-0.5 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStudioTab('files')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              currentTab === 'files'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            <Files className="w-3.5 h-3.5" />
            <span>Files</span>
            {sourceFiles.length > 0 && (
              <span className="text-[10px] font-mono opacity-80">({sourceFiles.length})</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStudioTab('filter')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              currentTab === 'filter'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>

          <button
            type="button"
            onClick={() => setStudioTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              currentTab === 'settings'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>

        {/* Close Sidebar button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
          title="Collapse Sidebar"
          aria-label="Collapse Sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* TAB 1: FILES & SOURCES */}
        {currentTab === 'files' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Imported Documents
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  {pages.length} total active pages in studio
                </p>
              </div>

              {sourceFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Clear all documents from canvas?')) clearAll();
                  }}
                  className="text-[11px] text-red-500 hover:text-red-600 font-medium transition flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear All
                </button>
              )}
            </div>

            {/* Quick Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={async (e) => {
                await handleFiles(e.target.files);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-indigo-400/60 dark:border-indigo-500/40 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-500 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add PDF Documents</span>
            </button>

            {/* Source Documents List */}
            {sourceFiles.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/5 space-y-2">
                <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-zinc-600" />
                <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  No documents imported yet
                </p>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                  Drop PDFs onto the workspace canvas or click Add above
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sourceFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.04] transition space-y-2 shadow-2xs group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: file.colorCode }}
                        />
                        <span
                          className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate"
                          title={file.name}
                        >
                          {file.name}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove "${file.name}" and its pages?`)) {
                            removeSourceFile(file.id);
                          }
                        }}
                        className="text-slate-400 hover:text-red-500 p-1 rounded-md transition shrink-0 opacity-0 group-hover:opacity-100"
                        title="Remove document"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
                      <span>{file.pageCount} {file.pageCount === 1 ? 'page' : 'pages'}</span>
                      <span>{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PAGE FILTERS */}
        {currentTab === 'filter' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Page Sequence Filters
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                Quickly select which pages to keep in your document
              </p>
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Quick Presets
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePresetFilter('all')}
                  className="py-1.5 px-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 transition text-center"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetFilter('odd')}
                  className="py-1.5 px-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 transition text-center"
                  title="Keep odd pages only"
                >
                  Odd Only
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetFilter('even')}
                  className="py-1.5 px-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 transition text-center"
                  title="Keep even pages only"
                >
                  Even Only
                </button>
              </div>
            </div>

            {/* Custom Page Range */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Custom Page Range
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="e.g. 1-3, 5, 8-12"
                  value={rangeInput}
                  onChange={(e) => {
                    setRangeInput(e.target.value);
                    setRangeError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyCustomRange();
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />

                {rangeError ? (
                  <p className="text-[11px] text-red-500 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {rangeError}
                  </p>
                ) : rangeMatchCount?.count !== undefined && rangeMatchCount.count !== null ? (
                  <p className="text-[11px] text-emerald-500 flex items-center gap-1 font-medium">
                    <Check className="w-3.5 h-3.5 shrink-0" /> {rangeMatchCount.count} pages will be kept
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                    Use commas and hyphens (e.g. 1-4, 7, 10-15)
                  </p>
                )}

                <button
                  type="button"
                  onClick={applyCustomRange}
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-bold hover:opacity-90 transition shadow-xs"
                >
                  Apply Range Filter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STUDIO SETTINGS */}
        {currentTab === 'settings' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Workspace & Export Settings
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                Customize layout density, filename format, and output folders
              </p>
            </div>

            {/* Grid Density */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-indigo-500" /> Canvas Density
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-200/50 dark:bg-zinc-800/80 p-1 rounded-xl">
                {densities.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateSettings({ gridDensity: item.id })}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition ${
                      settings.gridDensity === item.id
                        ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Filename Pattern */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Export Filename Pattern
              </label>
              <input
                type="text"
                value={settings.pattern}
                onChange={(e) => updateSettings({ pattern: e.target.value })}
                placeholder="merged-{date}"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-400">
                {['merged-{date}', 'doc-{time}', 'pdf-{timestamp}'].map((pat) => (
                  <button
                    key={pat}
                    type="button"
                    onClick={() => updateSettings({ pattern: pat })}
                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-mono transition"
                  >
                    {pat}
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Destination Folder */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Direct Destination Folder
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePickFolder}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-xs"
                >
                  <Folder className="w-3.5 h-3.5" />
                  Select Folder
                </button>
                {downloadDirectoryHandle && (
                  <button
                    type="button"
                    onClick={() => {
                      setDownloadDirectoryHandle(null);
                      addToast('Reset to default browser downloads', 'info');
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-zinc-800 transition text-slate-600 dark:text-zinc-400"
                  >
                    Reset
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                {downloadDirectoryHandle ? (
                  <span className="text-emerald-500 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Target: {downloadDirectoryHandle.name}
                  </span>
                ) : (
                  'Saves to browser default Downloads directory'
                )}
              </p>
            </div>

            {/* Switches */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/10">
              <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.autoResetAfterMerge}
                  onChange={(e) => updateSettings({ autoResetAfterMerge: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-700 dark:text-zinc-300 font-medium">
                  Auto-reset canvas after successful merge
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.individualPageSaveAs}
                  onChange={(e) => updateSettings({ individualPageSaveAs: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-700 dark:text-zinc-300 font-medium">
                  Prompt "Save As" for single page downloads
                </span>
              </label>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
