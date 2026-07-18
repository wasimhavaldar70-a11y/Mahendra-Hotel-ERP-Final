'use client';

import { ShieldAlert } from 'lucide-react';

interface ErrorStateProps {
  error: Error;
  reset: () => void;
  title?: string;
}

export default function ErrorState({ error, reset, title = 'Component Error' }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-slate-50 border border-slate-100 rounded-xl text-center space-y-4">
      <div className="p-3 bg-red-50 text-red-500 rounded-full">
        <ShieldAlert className="w-8 h-8" />
      </div>
      
      <div className="max-w-sm space-y-1">
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        <p className="text-sm text-slate-500">
          An unexpected error occurred while loading this section.
        </p>
      </div>

      {error.message && (
        <pre className="text-left w-full max-w-md bg-slate-900 text-slate-300 text-xs font-mono p-3 rounded-lg overflow-x-auto border border-slate-800 max-h-32 break-all">
          {error.message}
        </pre>
      )}

      <button
        onClick={() => reset()}
        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-md shadow-blue-500/10"
      >
        Retry Segment
      </button>
    </div>
  );
}
