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

1. Ensure any install or build dependencies are removed before the end of the layer when doing a build.
2. Update the README.md with details of changes to the interface, this includes new environment variables, exposed ports, useful file locations and container parameters.
3. Your PR must pass all CI checks (Linting, Tests, Build).
4. Fill out the Pull Request template completely.
5. You may merge the Pull Request in once you have the sign-off of at least one maintainer.

## 🐛 Reporting Bugs

Bugs are tracked as GitHub issues. When creating an issue, please use the provided Bug Report template and include:
- A clear and descriptive title.
- Exact steps to reproduce the issue.
- Your environment details (OS, Browser, Node.js version, Database version).
- Expected behavior vs. actual behavior.

## ⚖️ Licensing & CLA

OpenTicket uses a dual-licensing model (AGPL-3.0 / Enterprise). By contributing to this repository, you agree that your contributions will be licensed under the AGPL-3.0. You also certify that you have the right to submit the code under this license.
