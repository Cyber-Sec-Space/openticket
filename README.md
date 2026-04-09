# OpenTicket (Beta)

<p align="center">
  <img src="./public/banner.png" alt="OpenTicket Banner" width="100%">
</p>

[🌍 Official Webpage](https://openticket.cyber-sec.space) | [🌐 Read in Traditional Chinese (繁體中文)](README.zh-TW.md) | [🏗️ Architecture Specs](docs/ARCHITECTURE.md)

A next-generation Cybersecurity Incident & Inventory Management system for SecOps and IT personnel. Designed to be a lightweight, centralized, and visually stunning alternative to enterprise IT ticketing tools like Jira and ServiceNow.

## ✨ Key Features
- **Centralized Dashboard:** Real-time analytics, Typology Distributions, and Severity Matrices tracking organizational exposure.
- **Incident & Vulnerability Tracking:** End-to-end triaging pipelines mapping discrete incidents and CVE vulnerabilities directly to internal assets.
- **Native Two-Factor Authentication (2FA):** TOTP-based 2FA module that integrates effortlessly with standard authenticator applications (Google Authenticator, Authy). Supports Global Enforce locks by System Administrators.
- **High-Density Analytics Layout:** Redesigned single-row 8-metric KPI grid allowing deep visibility into SOC operations, positioning actionable components (Command Actions) centrally for immediate triage responsiveness.
- **Dynamic Granular Permission Matrix:** Platform Administrators can leverage fine-grained access control by defining "Custom Privilege Tiers" bounding exact atomic actions (e.g., `CREATE_INCIDENTS`, `VIEW_ASSETS`). Operators can be assigned multiple discrete roles simultaneously, enabling true Zero-Trust (ZT) organizational flexibility natively mapped to PostgreSQL matrices.
- **Zero-Trust EventBus & Plugins:** Equipped with a heavily-fortified background EventBus. External third-party dependencies are natively sandboxed via 5 distinct isolation layers including: Promise `Time-Bomb` execution caps (5000ms), `Thundering Herd` query neutralization caching, and `End-to-End AES-256-GCM` configuration storage. Administrators browse the Plugin Registry and explicitly grant bounded Sandbox Permissions via an embedded immersive UI authorization flow.
- **Omni-channel Notifications:** Natively handles email transmission via configurable SMTP configurations, accompanied by an HTML5 Desktop Push Notification center operating persistently in background tabs via highly-efficient Server-Sent Events (SSE) filtering specifically for Critical/High system incidents.
- **Security-First Paradigm:** Defends against credential stuffing with in-memory Brute Force Rate Limiting across authentication pipelines. Ensures strict BOLA (Broken Object Level Authorization) evaluations actively rejecting unauthorized object-level manipulation.
- **Enterprise-Grade UI Components:** Built on TailwindCSS utilizing modern blur/backdrop-filter dynamics, combined with deeply interactive BaseUI/Shadcn components, fully portaled `react-datepicker` forms, and Recharts.

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
The simplest way to run OpenTicket is via Docker Compose, which automatically provisions the PostgreSQL database, runs migrations, and starts the optimized Next.js standalone container.

```bash
docker-compose up -d
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

### ⬆️ Upgrading from `<= v0.3.x` to `v0.4.0`
Version 0.4.0 introduces the **Dynamic Granular Permission Matrix**, which overhauls the legacy `EnumArray` roles system into relational `CustomRole` matrices natively in PostgreSQL. To avoid data loss when applying these strict database schema changes, you **MUST** run the dedicated upgrade migration script which safely bridges your legacy roles to the new architecture mapping:

```bash
# Safely pull legacy permissions, apply schema drops, and remap cleanly to the CustomRole structure
npm run upgrade:0.4.0
```

### 🪄 First-Time Bootstrap Workflow
No matter which method you choose, visiting `http://localhost:3000` for the first time will automatically intercept and route you to the **Setup Wizard (`/setup`)**. This securely provisions your first Global System Administrator account.
