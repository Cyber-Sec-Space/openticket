import React from "react"
import { db } from "@/lib/db"
import { activePlugins } from "@/plugins"
import { parsePluginConfig } from "@/lib/plugins/crypto"
import { createPluginContext } from "@/lib/plugins/sdk-context"
import { OpenTicketPluginUI } from "@/lib/plugins/types"

interface PluginEngineContextRendererProps {
  /** The specific array of UI hook to seek inside plugin.ui */
  hookType: keyof OpenTicketPluginUI
  
  /** 
   * The contextual payload to supply to the injected widget.
   * e.g., { incident: existingIncidentData } 
   */
  payload?: Record<string, any>
}

/**
 * An asynchronous Server Component designed to interrogate the Plugin Architecture 
 * and inject context-aware UI widgets dynamically during App Router render cycles.
 */
export async function PluginEngineContextRenderer({ hookType, payload = {} }: PluginEngineContextRendererProps) {
  // #region agent log
  fetch('http://127.0.0.1:7451/ingest/93e51d37-4838-4ded-8cc4-6cd156753e67',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'33383f'},body:JSON.stringify({sessionId:'33383f',runId:'initial',hypothesisId:'H3',location:'src/components/plugins/plugin-context-renderer.tsx:entry',message:'PluginEngineContextRenderer render start',data:{hookType,hasPayload:!!payload && Object.keys(payload).length > 0},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  // Query all actively running plugins in the database
  const activePluginStates = await db.pluginState.findMany({ 
    where: { isActive: true },
    select: { id: true, configJson: true }
  });

  const injectedElements = await Promise.all(
    activePlugins.map(async (plugin) => {
      // Confirm the plugin is enabled in the database
      const state = activePluginStates.find((s) => s.id === plugin.manifest.id);
      if (!state) return null;

      // Extract the target hook components
      const targetHookArray = plugin.ui?.[hookType] as React.ComponentType<any>[] | undefined;
      if (!targetHookArray || !Array.isArray(targetHookArray) || targetHookArray.length === 0) {
        return null;
      }

      // Initialize execution context cryptographically
      let config: Record<string, any> = {};
      try {
        config = state.configJson ? parsePluginConfig(state.configJson) : {};
      } catch (error: any) {
        // #region agent log
        fetch('http://127.0.0.1:7451/ingest/93e51d37-4838-4ded-8cc4-6cd156753e67',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'33383f'},body:JSON.stringify({sessionId:'33383f',runId:'initial',hypothesisId:'H3',location:'src/components/plugins/plugin-context-renderer.tsx:parseConfig:error',message:'plugin config parse failed during render',data:{pluginId:plugin.manifest.id,errorMessage:error?.message || 'unknown'},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        throw error;
      }
      
      // We don't necessarily want to init API contexts for every plugin on every render if it's heavy,
      // but createPluginContext uses a memory cache, so it's optimized.
      const context = await createPluginContext(plugin.manifest.id, plugin.manifest.name);
      // #region agent log
      fetch('http://127.0.0.1:7451/ingest/93e51d37-4838-4ded-8cc4-6cd156753e67',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'33383f'},body:JSON.stringify({sessionId:'33383f',runId:'initial',hypothesisId:'H4',location:'src/components/plugins/plugin-context-renderer.tsx:pluginWidget:ready',message:'plugin widget ready for render',data:{pluginId:plugin.manifest.id,hookType,widgetCount:targetHookArray.length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      return (
        <React.Fragment key={plugin.manifest.id}>
          {targetHookArray.map((WidgetComponent, idx) => (
             <React.Suspense fallback={<div className="h-24 bg-black/20 animate-pulse rounded-xl border border-white/5" />} key={`${plugin.manifest.id}-${hookType}-${idx}`}>
               <WidgetComponent 
                 api={context.api} 
                 config={config} 
                 {...payload} 
               />
             </React.Suspense>
          ))}
        </React.Fragment>
      );
    })
  );

  return <>{injectedElements}</>;
}
