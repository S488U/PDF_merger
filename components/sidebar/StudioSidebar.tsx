'use client';

import React, { useState, useMemo, useRef } from 'react';
import { usePdfStore } from '@/lib/store/usePdfStore';
import {
  Files,
  Filter,
  Sliders,
  X,
  FileText,
  Trash2,
  Folder,
  Check,
  AlertCircle,
  LayoutGrid,
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
    { id: 'spacious', label: 'Large' },
  ];

  if (!isOpen) return null;

  return (
    <aside className="w-80 sm:w-88 shrink-0 flex flex-col bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 h-[calc(100vh-3.5rem)] sticky top-14 z-20 transition-all">
      {/* Sidebar Header with Tabs */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-md text-xs font-medium w-full">
          <button
            type="button"
            onClick={() => setStudioTab('files')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded transition ${
              currentTab === 'files'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Files className="w-3.5 h-3.5" />
            <span>Files</span>
            {sourceFiles.length > 0 && (
              <span className="font-mono text-[11px] opacity-75">({sourceFiles.length})</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStudioTab('filter')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded transition ${
              currentTab === 'filter'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>

          <button
            type="button"
            onClick={() => setStudioTab('settings')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded transition ${
              currentTab === 'settings'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition shrink-0"
          title="Close sidebar"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* TAB 1: FILES */}
        {currentTab === 'files' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Documents
                </h3>
                <p className="text-xs text-zinc-500">
                  {pages.length} total pages on canvas
                </p>
              </div>

              {sourceFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Clear all documents from canvas?')) clearAll();
                  }}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium transition"
                >
                  Clear all
                </button>
              )}
            </div>

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
              className="w-full h-9 flex items-center justify-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Documents</span>
            </button>

            {sourceFiles.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
                <FileText className="w-8 h-8 mx-auto text-zinc-400" />
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  No files added
                </p>
                <p className="text-xs text-zinc-500">
                  Upload PDF files to start organizing
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sourceFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: file.colorCode }}
                        />
                        <span
                          className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate"
                          title={file.name}
                        >
                          {file.name}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove "${file.name}"?`)) {
                            removeSourceFile(file.id);
                          }
                        }}
                        className="text-zinc-400 hover:text-red-500 p-0.5 rounded transition shrink-0"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
                      <span>{file.pageCount} {file.pageCount === 1 ? 'page' : 'pages'}</span>
                      <span>{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FILTER */}
        {currentTab === 'filter' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Page Filtering
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Quickly isolate specific pages to keep
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Preset Sequences
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePresetFilter('all')}
                  className="h-8 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetFilter('odd')}
                  className="h-8 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition"
                  title="Keep odd pages only"
                >
                  Odd Only
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetFilter('even')}
                  className="h-8 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition"
                  title="Keep even pages only"
                >
                  Even Only
                </button>
              </div>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
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
                  className="w-full h-9 px-3 text-sm rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100 font-mono focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-400"
                />

                {rangeError ? (
                  <p className="text-xs text-red-500 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {rangeError}
                  </p>
                ) : rangeMatchCount?.count !== undefined && rangeMatchCount.count !== null ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                    <Check className="w-3.5 h-3.5 shrink-0" /> {rangeMatchCount.count} pages will be kept
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Use commas and hyphens (e.g. 1-4, 7, 10-15)
                  </p>
                )}

                <button
                  type="button"
                  onClick={applyCustomRange}
                  className="w-full h-9 rounded-md bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SETTINGS */}
        {currentTab === 'settings' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Preferences
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Layout and export options
              </p>
            </div>

            {/* Density */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-zinc-500" /> Canvas Density
              </label>
              <div className="grid grid-cols-3 gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-md">
                {densities.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateSettings({ gridDensity: item.id })}
                    className={`py-1 text-xs font-medium rounded transition ${
                      settings.gridDensity === item.id
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Filename Pattern */}
            <div className="space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Export Filename Pattern
              </label>
              <input
                type="text"
                value={settings.pattern}
                onChange={(e) => updateSettings({ pattern: e.target.value })}
                placeholder="merged-{date}"
                className="w-full h-9 px-3 text-sm rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100 font-mono focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-400"
              />
              <div className="flex flex-wrap items-center gap-1 text-xs text-zinc-500">
                {['merged-{date}', 'doc-{time}', 'pdf-{timestamp}'].map((pat) => (
                  <button
                    key={pat}
                    type="button"
                    onClick={() => updateSettings({ pattern: pat })}
                    className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono text-[11px] transition"
                  >
                    {pat}
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Destination Folder */}
            <div className="space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Destination Folder (Chromium)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePickFolder}
                  className="h-8 px-3 rounded-md text-xs font-semibold bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 hover:opacity-90 transition flex items-center gap-1.5"
                >
                  <Folder className="w-3.5 h-3.5" />
                  Select
                </button>
                {downloadDirectoryHandle && (
                  <button
                    type="button"
                    onClick={() => {
                      setDownloadDirectoryHandle(null);
                      addToast('Reset to default browser downloads', 'info');
                    }}
                    className="h-8 px-3 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  >
                    Reset
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-500">
                {downloadDirectoryHandle ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> {downloadDirectoryHandle.name}
                  </span>
                ) : (
                  'Saves to default Downloads'
                )}
              </p>
            </div>

            {/* Automation Switches */}
            <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.autoResetAfterMerge}
                  onChange={(e) => updateSettings({ autoResetAfterMerge: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-400"
                />
                <span className="text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
                  Auto-reset canvas after successful merge
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.individualPageSaveAs}
                  onChange={(e) => updateSettings({ individualPageSaveAs: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-400"
                />
                <span className="text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
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
