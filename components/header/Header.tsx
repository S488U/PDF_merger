'use client';

import React from 'react';
import { usePdfStore } from '@/lib/store/usePdfStore';
import { Settings, Undo2, Trash2, Sun, Moon, Layers } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
}

export function Header({ onOpenSettings }: HeaderProps) {
  const { undoStack, undo, clearAll, pages, settings, updateSettings } = usePdfStore();
  const canUndo = undoStack.length > 0;

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: nextTheme });
    if (typeof document !== 'undefined') {
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full glass border-b px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight">PDF Tools</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Merge, split, rotate, and arrange PDF pages
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pages.length > 0 && (
            <>
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  canUndo
                    ? 'hover:bg-slate-200/50 dark:hover:bg-slate-800/50 border-slate-300 dark:border-slate-700'
                    : 'opacity-40 cursor-not-allowed border-transparent'
                }`}
                title="Undo last action (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Undo</span>
                {canUndo && <span className="text-[10px] opacity-75">({undoStack.length})</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to clear all pages?')) {
                    clearAll();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition border border-transparent hover:border-red-200 dark:hover:border-red-900"
                title="Clear all pages"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition text-slate-700 dark:text-slate-300"
            aria-label="Toggle theme"
          >
            {settings.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition text-slate-700 dark:text-slate-300"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
