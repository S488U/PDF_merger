'use client';

import React, { useState, useRef } from 'react';
import { usePdfStore } from '@/lib/store/usePdfStore';
import {
  UploadCloud,
  FilePlus2,
  FileText,
  ShieldCheck,
  Zap,
  Scissors,
  RotateCw,
  Layers,
  Loader2,
  Plus,
} from 'lucide-react';

export function DropZone() {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addSourceFiles, isProcessing, processingMessage, pages, addToast } = usePdfStore();

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const filesToLoad: { file: File; buffer: ArrayBuffer }[] = [];
    let invalidCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        try {
          const buffer = await file.arrayBuffer();
          filesToLoad.push({ file, buffer });
        } catch (err) {
          console.error('Error reading file buffer:', err);
          invalidCount++;
        }
      } else {
        invalidCount++;
      }
    }

    if (invalidCount > 0) {
      addToast(`${invalidCount} non-PDF file(s) ignored. Only PDF documents are supported.`, 'warning');
    }

    if (filesToLoad.length > 0) {
      await addSourceFiles(filesToLoad);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  const triggerBrowse = () => {
    fileInputRef.current?.click();
  };

  // Case 1: Workspace already has documents -> render a sleek, compact add-files banner
  if (pages.length > 0) {
    return (
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={triggerBrowse}
        className={`group relative w-full flex items-center justify-between px-4 sm:px-5 py-3 rounded-xl border border-dashed transition cursor-pointer ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
            : 'border-slate-300 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/60 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={async (e) => {
            await handleFiles(e.target.files);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FilePlus2 className="w-4 h-4" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {isProcessing ? processingMessage || 'Parsing PDF...' : 'Add more PDF documents'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Drop PDFs here or click to append pages to the canvas
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerBrowse();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Upload More</span>
        </button>
      </div>
    );
  }

  // Case 2: Empty Workspace -> rich, welcoming, professional onboarding experience
  return (
    <div className="w-full max-w-4xl mx-auto py-8 sm:py-12 space-y-8">
      {/* Upload Drop Zone Card */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={triggerBrowse}
        className={`relative w-full rounded-3xl border-2 border-dashed p-8 sm:p-14 transition-all duration-200 cursor-pointer text-center flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-900/70 shadow-xs ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/30 scale-[1.01] ring-4 ring-blue-500/10'
            : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={async (e) => {
            await handleFiles(e.target.files);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />

        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
          {isProcessing ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <UploadCloud className="w-8 h-8" />
          )}
        </div>

        <div className="max-w-md space-y-1.5">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isProcessing ? processingMessage || 'Reading PDF files...' : 'Import your PDF documents'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Drag and drop one or multiple PDF files here, or click to browse from your device.
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerBrowse();
          }}
          className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition active:scale-98"
        >
          <FilePlus2 className="w-4 h-4" />
          Browse PDF Files
        </button>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-3 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <FileText className="w-3 h-3 text-blue-500" /> Multi-file support
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <ShieldCheck className="w-3 h-3 text-emerald-500" /> 100% In-Browser Privacy
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Zap className="w-3 h-3 text-amber-500" /> Instant Processing
          </span>
        </div>
      </div>

      {/* Feature Walkthrough Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Merge & Reorder Pages
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Drag and drop individual pages across different PDFs into your exact preferred sequence.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Scissors className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Split Into Sections
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Slice oversized or dual-column pages horizontally or vertically with an interactive visual guide.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <RotateCw className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Rotate & Filter Ranges
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Fix upside-down pages and apply rapid odd/even or custom range filters before exporting.
          </p>
        </div>
      </div>
    </div>
  );
}
