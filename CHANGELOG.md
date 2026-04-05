# Changelog

All notable changes to this project will be documented in this file.

## 0.3.0
### Security
- Fixed a massive Privilege Escalation (PrivEsc) vector inside `/api/incidents` where `REPORTER`s could illegally inject arbitrary `assetId` values to force system-wide SOAR automated quarantines across unowned macro infrastructure.
- Re-architected Brute Force Rate Limiting inside `authorize()` NextAuth backend, shifting from a volatile In-Memory map constraint to a `schema.prisma` DB-synchronized state loop. This totally eradicates Stateless Dissonance, enforcing uniform authentication throttling limits seamlessly across scaled horizontal Kubernetes clusters and multi-threaded environments.
- Patched a Multi-User Concurrency Write Defect within `/api/upload` by replacing temporal `Date.now()` filenames with cryptographically absolute `crypto.randomUUID()` identifiers, stopping identical-millisecond file stream collisions forever.
- Rectified an egregious Privilege Downgrade Vulnerability inside `src/app/(dashboard)/settings` where malicious actors or CSRF intercepts could instantly dismantle Two-Factor Authentication boundaries on an active session. The `disable2FA` pipeline now mandates strict root `<input type="password">` origin re-authentication validations.
- Enhanced BOLA & OOM `take: 5000` memory caps on `/api/export` payload streaming by embedding URL parameter `&skip=` index tracking, unlocking infinite pagination extraction flows for global enterprises without triggering memory crashes.
- Solidified Comment Creation via extreme Inline BOLA verification checking ensuring that malicious actors cannot forge Server Action payloads pushing discussions to unowned tickets.
- Upgraded `nodemailer` to `^8.0.4` to remediate a known CRLF Injection vulnerability (CWE-93 / SNYK-JS-NODEMAILER-15790064) through the `envelope.size` parameter.
- Closed a Critical Cloud Storage Insecure Direct Object Reference (IDOR) by forcibly evicting all evidence attachments out of `public/uploads` into a hidden `private` volume, protected by a zero-trust BOLA `/api/files` streaming gateway blocking unauthorized traversal attempts.
- Remediated Broken Object Level Authorization (BOLA) and Application Logic DoS within `/api/export`, enforcing strict `take: 5000` memory ceilings and restricting generic `REPORTER`s to dumping only natively-owned entity graphs rather than the entire enterprise index.

### Changed
- Concurrency Optimization: Upgraded HTML5 Desktop Notification layer shifting away from overlapping `HTTP Polling` streams towards highly-efficient `Server-Sent Events (SSE)`.

## 0.2.0
### Added
- Plugin Management: Expanded Plugin Store ecosystem by introducing native `PagerDuty Escalator`, `Jira Cloud Synchronization`, and `Microsoft Teams Webhook` extensions, powering dynamic M2M response mechanisms and SOC collaboration.
- Plugin Management: Deployed a `/settings/plugins` interface linking the static Plugin Registry directly to a dynamic PostgreSQL `PluginState` table. Administrators can now visually Install, Uninstall, and Configure Slack credentials via UI without committing ENV variables.
- Extensibility (Server/Client): Engineered a static-registry Plugin Architecture (`src/lib/plugins/hook-engine`) capable of isolating logic using an automated EventBus (`onIncidentCreated`, `onAssetCompromise`, `onIncidentResolved`).
- Integrations: Rolled out the first-party `slack-notifier` plugin as a live pilot demonstrating hook interception and Dashboard Web-Widget injection.
- Notifications (Web): Engineered a global HTML5 Browser Notification polling architecture capable of pushing OS-level desktop alerts (Critical Incidents, Asset Compromise, Assignments, and Resolutions) to active operators across background tabs.
- Preferences: Deployed a granular Notification Matrix in the `/settings` user panel allowing operators to strictly configure which telemetry events trigger desktop-level popups.
- Identity Verification: Deployed an impenetrable Registration Wall demanding cryptographic link verification (`VerificationToken`) dispatched directly via SMTP before granting UI access, effectively destroying phantom account generation vectors.
- Self-Service Recovery: Engineered an out-of-band `PasswordResetToken` pipeline permitting operators to rescue lost credentials independently. Includes robust Anti-Enumeration protections on the `/forgot-password` schema to mask valid topological targets.
- Notification (SMTP): Expanded Notification triggers adding 4 specific system-defined conditionals: `Asset Compromise`, `New Vulnerability`, `Ticket Resolution`, and `Operator Joined`, enabling fully configurable global delivery streams.
- Security: Migrated from single-role RBAC to Array-based Multi-Role Access Control supporting blended organizational privileges (e.g., users can be `SECOPS` and `ADMIN` simultaneously).
- Identity Mapping: Introduced new `API_ACCESS` privilege tier allowing entities to mint non-interactive automation tokens.
- M2M Authentication: Built Machine-to-Machine API token infrastructure with cryptographic `SHA-256` storage handling Native Bearer authentications across SOAR/CI-CD interfaces.
- UI: Reconstructed User Management Dashboard allowing checkbox-based matrix selections for multi-role alignments and integrated a dedicated Token management panel (`/settings/tokens`).
- Analytics: Enriched Main Dashboard with advanced SecOps KPI metrics including 14-days Mean Time To Resolve (MTTR), SLA Compliance tracking cards, and dynamic `incBreached` lines projected on the generic 14-day Detection Trend chart.
- Analytics: Instantiated 7-day retrospective snapshot tracking across top-level Metric Cards dynamically visualizing `Delta %` (▲/▼) volume drifts for active incidents and vulnerabilities.
- Dashboard: Refactored generic "Recent Declarations" into a highly personalized, RBAC-filtered "Personal Case Board" with Server-Side Pagination supporting dynamic active-ticket triaging workflows.
  - Added filter control UI (`?filter=all|assigned|reported|unassigned`) allowing operators to instantly pivot context views.
- Attachments: Integrated local binary storage capabilities `/api/upload` linked to Incidents and Vulnerabilities acting as centralized execution evidence.
- SLA Management: Enabled strict dynamic `targetSlaDate` bindings with UI shifting indicators marking overdue constraints.
- Notification (Webhook): Configured external SOC integration triggers capable of posting payload states directly into Discord/Slack formats.
- Data Delivery: Surfaced a high-speed `/api/export` comma-separated report compiler mapped to individual query scopes.
- UI: Reconstructed Index dashboards embedding Next.js `searchParam` pagination controllers & advanced filters preserving performance on large structural datasets.
- Schema: Adjusted native `Prisma ERD` model synchronizing `SystemSetting`, `Attachment` properties alongside `Architecture.md` representations.

- IAM Governance: Launched dedicated User Profiling details page `/users/[id]` encapsulating Audit Logs, Evidence Matrix, and SLA assignments.
- IAM Governance: Refactored User Dashboard to utilize headless Shadcn `Dialog` popups for rendering heavy data arrays to maintain core interface sleekness and focus.
- IAM Scalability: Upgraded User Dashboard `/users/[id]` with independent server-side pagination matrices (`?auditPage`, `?filePage`, `?incPage`) guaranteeing zero-crash rendering on operator telemetry payloads exceeding 100,000+ rows.
- IAM Governance: Integrated Bulk Operations Dashboard supporting massive multi-operator suspension, deletion, and role escalation natively.
- IAM Governance: Re-architected `onDelete: SetNull` Database relationships globally preserving Evidence and Incident contexts mapping back to `Deleted Operators`.
- IAM Governance: Deployed `isDisabled` real-time JWT interceptors terminating active attacker sessions instantly upon Account Suspension.

### Fixed
- Remediated Broken Object Level Authorization (BOLA) in `api/assets` by proactively isolating `REPORTER` users from horizontal enterprise topology scanning, terminating internal threat visibility vectors.
- Corrected logic desync within `api/incidents` where Zero-Day `CRITICAL` payloads failed to trigger synchronous SOAR Auto-Quarantine heuristics via direct API creation.
- Fortified backend generic physical deletion nodes inside `incidents/[id]` and `upload.ts` with extreme native `path.resolve` boundary lockdowns, completely sealing `.env` and DB Path Traversal vulnerabilities from compromised uploads.
- Introduced a hard Prisma-driven rate-limiting matrix within `System Settings` mitigating automated credential stuffing, infinite logic looping, and TOTP traversal attempts natively within `login` Server Actions.
- Fortified public Registration API with generic return codes preventing `Enmueration Attacks` and implemented constant-time logic blocking to massively throttle App-level Database DoS injections.
- Enforced hard `take: 100` ceiling bounds globally across naked Prisma REST endpoints (`/api/incidents`, `/api/assets`) sealing Out of Memory (OOM) API crashing vulnerabilities under massive scalability.
- Enforced strict cryptographic MIME / Extension Allowlist (.png, .json, .log, etc) inside `uploadAttachment` entirely mitigating Stored XSS payloads (.html, .svg) delivered through fake evidence files.
- Injected strict physical Node `fs.unlinkSync()` routines executing natively against `/public/uploads` preceding Prisma Cascades to seal silent Storage / Drive Exhaustion DoS vulnerabilities during Incident, Vulnerability, and User Profile permanent deletions.
- Secured `uploadAttachment` Server Action with rigorous RBAC verification logic protecting against Broken Object Level Authorization (BOLA) and entity spoofing.
- Resolved fatal Prisma schema mismatch defect within `[PATCH] /api/incidents/[id]/route.ts` REST API, avoiding unhandled 500 exceptions during assignment mutations.
- Migrated legacy `middleware.ts` to `proxy.ts` to resolve fatal Turbopack parsing crashes (`TypeError: Cannot read properties of undefined (reading 'modules')`) and `404` errors under Next.js 16.2.1 conventions.
- Moved and redesigned "Digital Evidence" components into right-side control column sidebars for Incidents and Vulnerabilities to enhance form aesthetics and layout.
- Fixed bug where Investigation Logs failed to post due to a missing `type="submit"` attribute on the Radix/Base-UI button element binding.
- Resolved Next.js compile error where `(dashboard)` pages conflicted with legacy root pages by clearing out duplicate component files in `/assets`, `/incidents`, and `/page.tsx`.
- Fixed Next.js 15 dynamic routing issue where `params` was not being handled as a Promise inside the incident detail view.
- Adjusted Prisma JSON typing for server action FormData to prevent compile-time type mismatches.

### Added
- Analytics: Deepened Dashboard metrics extracting independent Vulnerability telemetry via 2 additional structural stat grids (6-node total).
- Analytics: Engineered dual `Recharts` vectors mapping global vulnerability states—a high-contrast Donut Chart depicting resolution lifecycles, and a specialized Radar Spiderweb modeling CVSS severity threat distribution.
- Analytics: Refactored Main Dashboard visual density, introducing a parallel `Recent Declarations` activity feed resolving blank spaces on generic loads.
- Analytics: Upgraded React Recharts primitives utilizing SVG `<linearGradient>` and custom HTML tooltips, producing a highly polished premium aesthetic.
- Security: Bound globally-configurable Two-Factor Enforce directives natively into the NextAuth resolution stream restricting credentials entirely if misaligned.
- UI: Erected dedicated `/register` endpoints dynamically exposing public enrollment paths governed by Administrative registry flags.
- Management: Deployed System Configuration framework (Phase 12) featuring a global `SystemSetting` singleton database entity.
- UI: Introduced a restrictive `/system` boundary dashboard accessible solely to Admin personnel for managing Registration, Role assignment mapping, and Universal 2FA enforcement flags.
- Security: Implemented Phase 11 Two-Factor Authentication (TOTP) pipeline within NextAuth Credentials provider.
- UI: Added Settings Identity Preferences panel rendering Dual-Phase QR code setups securely leveraging otplib algorithms.
- UI: Rectified visual margin collapsing on `Apply Layout` boundaries and refined `Enable 2FA` button text legibility.
- Core: Augmented Prisma schemas with TwoFactorSecret properties, enforcing robust login step-ups actively preventing credential stuffing.
- Security: Implemented a proprietary `<ConfirmForm>` react client boundary wrapping all destructive server actions (e.g. Terminate Incident, Execution modifications) with strict browser-level intent validation checks.
- Quality of Life: Standardized the default global tracking prefixes across index tables and detail queries from `TKT-` (Ticket) to `INC-` (Incident) fully embracing SecOps nomenclature.
- Phase 4 Interface Revamp: Exchanged all visually clashing OS-native HTML drop-down menus (`<select>`) globally with custom-styled headless Shadcn `<Select>` elements to standardize the OpenTicket Glassmorphic premium motif across MacOS/Windows variants.
- Phase 4 Core Expansions (Multi-Assignee Support): Transitioned `Incident` relational parameters dropping singular restrictive `assigneeId` vectors to power scalable Many-To-Many (M2M) `assignees` database array structures resolving bottleneck IR deployments.
- New Client Element: Minted the `MultiAssigneePicker` component; an elite popover logic block utilizing Lucide arrays empowering execution controllers to pick unlimited user groupings naturally transmitting native REST Form payloads.
- Phase 3 Schema Expansion: Orchestrated Prisma migrations injecting native `IncidentType` Enums spanning Malware, Phishing, and Breach categorizations.
- Re-architected the `Incident Intelligence` display panels implementing highly-legible `Key/Value` UI grids explicitly rendering definitions and categories, resolving prior overly-simplistic layouts.
- Exposed `IncidentType` parameters natively within Next.js Server Action instantiation forms (`/incidents/new`) and Edit Detail modes.
- Phase 2 Incident Features: Introduced a global text Search capability merging Title, Content, and ID validations via URL parameters.
- Unified Incident Defense Timelines blending discrete system AuditLogs (triage changes/assignments) seamlessly with user communications.
- Explicit Ticket Title and Description editability secured via native UI controls for authorized members.
- Hard Permanent Incident Deletion mechanisms gated exclusively to Administrative superusers.
- Implemented real-time Assignment mechanisms allowing SecOps and Admin users to assign personnel and triage Severity within Incident detailed views.
- Empowered Incident listing grids with resilient `searchParams` URL filtering combinations.
- Built native Pagination support (10 items / page) for high-scale incident metric tracking without client-side React hydration drag.
- Complete UI/UX aesthetic overhaul implementing a premium, sleek dark mode tailored for Cybersecurity usage.
- Global application Layout integration employing a dynamic left-pane Sidebar for streamlined navigation.
- Glassmorphism UI tokens, neon pulse animations, and immersive data grid layouts across all operational dashboards.
- Created OpenTicket MVP core Next.js project.
- Implemented Postgres via Prisma ORM schemas for Account, Session, User, VerificationToken, Incident, Asset, Comment, AuditLog.
- Integrated Auth.js v5 (NextAuth) with a Credentials provider.
- Configured robust RBAC checking within API routers and Server Actions.
- Set up Shadcn UI component suite with default UI elements.
- Implemented UI views for: Main Dashboard, Incident Listing, Incident Creation, Incident Workflow Viewing, and Assets List.
- Configured Dockerized Database setup script (`docker-compose.yml`).
- Initialized basic `jest` and tests for basic utility functions, ensuring core module coverage.
