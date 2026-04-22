# OpenTicket

<p align="center">
  <img src="./public/banner.png" alt="OpenTicket Banner" width="100%">
</p>

[🌍 Official Webpage](https://openticket.cyber-sec.space) | [🌐 閱讀繁體中文版](README.zh-TW.md) | [🏗️ Architecture Specs](docs/ARCHITECTURE.md) | [🔌 Plugin Registry](https://github.com/Cyber-Sec-Space/openticket-plugin-registry)

![License](https://img.shields.io/badge/License-AGPLv3%20%2F%20Enterprise-blue.svg)
![Version](https://img.shields.io/badge/version-v1.0.0--rc.1-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-ORM-1B222D?logo=prisma)

A next-generation, high-performance IT Service Management (ITSM) and cybersecurity incident response platform, engineered for Enterprise SecOps. Built as a lightweight, visual, and highly secure alternative to traditional ticketing systems like Jira or ServiceNow.

## ✨ Core Features

- **Absolute Zero-Trust Edge Perimeter:** All routes (including API endpoints) are actively intercepted by a Next.js Edge Middleware proxy (`proxy.ts`). Unauthenticated requests are rejected at the Edge before reaching the Node.js runtime, creating a hardened L7 defense boundary.
- **Distributed Rate Limiting (No Redis):** A database-backed dual-vector rate limiter simultaneously tracks both source IP and target account attempts, inherently blocking brute-force, credential stuffing, and distributed password-spraying attacks without external infrastructure.
- **TOTP Two-Factor Authentication (2FA) & Account Security:** Features an Edge cryptography-backed 2FA module using `otpauth` with QR code enrollment, supporting global enforcement. Includes administrator-initiated SMTP password resets, operator invitations via signed Join URLs, and email verification flows.
- **Immunity to DNS Rebinding & SSRF Mitigation:** The Webhook engine pre-resolves DNS and freezes the target IPv4 address before dispatching. Comprehensive blocklists cover `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, link-local `169.254.169.254`, and IPv6 loopback — preventing internal VPC penetration.
- **Native Postgres GIN Full-Text Search:** Utilizes PostgreSQL's native `to_tsvector` and GIN index structures (deployed via `npm run indexing`) to maintain ultra-fast, millisecond-level search responses across thousands of Incidents and Vulnerabilities.
- **Zero-Trust Sandbox & Plugin Ecosystem (isolated-vm):** Third-party plugins are locked down via five native defensive layers: `isolated-vm` 128MB memory ceiling, 5000ms time-bomb execution limit, AST syntax tree pre-flight validation prior to installation, cryptographic signature verification, and Zod schema enforcement across all SDK operations.
- **High-Resolution Plugin UI Injection:** Through precise UI hook slots defined in the Plugin SDK, plugins inject interactive React widgets natively into the Dashboard, Incident, Asset, Vulnerability, User, Settings, and System Configuration pages. Officially verified plugins receive a cryptographic verification badge. Plugins can also register entirely new full-page routes and system configuration tabs.
- **ITSM & SOAR Automation Engine:** Automatically calculates and tracks SLA targets based on configurable severity-to-hours matrices (for both Incidents and Vulnerabilities). During CRITICAL incidents, it triggers auto-quarantine protocols, instantly shifting linked Assets to a `COMPROMISED` state and broadcasting global alerts via SMTP and Webhooks. Supports Multi-Asset Correlation.
- **Seamless Evidence Upload & DDE-Immune CSV Export:** A custom drag-and-drop file upload component handles digital evidence attachment with strict MIME validation. The raw data CSV export engine sanitizes all cell prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`) to ensure absolute immunity to CSV-Injection (DDE) attacks.
- **Machine-to-Machine (M2M) API Tokens:** A dedicated API Key management interface allows operators to generate, track, and revoke SHA-256 hashed automation tokens with optional expiry dates. Tokens inherit the issuer's RBAC permissions and are validated at the Edge before Node.js processing.
- **Dynamic Granular Permission Matrix:** Advanced native RBAC isolation supporting over 30 atomic-level permission settings across Incidents, Vulnerabilities, Assets, Users, Roles, Plugins, API Tokens, and System Configuration. Operators can stack multiple custom role tags simultaneously.
- **Multi-Provider Mailer Engine:** Supports three mail delivery providers out of the box — traditional SMTP (via Nodemailer), Resend API, and SendGrid API — all configurable from the System Settings dashboard. SMTP passwords and API keys are encrypted at rest using AES-256-GCM.
- **Cyberpunk UI & LocalTime Synchronization:** Custom skeleton loaders and a client-side `LocalTime` component ensure all timestamps are automatically displayed in the operator's local timezone, eliminating timezone confusion across distributed SOC teams.

---

## 🚀 Examples & Usage

### 1. Declaring an Incident
When an operator with the `CREATE_INCIDENTS` permission identifies a potential threat:
- Click **"Declare Incident"** from the dashboard.
- Enter incident characteristics (e.g., *Suspicious outbound traffic on Port 443*).
- Select associated **Target Nodes** (Assets) via multi-select (e.g., *SRV-WEB-01*).
- Assign the corresponding **Typology** (e.g., *Phishing, Malware, Network Anomaly*).

### 2. Triaging Vulnerabilities
The vulnerability tracking module directly mirrors the system asset inventory:
- Navigate to **"Log Vulnerability"**.
- Enter the official `CVE-ID` and specify its CVSS severity score.
- Assign the vulnerability to specific system nodes (Assets). Upon submission, the *Vulnerability Heatmap* updates dynamically in real-time.

### 3. Machine-to-Machine (M2M) API Tokens
Directly pipe OpenTicket telemetry to CI/CD pipelines or enterprise SOAR playbooks:
- Navigate to **"Identity Preferences → API Tokens"** (requires the `ISSUE_API_TOKENS` permission).
- Generate a cryptographically protected automation key (e.g., *GitHub Actions Push*).
- Append the header `Authorization: Bearer <token>` when external scripts call `/api/incidents` or `/api/assets`. The call dynamically inherits the server privileges of the key issuer.

---

## 🛠️ Core Technology Stack
- **Framework:** Next.js 16.2 (App Router & Server Actions)
- **Database:** PostgreSQL 15 (via Prisma ORM V6) + PgBouncer
- **Authentication:** Auth.js v5 (NextAuth.js) / bcrypt / OTPAuth
- **Styling & Components:** TailwindCSS v4, Lucide React, Shadcn/UI
- **Data Visualization:** Recharts v3
- **Input Validation:** Zod v4
- **XSS Sanitization:** isomorphic-dompurify
- **Plugin Sandbox:** isolated-vm
- **Security Scanning:** Snyk

---

## 🚀 Quick Start / Deployment

OpenTicket provides three deployment methodologies: **Fully Containerized** (Recommended for Production), **Bare-Metal Development Script**, and **Pre-Compiled Standalone**.

### Option A: Fully Containerized Deployment (Docker Enterprise)
The easiest way to run OpenTicket. Docker Compose handles the PostgreSQL database, asynchronous schema migrator pipelines, PgBouncer connection pooling, and boots the highly optimized Next.js standalone container.

```bash
# 1. Copy template environment variables
cp .env.example .env

# 2. Boot the stack (migrator runs automatically)
docker-compose up -d --build
```
*Your application will start on `http://localhost:3000`. Stop it anytime using `docker-compose down`.*

### Option B: Bare-Metal Development Script
If you prefer running Node.js directly on your host machine, use the setup script. It interactively provisions your `.env` variables, installs dependencies, and runs Prisma migrations.

```bash
# Ensure a local PostgreSQL instance is running before proceeding
chmod +x setup.sh
./setup.sh

# Hint: For headless CI/CD deployments, bypass TTY prompts dynamically:
# ./setup.sh --non-interactive

# Start the development server
npm run dev
```

> **Local Email Testing**: For local development, it is recommended to use [MailDev](https://github.com/maildev/maildev) as a safe SMTP interceptor. All outbound system emails (Setup OTPs, Incident Assignments, Auto-Quarantine Alerts) can be intercepted and viewed at `http://localhost:1080`.

### Option C: Pre-Compiled Standalone Bundle (Minimalist Production)
For strictly constrained internal networks without Docker, OpenTicket offers a pre-compiled standalone tarball in the [GitHub Releases](https://github.com/Cyber-Sec-Space/openticket/releases) section. It contains the fully optimized Next.js `.next/standalone` output, avoiding the need for lengthy `npm install` executions on production hardware.

```bash
# 1. Download & Verify the Standalone Tarball
wget https://github.com/Cyber-Sec-Space/openticket/releases/download/v1.0.0-rc.1/openticket-standalone-v1.0.0-rc.1.tar.gz
echo "709d78529e7ef54a090dcbb761fe1b35f26336b2626dcf74fbae962ea8ecd2ef *openticket-standalone-v1.0.0-rc.1.tar.gz" | shasum -a 256 --check

# 2. Extract and enter the directory
tar -xzf openticket-standalone-v1.0.0-rc.1.tar.gz
cd openticket-standalone

# 3. Setup environment variables
cp .env.example .env
nano .env # Set DATABASE_URL and AUTH_SECRET

# 4. Attention: Database Must Be Schema-Ready!
# The standalone build is purely a compute node (does not contain Prisma CLI). 
# You MUST have previously triggered the migration pipeline from a worker or Docker node.

# 5. Native Node.js Production Boot
node server.js
```

---

### ⬆️ Painless Cross-Version Upgrades (Direct to 1.0.0-rc.1)
Version `1.0.0-rc.1` finalizes the **Zero-Trust Plugin SDK**, **SOAR SLA Engine**, and **PgBouncer** integration, building upon previous RBAC and security foundations.
To prevent destructive column loss during generational upgrades, OpenTicket implements backward-compatible idempotent defenses at the database layer.

If you are using Docker, running `docker-compose up` automatically triggers the full `migrate:prod` pipeline.
If you are on Bare-Metal, you **must** manually run the specialized migration script. It retroactively calculates missing SLA targets for legacy incidents/vulnerabilities, and injects the latest plugin role authorizations:

```bash
# Chains: backup → prisma migrate → upgrade:0.4.0 → 0.5.0 → 0.5.2 → 1.0.0-rc.1 → indexing
npm run migrate:prod
```

### 🪄 First-Time Initialization Wizard
Regardless of your chosen deployment method, upon first accessing `http://localhost:3000`, the system redirects you to the **System Initialization Wizard (`/setup`)**. This guides you through the secure registration of the first Global System Administrator account, including SMTP configuration and email OTP verification.

---

## 🔒 Security Architecture

- **Vulnerability Vaulting**: All Plugin configurations are encrypted at rest using `AES-256-GCM` with a versioned rotating key-vault schema derived from `AUTH_SECRET`.
- **Network Isolation**: Webhooks enforce strict SSRF protections against `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, and local DNS resolution via pre-resolved IP freezing.
- **Security Headers**: All responses include `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and a restrictive `Permissions-Policy`.
- **Plugin Safe Mode**: In case of a malfunctioning plugin causing boot failures, run `npm run plugin:reset` to deactivate all plugins at the database level.

---

## 📖 Documentation

- [REST API Documentation](docs/API.md) — Integrating OpenTicket with external tools and SOAR playbooks.
- [Architecture Specification](docs/ARCHITECTURE.md) — Deep dive into system design, data flow, and security boundaries.
- [Contributing Guide](CONTRIBUTING.md) — How to run locally, code style rules, and PR process.
- [Security Policy](SECURITY.md) — How to responsibly report vulnerabilities.

---

## 💼 Dual Licensing

OpenTicket is dual-licensed:

1. **Open Source (AGPL-3.0)**: Free for non-commercial and open-source deployments.
2. **Enterprise Commercial**: For organizations needing to embed OpenTicket into proprietary platforms without copyleft restrictions. Contact `sales@cyber-sec.space`.
