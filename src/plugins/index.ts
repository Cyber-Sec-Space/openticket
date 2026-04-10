import { OpenTicketPlugin } from "../lib/plugins/types"

// Core framework execution target point.
// Plugins should not be bundled in this core repository. The activePlugins array must remain strictly unoccupied
// prior to dynamic external injections via the PluginState Engine or separate distribution architectures.

export const activePlugins: OpenTicketPlugin[] = [];
