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
        { key: 'R', desc: 'Rotate page 90° clockwise' },
        { key: 'S', desc: 'Open interactive Split tool in inspect modal' },
        { key: 'Delete / Backspace', desc: 'Delete active or selected page(s)' },
      ],
    },
    {
      category: 'Workspace & Navigation',
      items: [
        { key: 'Ctrl + B / ⌘B', desc: 'Toggle Studio Sidebar' },
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
      className="p-0 rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl max-w-lg w-full backdrop:bg-black/75 m-auto text-zinc-100 overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Command className="w-4 h-4" />
            </div>
            <div>
              <h2 id="shortcuts-dialog-title" className="text-base font-bold text-zinc-100">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-zinc-400">
                Studio shortcuts for high-speed document editing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition"
            aria-label="Close shortcuts modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-5 space-y-6">
          {shortcuts.map((group) => (
            <div key={group.category} className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                {group.category}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-zinc-950/60 border border-white/5"
                  >
                    <span className="text-zinc-300 font-medium">
                      {item.desc}
                    </span>
                    <kbd className="px-2 py-0.5 font-mono text-[11px] font-semibold bg-zinc-800 text-zinc-200 border border-white/10 rounded-md shadow-xs">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-zinc-900 hover:bg-zinc-200 transition"
          >
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
}
