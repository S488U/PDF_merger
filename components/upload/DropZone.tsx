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
  ArrowRight,
  Sparkles,
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

  // When workspace already has pages: render a sleek, modern inline upload bar
  if (pages.length > 0) {
    return (
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={triggerBrowse}
        className={`group relative w-full flex items-center justify-between px-4 sm:px-6 py-3 rounded-2xl border transition-all cursor-pointer ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/20'
            : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#111420]/80 hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-[#151928] shadow-xs'
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
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-xs shadow-indigo-500/20">
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FilePlus2 className="w-4 h-4" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
              {isProcessing ? processingMessage || 'Importing PDFs...' : 'Append more documents to canvas'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 hidden sm:block">
              Drop PDFs anywhere or click to browse
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerBrowse();
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Upload PDF</span>
        </button>
      </div>
    );
  }

  // When empty: SaaS-level Hero Empty State
  return (
    <div className="w-full max-w-4xl mx-auto py-10 sm:py-16 space-y-10">
      {/* SaaS Hero Ingestion Card */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={triggerBrowse}
        className={`relative w-full rounded-3xl border p-8 sm:p-16 transition-all duration-300 cursor-pointer text-center flex flex-col items-center justify-center gap-5 overflow-hidden ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01] ring-4 ring-indigo-500/20 shadow-2xl shadow-indigo-500/10'
            : 'border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#111422]/90 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/5 shadow-md'
        }`}
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-gradient-to-b from-indigo-500/15 via-purple-500/5 to-transparent blur-3xl pointer-events-none" />

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

        {/* Hero Icon */}
        <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25">
          {isProcessing ? (
            <Loader2 className="w-9 h-9 animate-spin" />
          ) : (
            <UploadCloud className="w-9 h-9" />
          )}
        </div>

        <div className="max-w-md space-y-2 relative z-10">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {isProcessing ? processingMessage || 'Reading PDF files...' : 'Drag & drop your PDFs here'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            Combine multiple documents, reorganize pages, split sections, and rotate orientation in one unified workspace.
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerBrowse();
          }}
          className="relative z-10 inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-500/30 transition-all hover:scale-105 active:scale-98"
        >
          <FilePlus2 className="w-4 h-4" />
          <span>Browse Files from Device</span>
        </button>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] text-slate-500 dark:text-zinc-400 relative z-10">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> 100% In-Browser Privacy
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08]">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Instant Processing
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08]">
            <FileText className="w-3.5 h-3.5 text-blue-500" /> Multiple PDF Merging
          </span>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111422] border border-slate-200 dark:border-white/[0.08] space-y-2.5 hover:border-indigo-500/40 transition shadow-xs group">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">
            Visual Reordering
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
            Drag and drop individual pages seamlessly across files into your exact preferred document sequence.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#111422] border border-slate-200 dark:border-white/[0.08] space-y-2.5 hover:border-indigo-500/40 transition shadow-xs group">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Scissors className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">
            Page Splitter
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
            Divide double pages or books horizontally or vertically with an interactive visual cutting guide.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#111422] border border-slate-200 dark:border-white/[0.08] space-y-2.5 hover:border-indigo-500/40 transition shadow-xs group">
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <RotateCw className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">
            Rotate & Filter
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
            Fix orientations in 90° steps and filter odd/even or custom ranges with instant preview feedback.
          </p>
        </div>
      </div>
    </div>
  );
}
