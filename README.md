# OpenTicket MVP

A Cybersecurity Incident & Inventory Management system for SecOps and IT personnel. Designed to be a lightweight, centralized alternative to enterprise IT ticketing tools like Jira and ServiceNow. 

## Core Architecture
- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL (with Prisma ORM V6)
- **Authentication:** Auth.js v5 (NextAuth.js) with role-based access control (RBAC).
- **Assignments:** Native M2M Incident Multi-Assignee (SecOps/Admins) task distribution framework.
- **Styling UI:** TailwindCSS v4 with Shadcn UI components & custom Glassmorphism designs.

## Development Setup

1. **Database:** Start the database locally via docker.
   ```bash
   docker compose up -d
   ```

2. **Environment Variables:** Make sure `.env` contains the required credentials:
   ```env
   DATABASE_URL="postgresql://openticket_user:openticket_password@localhost:5432/openticket_dev?schema=public"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="..."
   ```

3. **Database Initialization:**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   npx tsx prisma/seed.ts
   ```

4. **Start Application:**
   ```bash
   npm run dev
   ```

## Roles and Test Accounts

The MVP is seeded with a default Admin account on database initialization:
- **Email:** `admin@openticket.local`
- **Password:** `Admin@123`
- **Roles Available:** `ADMIN`, `SECOPS`, `REPORTER`
