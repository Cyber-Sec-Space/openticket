# OpenTicket (Beta)

<p align="center">
  <img src="./public/banner.png" alt="OpenTicket Banner" width="100%">
</p>

[🌍 Official Webpage](https://openticket.cyber-sec.space) | [🌐 Read in Traditional Chinese (繁體中文)](README.zh-TW.md) | [🏗️ Architecture Specs](docs/ARCHITECTURE.md) | [🔌 Plugin Registry](https://github.com/Cyber-Sec-Space/openticket-plugin-registry)

A next-generation Cybersecurity Incident & Inventory Management system for SecOps and IT personnel. Designed to be a lightweight, centralized, and visually stunning alternative to enterprise IT ticketing tools like Jira and ServiceNow.

## ✨ Key Features
- **Absolute Zero-Trust Edge Perimeters (L7 DDoS Defense):** Incoming API payloads are proactively intercepted by Next.js Edge Middleware (`proxy.ts`), physically divorcing unauthenticated volumetric traffic from the downstream Node.js core execution thread and PostgreSQL Database.
- **SSRF & DNS Rebinding Immunity:** Neutralizes complex Time-of-Check Time-of-Use (TOCTOU) DNS rebinding attacks securely freezing IPv4 address resolutions dynamically before fetching webhooks, protecting inner VPC spaces.
- **Botnet Deflection (Decoupled Auth Limits):** Employs strict in-memory rate limiting completely severing IP enumeration patterns from targeted identity credential stuffing pipelines.
- **Postgres Full-Text Search (tsvector):** Radically scales Log and Alert dashboard lookups leveraging native structural `tsquery` optimizations over generic DB `O(N)` LIKE queries.
- **Asynchronous Modal Transactions:** Eradicates synchronous UI blockers (Browser alerts), replacing core operational confirms with seamless Shadcn portaled `<Dialog>` primitives.
- **Centralized Dashboard:** Real-time analytics, Typology Distributions, and Severity Matrices tracking organizational exposure.
- **Comprehensive Audit Telemetry:** Enforces complete non-repudiation with 100% audit log coverage across all critical system actions, including RBAC role modifications, plugin state toggles, security configuration changes, and authentication lifecycles.
- **Incident & Vulnerability Tracking:** End-to-end triaging pipelines mapping discrete incidents and CVE vulnerabilities directly to internal assets.
- **Native Two-Factor Authentication (2FA):** TOTP-based 2FA module that integrates effortlessly with standard authenticator applications (Google Authenticator, Authy). Supports Global Enforce locks by System Administrators.
- **High-Density Analytics Layout:** Redesigned single-row 8-metric KPI grid allowing deep visibility into SOC operations, positioning actionable components (Command Actions) centrally for immediate triage responsiveness.
- **Enterprise High-Availability (HA):** Natively embeds a `PgBouncer` Sidecar topology enforcing Transactional Connection Pooling. Effectively eradicates multi-node horizontal scaling starvation, ensuring massive concurrent Database throughput underneath load balancers.
- **Zero-Trust M2M Identities:** Rigidly decouples automated Machine-to-Machine API interactions from human Administrator roles. Systematically assigns independent `Automation Bot (M2M)` boundaries to API Tokens, ensuring token-based authentications cannot escalate or inherit UI administration privileges even within compromised CI/CD scripts.
- **Dynamic Granular Permission Matrix:** Platform Administrators can leverage fine-grained access control by defining "Custom Privilege Tiers" bounding exact atomic actions (e.g., `CREATE_INCIDENTS`, `VIEW_ASSETS`, `INSTALL_PLUGINS`). Operators can be assigned multiple discrete roles simultaneously, enabling true Zero-Trust (ZT) organizational flexibility natively mapped to PostgreSQL matrices.
- **Zero-Trust EventBus & Plugins:** Equipped with a heavily-fortified background EventBus. External third-party dependencies are natively sandboxed via distinct isolation layers including: Promise `Time-Bomb` execution caps (5000ms), `Thundering Herd` query neutralization caching, and `End-to-End AES-256-GCM` configuration storage. Administrators browse the Plugin Registry and explicitly grant bounded Sandbox Permissions via an embedded immersive UI authorization flow. Registry plugins safely inject Remote React `settingsPanels` natively extending frontend capabilities, and undergo rigorous **Pre-flight AST Syntax validations** resolving devastating source code malformations completely pre-deployment.
- **Granular Plugin UI Extensibility:** Exposes surgically precise UI hooks (e.g., `*MainWidgets` and `*SidebarWidgets`), allowing external plugins to seamlessly embed specialized cards and displays strictly into the primary timelines or secondary data columns across Incident, Vulnerability, Asset, and User Profile architectures without breaking Core UI integrity.
- **Omni-channel Notifications:** Natively handles email transmission via configurable SMTP configurations, accompanied by an HTML5 Desktop Push Notification center operating persistently in background tabs via highly-efficient Server-Sent Events (SSE) filtering specifically for Critical/High system incidents.
- **Security-First Paradigm:** Defends against credential stuffing with in-memory Brute Force Rate Limiting across authentication pipelines. Ensures strict BOLA (Broken Object Level Authorization) evaluations actively rejecting unauthorized object-level manipulation.
- **Transparent Dual-Licensing:** Natively surfaces dual-licensing modes (AGPL-3.0 / Enterprise) directly within the dashboard infrastructure, ensuring enterprise deployments maintain strict licensing hygiene and regulatory compliance.
- **Multi-Version Protocol:** Rigidly decouples the OpenTicket Base platform version from the isolated Plugin SDK Framework (`PLUGIN_API_VERSION` — currently at **1.4.0** with strict transaction isolation). Allows external developer extensions to mandate specific Hook Sandbox runtimes ensuring precise back-compatibility constraints.
- **Enterprise-Grade UI Components:** Built on TailwindCSS utilizing modern blur/backdrop-filter dynamics, combined with deeply interactive BaseUI/Shadcn components, fully portaled `react-datepicker` forms, and Recharts.

<!-- IMAGE PLACEHOLDER: [OpenTicket Dashboard / Threat Matrix Preview] -->

---

## 🚀 Examples & Usage

### 1. Declaring an Incident
When an operator possessing the `CREATE_INCIDENTS` permission discovers a threat:
- Click **"Declare Incident"** from the Dashboard.
- Provide the Incident Signature (e.g., *Suspicious outbound traffic on Port 443*).
- Select the **Target Node (Asset)** it corresponds to (e.g., *SRV-WEB-01*). 
- Identify the **Topology** mapping (e.g., *Phishing, Malware, Network Anomaly*).

### 2. Triaging Vulnerabilities
Vulnerability components mirror the system's asset inventory:
- Navigate to **"Log Vulnerability"**.
- Input the official `CVE-ID` and select its inherent CVSS severity scale.
- Assign the Node it affects. The Dashboard's *Vulnerability Heatmap* updates immediately in real-time.

### 3. Machine-to-Machine Automation (API Tokens)
You can directly bridge OpenTicket to your CI/CD pipelines or SOAR orchestrators.
- Navigate to **"Identity Preferences -> API Tokens"** (Requires `ISSUE_API_TOKENS` capability).
- Mint a new cryptographic automation token (e.g., *GitHub Actions Push*).
- Provide the generated raw token payload in the Header: `Authorization: Bearer <token>` when directly calling the `/api/incidents` or `/api/assets` endpoints. Your automated integration inherently assumes your exact privilege tier.

### API & Integrations
- **Zero-Trust Hook Engine**: Asynchronous Event-bus architecture (`onIncidentCreated`, `onAssetCompromise`, `onIncidentResolved`) allowing external execution explicitly shielded against Denial-of-Service loops by a 5-second `Promise.race` Sandbox.
- **External Plugin Sandbox Orchestration**: Seamlessly hot-swap modular integrations (e.g., Jira SOC Sync, Slack Webhooks) directly via the dashboard Plugin Store. Integrations undergo Server-Side Manifest Intersections enforcing Least-Privilege authorizations that demand manual admin constraint approvals.
- **Secure M2M Key Cryptography**: Fully resilient against unauthorized dumping. Configuration dependencies are vaulted utilizing `AES-256-GCM` encryption, alongside classic unrecoverable Machine-to-Machine (M2M) bearer hashes.
- **Brute Force & Rate Limiting**: Global backend constraints throttling aggressive login scripts to protect structural integrity natively, preventing server-crashing enumeration loops.

---

## 🛠️ Core Technology Stack
- **Framework:** Next.js 16.2 (App Router & Server Actions)
- **Database:** PostgreSQL (with Prisma ORM V6)
- **Authentication:** Auth.js v5 (NextAuth.js) / bcrypt / OTPAuth
- **Styling & Components:** TailwindCSS v4, Lucide React, Shadcn/UI, React-Datepicker (Custom Portals & Context Masking)
- **Data Visualization:** Recharts v3
- **Security Scanned by:** Snyk

---

## 🚀 Quick Start (Installation)

OpenTicket provides two frictionless ways to deploy the platform: **Full Containerization** (Recommended for Production) or a **Bare-metal Setup Script** (Recommended for Development).

### Option A: Complete Docker Deployment (Enterprise)
The simplest way to run OpenTicket is via Docker Compose, which automatically provisions the PostgreSQL database, executes isolated Migrator state pipelines asynchronously, starts PgBouncer pooling, and spins up the optimized Next.js standalone container.

```bash
# Ensure you copy your secure production configuration first
cp .env.example .env

docker-compose up -d --build
```
*Your application will boot up on `http://localhost:3000`. Stop it anytime with `docker-compose down`.*

### Option B: Bare-Metal Setup CLI (Development)
If you prefer running Node.js locally without Docker, simply execute the setup script. It will interactively configure your `.env` file, install dependencies, and run Prisma migrations.

```bash
# Ensure you have an empty PostgreSQL database available
chmod +x setup.sh
./setup.sh

# Start the development server
npm run dev
```

### Option C: Pre-compiled Standalone Release (Production / Minimalist)
For users who do not wish to orchestrate Docker but want a heavily optimized Next.js production build, OpenTicket provides a pre-compiled Standalone package in the [GitHub Releases](https://github.com/Cyber-Sec-Space/open-ticket/releases) section.
This `.tar.gz` archive contains the compiled `.next/standalone` output, drastically reducing the deployment footprint manually without requiring raw compilation.

```bash
# 1. Download the latest standalone bundle from GitHub Releases
wget https://github.com/Cyber-Sec-Space/open-ticket/releases/download/v0.5.2/openticket-standalone-v0.5.2.tar.gz

# (Optional) Verify Cryptographic Integrity (SHA-512)
# Expected: (SHA-512 Hash for v0.5.2 will be published upon build pipeline completion)
shasum -a 512 openticket-standalone-v0.5.2.tar.gz

# Extract
tar -xzf openticket-standalone-v0.5.2.tar.gz
cd openticket-standalone

# 2. Configure your specific environment parameters
cp .env.example .env
nano .env # Explicitly set DATABASE_URL, AUTH_SECRET and NEXTAUTH_SECRET (same strong value recommended)

# 3. Apply schema mechanisms to your active database
npx prisma migrate deploy

# 4. Boot the Production Server natively
node server.js
```

### ⬆️ Multi-Version Legacy Upgrades (0.3.0 -> 0.5.0)
Version 0.5.0 finalizes the massive **Zero-Trust Plugin SDK** and **PgBouncer** integration, building directly upon the RBAC overhauls initiated in 0.4.0.
To prevent catastrophic SQL column-drop data loss across legacy transitions, OpenTicket natively encapsulates idempotent backward-compatible interceptions. 

If operating Docker, pulling the latest `docker-compose.yml` and executing `docker-compose up` natively triggers the chained `migrate:prod` pipeline resolving structural updates asynchronously. 
For Bare-Metal deployments, you **MUST** run the designated sequential upgrade command, guaranteeing legacy Role Mapping extraction operates before schema deprecation:

```bash
# Safely pull legacy permissions, apply schema drops, remap to CustomRoles, and bootstrap Plugin System constraints
npm run migrate:prod
```

### 🪄 First-Time Bootstrap Workflow
No matter which method you choose, visiting `http://localhost:3000` for the first time will automatically intercept and route you to the **Setup Wizard (`/setup`)**. This securely provisions your first Global System Administrator account.
