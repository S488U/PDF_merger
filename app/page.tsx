'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/header/Header';
import { SettingsModal } from '@/components/header/SettingsModal';
import { DropZone } from '@/components/upload/DropZone';
import { SourceFileList } from '@/components/source-files/SourceFileList';
import { PageGrid } from '@/components/preview/PageGrid';
import { PreviewModal } from '@/components/modals/PreviewModal';
import { SplitToolModal } from '@/components/modals/SplitToolModal';
import { StickyFooter } from '@/components/footer/StickyFooter';
import { usePdfStore } from '@/lib/store/usePdfStore';

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { undo, pages } = usePdfStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  return (
    <main className="min-h-screen flex flex-col pb-28">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6 flex-1">
        <DropZone />

        <SourceFileList />

        {pages.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-tight">
                Pages Canvas ({pages.length})
              </h2>
              <span className="text-xs text-slate-500">
                Drag pages to reorder • Tap split/rotate/delete to customize
              </span>
            </div>
            <PageGrid />
          </div>
        )}
      </div>

      <PreviewModal />
      <SplitToolModal />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <StickyFooter />
    </main>
  );
}
