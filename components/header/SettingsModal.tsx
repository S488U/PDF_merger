'use client';

import React, { useEffect, useRef } from 'react';
import { usePdfStore } from '@/lib/store/usePdfStore';
import { X, Folder, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { settings, updateSettings, downloadDirectoryHandle, setDownloadDirectoryHandle } = usePdfStore();

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
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Failed to pick folder:', err);
        }
      }
    } else {
      alert('File System Access API is not supported in this browser.');
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="p-0 rounded-2xl glass shadow-2xl max-w-md w-full border border-slate-300 dark:border-slate-800 backdrop:bg-black/60 m-auto text-slate-900 dark:text-slate-100"
    >
      <div className="p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold">Preferences</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Default Output Filename Pattern
            </label>
            <input
              type="text"
              value={settings.pattern}
              onChange={(e) => updateSettings({ pattern: e.target.value })}
              placeholder="merged-{date}"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">Available placeholders: <code>{'{date}'}</code>, <code>{'{time}'}</code>, <code>{'{timestamp}'}</code></p>
          </div>

          <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.autoResetAfterMerge}
              onChange={(e) => updateSettings({ autoResetAfterMerge: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <span>Auto-reset canvas after successful merge</span>
          </label>

          <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.individualPageSaveAs}
              onChange={(e) => updateSettings({ individualPageSaveAs: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <span>Prompt "Save As" dialog for individual page downloads</span>
          </label>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Default Download Location (Browser Support)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePickFolder}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                <Folder className="w-3.5 h-3.5" />
                Choose Folder
              </button>
              {downloadDirectoryHandle && (
                <button
                  type="button"
                  onClick={() => setDownloadDirectoryHandle(null)}
                  className="px-3 py-2 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition"
                >
                  Reset to Default
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              {downloadDirectoryHandle ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Folder selected: <strong>{downloadDirectoryHandle.name}</strong></span>
                </>
              ) : (
                'Using standard browser Downloads folder'
              )}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 transition"
          >
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
}
