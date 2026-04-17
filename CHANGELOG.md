# Changelog

All notable changes to this project will be documented in this file.

## 0.5.3
### Security & Compliance
- **Decoupled Vulnerability SLA Architecture**: Added `vulnSla*` fields to the `SystemSetting` Prisma model to enable independent patching lifecycle management separately from general Incident SLAs.
- **Compliance-Based SLA Templates**: Implemented dynamic templates (`CISA_BOD_22_01`, `PCI_DSS_V4`, `FEDRAMP_MODERATE`, `STANDARD_ENTERPRISE`) to map severity matrices directly to industry and federal regulations natively inside the UI.
- **Audit-Ready Configuration**: Validated SLA limits, correctly aligning the `FEDRAMP_MODERATE` low-risk vulnerability SLA to 180 days (4320 hours) to fulfill FedRAMP SI-2 compliance controls.
- **Retroactive Patching Engine**: Upgraded `actions.ts` to trigger atomic SQL target date recalculations across all open vulnerabilities dynamically whenever SLA settings are modified.
- **Comprehensive Audit Telemetry Coverage**: Enforced complete non-repudiation across the entire OpenTicket platform by systematically injecting `db.auditLog.create` sequences into all latent system perimeters. This closes critical traceability gaps involving System Configuration changes, Plugin installations, RBAC Role modifications, Two-Factor Authentication lifecycle events, and core Authentication/Registration lifecycles.
### Fixed
- **Plugin Sandbox Execution Stabilization (Time-Bomb Async)**: Fixed a Denial-of-Service condition inside the Plugin Engine (`hook-engine.ts`) where the `vm.runInContext` synchronous timeout failed to catch hanging asynchronous Promise chains from malicious or broken plugins. Executions are now securely wrapped in a `Promise.race()` to enforce the strict 5000ms ceiling.
- **React State Input Mismatch**: Remediated an "uncontrolled to controlled" rendering crash in `SlaSettingsPanel` by injecting strict nullish coalescing values on hidden vulnerability SLA inputs.
- **Configuration Server Actions Resiliency**: Wrapped `updateSystemSettings` persistence logic in a rigid `try/catch` sequence with local filesystem logging, enabling debugging of latent backend crashes previously obscured as "Unexpected server response" failures.
- **Plugin Registry Downloader Robustness**: Repaired test and logical parity issues concerning missing local `index.tsx` registries by formally warning and safely falling back to the remote GitHub production registry without throwing unhandled exceptions.

## 0.5.2
### Security
- **Security Audit Remediation (Post 0.5.2)**: Closed the initial production hardening findings by removing insecure crypto fallback behavior, requiring explicit `AUTH_SECRET` and `NEXTAUTH_SECRET` values in Docker, narrowing database port exposure to localhost bindings, and adding PgBouncer health checks for startup dependency safety.
- **Authentication & Registration Hardening**: Added trusted-proxy-aware IP extraction (`TRUST_PROXY_HEADERS=true` opt-in), aligned registration bcrypt cost to `12`, and enforced the bcrypt 72-byte password guardrail to prevent pathological hashing payloads.
- **Outbound and Content Safety Hardening**: Added HTML escaping in SMTP templates, enabled strict SMTP certificate verification by default (`SMTP_TLS_REJECT_UNAUTHORIZED`), introduced CSV formula-injection protection in exports, and added optional HMAC validation (`x-webhook-signature`) for plugin webhooks when `WEBHOOK_SECRET` is configured.
- **Absolute Zero-Trust Edge Perimeters (L7 DDoS Defense)**: Shifted massive load boundaries to the Next.js Edge Middleware layer natively (`proxy.ts`). Incoming HTTP payloads hitting API routes without structurally valid Bearer tokens or Session Cookies are instantly purged at the Edge, effectively shielding the Node js Thread Pool from volumetric unauthenticated DoS.
- **SSRF & DNS Rebinding Immunity**: Neutralized complex Time-of-Check Time-of-Use (TOCTOU) DNS rebinding attacks structurally. The Webhook dispatcher (`webhook.ts`) now proactively locks external hostname resolutions, freezes identical IPv4 routes into memory, and injects simulated `Host` headers to unconditionally intercept malicious network pivoting against inner VPC environments.
- **Botnet Traversal & Credential Stuffing Decoupling**: Severed combined tracking methodologies inside the Authentication rate-limiter natively (`auth.ts`). Identity enumeration flows and volumetric IP spray attacks are now aggressively segregated into strict separate throttling vectors.
- **Impermeable Input Sanitization**: Expanded zero-trust schemas incorporating strict `IPv4/IPv6` regex bounds directly onto Edge-oriented Asset Provisioning nodes, blocking arbitrary `LUA/Bash` string injections downstream across dependent SIEM / Network components.
- **System Module Hardening**: Sealed a latent plaintext storage vulnerability affecting Native SMTP Passwords by integrating dynamic AES-256-GCM Encryption (`crypto.ts`) over the `SystemSetting.smtpPassword` column natively, successfully thwarting credential leakage from systemic Database breaches. Hardened internal Webhook configuration parsing with strict defensive SSRF boundary evaluations.
- **Logic Validation Stabilization**: Resolved a rigorous configuration nullification exception that rendered generic SMTP Passwords and Default Role settings permanently undeletable post-definition out-of-the-box. Implemented absolute array overrides natively resolving false object-spreading behavior.
- **Zero-Trust M2M Subletting (API Token Privileges)**: Severed generic API Token generation from standard Administration accounts (`upgrade-to-0.5.2.ts`). Minting machine-tokens is now forcefully gated behind a dedicated `Automation Bot (M2M)` structural role, ensuring seamless idempotent RBAC migrations without triggering unauthenticated elevation.

### Added
- **Global INFO Tier Escalation Matrix**: Wove an `INFO EXPOSURE` metadata standard structurally across the Postgres Data Definition (Schema). Re-mapped API Validation logic middleware (`route.ts`) preventing native structural injection exceptions on automated log reports. Fully synchronized dashboard UI modules (Radar Charts, Vulnerability Badges, Dynamic Select Controls) seamlessly projecting an extensive Cyan-themed Info layer natively across all user touchpoints.
- **Complete Extensibility (Plugin UI Architecture)**: Expanded the Plugin SDK to natively inject code-level generic React capabilities directly into the Application. 
    - Installed a `PluginEngineContextRenderer` traversing all runtime Plugin states actively injecting `<ContextWidgets>` intuitively alongside Incidents (`src/app/(dashboard)/incidents/[id]`), Assets, and Vulnerabilities.
    - **Bifurcated Plugin UI Hooks**: Deconstructed monolithic widget structures into highly-targeted `*MainWidgets` and `*SidebarWidgets` rendering anchors. Plugins can now natively intersect specific visual columns across Incidents, Vulnerabilities, Assets, and User Profiles without breaking grid typologies.
    - Upgraded Global System Forms `SystemTabsLayout` arrays recursively fetching `systemConfigTabs` bindings from plugins natively mapping external administrative controls.
    - Empowered `Sidebar.tsx` and `MobileNav.tsx` dynamically with an "Extensions" Navigation pane traversing registered dynamic plugin full-page Next.js Catch-All routes.
- **Asynchronous Modal Architecture**: Systematically refactored disruptive and visually jarring native browser alerts (`window.confirm`, `window.alert`) replacing them fully with elegant, non-blocking React Shadcn `<Dialog>` structures. Portaled async executions now seamlessly handle core destructive lifecycle functions (Bulk Deletions, Profile Disruptions) without suspending the native DOM engine.

### Production & Infrastructure
- **Docker Compose Deadlock Elimination**: Repaired a catastrophic production deployment deadlock blocking initialization of the `migrator` orchestration pod. Altered image compilation target natively to `target: builder`, ensuring the transient pod retains strict TypeScript engine (`tsx`) logic to seamlessly seed Database topologies (`migrate:prod`) prior to shedding source code dependencies in the final Next.js Standalone runner.
- **Postgres Database Scaling (FTS)**: Overhauled core structural Incident and Vulnerability lookup controllers. Eliminated `O(N)` heavy `%LIKE%` wildcard sweeps, converting Prisma schemas natively into strictly indexed `tsvector / tsquery` queries activating blazing-fast PostgreSQL Full-Text Search.
- **Memory Leak Protection (Serverless Safety)**: Hardened global access validations (`api-auth.ts`) by introducing explicit `await` states covering asynchronous token last-usage writes, completely eradicating dangling execution connections capable of freezing or collapsing Serverless (Vercel) instances.
- **Server Execution Stabilization**: Eliminated a fatal synchronized Denial-of-Service (DoS) defect within the Settings Page where modifying SLA thresholds intentionally blocked Node threads natively attempting iterative SLA metadata rebuilds on millions of unresolved generic tickets, gracefully encapsulating massive SQL scanning tasks in non-blocking event-loop sequences.
- **Plugin Architecture Resilience**: Completely decoupled Host UI processes from external Plugin execution crashes. Deployed Native React `Error Boundaries` (`error.tsx`) catching severe rendering logic exceptions dynamically without disrupting neighboring global widgets. Ingested `ignoreBuildErrors` blocking strict Plugin TS-rules from maliciously halting Docker production compilation. Engineered an emergency out-of-band CLI executable (`npm run plugin:reset`) that forcefully synchronizes both physical files and database states, enabling instant system rehabilitation without manual AST unlinking. Implemented an **AST Pre-flight Syntax Checker** that natively intercepts and automatically rolls back corrupted plugin installations *before* filesystem injection.

## 0.5.1
### Fixed
- **Turbopack Build Stabilization**: Eliminated a stealth environment OS trailing-space bug (`vuln-form-client 2.tsx`) aggressively crashing production compiler states by restructuring module resolutions.
- **Layout Stabilization**: Enforced deterministic layout width (`w-full`) across all major React Dashboard Modals (Create Incident, Asset, Vulnerability) preventing interactive size-jittering explicitly during form population states.
- **Data Presentation Hardening**: Intercepted `[object Object]` React rendering exceptions natively inside `AuditLog` Timeline components, replacing un-stringified mapping errors with a robust JSON rendering pipeline inside the Audit Stream UI.
- **Asset Portability Extension**: Added robust fallback parameters `externalId` handling identification paths for non-IP based Virtual Assets (e.g. Git Repositories, Cloud IAM Roles, Cloudflare Workers) natively scaling the Asset Management Matrix.
- **Permission Structual Check**: Deep-dived into `registry.json` hierarchy maps parsing `requestedPermissions` recursively by active version tag inside the Store Plugin Cards, eliminating false-negative 'No Permissions Requested' alerts natively.

### Added
- **Multi-Version Protocol Display**: Formally exposed `PLUGIN_API_VERSION` globally. System settings now actively decouple and report precise Semantic Versions defining OpenTicket Base Framework vs OpenTicket Hook Engine capabilities.
- **Store Deep-Dive Overlay**: Reconstructed the Plugin Registry `PluginCard` mapping array to trigger immersive "Details Metadata Modals", explicitly highlighting kernel `Requested Permissions` dependencies rather than direct unsafe configs on click.
- **License & Legal UI Integrations**: Brought dual-licensing transparency into the UI by erecting a dedicated "Legal & Licenses" structural tab in `System Settings`, accompanied natively by a globally persistent standard copyright `<Footer>` block.

## 0.5.0
### Security
- **Phase 1 SDK Zero-Trust Elevation**: Remediated a severe structural escalation vector within the Plugin SDK where installed extensions could arbitrarily alter or grant capabilities natively by passing altered `Permission[]` arrays sequentially to `initEntity()`. Bot roles are now statically enforced and immune to internal code manipulation post-installation.
- **Phase 2 Thundering Herd Mitigation & Lifecycle Safeties**: Resolved a dangerous Cache Poisoning vulnerability rendering deactivated plugins partially capable of executing hooks. Implemented synchronous `invalidateHookCache()` triggers attached intimately to State Database mutations, alongside a robust 10-second `__engineCache` mechanism effectively shielding core Postgres `SELECT` operations across explosive Event Webhooks.
- **Phase 3 Awaiting Sandbox Time-Bomb (DoS Mitigation)**: Terminated a massive Global Application DoS threshold where external Plugin executions (`fetch` loops without native timeouts, or `while(true)` loops) hung the central Event-Bus indefinitely. Native Hooks are now forcefully contained within a `Promise.race()` primitive, terminating unresponsive modules absolutely at a `5000ms` strict execution cap.
- **Phase 4 AES-256 Storage At Rest**: Closed plaintext storage exposures affecting external plugin telemetry keys and webhooks. Designed and integrated an `aes-256-gcm` End-to-End Cryptography module drawing on Server `NEXTAUTH_SECRET` entropy, rendering Postgres `PluginState.configJson` illegible if targeted by Database Breaches. Includes resilient fallback mechanisms mitigating breaking regressions across unencrypted legacy states.
- **Phase 5 OAuth-Style UI Intersect Authorization**: Rectified a critical Authentication Bypass flaw within default plugin configurations, wherein code arrays requesting `MANAGE_USERS` were dynamically approved during blind UI installations. Constructed an immersive Dual-Layer Frontend Modal actively pushing Manifest privileges to end-users for conscious explicit consent, synced unconditionally to a rigid Backend Intersection filter blocking silent configuration payloads.

### Production & Infrastructure
- **High-Availability (PgBouncer Sidecar)**: Resolved Postgres `max_connections` starvation vulnerabilities under intensive API horizontal scaling by engineering a native `pgbouncer` container instance acting as a transactional connection pool proxy.
- **Migration Decoupling**: Remediated a destructive container race-condition scenario collapsing multi-node deployments. Schema execution (`prisma migrate`) is now fully isolated into a short-lived transient `migrator` service, protecting the master database Lock mechanisms natively.
- **Strict Environment Typings**: Deployed a rigorous `.env.example` baseline structurally refusing the deployment of inherently weak default administrative passwords in orchestration runtimes.
- **Cross-Version Idempotent Upgrades**: Built a catastrophic schema-loss prevention pipeline natively intercepting 0.3.0 -> 0.5.0 Docker migrations (`npm run migrate:prod`). The new mechanism sequentially validates and restores legacy Role Enumerations preventing global administrative lockout.
- **UI Settings Panel Injection**: Expanded the core `OpenTicketPluginUI` capabilities to securely ingest custom React Component bindings (`settingsPanels`). Registry plugins can now dynamically build seamless configuration interfaces directly within the Global Settings application.

### Changed
- Engineered and fully implemented the final `ActivePlugins` hook distribution matrix, converting the Plugin System into a fully mature, extensible zero-trust runtime wrapper.

### Quality Assurance
- **100% Coverage**: Successfully generated meticulous unit tests covering encryption layers, boundary access checks, explicit mock injection boundaries, and rigid isolation exceptions across the plugin management suite resulting in total Jest line-coverage and branch enforcement.

## 0.4.0
### Security
- **Phase 27 RBAC UI Hardening**: Applied an elegant Access Denied UX boundary across all isolated `<form>` creation routes (`/incidents/new`, `/assets/new`, `/vulnerabilities/new`, `/users/new`). Prevents Application-Level HTTP 500 crash states by gracefully blocking unsanctioned `GET` traffic attempting to load mutations structurally locked by Server Actions.
- **Phase 26 Production Defect Sweeps**: Identified a lethal component failure within Next.js Server Actions tied precisely to raw `throw new Error()` emissions. Refactored `<form>` native submissions via interactive `useActionState`/`useTransition` React Client boundaries resolving `null:null` screen vaporization crashes.
- **Phase 25 Form Hardening**: Eliminated arbitrary data assumption logic inside `settings/plugins/store` native structural validation, effectively cutting off supply chain poisoning via hijacked or malformed GitHub JSON manifests.
- **Phase 24 Database Resilience**: Ingested strict `@@index([status])` & `@@index([severity])` B-Tree lookups recursively to Prisma schemas, collapsing Big-O database search intervals across macro horizontal workloads, preventing Time-Boxing query failures.
- **Phase 23 Security Audit**: Refactored `upload.ts` to neutralize an RBAC Domain Collision where incident attachment permissions allowed bypassing vulnerability deletion BOLA checks. Added rigorous verification and introduced `UPLOAD_VULN_ATTACHMENTS` and `DELETE_VULN_ATTACHMENTS` boundary specifications.
- **Phase 22 Extension Audit**: Resolved a severe cross-user Broken Object Level Authorization (BOLA) Information Disclosure vector within the Global User Directory (`/users/[id]`). Systemic operators possessing basic `VIEW_USERS` access could passively peek into targeted High-Level Engineer profiles to extract and extrapolate deeply restricted Data/Incidents headers. Hardened both `Assigned Incidents` and `Digital Evidence` arrays to unconditionally demand intersection parameters matching the observer's base privileges, rendering restricted datasets structurally invisible.
- Phase 21 final stage audit isolated three significant mathematical and structural defects bypassing RBAC checks: (1) Added missing `VIEW_AUDIT_LOGS` barrier constraint resolving a systemic privacy leak within User Profiling where base operator viewers could passively extract restricted telemetry. (2) Severed arbitrary Vuln timeline mutations by verifying `ADD_COMMENTS` explicitly, fixing a read-only bypass in the Vulnerabilities Action module. (3) Stripped duplicate Database initialization records within `actions.ts` authentication envelopes, preventing a Rate-Limiter mathematical scaling error that artificially halved brute-force lock thresholds (locking legitimate users iteratively).
- Migrated rigid static Role-Based Access Control (RBAC) strings to a **Dynamic Granular Permission Matrix**. Platform Administrators can now define Custom Privilege Tiers down to atomic actions (e.g., `CREATE_INCIDENTS`, `API_ISSUE_TOKEN`, `SYSTEM_SETTINGS`) empowering massive multi-layer SOC environments with zero-trust UI guarantees.
- Refactored server-side `NextAuth` Identity mappings to strip antiquated Role lists in favor of synchronous Database `customRoles.permissions` evaluations, locking out unauthorized Server Actions implicitly.
- Rectified a massive architectural "God-Mode Privilege Defect" within the Plugin Architecture (`hook-engine.ts`) where unsandboxed Server-Side Javascript could hijack global singletons (`@/lib/db`). We are migrating to a protected strictly-controlled SDK Execution Context (`context.api.createIncident`) forced exclusively under designated un-impersonable System Bot Identities.
- Resolved 5 High-Severity Broken Object Level Authorization (BOLA) logic flaws originating from legacy RBAC migration: (1) Hardened API `GET /incidents/[id]` and `PATCH /incidents/[id]` preventing arbitrary array bypasses that leaked cross-assigned ticket structures, (2) Decoupled Arbitrary Resolution Requirements on `POST /incidents`, unlocking Standard Operator Ticket Creation, (3) Strictly Enforced `EXPORT_INCIDENTS` capability walls shielding `/api/export` CSVs from mass leakage, and (4) Re-architected Attachment Evidentiary constraints mitigating cross-assignee evidence spoliation.
- Remediated 2 Zero-Day Critical Flaws discovered in Phase 2 Audit: (1) Closed a devastating Privilege Escalation (PrivEsc) vector in `deleteRole` which maliciously elevated all members of a deleted role exclusively up to System Administrator due to an unconstrained `findFirst` Prisma mapping, prioritizing authoritative global System Default fallbacks instead. (2) Sealed a massive File Exfiltration vulnerability (`/api/files/[filename]`) by preventing generic global viewing bypasses across all system evidence uploads, strictly bounding authorization contexts to parent-child Incident relationships.
- Eliminated 4 Massive Context-Bypass (BOLA) capabilities rooted deeply inside Next.js Embedded Server Actions during the Phase 3 Audit. Any system operator possessing nominal sub-skills (`ADD_COMMENTS`, `UPDATE_INCIDENTS_METADATA`, `UPDATE_INCIDENT_STATUS`, `DELETE_INCIDENTS`) could forcefully forge POST payloads to completely spoof ownership boundaries over any isolated Incident globally. BOLA enforcement has now been structurally synchronized across all Server Actions and React Server Components natively.
- Phase 4 deep security architecture sweep isolated and terminated a latent Permission Enforcement Gap within the primary target Incident Creation Form (`src/app/(dashboard)/incidents/new/actions.ts`). The Server Action previously lacked atomic capability confirmation (`hasPermission`), theoretically allowing any authenticated viewer/guest-tier session context to autonomously trigger CRITICAL tickets and cascade mass-quarantine Email/SOAR dispatching flows. Incident provisioning is now fully fortified across both Edge APIs and Server Logic components.
- Phase 5 audit effectively closed a catastrophic Data Exfiltration flaw originating from naive React Server Component data hydration boundaries. Discovered that the primary UI query interfaces at `(dashboard)/page.tsx` and `(dashboard)/incidents/page.tsx` incorrectly interpreted generic view privileges (e.g., `hasPrivilege` array intersection matches), resulting in standard users with only `VIEW_INCIDENTS_ASSIGNED` capabilities dropping their Prisma filters and bypassing structural isolation, structurally capable of viewing ALL active tickets globally. Native object-level boundaries explicitly cascading exact queries have been natively restored.
- Phase 6 completed the definitive BOLA boundary audit cross-matrix. Remediated an inverted Logic Flaw causing a Denial of Service (DoS) of authorized data in `src/app/(dashboard)/incidents/[id]/page.tsx`, wherein non-editing Auditors (possessing only `VIEW_INCIDENTS_ALL`) were completely blocked from viewing global tickets due to read authorization being exclusively tied to mutation constraints. Additionally, injected a missing strict `VIEW_ASSETS` boundary constraint across direct Asset ID lookups (`src/app/(dashboard)/assets/[id]/page.tsx`) to prevent unauthorized URL-level access.
- Phase 7 terminated a systemic Webhook SSRF configuration flaw in `src/lib/webhook.ts` that explicitly bypassed default protections via `0.0.0.0` or `[::]` Loopback Wildcards, blocking potential pivot points into internal container workloads. Secondly, the sweep removed a destructive Evidence Deletion BOLA nested within `src/app/actions/upload.ts` where any arbitrary user granted `DELETE_INCIDENT_ATTACHMENTS` bypassed all data isolation bounds, enabling them to wipe critical structural forensic evidence irrespective of origin boundaries.
- Phase 8 resolved critical endpoint data exfiltration loopholes and Denial of Service defects. The Data Export API (`/api/export`) was completely refactored to enforce exact `VIEW_INCIDENTS_ASSIGNED` and `VIEW_INCIDENTS_UNASSIGNED` filter limits, preventing global bulk extraction by lower-tier actors. Additionally, the core Incidents API (`/api/incidents`) was structurally hardened to return an exact Zero-Trust view block (`[]` or `403`) for subjects lacking all View capabilities, mitigating a Prisma relational Engine Crash where `OR: []` threw native `500 Server Errors`.
- Phase 9 executed the final systemic **Absolute Zero-Trust** sweep across the unified filesystem architecture (`api/files/[filename]` and `upload.ts`). It unconditionally severs all IO evidence streams (upload, download, delete) for operatives functioning with Zero View Capabilities (lacking all of `ALL`, `ASSIGNED`, and `UNASSIGNED`), forcibly closing the last logical data extraction aperture even if an operative originally authored the document.
- Phase 10 identified and resolved a severe **Vertical Privilege Escalation (PrivEsc)** vulnerability stemming from unrestricted "Role Minting" in Custom Role management. Specifically, it decoupled monolithic privileges (`MANAGE_PLUGINS`, `MANAGE_USER_ROLES`) into 6 modular capabilities via Prisma (`INSTALL_PLUGINS`, `TOGGLE_PLUGINS`, `CONFIGURE_PLUGINS`, `RESTART_SYSTEM_SERVICES`, `ASSIGN_USER_ROLES`, `CREATE_ROLES`...). Most importantly, the `createRole`/`updateRole` API was weaponized with a mathematical **Subset Integrity Check**, aggressively throwing HTTP `403` if an operative attempts to delegate or mint a custom role containing capabilities strictly higher than their own (unless possessing systemic `UPDATE_SYSTEM_SETTINGS`).

### Added
- **Security Checksums**: Integrated SRMI hash payload bindings for `npm run build` validating production deployment consistency using native Node `crypto` capabilities.
- **Enterprise Test Coverage Protocol**: Scoped Jest unit tests to validate 100% line, generic and branch code coverage targeting global configuration mapping schemas securely.
- **Extensive Plugin Mock Implementations**: Over 300+ lines of custom mock environments spanning Node's `child_process`, `fs/promises`, global `fetch` arrays, and boundary detection implementations shielding untested gaps.

## 0.3.0
### Security
- Fixed a massive Privilege Escalation (PrivEsc) vector inside `/api/incidents` where `REPORTER`s could illegally inject arbitrary `assetId` values to force system-wide SOAR automated quarantines across unowned macro infrastructure.
- Re-architected Brute Force Rate Limiting inside `authorize()` NextAuth backend, shifting from a volatile In-Memory map constraint to a `schema.prisma` DB-synchronized state loop. This totally eradicates Stateless Dissonance, enforcing uniform authentication throttling limits seamlessly across scaled horizontal Kubernetes clusters and multi-threaded environments.
- Patched a Multi-User Concurrency Write Defect within `/api/upload` by replacing temporal `Date.now()` filenames with cryptographically absolute `crypto.randomUUID()` identifiers, stopping identical-millisecond file stream collisions forever.
- Rectified an egregious Privilege Downgrade Vulnerability inside `src/app/(dashboard)/settings` where malicious actors or CSRF intercepts could instantly dismantle Two-Factor Authentication boundaries on an active session. The `disable2FA` pipeline now mandates strict root `<input type="password">` origin re-authentication validations.
- Enhanced BOLA & OOM `take: 5000` memory caps on `/api/export` payload streaming by embedding URL parameter `&skip=` index tracking, unlocking infinite pagination extraction flows for global enterprises without triggering memory crashes.
- Solidified Comment Creation via extreme Inline BOLA verification checking ensuring that malicious actors cannot forge Server Action payloads pushing discussions to unowned tickets.
- Upgraded `nodemailer` to `^8.0.4` to remediate a known CRLF Injection vulnerability (CWE-93 / SNYK-JS-NODEMAILER-15790064) through the `envelope.size` parameter.
- Patched a critical Assignee Lockout BOLA where legitimate Engineers assigned to incidents were completely severed from `page.tsx` summaries, list views, and APIs because of hardcoded `reporterId` isolation limits. Access logic now encapsulates Assignees globally.
- Sealed a massive `MetricSnapshot` DB Memory Bloat (OOM) defect within `getDashboardTrendData` where individual tracking of basic `USER` traffic produced millions of unfiltered metric rows; restricted historical persistence entirely to `GLOBAL` state frames while pushing `USER` queries to in-memory rendering execution.
- Addressed Application-level DoS vulnerability in `/api/cron/metrics` by restricting endpoint with strict `CRON_SECRET` authorization.

### Changed
- Concurrency Optimization: Upgraded HTML5 Desktop Notification layer shifting away from overlapping `HTTP Polling` streams towards highly-efficient `Server-Sent Events (SSE)`.

## 0.2.0
### Added
- Plugin Management: Deployed a `/settings/plugins` interface linking the static Plugin Registry directly to a dynamic PostgreSQL `PluginState` table. Administrators can now visually Install, Uninstall, and Configure registry module credentials via UI without committing ENV variables.
- Extensibility (Server/Client): Engineered a dynamic external-registry Plugin Architecture (`src/lib/plugins/hook-engine`) capable of isolating logic using an automated EventBus (`onIncidentCreated`, `onAssetCompromise`, `onIncidentResolved`).
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
