# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-rc.1] - 2026-04-19

### Added
- **REST API Documentation**: Full documentation for external orchestration integrations.
- **Community Standards**: Added `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md` and GitHub Issue/PR templates to formalize the Open Source community governance.
- **Zero-Trust Middleware**: Enhanced IP and Proxy trust resolution rules within `auth.ts`.
- **Unit and Integration Test Suites**: Massive leap in coverage for API, proxy, hook engine, and metrics services.

### Changed
- **Navigation Provider Transition**: Decoupled transition states from Next.js 15 routing for "instant" UI feedback without blocking.
- **Strict ESLint Rules**: Enforced strict rules preventing global `any` assertions to harden security.

### Removed
- **Legacy Fallback Decryption**: Dropped the insecure `LEGACY_FALLBACK_SECRET` key to ensure zero-key decryption strictly fails.
- **Unsafe SQL Injections**: Eradicated remaining `executeRawUnsafe` calls in favor of safe parameterized execution.
- **Debug Artifacts**: Cleaned up test scripts (`test-ivm.js`) and deprecated routing paths.

### Fixed
- Navigation loading bar hanging on first entry.
- Type casting issues across `hasPermission` boundary checks.
