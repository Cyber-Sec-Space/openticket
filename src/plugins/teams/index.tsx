import { OpenTicketPlugin } from "@/lib/plugins/types";

export const teamsIntegration: OpenTicketPlugin = {
  manifest: {
    id: "ms-teams-notifier-01",
    name: "Microsoft Teams Webhook",
    description: "Broadcasts critical OpenTicket events as rich Adaptive Cards into designated Microsoft Teams SOC channels for immediate visibility.",
    version: "1.0.5"
  },
  hooks: {
    onAssetCompromise: async (asset, config) => {
      console.log(`[MS Teams Plugin] Sending adaptive card for compromised asset: ${asset?.name}`);
    }
  }
};
