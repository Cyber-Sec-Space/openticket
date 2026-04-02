# OpenTicket (MVP)

[🌐 Read in Traditional Chinese (繁體中文)](README.zh-TW.md) | [🏗️ Architecture Specs](docs/ARCHITECTURE.md)

A next-generation Cybersecurity Incident & Inventory Management system for SecOps and IT personnel. Designed to be a lightweight, centralized, and visually stunning alternative to enterprise IT ticketing tools like Jira and ServiceNow.

## ✨ Key Features
- **Centralized Dashboard:** Real-time analytics, Typology Distributions, and Severity Matrices tracking organizational exposure.
- **Incident & Vulnerability Tracking:** End-to-end triaging pipelines mapping discrete incidents and CVE vulnerabilities directly to internal assets.
- **Native Two-Factor Authentication (2FA):** TOTP-based 2FA module that integrates effortlessly with standard authenticator applications (Google Authenticator, Authy). Supports Global Enforce locks by System Administrators.
- **High-Density Analytics Layout:** Redesigned single-row 8-metric KPI grid allowing deep visibility into SOC operations, positioning actionable components (Command Actions) centrally for immediate triage responsiveness.
- **Role-Based Access Control (RBAC):** Native multi-tenant segregation distinguishing `ADMIN` (Infrastructure overrides), `SECOPS` (Triage), and `REPORTER` (End-User) roles.
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

---

## 🛠️ Core Technology Stack
- **Framework:** Next.js 16.2 (App Router & Server Actions)
- **Database:** PostgreSQL (with Prisma ORM V6)
- **Authentication:** Auth.js v5 (NextAuth.js) / bcrypt / OTPAuth
- **Styling & Components:** TailwindCSS v4, Lucide React, Shadcn/UI, React-Datepicker (Custom Portals & Context Masking)
- **Data Visualization:** Recharts v3
- **Security Scanned by:** Snyk

---

## 💻 Development Setup

1. **Database Containerization:** Bring up the local Postgres DB via Docker.
   ```bash
   docker compose up -d
   ```

2. **Environment Configuration:** Ensure `.env` contains the required credentials:
   ```env
   DATABASE_URL="postgresql://openticket_user:openticket_password@localhost:5432/openticket_dev?schema=public"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="REPLACE_WITH_YOUR_STRONG_SECRET_HASH"
   ```

3. **Database Initialization & Seeding:**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   npx tsx prisma/seed.ts
   ```

4. **Start the Turbopack Application:**
   ```bash
   npm run dev
   ```

## 🔐 Default Test Accounts

The MVP is automatically seeded with accounts spanning each RBAC group upon running the seed script:

- **Admin Account (Unrestricted Setup & 2FA Enforcement):**
  - **Email:** `admin@openticket.local`
  - **Password:** `Admin@123`

- **SecOps Engineer (Incident Resolution & Editing):**
  - **Email:** `secops@openticket.local`
  - **Password:** `Secops@123`

- **Standard Reporter (Creation & View-Only):**
  - **Email:** `reporter@openticket.local`
  - **Password:** `Reporter@123`
