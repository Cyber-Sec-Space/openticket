# Changelog

All notable changes to this project will be documented in this file.

## main
### Fixed
- Fixed Next.js 15 dynamic routing issue where `params` was not being handled as a Promise inside the incident detail view.
- Adjusted Prisma JSON typing for server action FormData to prevent compile-time type mismatches.

### Added
- Created OpenTicket MVP core Next.js project.
- Implemented Postgres via Prisma ORM schemas for Account, Session, User, VerificationToken, Incident, Asset, Comment, AuditLog.
- Integrated Auth.js v5 (NextAuth) with a Credentials provider.
- Configured robust RBAC checking within API routers and Server Actions.
- Set up Shadcn UI component suite with default UI elements.
- Implemented UI views for: Main Dashboard, Incident Listing, Incident Creation, Incident Workflow Viewing, and Assets List.
- Configured Dockerized Database setup script (`docker-compose.yml`).
- Initialized basic `jest` and tests for basic utility functions, ensuring core module coverage.
