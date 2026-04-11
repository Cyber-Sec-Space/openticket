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
      const config = state.configJson ? parsePluginConfig(state.configJson) : {};
      
      // We don't necessarily want to init API contexts for every plugin on every render if it's heavy,
      // but createPluginContext uses a memory cache, so it's optimized.
      const context = await createPluginContext(plugin.manifest.id, plugin.manifest.name);

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
