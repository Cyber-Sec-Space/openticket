'use client';

import { useEffect } from 'react';
import { AlertTriangle, Home, RefreshCw, ServerCrash, ToyBrick } from 'lucide-react';
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

  const isPluginError = error.name.includes("Plugin") || error.message.includes("Plugin");

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
      <div className={`p-6 rounded-full mb-6 ${isPluginError ? 'bg-orange-500/10' : 'bg-red-500/10'}`}>
        {isPluginError ? (
          <ToyBrick className="w-16 h-16 text-orange-500" />
        ) : (
          <ServerCrash className="w-16 h-16 text-red-500" />
        )}
      </div>
      
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">
        {isPluginError ? "Plugin Engine Crash" : "Internal System Error"}
      </h1>
      
      <p className="text-muted-foreground max-w-lg mb-8">
        {isPluginError 
          ? "A critical unhandled exception occurred within the Plugin Context. The failure stems from external plugin logic, sandboxing boundaries, or malformed plugin data."
          : "An unexpected exception occurred while rendering this interface. The failure stems from application logic, data validation, or infrastructure dependencies."}
      </p>

      <div className={`bg-black/40 border text-neutral-300 p-4 rounded-md text-left font-mono text-sm max-w-xl w-full mb-8 overflow-x-auto ${isPluginError ? 'border-orange-500/20' : 'border-red-500/20'}`}>
        <p className={`font-bold mb-1 flex items-center ${isPluginError ? 'text-orange-400' : 'text-red-400'}`}>
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
        
        {isPluginError ? (
          <Link 
            href="/settings/plugins"
            className="flex items-center justify-center h-10 px-4 py-2 border border-white/10 bg-transparent text-sm font-medium rounded-md hover:bg-white/5 transition-colors"
          >
            Check Plugins
          </Link>
        ) : (
          <Link 
            href="/"
            className="flex items-center justify-center h-10 px-4 py-2 border border-white/10 bg-transparent text-sm font-medium rounded-md hover:bg-white/5 transition-colors"
          >
            <Home className="w-4 h-4 mr-2" /> Return to Dashboard
          </Link>
        )}
      </div>

      {isPluginError && (
        <div className="mt-12 text-xs text-neutral-600">
          If the server is locked in a compilation crash loop, run <code className="text-neutral-400 select-all">npm run plugin:reset</code> in the host terminal.
        </div>
      )}
    </div>
  );
}
