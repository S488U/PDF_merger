'use client';

import React, { useEffect, useRef } from 'react';
import { X, Command, CornerDownLeft } from 'lucide-react';

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
      category: 'History & Editing',
      items: [
        { key: 'Ctrl + Z / ⌘Z', desc: 'Undo last operation' },
        { key: 'Ctrl + Y / ⌘⇧Z', desc: 'Redo last undone operation' },
        { key: 'Delete / Backspace', desc: 'Delete focused or hovered page' },
        { key: 'R', desc: 'Rotate selected page 90° clockwise' },
      ],
    },
    {
      category: 'Inspection & Navigation',
      items: [
        { key: '← / →', desc: 'Previous / Next page in preview modal' },
        { key: 'Esc', desc: 'Close any active modal or overlay' },
        { key: 'Enter', desc: 'Confirm range filter or split apply' },
        { key: '?', desc: 'Toggle keyboard shortcuts reference' },
      ],
    },
  ];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="shortcuts-dialog-title"
      className="p-0 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 backdrop:bg-black/60 m-auto text-slate-900 dark:text-slate-100 overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Command className="w-4 h-4" />
            </div>
            <div>
              <h2 id="shortcuts-dialog-title" className="text-base font-bold">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Speed up your document workflow
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
            aria-label="Close shortcuts modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-5 space-y-6">
          {shortcuts.map((group) => (
            <div key={group.category} className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.category}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60"
                  >
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {item.desc}
                    </span>
                    <kbd className="px-2 py-0.5 font-mono text-[11px] font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 transition"
          >
            Got it
          </button>
        </div>
      </div>
    </dialog>
  );
}
