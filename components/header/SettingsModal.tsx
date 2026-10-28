'use client';

import React, { useEffect, useRef } from 'react';
import { usePdfStore } from '@/lib/store/usePdfStore';
import { X, Folder, Check, Sliders, LayoutGrid } from 'lucide-react';
import type { GridDensity } from '@/types/pdf';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const {
    settings,
    updateSettings,
    downloadDirectoryHandle,
    setDownloadDirectoryHandle,
    addToast,
  } = usePdfStore();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

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

  const densities: { id: GridDensity; label: string; desc: string }[] = [
    { id: 'compact', label: 'Compact', desc: 'Smaller cards, max pages visible' },
    { id: 'comfortable', label: 'Comfortable', desc: 'Balanced card size and spacing' },
    { id: 'spacious', label: 'Spacious', desc: 'Large high-detail thumbnails' },
  ];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="settings-dialog-title"
      className="p-0 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 backdrop:bg-black/60 m-auto text-slate-900 dark:text-slate-100 overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 id="settings-dialog-title" className="text-base font-bold">
                Studio Preferences
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Custom defaults for export, layout, and automation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-5 space-y-6">
          {/* Workspace Density */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5" /> Canvas Thumbnail Density
            </label>
            <div className="grid grid-cols-3 gap-2">
              {densities.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => updateSettings({ gridDensity: item.id })}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    settings.gridDensity === item.id
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold shadow-2xs'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-xs">{item.label}</span>
                  <span className="text-[10px] text-slate-400 font-normal leading-tight mt-1">
                    {item.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Export Pattern */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Default Output Filename Pattern
            </label>
            <input
              type="text"
              value={settings.pattern}
              onChange={(e) => updateSettings({ pattern: e.target.value })}
              placeholder="merged-{date}"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
            />
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
              <span>Insert tokens:</span>
              {['merged-{date}', 'document-{time}', 'pdf-{timestamp}'].map((pattern) => (
                <button
                  key={pattern}
                  type="button"
                  onClick={() => updateSettings({ pattern })}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px] transition"
                >
                  {pattern}
                </button>
              ))}
            </div>
          </div>

          {/* Automation Toggles */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-start gap-3 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.autoResetAfterMerge}
                onChange={(e) => updateSettings({ autoResetAfterMerge: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  Auto-reset canvas after successful merge
                </span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                  Clears the canvas automatically once your assembled PDF downloads.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.individualPageSaveAs}
                onChange={(e) => updateSettings({ individualPageSaveAs: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  Prompt "Save As" dialog for individual page downloads
                </span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                  Lets you choose the specific filename and destination folder when downloading single pages.
                </p>
              </div>
            </label>
          </div>

          {/* File System Access Folder */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Direct Destination Folder (Chromium / Edge)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePickFolder}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
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
                  className="px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Reset
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              {downloadDirectoryHandle ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Target folder: <strong>{downloadDirectoryHandle.name}</strong></span>
                </>
              ) : (
                'Currently saving to your browser default Downloads folder'
              )}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 transition"
          >
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
}
