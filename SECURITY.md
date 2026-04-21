# Security Policy

Security is the core foundation of OpenTicket. As a cybersecurity incident management platform, we take all security vulnerabilities seriously and appreciate the efforts of security researchers and our community in helping us keep our platform safe.

## Supported Versions

We only provide security updates for the current major release branch. 

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| 0.5.x   | :white_check_mark: |
| < 0.5.x | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you believe you have found a security vulnerability in OpenTicket, please report it to us privately through one of the following channels:

1. **GitHub Security Advisories**: Use the "Report a vulnerability" button in the [Security tab](https://github.com/Cyber-Sec-Space/open-ticket/security/advisories) of this repository.
2. **Email**: Contact our security team directly at `security@cyber-sec.space`. If your report contains highly sensitive Proof of Concepts (PoCs), we strongly encourage you to encrypt your email using our official PGP key (Fingerprint: `XXXX XXXX XXXX XXXX`).

### What to include in your report:
- A description of the vulnerability and its impact.
- Detailed steps to reproduce the issue.
- Proof of Concept (PoC) code or screenshots if applicable.
- Any suggested mitigations.

## Rules of Engagement / Authorized Testing

To protect our users and infrastructure, you must adhere to the following rules during your research:
- **Test Locally**: DO NOT perform security testing against our live, production URLs or any infrastructure hosted by us. You must test exclusively against a local Sandbox/Instance (e.g., using `docker-compose up` or our provided `setup.sh`).
- **No Data Exfiltration**: Do not access, modify, or delete user data that does not belong to your own test accounts.
- **No Disruption**: Do not perform Denial of Service (DoS) attacks or intentionally execute resource exhaustion payloads against anything other than your local isolated environment.
- **No Backdoors**: Do not leave backdoors or malicious payloads lingering in the database or server filesystem after your Proof of Concept is complete.

## Response Timeline
- We will acknowledge receipt of your vulnerability report within **72 hours**.
- We aim to provide a fix or mitigation plan within **30 days**.
- We will notify you when the vulnerability is patched and a security advisory is published.

## Scope

As a heavily fortified Enterprise platform built on a Zero-Trust architecture, we are particularly interested in bypasses against our native mitigation layers.

**In Scope**:
- Remote Code Execution (RCE)
- Server-Side Request Forgery (SSRF) bypasses (defeating our IP-freezing and DNS rebinding protections)
- Cross-Site Scripting (XSS) (including bypasses against `isomorphic-dompurify` in Plugin UI injections)
- Authentication & Authorization Bypasses (including BOLA/IDOR, Setup Wizard Hijacking, or Edge proxy layer evasion)
- MFA/2FA Bypasses (defeating TOTP authentication enforcement)
- Privilege Escalation (defeating our strictly-typed PostgreSQL Enum-based Role Access Control matrix)
- SQL / Prisma Injection
- Sandbox Escapes in the Plugin Engine (bypassing `isolated-vm`, `Promise.race` 5000ms TTL, or 128MB Memory limits)
- AST Pre-Flight Evasion (bypassing the TypeScript AST static vulnerability analysis during Plugin deployment)
- Prototype Pollution or SDK Validation Bypass (defeating Zod strict schemas in `api.*` methods)
- Rate-Limiting Bypasses (defeating our database-backed Login throttling to achieve Credential Stuffing)
- CSV Injection / DDE vulnerabilities in telemetry exports (bypassing the `=, +, -, @` sanitizer)
- SMTP Header Injection / Email Spoofing (bypassing our Multi-Provider Mailer abstraction)
- Path Traversal / Arbitrary File Upload (bypassing the strict extension verifiers and cryptographic filename isolations)
- Information Disclosure of sensitive data (Tokens, Passwords, AES-256-GCM Vault payloads, PII)

**Out of Scope**:
- Issues requiring physical access to the server or database.
- Social engineering (e.g., phishing) against OpenTicket users.
- Denial of Service (DoS) attacks that require massive external volumetric traffic (OpenTicket is designed to be protected by external WAF/DDoS mitigation).
- Vulnerabilities in outdated, unsupported browsers.
- Theoretical vulnerabilities without a reproducible Proof of Concept (PoC).
- Vulnerabilities within third-party upstream dependencies (e.g., React, Prisma), unless you can provide a PoC demonstrating that OpenTicket explicitly utilizes the dependency in an insecure manner.

## Safe Harbor

We consider security research and vulnerability disclosure activities conducted in compliance with this policy to be authorized conduct. We will not initiate or support legal action against researchers who adhere to these guidelines. If legal action is initiated by a third party against you for activities conducted in accordance with this policy, we will make it known that your actions were conducted in compliance with this policy.

## Rewards / Bug Bounty

Currently, OpenTicket operates as a non-profit open-source initiative. While we cannot offer monetary bug bounties at this time, valid and critical vulnerability disclosures will be fully acknowledged in our Hall of Fame, CVE reports, and Release Notes.

## Hall of Fame / Credits

We deeply appreciate the security researchers who responsibly disclose vulnerabilities. We will gladly credit you (with your permission) in our Security Advisories and Release Notes when a patch is published.
