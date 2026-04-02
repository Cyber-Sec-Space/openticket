import { OpenTicketPlugin } from "../lib/plugins/types"

import { slackIntegration } from "./slack-notifier"
import { pagerDutyIntegration } from "./pagerduty"
import { jiraIntegration } from "./jira"
import { teamsIntegration } from "./teams"

// To activate a plugin, merely import it and inject it into this static execution array.
// This design inherently prevents dynamic Webpack unbundling breakages on Next.js Edge topologies.

export const activePlugins: OpenTicketPlugin[] = [
  slackIntegration,
  pagerDutyIntegration,
  jiraIntegration,
  teamsIntegration
];
