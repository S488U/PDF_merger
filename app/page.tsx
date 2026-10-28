'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/header/Header';
import { SettingsModal } from '@/components/header/SettingsModal';
import { ShortcutsModal } from '@/components/modals/ShortcutsModal';
import { DropZone } from '@/components/upload/DropZone';
import { SourceFileList } from '@/components/source-files/SourceFileList';
import { PageGrid } from '@/components/preview/PageGrid';
import { PreviewModal } from '@/components/modals/PreviewModal';
import { SplitToolModal } from '@/components/modals/SplitToolModal';
import { StickyFooter } from '@/components/footer/StickyFooter';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { usePdfStore } from '@/lib/store/usePdfStore';
import { LayoutGrid, Sparkles } from 'lucide-react';

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const { undo, redo, pages, settings } = usePdfStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in form controls
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (modifier && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <main className="min-h-screen flex flex-col bg-[#f8f9fa] dark:bg-[#0b0d13] pb-28 text-slate-900 dark:text-slate-100 transition-colors">
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6 flex-1">
        <DropZone />

        <SourceFileList />

        {pages.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-0.5">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Page Sequence Canvas ({pages.length})
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                  {settings.gridDensity}
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Drag handles to reorder • Hover to inspect • Use toolbar to rotate/split/delete
              </span>
            </div>

            <PageGrid />
          </div>
        )}
      </div>

      <PreviewModal />
      <SplitToolModal />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      <ToastContainer />
      <StickyFooter />
    </main>
  );
}
