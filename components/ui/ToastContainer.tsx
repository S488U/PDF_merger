'use client';

import React from 'react';
import { usePdfStore } from '@/lib/store/usePdfStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = usePdfStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-24 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        let Icon = Info;
        let colorClasses = 'border-blue-200 dark:border-blue-800/60 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          colorClasses = 'border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          colorClasses = 'border-amber-200 dark:border-amber-800/60 bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          colorClasses = 'border-red-200 dark:border-red-800/60 bg-white dark:bg-slate-900 text-red-600 dark:text-red-400';
        }

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 ${colorClasses}`}
          >
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">
              {toast.message}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
