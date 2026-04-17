import externalwebhooktoticketPlugin from "./external-webhook-to-ticket";
import { OpenTicketPlugin } from "../lib/plugins/types"

// Core framework execution target point.
// Plugins should not be bundled in this core repository. The activePlugins array must remain strictly unoccupied
// prior to dynamic external injections via the PluginState Engine or separate distribution architectures.

const safeRequire = (modFn: () => any) => {
  try {
    return modFn().default;
  } catch (err) {
    console.error("[Plugin System] Critical Isolation: A plugin threw an exception during initialization and was safely contained.", err);
    return null;
  }
};

export const activePlugins: OpenTicketPlugin[] = [
  externalwebhooktoticketPlugin,]
