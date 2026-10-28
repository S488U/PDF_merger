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
      try {
        const buffer = await file.arrayBuffer();
        const isPdfName = file.name.toLowerCase().endsWith('.pdf');
        const isPdfMime = file.type && (file.type === 'application/pdf' || file.type.includes('pdf'));
        const header = new Uint8Array(buffer.slice(0, 5));
        const isPdfMagic = header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;

        if (isPdfName || isPdfMime || isPdfMagic) {
          filesToLoad.push({ file, buffer });
        } else {
          invalidCount++;
        }
      } catch (err) {
        console.error('Error reading file buffer:', err);
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

  // When workspace already has pages: render a sleek, clean append bar
  if (pages.length > 0) {
    return (
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`group relative w-full flex items-center justify-between px-5 py-3.5 rounded-lg border transition-all cursor-pointer overflow-hidden ${
          isDragOver
            ? 'border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-900'
            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-zinc-400 dark:hover:border-zinc-700 shadow-2xs'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf, .pdf, application/x-pdf"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onChange={async (e) => {
            await handleFiles(e.target.files);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />

        <div className="flex items-center gap-3 pointer-events-none">
          <div className="h-8 w-8 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100 shrink-0 border border-zinc-200 dark:border-zinc-700">
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FilePlus2 className="w-4 h-4" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {isProcessing ? processingMessage || 'Importing PDFs...' : 'Add more PDF files'}
            </p>
            <p className="text-xs text-zinc-500 hidden sm:block">
              Drop PDFs here or click to browse
            </p>
          </div>
        </div>

        <button
          type="button"
          tabIndex={-1}
          className="pointer-events-none h-8 px-3 rounded-md text-xs font-semibold bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 transition shadow-2xs flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Upload</span>
        </button>
      </div>
    );
  }

  // Clean, high-contrast shadcn Empty State
  return (
    <div className="w-full max-w-4xl mx-auto py-12 sm:py-20 space-y-12">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative w-full rounded-xl border-2 border-dashed p-10 sm:p-16 transition-all duration-200 cursor-pointer text-center flex flex-col items-center justify-center gap-6 overflow-hidden ${
          isDragOver
            ? 'border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-900'
            : 'border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-400 dark:hover:border-zinc-700'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf, .pdf, application/x-pdf"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onChange={async (e) => {
            await handleFiles(e.target.files);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />

        <div className="h-14 w-14 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100 pointer-events-none">
          {isProcessing ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <UploadCloud className="w-6 h-6" />
          )}
        </div>

        <div className="max-w-md space-y-2 pointer-events-none">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {isProcessing ? processingMessage || 'Reading PDF files...' : 'Select or drop PDF documents'}
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Reorder pages, split sheets into sections, rotate orientations, and merge multiple documents locally in your browser.
          </p>
        </div>

        <button
          type="button"
          tabIndex={-1}
          className="pointer-events-none h-10 px-6 rounded-md text-sm font-semibold bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 transition shadow-xs flex items-center gap-2"
        >
          <FilePlus2 className="w-4 h-4" />
          <span>Browse Files</span>
        </button>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-zinc-500 font-medium pointer-events-none">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" /> Private & local
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <Zap className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" /> Instant processing
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <FileText className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" /> Multiple file merge
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="h-8 w-8 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100 font-semibold text-xs border border-zinc-200 dark:border-zinc-700">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Reorder Pages
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Drag and drop individual thumbnails across multiple files to organize pages in any order.
          </p>
        </div>

        <div className="p-5 rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="h-8 w-8 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100 font-semibold text-xs border border-zinc-200 dark:border-zinc-700">
            <Scissors className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Split Into Halves
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Divide large pages horizontally or vertically with an interactive draggable cutting line.
          </p>
        </div>

        <div className="p-5 rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="h-8 w-8 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100 font-semibold text-xs border border-zinc-200 dark:border-zinc-700">
            <RotateCw className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Rotate & Filter
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Rotate orientations in 90° steps and filter odd/even or custom ranges with live match counts.
          </p>
        </div>
      </div>
    </div>
  );
}
