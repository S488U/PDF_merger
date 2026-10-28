'use client';

import React from 'react';
import { usePdfStore } from '@/lib/store/usePdfStore';
import {
  Settings,
  Undo2,
  Redo2,
  Trash2,
  Sun,
  Moon,
  Files,
  HelpCircle,
} from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
}

export function Header({ onOpenSettings, onOpenShortcuts }: HeaderProps) {
  const {
    undoStack,
    redoStack,
    undo,
    redo,
    clearAll,
    pages,
    sourceFiles,
    settings,
    updateSettings,
  } = usePdfStore();

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

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
    <header className="sticky top-0 z-30 w-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-2.5 sm:px-6 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs shadow-blue-500/20">
            <Files className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                PDF Tools
              </span>
              <span className="hidden sm:inline-flex text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50">
                Studio
              </span>
            </div>
            {pages.length > 0 ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {sourceFiles.length} {sourceFiles.length === 1 ? 'file' : 'files'} • {pages.length} {pages.length === 1 ? 'page' : 'pages'}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:block">
                Privacy-first in-browser document editor
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {pages.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              {/* Undo */}
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  canUndo
                    ? 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs'
                    : 'opacity-35 cursor-not-allowed text-slate-400'
                }`}
                title="Undo last action (Ctrl+Z)"
                aria-label="Undo last action"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Undo</span>
                {canUndo && <span className="text-[10px] opacity-70">({undoStack.length})</span>}
              </button>

              {/* Redo */}
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  canRedo
                    ? 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs'
                    : 'opacity-35 cursor-not-allowed text-slate-400'
                }`}
                title="Redo action (Ctrl+Y or ⌘⇧Z)"
                aria-label="Redo action"
              >
                <Redo2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Redo</span>
                {canRedo && <span className="text-[10px] opacity-70">({redoStack.length})</span>}
              </button>

              <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-0.5" />

              {/* Clear All */}
              <button
                type="button"
                onClick={() => {
                  if (confirm('Clear all pages and reset workspace? (You can undo this with Ctrl+Z)')) {
                    clearAll();
                  }
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                title="Clear all pages from workspace"
                aria-label="Clear all pages"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Clear</span>
              </button>
            </div>
          )}

          {/* Shortcuts Help */}
          <button
            type="button"
            onClick={onOpenShortcuts}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
          >
            {settings.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
