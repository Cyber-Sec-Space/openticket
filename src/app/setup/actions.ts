"use server"

import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"
import { Permission } from "@prisma/client"
import nodemailer from "nodemailer"

export async function testSmtpConnection(host: string, port: number, user: string, pass: string) {
  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false"
      }
    });
    await transporter.verify();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to connect to SMTP server." };
  }
}

export async function dispatchSetupVerificationEmail(
  email: string, 
  smtpHost: string, 
  smtpPort: number, 
  smtpUser: string, 
  smtpPassword: string, 
  smtpFrom: string
) {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  await db.verificationToken.deleteMany({ where: { identifier: "SETUP_ADMIN" } });
  await db.verificationToken.create({
    data: {
      identifier: "SETUP_ADMIN",
      token: otpCode,
      expires: new Date(Date.now() + 15 * 60 * 1000)
    }
  });

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPassword },
      tls: {
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false"
      }
    });

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #444; background-color: #111; color: #fff; padding: 30px; border-radius: 8px;">
        <h2 style="color: #60a5fa; border-bottom: 1px solid #333; padding-bottom: 15px; margin-top: 0;">🛡️ SECURE INITIALIZATION</h2>
        <p>A request to initialize the OpenTicket mainframe was made with this email address.</p>
        <p>Your Setup Verification Code is:</p>
        <div style="margin: 30px 0; text-align: center;">
          <span style="background-color: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-family: monospace; font-size: 24px; letter-spacing: 4px;">${otpCode}</span>
        </div>
        <p style="margin-top: 20px; font-size: 12px;">This code will expire in 15 minutes.</p>
      </div>
    `;

    await transporter.sendMail({
      from: smtpFrom || "OpenTicket SOC <noreply@openticket.local>",
      to: email,
      subject: "OpenTicket Setup: Verify your email",
      html
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send verification email." };
  }
}

export async function initializeInstance(formData: FormData) {
  const existingCount = await db.user.count()
  if (existingCount > 0) {
    throw new Error("System is already initialized. Cannot run bootstrap procedure.")
  }

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string
  const systemPlatformUrl = formData.get("systemPlatformUrl") as string || "http://localhost:3000"
  
  const requireEmailVerification = formData.get("requireEmailVerification") === "on"
  const otpCode = formData.get("otpCode") as string

  // Optional SMTP overrides
  const smtpEnabled = formData.get("smtpEnabled") === "on"
  const smtpHost = formData.get("smtpHost") as string || null
  const smtpPort = parseInt(formData.get("smtpPort") as string || "0") || null
  const smtpUser = formData.get("smtpUser") as string || null
  const smtpPassword = formData.get("smtpPassword") as string || null
  const smtpFrom = formData.get("smtpFrom") as string || null

  if (!name || !email || !password || password !== confirmPassword) {
    throw new Error("Invalid parameters provided or passwords do not match.")
  }

  if (requireEmailVerification) {
    if (!otpCode) {
      throw new Error("OTP Code is required when email verification is enforced.")
    }
    const vt = await db.verificationToken.findFirst({
      where: { identifier: "SETUP_ADMIN", token: otpCode }
    })
    if (!vt || new Date() > vt.expires) {
      throw new Error("Invalid or expired Verification Code.")
    }
    // Clean up
    await db.verificationToken.deleteMany({ where: { identifier: "SETUP_ADMIN" } });
  }

  // CWE-407 DoS Mitigation
  if (password.length > 72) throw new Error("Security Violation: Password length exceeds bounds.");
  if (name.length > 255 || email.length > 255) throw new Error("Security Violation: Parameters exceed bounds.");

  const passwordHash = await bcrypt.hash(password, 12)

  await db.$transaction([
    db.user.create({
      data: {
        name,
        email,
        passwordHash,
        emailVerified: (requireEmailVerification && otpCode) ? new Date() : new Date(), // Pre-verified if they pass Setup! Or always verified for first admin? "如開啟admin account就要開始驗證" -> yes, so if they pass OTP, they are verified. If it wasn't required, they are automatically verified.
        customRoles: {
          connectOrCreate: {
            where: { name: 'System Administrator' },
            create: {
              name: 'System Administrator',
              description: 'God-mode administrative role',
              isSystem: true,
              permissions: Object.values(Permission)
            }
          }
        }
      }
    }),
    db.customRole.upsert({
      where: { name: 'Compliance Auditor' },
      update: {},
      create: {
        name: 'Compliance Auditor',
        description: 'Global read-only access for compliance and executive auditing',
        isSystem: true,
        permissions: [
          Permission.VIEW_INCIDENTS_ALL, Permission.VIEW_ASSETS, Permission.VIEW_VULNERABILITIES, 
          Permission.VIEW_USERS, Permission.VIEW_ROLES, Permission.VIEW_DASHBOARD, Permission.VIEW_AUDIT_LOGS,
          Permission.VIEW_PLUGINS, Permission.VIEW_SYSTEM_SETTINGS, Permission.VIEW_API_TOKENS
        ]
      }
    }),
    db.customRole.upsert({
      where: { name: 'SOC Analyst' },
      update: {},
      create: {
        name: 'SOC Analyst',
        description: 'Basic L1 ticket handling. Can triage and update assigned incidents.',
        isSystem: true,
        permissions: [
          Permission.VIEW_INCIDENTS_ASSIGNED, Permission.VIEW_INCIDENTS_UNASSIGNED, Permission.CREATE_INCIDENTS, 
          Permission.UPDATE_INCIDENTS_METADATA, Permission.ASSIGN_INCIDENTS_SELF, Permission.UPLOAD_INCIDENT_ATTACHMENTS, 
          Permission.ADD_COMMENTS, Permission.VIEW_DASHBOARD, Permission.VIEW_ASSETS
        ]
      }
    }),
    db.customRole.upsert({
      where: { name: 'Incident Commander' },
      update: {},
      create: {
        name: 'Incident Commander',
        description: 'Advanced incident management. Can close incidents, delete comments, and assign tasks.',
        isSystem: true,
        permissions: [
          Permission.VIEW_INCIDENTS_ALL, Permission.VIEW_INCIDENTS_ASSIGNED, Permission.VIEW_INCIDENTS_UNASSIGNED,
          Permission.CREATE_INCIDENTS, Permission.UPDATE_INCIDENTS_METADATA, Permission.UPDATE_INCIDENT_STATUS_RESOLVE,
          Permission.UPDATE_INCIDENT_STATUS_CLOSE, Permission.ASSIGN_INCIDENTS_SELF, Permission.ASSIGN_INCIDENTS_OTHERS,
          Permission.LINK_INCIDENT_TO_ASSET, Permission.UPLOAD_INCIDENT_ATTACHMENTS, Permission.DELETE_INCIDENT_ATTACHMENTS,
          Permission.DELETE_INCIDENTS, Permission.EXPORT_INCIDENTS, Permission.ADD_COMMENTS, Permission.DELETE_OWN_COMMENTS,
          Permission.DELETE_ANY_COMMENTS, Permission.VIEW_ASSETS, Permission.VIEW_DASHBOARD
        ]
      }
    }),
    db.customRole.upsert({
      where: { name: 'Threat Intelligence Analyst' },
      update: {},
      create: {
        name: 'Threat Intelligence Analyst',
        description: 'Responsible for registering and updating CVEs and network vulnerabilities.',
        isSystem: true,
        permissions: [
          Permission.VIEW_VULNERABILITIES, Permission.CREATE_VULNERABILITIES, Permission.UPDATE_VULNERABILITIES, 
          Permission.ASSIGN_VULNERABILITIES_SELF, Permission.UPLOAD_VULN_ATTACHMENTS, Permission.VIEW_DASHBOARD, 
          Permission.VIEW_ASSETS
        ]
      }
    }),
    db.customRole.upsert({
      where: { name: 'Vulnerability Management Lead' },
      update: {},
      create: {
        name: 'Vulnerability Management Lead',
        description: 'Lead offensive/defensive security. Can delete vulnerabilities and manage assignments.',
        isSystem: true,
        permissions: [
          Permission.VIEW_VULNERABILITIES, Permission.CREATE_VULNERABILITIES, Permission.UPDATE_VULNERABILITIES, 
          Permission.DELETE_VULNERABILITIES, Permission.ASSIGN_VULNERABILITIES_SELF, Permission.ASSIGN_VULNERABILITIES_OTHERS, 
          Permission.LINK_VULN_TO_ASSET, Permission.UPLOAD_VULN_ATTACHMENTS, Permission.DELETE_VULN_ATTACHMENTS, 
          Permission.VIEW_DASHBOARD, Permission.VIEW_ASSETS
        ]
      }
    }),
    db.customRole.upsert({
      where: { name: 'IT Operations Analyst' },
      update: {},
      create: {
        name: 'IT Operations Analyst',
        description: 'Can view and update existing infrastructure asset metadata.',
        isSystem: true,
        permissions: [
          Permission.VIEW_ASSETS, Permission.UPDATE_ASSETS, Permission.VIEW_DASHBOARD
        ]
      }
    }),
    db.customRole.upsert({
      where: { name: 'Infrastructure Administrator' },
      update: {},
      create: {
        name: 'Infrastructure Administrator',
        description: 'Full autonomy over CMDB infrastructure including asset creation and destruction.',
        isSystem: true,
        permissions: [
          Permission.VIEW_ASSETS, Permission.CREATE_ASSETS, Permission.UPDATE_ASSETS, Permission.DELETE_ASSETS, 
          Permission.VIEW_DASHBOARD
        ]
      }
    }),
    db.customRole.upsert({
      where: { name: 'Identity & Access Administrator' },
      update: {},
      create: {
        name: 'Identity & Access Administrator',
        description: 'Specialized role for managing user access, role assignments, and password resets.',
        isSystem: true,
        permissions: [
          Permission.VIEW_USERS, Permission.CREATE_USERS, Permission.UPDATE_USER_PROFILE, Permission.ASSIGN_USER_ROLES, 
          Permission.RESET_USER_PASSWORDS, Permission.SUSPEND_USERS, Permission.DELETE_USERS, Permission.VIEW_ROLES, 
          Permission.CREATE_ROLES, Permission.UPDATE_ROLES, Permission.DELETE_ROLES, Permission.VIEW_DASHBOARD, 
          Permission.VIEW_AUDIT_LOGS
        ]
      }
    }),
    db.systemSetting.upsert({
      where: { id: "global" },
      update: {},
      create: {
        id: "global",
        allowRegistration: false,
        requireGlobal2FA: false,
        requireEmailVerification,
        systemPlatformUrl,
        smtpEnabled,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPassword,
        smtpFrom
      }
    })
  ])

  redirect("/login")
}
