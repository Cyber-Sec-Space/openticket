# Changelog

All notable changes to this project will be documented in this file.

## main
### Fixed
- Fixed bug where Investigation Logs failed to post due to a missing `type="submit"` attribute on the Radix/Base-UI button element binding.
- Resolved Next.js compile error where `(dashboard)` pages conflicted with legacy root pages by clearing out duplicate component files in `/assets`, `/incidents`, and `/page.tsx`.
- Fixed Next.js 15 dynamic routing issue where `params` was not being handled as a Promise inside the incident detail view.
- Adjusted Prisma JSON typing for server action FormData to prevent compile-time type mismatches.

### Added
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
