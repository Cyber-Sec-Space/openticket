import React from "react"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { activePlugins } from "@/plugins"
import { parsePluginConfig } from "@/lib/plugins/crypto"
import { createPluginContext } from "@/lib/plugins/sdk-context"

export default async function PluginDynamicPage({ 
  params 
}: { 
  params: Promise<{ pluginId: string; slug?: string[] }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const { pluginId, slug } = await params;
  
  // Reconstruct the requested sub-route string
  // If no slug is provided, we assume the root route for this plugin's pages.
  const routeUrl = slug ? slug.join('/') : '';

  // 1. Verify existence of Plugin
  const plugin = activePlugins.find((p) => p.manifest.id === pluginId);
  if (!plugin) {
    return notFound();
  }

  // 2. Verify Plugin State in DB
  const state = await db.pluginState.findUnique({
    where: { id: pluginId }
  });

  if (!state || !state.isActive) {
    // Plugin must be active to serve pages
    return notFound();
  }

  // 3. Find the corresponding Page in the Plugin UI Manifest
  const pageDefinition = plugin.ui?.pages?.find((p) => p.routeUrl === routeUrl);
  if (!pageDefinition) {
    return notFound();
  }

  // 4. Extract configuration and Context
  const config = state.configJson ? parsePluginConfig(state.configJson) : {};
  const context = await createPluginContext(plugin.manifest.id, plugin.manifest.name);

  // 5. Render target component securely
  const PluginPageComponent = pageDefinition.component;

  return (
    <div className="w-full h-full p-6 md:p-8 animate-fade-in-up">
      <React.Suspense fallback={<div className="h-48 bg-black/20 animate-pulse rounded-xl border border-white/5" />}>
        <PluginPageComponent 
          api={context.api} 
          config={config} 
          // Injecting slug and session as handy utilities for advanced plugins natively
          routeSlug={slug}
          session={session}
        />
      </React.Suspense>
    </div>
  )
}
