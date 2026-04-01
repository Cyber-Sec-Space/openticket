# Changelog

All notable changes to this project will be documented in this file.

## main
### Added
- Attachments: Integrated local binary storage capabilities `/api/upload` linked to Incidents and Vulnerabilities acting as centralized execution evidence.
- SLA Management: Enabled strict dynamic `targetSlaDate` bindings with UI shifting indicators marking overdue constraints.
- Notification (Webhook): Configured external SOC integration triggers capable of posting payload states directly into Discord/Slack formats.
- Data Delivery: Surfaced a high-speed `/api/export` comma-separated report compiler mapped to individual query scopes.
- UI: Reconstructed Index dashboards embedding Next.js `searchParam` pagination controllers & advanced filters preserving performance on large structural datasets.
- Schema: Adjusted native `Prisma ERD` model synchronizing `SystemSetting`, `Attachment` properties alongside `Architecture.md` representations.

### Fixed
- Fortified public Registration API with generic return codes preventing `Enmueration Attacks` and implemented constant-time logic blocking to massively throttle App-level Database DoS injections.
- Enforced hard `take: 100` ceiling bounds globally across naked Prisma REST endpoints (`/api/incidents`, `/api/assets`) sealing Out of Memory (OOM) API crashing vulnerabilities under massive scalability.
- Enforced strict cryptographic MIME / Extension Allowlist (.png, .json, .log, etc) inside `uploadAttachment` entirely mitigating Stored XSS payloads (.html, .svg) delivered through fake evidence files.
- Injected strict physical Node `fs.unlinkSync()` routines executing natively against `/public/uploads` preceding Prisma Cascades to seal silent Storage / Drive Exhaustion DoS vulnerabilities during incident deletion.
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
