# Contributing to OpenTicket

First off, thank you for considering contributing to OpenTicket! It's people like you that make OpenTicket such a great platform for the cybersecurity community.

## 🤝 Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to the maintainers.

## 🚀 Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/open-ticket.git
   cd open-ticket
   ```
3. **Run the setup script** to install dependencies, configure `.env`, and migrate the database:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```
4. **Start the development server**:
   ```bash
   npm run dev
   ```

## 💻 Development Workflow

### Branch Naming

Please use descriptive branch names based on the nature of your changes:
- `feat/` for new features (e.g., `feat/add-slack-webhook`)
- `fix/` for bug fixes (e.g., `fix/login-rate-limit`)
- `docs/` for documentation changes
- `chore/` for maintenance tasks (dependencies, config)

### Code Style

We enforce strict coding standards to maintain enterprise-grade quality:
- **TypeScript**: Strict mode is enabled. Do not use `any`. Use `unknown` if necessary and narrow the type.
- **ESLint**: Ensure your code passes all linting rules (`npm run lint`).
- **Prettier**: Code must be formatted using Prettier.

### Testing Requirements

- **All new features must include tests.**
- Run tests locally before submitting a PR: `npm run test`
- We aim for high test coverage, especially for security-critical paths (Authentication, RBAC, Data Access).

## 📥 Pull Request Process

1. Ensure your TypeScript code passes absolute strict mode checks. Do not use `@ts-ignore` or `any` to bypass the `isolated-vm` Sandbox boundaries.
2. If your branch modifies `schema.prisma`, ensure you've successfully tested the migration chain using `npm run migrate:prod` locally.
3. Update the `README.md` and/or `docs/API.md` with details of changes to SDK payloads or UI layouts.
4. Your PR must pass all CI checks (Linting, Tests, Build).
5. Fill out the Pull Request template completely.
6. You may merge the Pull Request in once you have the sign-off of at least one maintainer.

## 🐛 Reporting Bugs

Bugs are tracked as GitHub issues. When creating an issue, please use the provided Bug Report template and include:
- A clear and descriptive title.
- Exact steps to reproduce the issue.
- Your environment details (OS, Browser, Node.js version, Database version).
- Expected behavior vs. actual behavior.

## ⚖️ Licensing & CLA

OpenTicket uses a dual-licensing model (AGPL-3.0 / Enterprise). By contributing to this repository, you agree to sign our Contributor License Agreement (CLA). This CLA grants Cyber Sec Space the right to commercially re-license your contributions as part of the Enterprise edition, while ensuring your code remains perpetually available to the community under the AGPL-3.0.

When you submit your first Pull Request, our CLA-Bot will automatically prompt you to review and digitally sign the agreement before the PR can be merged.
