'use client';

import { useEffect } from 'react';
import { AlertTriangle, Home, RefreshCw, ServerCrash } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Dashboard Render Error:", error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
      <div className="bg-red-500/10 p-6 rounded-full mb-6">
        <ServerCrash className="w-16 h-16 text-red-500" />
      </div>
      
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">
        System Module Crash
      </h1>
      
      <p className="text-muted-foreground max-w-lg mb-8">
        A critical unhandled exception occurred rendering this interface. If you recently installed a Plugin, the plugin may be structurally corrupt or throwing a fatal render error.
      </p>

      <div className="bg-black/40 border border-red-500/20 text-neutral-300 p-4 rounded-md text-left font-mono text-sm max-w-xl w-full mb-8 overflow-x-auto">
        <p className="font-bold text-red-400 mb-1 flex items-center">
          <AlertTriangle className="w-4 h-4 mr-2" /> Error Signature
        </p>
        <p className="text-xs break-all">{error.message || "Unknown rendering exception"}</p>
        {error.digest && <p className="text-xs text-neutral-500 mt-2">Digest: {error.digest}</p>}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => reset()}
          className="flex items-center justify-center h-10 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Attempt Recovery
        </button>
        
        <Link 
          href="/settings/plugins"
          className="flex items-center justify-center h-10 px-4 py-2 border border-white/10 bg-transparent text-sm font-medium rounded-md hover:bg-white/5 transition-colors"
        >
          Check Plugins
        </Link>
      </div>

      <div className="mt-12 text-xs text-neutral-600">
        If the server is locked in a compilation crash loop, run <code className="text-neutral-400 select-all">npm run plugin:reset</code> in the host terminal.
      </div>
    </div>
  );
}
