'use client';

import React, { useState, useRef } from 'react';
import { usePdfStore } from '@/lib/store/usePdfStore';
import { UploadCloud, FileText, Loader2 } from 'lucide-react';

export function DropZone() {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addSourceFiles, isProcessing, processingMessage } = usePdfStore();

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const filesToLoad: { file: File; buffer: ArrayBuffer }[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        const buffer = await file.arrayBuffer();
        filesToLoad.push({ file, buffer });
      }
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

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`relative w-full rounded-2xl border-2 border-dashed p-6 sm:p-10 transition cursor-pointer text-center flex flex-col items-center justify-center gap-3 ${
        isDragOver
          ? 'border-blue-500 bg-blue-500/10 scale-[1.005]'
          : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-white/40 dark:bg-slate-900/40'
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

      <div className="w-14 h-14 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
        {isProcessing ? (
          <Loader2 className="w-7 h-7 animate-spin" />
        ) : (
          <UploadCloud className="w-7 h-7" />
        )}
      </div>

      <div>
        <h3 className="text-base font-semibold">
          {isProcessing ? processingMessage || 'Processing files...' : 'Click or drop PDF files here'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Supports multiple PDFs. All operations run locally and quickly in your browser.
        </p>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800/60">
          <FileText className="w-3 h-3" /> PDF format
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800/60">
          Fast & Private
        </span>
      </div>
    </div>
  );
}
