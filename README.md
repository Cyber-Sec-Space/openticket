# OpenTicket

![License](https://img.shields.io/badge/License-AGPLv3%20%2F%20Enterprise-blue.svg)
![Version](https://img.shields.io/badge/version-v1.0.0--rc.1-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)

OpenTicket is a next-generation, high-performance IT Service Management (ITSM) and cybersecurity incident response platform. Engineered for Enterprise environments, it prioritizes **Zero-Trust Security**, **Cryptographic Data Vaults**, and **Sub-millisecond UI Latency** through aggressive Next.js Server-Side Rendering (SSR).

## 🚀 Key Features

*   **Zero-Trust Architecture**: Granular Role-Based Access Control (RBAC) where every API endpoint and Edge Middleware execution intrinsically validates cryptographic session claims.
*   **Encrypted Plugin Engine (Sandboxed)**: Extend the platform with third-party Node.js plugins, securely executed inside an `isolated-vm` sandbox to prevent unauthorized host-system access. Plugin configurations are locked via AES-256-GCM.
*   **Automated SOAR Capabilities**: Auto-quarantine compromised assets or trigger SIEM webhooks dynamically upon Critical incident injection.
*   **Blazing Fast UI**: Decoupled transition states and optimistic UI updates guarantee instant page navigation without React concurrent mode blocking.
*   **Enterprise Integrations**: Native support for SMTP, SendGrid, Resend, and robust REST APIs.

---

## 📖 Documentation

*   [REST API Documentation](docs/API.md) - For integrating OpenTicket with external tools.
*   [Contributing Guide](CONTRIBUTING.md) - How to run locally, code style rules, and PR process.
*   [Security Policy](SECURITY.md) - How to responsibly report vulnerabilities.
*   [Code of Conduct](CODE_OF_CONDUCT.md) - Community rules.

## 🛠️ Quick Start (Docker Production)

OpenTicket is designed to be deployed via Docker, leveraging a highly optimized multi-stage build and PgBouncer for database connection pooling.

```bash
# Clone the repository
git clone https://github.com/Cyber-Sec-Space/open-ticket.git
cd open-ticket

# Copy example environment
cp .env.example .env

# Generate secure secrets
openssl rand -base64 32 # Use for NEXTAUTH_SECRET

# Start the stack
docker-compose up -d
```

---

## 🔒 Security Architecture

*   **Vulnerability Vaulting**: All Plugin configurations are encrypted at rest using `AES-256-GCM` mapped against a rotating key-vault schema.
*   **Network Isolation**: Webhooks enforce strict SSRF protections against `127.0.0.0/8`, `10.0.0.0/8`, and local DNS resolution.
*   **Distributed Rate Limiting**: The authentication engine utilizes a database-backed distributed rate limiter to defend against horizontal brute-forcing and localized botnets simultaneously.

---

## 💼 Dual Licensing

OpenTicket is dual-licensed:

1.  **Open Source (AGPL-3.0)**: Free for non-commercial and open-source use.
2.  **Enterprise Commercial**: For organizations needing to embed OpenTicket into proprietary commercial systems without copyleft restrictions. Contact `sales@cyber-sec.space`.
