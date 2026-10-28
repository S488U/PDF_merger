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
  Files,
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
    <header className="sticky top-0 z-30 w-full h-14 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 transition-colors flex items-center justify-between">
      {/* Left: Sidebar Toggle, Brand & Document Status */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className={`h-9 w-9 rounded-md border flex items-center justify-center transition ${
            isSidebarOpen
              ? 'border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
              : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
          }`}
          title={isSidebarOpen ? 'Hide sidebar (Ctrl+B)' : 'Show sidebar (Ctrl+B)'}
          aria-label="Toggle sidebar"
        >
          {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-bold text-xs">
            <Files className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            PDF Tools
          </span>
        </div>

        {pages.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>{sourceFiles.length} {sourceFiles.length === 1 ? 'file' : 'files'}</span>
            <span>•</span>
            <span className="text-zinc-900 dark:text-zinc-200 font-semibold">{pages.length} pages</span>
          </div>
        )}
      </div>

      {/* Right: History controls, Shortcuts, Theme, Settings */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {(pages.length > 0 || sourceFiles.length > 0) && (
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-md border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className={`h-7 px-2.5 rounded text-xs font-medium flex items-center gap-1.5 transition ${
                canUndo
                  ? 'hover:bg-white dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-2xs'
                  : 'opacity-35 cursor-not-allowed text-zinc-400'
              }`}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Undo</span>
            </button>

            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className={`h-7 px-2.5 rounded text-xs font-medium flex items-center gap-1.5 transition ${
                canRedo
                  ? 'hover:bg-white dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-2xs'
                  : 'opacity-35 cursor-not-allowed text-zinc-400'
              }`}
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Redo</span>
            </button>

            <div className="w-px h-3.5 bg-zinc-300 dark:bg-zinc-700 mx-0.5" />

            <button
              type="button"
              onClick={() => clearAll()}
              className="h-7 w-7 rounded flex items-center justify-center text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              title="Clear all (Ctrl+Z to undo)"
              aria-label="Clear all pages"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Shortcuts */}
        <button
          type="button"
          onClick={onOpenShortcuts}
          className="h-9 w-9 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition"
          title="Shortcuts (?)"
          aria-label="Keyboard Shortcuts"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="h-9 w-9 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition"
          title={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          {settings.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Settings button */}
        <button
          type="button"
          onClick={onOpenSettingsTab}
          className="h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 text-xs font-medium transition"
          title="Studio Settings"
          aria-label="Studio Settings"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </div>
    </header>
  );
}
