import { OpenTicketPlugin, PluginSdkContext, TicketIncident, TicketVulnerability, TicketComment } from '@openticket/core';
import crypto from 'crypto';

const GitHubIssuesPlugin: OpenTicketPlugin = {
  manifest: {
    id: 'github-issues',
    name: 'GitHub Issues Integration',
    version: '1.2.0',
    description: 'Bi-directionally syncs OpenTicket security incidents with GitHub issues. Supports multiple repositories mapped as distinct Assets.',
  },
  hooks: {
    // ---- Initialization: Create Assets for all configured Repos ----
    onInstall: async (config: Record<string, any>, context: PluginSdkContext) => {
      const reposInput = config['GITHUB_REPOS'];
      if (!reposInput) return;

      const repos = reposInput.split(',').map((r: string) => r.trim()).filter((r: string) => r.length > 0 && r.includes('/'));

      await context.api.initEntity();

      for (const repo of repos) {
        try {
          const existing = await context.api.getAssetByIdentifier(repo);
          if (!existing) {
            await context.api.createAsset(
              `${repo}`,
              'REPOSITORY',
              undefined,
              repo,
              {
                plugin: 'github-issues',
                repo_identifier: repo
              }
            );
            console.log(`[GitHub Issues] Auto-created repository asset for ${repo}`);
          } else {
            console.log(`[GitHub Issues] Validated repository asset for ${repo}`);
          }
        } catch (error) {
          console.error(`[GitHub Issues] Failed to create asset for ${repo}`, error);
        }
      }
    },

    // ---- Push: OpenTicket Incidents to GitHub ----
    onIncidentCreated: async (incident: TicketIncident, config: Record<string, any>, context: PluginSdkContext) => {
      const token = config['GITHUB_TOKEN'];
      const labelsInput = config['ISSUE_LABELS'] || 'security,incident';

      if (!token) return;

      let targetRepo: string | null = null;
      if (incident.assetId) {
         try {
            const assetEntity = await context.api.getAsset(incident.assetId);
            targetRepo = assetEntity?.metadata?.repo_identifier;
         } catch(e) {
            console.error('[GitHub Issues] Cannot resolve asset', e);
         }
      }

      // Backward info struct parsing fallback
      if (!targetRepo && incident.asset?.metadata?.repo_identifier) {
         targetRepo = incident.asset.metadata.repo_identifier;
      }

      if (!targetRepo || !targetRepo.includes('/')) return;

      const [owner, repo] = targetRepo.split('/');
      const labels = labelsInput.split(',').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
      if (incident.severity) labels.push(`severity:${incident.severity.toLowerCase()}`);

      try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: `[Incident] ${incident.title}`,
            body: `### Security Incident Report\n\n**Severity:** ${incident.severity || 'Unknown'}\n**Description:**\n${incident.description || 'No description provided.'}\n\n---\n*Incident ID:* \`${incident.id}\`\n*Reported At:* ${new Date().toUTCString()}`,
            labels: labels
          }),
        });

        if (response.ok) {
          const data = await response.json();
          await context.api.manageIncidentTags(incident.id, `github:${targetRepo}#${data.number}`, 'add');
        }
      } catch (error) {
        console.error('[GitHub Issues] Fatal network error', error);
      }
    },

    // ---- Push: Metadata Sync ----
    onIncidentUpdated: async (incident: TicketIncident, config: Record<string, any>, context: PluginSdkContext) => {
      const token = config['GITHUB_TOKEN'];
      if (!token || !incident.tags) return;

      const githubTag = incident.tags.find((t: string) => t.startsWith('github:'));
      if (!githubTag) return;

      const [targetRepo, issueNumber] = githubTag.substring(7).split('#');
      const [owner, repo] = targetRepo.split('/');

      try {
        const labelsInput = config['ISSUE_LABELS'] || 'security,incident';
        const baseLabels = labelsInput.split(',').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        
        const allLabels = [...baseLabels];
        if (incident.severity) allLabels.push(`severity:${incident.severity.toLowerCase()}`);

        await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
             labels: allLabels,
             state: (incident.status === 'RESOLVED' || incident.status === 'CLOSED') ? 'closed' : 'open'
          }),
        });
      } catch (error) {
        console.error('[GitHub Issues] Error syncing incident update', error);
      }
    },

    onIncidentResolved: async (incident: TicketIncident, config: Record<string, any>, context: PluginSdkContext) => {
      // Re-trigger the universal updater since onIncidentUpdated handles states efficiently.
      await GitHubIssuesPlugin.hooks?.onIncidentUpdated?.(incident, config, context);
    },

    // ---- Push: Comments ----
    onCommentAdded: async (comment: TicketComment, config: Record<string, any>, context: PluginSdkContext) => {
      const token = config['GITHUB_TOKEN'];
      if (!token || !comment.incidentId || comment.content.includes('[GitHub:')) return;

      const incident = await context.api.getIncident(comment.incidentId);
      if (!incident || !incident.tags) return;

      const githubTag = incident.tags.find((t: string) => t.startsWith('github:'));
      if (!githubTag) return;

      const [targetRepo, issueNumber] = githubTag.substring(7).split('#');
      const [owner, repo] = targetRepo.split('/');

      try {
        await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            body: `*OpenTicket Operator Note:*\n\n${comment.content}`
          }),
        });
      } catch (error) { }
    },

    // ---- Push: Vulnerability Disclosures ----
    onVulnerabilityCreated: async (vuln: TicketVulnerability, config: Record<string, any>, context: PluginSdkContext) => {
      const token = config['GITHUB_TOKEN'];
      const labelsInput = config['ISSUE_LABELS'] || 'security,incident';
      if (!token) return;

      try {
        const fullVuln = await context.api.getVulnerability(vuln.id);
        if (!fullVuln || !fullVuln.vulnerabilityAssets || fullVuln.vulnerabilityAssets.length === 0) return;

        const assetEntity = await context.api.getAsset(fullVuln.vulnerabilityAssets[0].assetId);
        const targetRepo = assetEntity?.metadata?.repo_identifier;

        if (!targetRepo || !targetRepo.includes('/')) return;

        const [owner, repo] = targetRepo.split('/');
        const labels = labelsInput.split(',').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        labels.push('vulnerability');

        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: `[Vulnerability] ${vuln.title}`,
            body: `### Security Vulnerability Report\n\n**Severity:** ${vuln.severity || 'Unknown'}\n**CVE:** ${vuln.cveId || 'N/A'}\n**Description:**\n${vuln.description || 'No description provided.'}\n\n---\n*Vulnerability ID:* \`${vuln.id}\``,
            labels: labels
          }),
        });

        if (response.ok) {
           const data = await response.json();
           await context.api.addCommentToVulnerability(vuln.id, `[SYSTEM] Tracked via GitHub Issue: ${targetRepo}#${data.number}`);
        }
      } catch (error) { }
    },

    // ---- Pull: GitHub to OpenTicket ----
    onWebhookReceived: async (req: Request, config: Record<string, any>, context: PluginSdkContext) => {
      const secret = config['WEBHOOK_SECRET'];
      if (!secret) return new Response('Webhook Secret Not Configured', { status: 400 });

      const signature = req.headers.get('x-hub-signature-256') || '';
      const bodyText = await req.text();
      
      const hmac = crypto.createHmac('sha256', secret);
      const digest = `sha256=${hmac.update(bodyText).digest('hex')}`;
      const signatureBuffer = Buffer.from(signature, 'utf8');
      const digestBuffer = Buffer.from(digest, 'utf8');
      if (signatureBuffer.length !== digestBuffer.length || !crypto.timingSafeEqual(signatureBuffer, digestBuffer)) {
        return new Response('Invalid Signature', { status: 401 });
      }

      const payload = JSON.parse(bodyText);
      const event = req.headers.get('x-github-event');

      if (event === 'issues') {
        const match = payload.issue.body?.match(/\*Incident ID:\* `([^`]+)`/);
        const incidentId = match ? match[1] : null;

        if (incidentId) {
           if (payload.action === 'closed') {
              await context.api.updateIncidentStatus(incidentId, 'RESOLVED', 'Automatically resolved via GitHub Issue closure webhook.');
           }
        }
      } else if (event === 'issue_comment' && payload.action === 'created') {
        const commentBody = payload.comment.body;
        const author = payload.comment.user.login;
        const match = payload.issue.body?.match(/\*Incident ID:\* `([^`]+)`/);
        const incidentId = match ? match[1] : null;

        if (incidentId && !commentBody.includes('*OpenTicket Operator Note:*')) {
           await context.api.addComment(incidentId, `[GitHub: @${author}]\n\n${commentBody}`);
        }
      }

      return new Response('Webhook processed', { status: 200 });
    }
  }
};

export default GitHubIssuesPlugin;
