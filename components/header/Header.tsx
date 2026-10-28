'use client';

import React from 'react';
import { usePdfStore } from '@/lib/store/usePdfStore';
import {
  Undo2,
  Redo2,
  Trash2,
  Sun,
  Moon,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenSettingsTab: () => void;
  onOpenShortcuts: () => void;
}

export function Header({
  isSidebarOpen,
  onToggleSidebar,
  onOpenSettingsTab,
  onOpenShortcuts,
}: HeaderProps) {
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
    <header className="sticky top-0 z-30 w-full h-14 bg-white/90 dark:bg-[#090a10]/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/[0.08] px-3 sm:px-5 transition-colors flex items-center justify-between">
      {/* Left: Sidebar Toggle, Brand, Status Crumb */}
      <div className="flex items-center gap-3">
        {/* Sidebar Toggle Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className={`p-2 rounded-xl border transition flex items-center justify-center ${
            isSidebarOpen
              ? 'border-indigo-500/40 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
              : 'border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400'
          }`}
          title={isSidebarOpen ? 'Hide Studio Sidebar' : 'Show Studio Sidebar'}
          aria-label="Toggle Studio Sidebar"
        >
          {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              PDF Studio
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
              SaaS Pro
            </span>
          </div>
        </div>

        {/* Document Stats Crumb */}
        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-white/[0.08] text-xs text-slate-500 dark:text-zinc-400">
          {pages.length > 0 ? (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{sourceFiles.length} {sourceFiles.length === 1 ? 'file' : 'files'}</span>
              <span>•</span>
              <span className="font-semibold text-slate-800 dark:text-zinc-200">{pages.length} pages</span>
            </span>
          ) : (
            <span>Ready for documents</span>
          )}
        </div>
      </div>

      {/* Right: History, Clear, Theme, Shortcuts, Settings */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {pages.length > 0 && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-850 p-1 rounded-xl border border-slate-200 dark:border-white/[0.08]">
            {/* Undo */}
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                canUndo
                  ? 'hover:bg-white dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 shadow-2xs'
                  : 'opacity-30 cursor-not-allowed text-slate-400 dark:text-zinc-500'
              }`}
              title="Undo (Ctrl+Z / ⌘Z)"
              aria-label="Undo"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Undo</span>
            </button>

            {/* Redo */}
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                canRedo
                  ? 'hover:bg-white dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 shadow-2xs'
                  : 'opacity-30 cursor-not-allowed text-slate-400 dark:text-zinc-500'
              }`}
              title="Redo (Ctrl+Y / ⌘⇧Z)"
              aria-label="Redo"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Redo</span>
            </button>

            <div className="w-px h-3.5 bg-slate-200 dark:bg-white/10 mx-0.5" />

            {/* Clear All */}
            <button
              type="button"
              onClick={() => {
                if (confirm('Clear entire document workspace? (You can undo with Ctrl+Z)')) {
                  clearAll();
                }
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              title="Clear Canvas"
              aria-label="Clear Canvas"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Shortcuts Help */}
        <button
          type="button"
          onClick={onOpenShortcuts}
          className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition"
          title="Keyboard Shortcuts (?)"
          aria-label="Keyboard Shortcuts"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition"
          title={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          {settings.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Settings Tab Button */}
        <button
          type="button"
          onClick={onOpenSettingsTab}
          className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition"
          title="Studio Settings"
          aria-label="Studio Settings"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
