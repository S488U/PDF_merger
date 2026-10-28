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
  LayoutGrid,
  RotateCw,
  Trash2,
  CheckSquare,
  Square,
  Plus,
  Sliders,
  Filter,
  Files,
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
    settings,
    updateSettings,
  } = usePdfStore();

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
    { id: 'spacious', label: 'Spacious' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-[#08090d] text-slate-900 dark:text-zinc-100 transition-colors">
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

      {/* Main SaaS Studio Workspace: Sidebar + Central Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Studio Sidebar (Files, Filter, Settings) */}
        <StudioSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeTab={sidebarTab}
          onTabChange={(t) => setSidebarTab(t)}
        />

        {/* Central Workspace Canvas */}
        <main className="flex-1 overflow-y-auto bg-grid relative p-4 sm:p-6 lg:p-8 pb-32">
          <div className="max-w-7xl mx-auto space-y-6">
            {pages.length === 0 ? (
              // Empty State Ingestion
              <DropZone />
            ) : (
              // Populated Canvas Workspace
              <div className="space-y-4">
                {/* Canvas Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-[#111422]/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-xs">
                  {/* Left: Selection count & batch actions */}
                  <div className="flex items-center gap-2">
                    {hasSelectedPages ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                          {selectedPageIds.length} selected
                        </span>

                        <button
                          type="button"
                          onClick={() => rotateSelectedPages(90)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                          title="Rotate selected pages 90°"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Rotate</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete ${selectedPageIds.length} selected pages?`)) {
                              deleteSelectedPages();
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-500 transition shadow-2xs"
                          title="Delete selected pages"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>

                        <button
                          type="button"
                          onClick={clearSelection}
                          className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition"
                        >
                          Deselect
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={allSelected ? clearSelection : selectAllPages}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition"
                        >
                          {allSelected ? (
                            <>
                              <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Deselect All</span>
                            </>
                          ) : (
                            <>
                              <Square className="w-3.5 h-3.5" />
                              <span>Select All ({pages.length})</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right: Quick Canvas Density segmented control & Add PDFs */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Density Control */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-850 p-1 rounded-xl border border-slate-200/80 dark:border-white/[0.08]">
                      {densities.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => updateSettings({ gridDensity: item.id })}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                            settings.gridDensity === item.id
                              ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Quick Sidebar Opener buttons if sidebar is closed */}
                    {!isSidebarOpen && (
                      <button
                        type="button"
                        onClick={() => setIsSidebarOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Tools</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sortable Page Cards Canvas */}
                <PageGrid />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Floating Action Island Dock */}
      <StickyFooter />

      {/* Overlays & Modals */}
      <PreviewModal />
      <SplitToolModal />
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      <ToastContainer />
    </div>
  );
}
