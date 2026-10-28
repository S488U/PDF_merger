'use client';

import React, { useEffect, useRef } from 'react';
import { X, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  const shortcuts = [
    {
      category: 'Editing',
      items: [
        { key: 'Ctrl + Z', desc: 'Undo last operation' },
        { key: 'Ctrl + Y', desc: 'Redo last undone operation' },
        { key: 'R', desc: 'Rotate page 90° clockwise' },
        { key: 'S', desc: 'Split page in preview modal' },
        { key: 'Delete', desc: 'Delete active or selected page(s)' },
      ],
    },
    {
      category: 'Workspace',
      items: [
        { key: 'Ctrl + B', desc: 'Toggle Studio Sidebar' },
        { key: '← / →', desc: 'Previous / Next page in preview' },
        { key: 'Esc', desc: 'Close dialog or modal' },
        { key: '?', desc: 'Toggle shortcuts reference' },
      ],
    },
  ];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="shortcuts-dialog-title"
      className="p-0 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full backdrop:bg-black/75 m-auto text-zinc-900 dark:text-zinc-100 overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <Command className="w-3.5 h-3.5" />
            </div>
            <h2 id="shortcuts-dialog-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          {shortcuts.map((group) => (
            <div key={group.category} className="space-y-2">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                {group.category}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-md bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60"
                  >
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                      {item.desc}
                    </span>
                    <kbd className="px-2 py-0.5 font-mono text-[11px] font-semibold bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded shadow-2xs">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 rounded-md text-xs font-semibold bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 hover:opacity-90 transition"
          >
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
}
