import { OpenTicketPlugin } from "@/lib/plugins/types";

export const jiraIntegration: OpenTicketPlugin = {
  manifest: {
    id: "jira-sync-01",
    name: "Jira Cloud Synchronization",
    description: "Two-way structural synchronization with Jira. Generates comprehensive Jira issues from OpenTicket vulnerabilities, assigning appropriate priority codes.",
    version: "2.0.0"
  },
  hooks: {
    onIncidentResolved: async (incident, config) => {
      // Mocked Jira API call
      console.log(`[Jira Plugin] Closing linked ticket for incident ${incident?.id}`);
    }
  }
};
