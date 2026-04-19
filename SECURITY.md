# Security Policy

Security is the core foundation of OpenTicket. We take all security vulnerabilities seriously and appreciate the efforts of security researchers and our community in helping us keep our platform safe.

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
2. **Email**: Contact our security team directly at `security@cyber-sec.space`.

### What to include in your report:
- A description of the vulnerability and its impact.
- Detailed steps to reproduce the issue.
- Proof of Concept (PoC) code or screenshots if applicable.
- Any suggested mitigations.

### Response Timeline
- We will acknowledge receipt of your vulnerability report within **72 hours**.
- We aim to provide a fix or mitigation plan within **30 days**.
- We will notify you when the vulnerability is patched and a security advisory is published.

## Scope

**In Scope**:
- Remote Code Execution (RCE)
- Server-Side Request Forgery (SSRF)
- Cross-Site Scripting (XSS)
- Authentication Bypass / Broken Access Control (BOLA/IDOR)
- SQL Injection
- Information Disclosure of sensitive data (Tokens, Passwords, PII)
- Sandbox escapes in the Plugin Engine

**Out of Scope**:
- Issues requiring physical access to the server.
- Social engineering (e.g., phishing) against OpenTicket users.
- Denial of Service (DoS) attacks that require massive external volumetric traffic (OpenTicket is designed to be protected by external WAF/DDoS mitigation).
- Vulnerabilities in outdated, unsupported browsers.

## Hall of Fame / Credits

We deeply appreciate the security researchers who responsibly disclose vulnerabilities. We will gladly credit you (with your permission) in our Security Advisories and Release Notes when a patch is published.
