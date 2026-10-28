'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/header/Header';
import { StudioSidebar } from '@/components/sidebar/StudioSidebar';
import { ShortcutsModal } from '@/components/modals/ShortcutsModal';
import { DropZone } from '@/components/upload/DropZone';
import { PageGrid } from '@/components/preview/PageGrid';
import { PreviewModal } from '@/components/modals/PreviewModal';
import { SplitToolModal } from '@/components/modals/SplitToolModal';
import { StickyFooter } from '@/components/footer/StickyFooter';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { usePdfStore } from '@/lib/store/usePdfStore';
import {
  RotateCw,
  Trash2,
  CheckSquare,
  Square,
  Sliders,
} from 'lucide-react';
import type { GridDensity } from '@/types/pdf';

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'files' | 'filter' | 'settings'>('files');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const {
    undo,
    redo,
    pages,
    selectedPageIds,
    selectAllPages,
    clearSelection,
    rotateSelectedPages,
    deleteSelectedPages,
    clearAll,
    settings,
    updateSettings,
  } = usePdfStore();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

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
      } else if (modifier && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const hasSelectedPages = selectedPageIds.length > 0;
  const allSelected = pages.length > 0 && selectedPageIds.length === pages.length;

  const densities: { id: GridDensity; label: string }[] = [
    { id: 'compact', label: 'Compact' },
    { id: 'comfortable', label: 'Standard' },
    { id: 'spacious', label: 'Large' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors">
      {/* Top Application Header */}
      <Header
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onOpenSettingsTab={() => {
          setIsSidebarOpen(true);
          setSidebarTab('settings');
        }}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Main Studio Workspace: Sidebar + Central Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Studio Sidebar (Files, Filter, Settings) */}
        <StudioSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeTab={sidebarTab}
          onTabChange={(t) => setSidebarTab(t)}
        />

        {/* Central Workspace Canvas */}
        <main className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950 p-4 sm:p-6 lg:p-8 pb-52 sm:pb-60">
          <div className="max-w-7xl mx-auto space-y-6">
            {pages.length === 0 ? (
              // Empty State
              <DropZone />
            ) : (
              // Populated Canvas
              <div className="space-y-4">
                {/* Canvas Action Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                  {/* Left: Selection and Batch controls */}
                  <div className="flex items-center gap-2">
                    {hasSelectedPages ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                          {selectedPageIds.length} selected
                        </span>

                        <button
                          type="button"
                          onClick={() => rotateSelectedPages(90)}
                          className="h-8 px-2.5 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 transition"
                          title="Rotate selected pages 90°"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Rotate</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteSelectedPages()}
                          className="h-8 px-2.5 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 flex items-center gap-1.5 transition"
                          title="Delete selected pages"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>

                        <button
                          type="button"
                          onClick={clearSelection}
                          className="h-8 px-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
                        >
                          Deselect
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={allSelected ? clearSelection : selectAllPages}
                          className="h-8 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition"
                        >
                          {allSelected ? (
                            <>
                              <CheckSquare className="w-3.5 h-3.5" />
                              <span>Deselect all</span>
                            </>
                          ) : (
                            <>
                              <Square className="w-3.5 h-3.5" />
                              <span>Select all ({pages.length})</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => clearAll()}
                          className="h-8 px-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 text-xs font-medium flex items-center gap-1.5 transition"
                          title="Clear all documents from canvas (Ctrl+Z to undo)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Clear canvas</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right: Canvas density segmented control */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-md border border-zinc-200 dark:border-zinc-800">
                      {densities.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => updateSettings({ gridDensity: item.id })}
                          className={`px-2.5 py-1 text-xs font-medium rounded transition ${
                            settings.gridDensity === item.id
                              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {!isSidebarOpen && (
                      <button
                        type="button"
                        onClick={() => setIsSidebarOpen(true)}
                        className="h-8 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Tools</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Page Grid */}
                <PageGrid />

                {/* Bottom clearance spacer to ensure bottom row cards never collide with floating export bar */}
                <div className="h-28 sm:h-20" aria-hidden="true" />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Floating Bottom Bar */}
      <StickyFooter />

      {/* Overlays & Modals */}
      <PreviewModal />
      <SplitToolModal />
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      <ToastContainer />
    </div>
  );
}
