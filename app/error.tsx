'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error using our console or telemetry logger
    console.error('Unhandled Client-Side Error Boundary Caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-500">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Something went wrong</h2>
          <p className="text-sm text-slate-400">
            An unexpected error occurred in StayDesk. Our team has been notified.
          </p>
        </div>

        {error.message && (
          <div className="text-left bg-slate-950/50 rounded-lg p-3 border border-slate-800 text-xs font-mono text-slate-400 max-h-32 overflow-y-auto break-all">
            {error.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors border border-slate-600"
          >
            Reload Page
          </button>
          <button
            onClick={() => reset()}
            className="flex-1 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-lg shadow-blue-500/20 text-white"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
