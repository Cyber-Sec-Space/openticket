# OpenTicket (Beta)

<p align="center">
  <img src="./public/banner.png" alt="OpenTicket Banner" width="100%">
</p>
<p align="center">
  <img src="./public/plugins.png" alt="Plugin Architecture" width="48%">
  <img src="./public/notifications.png" alt="Notification Center" width="48%">
</p>

[🌐 Read in Traditional Chinese (繁體中文)](README.zh-TW.md) | [🏗️ Architecture Specs](docs/ARCHITECTURE.md)

A next-generation Cybersecurity Incident & Inventory Management system for SecOps and IT personnel. Designed to be a lightweight, centralized, and visually stunning alternative to enterprise IT ticketing tools like Jira and ServiceNow.

## ✨ Key Features
- **Centralized Dashboard:** Real-time analytics, Typology Distributions, and Severity Matrices tracking organizational exposure.
- **Incident & Vulnerability Tracking:** End-to-end triaging pipelines mapping discrete incidents and CVE vulnerabilities directly to internal assets.
- **Native Two-Factor Authentication (2FA):** TOTP-based 2FA module that integrates effortlessly with standard authenticator applications (Google Authenticator, Authy). Supports Global Enforce locks by System Administrators.
- **High-Density Analytics Layout:** Redesigned single-row 8-metric KPI grid allowing deep visibility into SOC operations, positioning actionable components (Command Actions) centrally for immediate triage responsiveness.
- **Array-based Multi-Role Control (RBAC):** Native multi-tenant segregation distinguishing `ADMIN` (Infrastructure overrides), `SECOPS` (Triage), `REPORTER` (End-User), and `API_ACCESS` (Machine Integration) roles. Users can be assigned multiple roles simultaneously for maximum operational flexibility.
- **Plug-and-Play Architecture:** Equipped with an isolated database-backed Hook Engine (EventBus). All third-party dependencies and extensions are gracefully managed natively under the Settings -> Plugins section for hot-swapping and configurations.
- **Omni-channel Notifications:** Natively handles email transmission via configurable SMTP configurations (Authentication & Reset checks), accompanied by an HTML5 Desktop Push Notification center operating persistently in background tabs filtering specifically for Critical/High system incidents.
- **Enterprise-Grade UI Components:** Built on TailwindCSS utilizing modern blur/backdrop-filter dynamics, combined with deeply interactive BaseUI/Shadcn components, fully portaled `react-datepicker` forms, and Recharts.

---

## 🚀 Examples & Usage

### 1. Declaring an Incident
When a `REPORTER` or `SECOPS` engineer discovers a threat:
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
- Navigate to **"Identity Preferences -> API Tokens"** (Requires `API_ACCESS` or `ADMIN` roles).
- Mint a new cryptographic automation token (e.g., *GitHub Actions Push*).
- Provide the generated raw token payload in the Header: `Authorization: Bearer <token>` when directly calling the `/api/incidents` or `/api/assets` endpoints. Your automated integration inherently assumes your exact privilege tier.

### 4. Activating System Plugins
Global Administrators can manage the Event Intercept framework directly from the `Plugins` panel:
- OpenTicket embraces extensibility, actively piloting a decouple-ready **Slack Critical Notifier**.
- Administrators can "Install" these capabilities from the Plugin Store via a single click, feeding their specific environment keys (such as Webhook URLs) via the Config Modal directly mapped to the database. All captured events will rapidly pipe over the Hook Engine concurrently in the background without locking primary server threads.

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

### 🪄 First-Time Bootstrap Workflow
No matter which method you choose, visiting `http://localhost:3000` for the first time will automatically intercept and route you to the **Setup Wizard (`/setup`)**. This securely provisions your first Global System Administrator account.
