import nodemailer from "nodemailer"
import { db } from "./db"
import { decryptString } from "./plugins/crypto"
import { getGlobalSettings } from "@/lib/settings";
import { runAsync } from "./utils/async";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

interface MailOptions {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

async function getSmtpTransporter(settings: any) {
  if (!settings.smtpHost || !settings.smtpPort || !settings.smtpUser || !settings.smtpPassword) {
    return null
  }

  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: settings.smtpUser,
      pass: decryptString(settings.smtpPassword),
    },
    tls: {
      rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false"
    }
  })
}

async function dispatchMail(options: MailOptions) {
  const settings = await getGlobalSettings()
  
  // `smtpEnabled` acts as the master switch for the Mailer system
  if (!settings?.smtpEnabled) return;

  const provider = settings.mailerProvider || 'SMTP';

  if (provider === 'RESEND') {
    if (!settings.mailerApiKey) {
      console.error("[Mailer] Missing Resend API Key");
      return;
    }
    const apiKey = decryptString(settings.mailerApiKey);
    const toArray = options.to.split(',').map(e => e.trim()).filter(Boolean);
    
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: options.from,
        to: toArray,
        subject: options.subject,
        html: options.html,
        text: options.text
      })
    }).then(async r => {
      if (!r.ok) console.error("[Mailer] Resend API Error:", await r.text());
    }).catch(err => console.error("[Mailer] Resend fetch error:", err));
    return;
  }

  if (provider === 'SENDGRID') {
    if (!settings.mailerApiKey) {
      console.error("[Mailer] Missing SendGrid API Key");
      return;
    }
    const apiKey = decryptString(settings.mailerApiKey);
    const toArray = options.to.split(',').map(e => ({ email: e.trim() })).filter(e => e.email);
    
    await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personalizations: [{ to: toArray }],
        from: { email: options.from }, // Note: SendGrid expects from to match verified sender
        subject: options.subject,
        content: [
          { type: "text/plain", value: options.text },
          { type: "text/html", value: options.html }
        ]
      })
    }).then(async r => {
      if (!r.ok) console.error("[Mailer] SendGrid API Error:", await r.text());
    }).catch(err => console.error("[Mailer] SendGrid fetch error:", err));
    return;
  }

  // Fallback to traditional SMTP via Nodemailer
  const transporter = await getSmtpTransporter(settings);
  if (transporter) {
    await transporter.sendMail(options).catch(err => console.error("[Mailer] SMTP Error:", err));
  }
}

async function getFromAddress() {
  const settings = await getGlobalSettings()
  return settings?.smtpFrom || '"OpenTicket SOC" <noreply@openticket.local>'
}

export async function sendCriticalAlertEmail(incident: { id: string, title: string, description: string, severity: string, status: string }, targetEmails: string[]) {
  if (targetEmails.length === 0) return
  const from = await getFromAddress()
  const safeTitle = escapeHtml(incident.title)
  const safeSeverity = escapeHtml(incident.severity)
  const safeStatus = escapeHtml(incident.status)
  const safeDescription = escapeHtml(incident.description)
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #444; background-color: #111; color: #fff; padding: 20px; border-radius: 8px;">
      <h2 style="color: #ff3333; border-bottom: 1px solid #333; padding-bottom: 10px;">🚨 CRITICAL INCIDENT ALERT</h2>
      <p><strong>Incident ID:</strong> INC-${incident.id.substring(0, 8).toUpperCase()}</p>
      <p><strong>Title:</strong> ${safeTitle}</p>
      <p><strong>Severity:</strong> <span style="background-color: #ff3333; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${safeSeverity}</span></p>
      <p><strong>Status:</strong> ${safeStatus}</p>
      <div style="background-color: #222; padding: 15px; border-left: 4px solid #ff3333; margin-top: 15px;">
        <p style="margin: 0; font-family: monospace; white-space: pre-wrap;">${safeDescription}</p>
      </div>
      <p style="margin-top: 20px; font-size: 12px; color: #888;">This is an automated operational alert generated by OpenTicket.</p>
    </div>
  `

  return runAsync(async () => {
    await dispatchMail({
      from,
      to: targetEmails.join(','),
      subject: `[CRITICAL] INC-${incident.id.substring(0,8).toUpperCase()} - ${incident.title}`,
      text: `CRITICAL INCIDENT: ${incident.title}\nSeverity: ${incident.severity}\nDescription:\n${incident.description}`,
      html,
    });
  });
}

export async function sendIncidentAssignmentEmail(incidentId: string, incidentTitle: string, userEmail: string, userName: string) {
  if (!userEmail) return
  const from = await getFromAddress()
  const safeName = escapeHtml(userName)
  const safeTitle = escapeHtml(incidentTitle)

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #444; background-color: #111; color: #fff; padding: 20px; border-radius: 8px;">
      <h2 style="color: #3399ff; border-bottom: 1px solid #333; padding-bottom: 10px;">🛡️ TICKET ASSIGNED</h2>
      <p>Hello <strong>${safeName}</strong>,</p>
      <p>You have been assigned to handle a security incident.</p>
      <p><strong>Incident ID:</strong> INC-${incidentId.substring(0, 8).toUpperCase()}</p>
      <p><strong>Title:</strong> ${safeTitle}</p>
      <p style="margin-top: 20px;">Please triage this incident as soon as possible.</p>
      <p style="margin-top: 20px; font-size: 12px; color: #888;">This is an automated operational alert generated by OpenTicket.</p>
    </div>
  `

  return runAsync(async () => {
    await dispatchMail({
      from,
      to: userEmail,
      subject: `[Assigned] INC-${incidentId.substring(0,8).toUpperCase()} - ${incidentTitle}`,
      text: `You have been assigned to incident: ${incidentTitle}`,
      html,
    });
  });
}

export async function sendResolutionEmail(incidentId: string, incidentTitle: string, reporterEmail: string, reporterName: string) {
  if (!reporterEmail) return
  const from = await getFromAddress()
  const safeName = escapeHtml(reporterName)
  const safeTitle = escapeHtml(incidentTitle)
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #444; background-color: #111; color: #fff; padding: 20px; border-radius: 8px;">
      <h2 style="color: #4ade80; border-bottom: 1px solid #333; padding-bottom: 10px;">✅ TICKET RESOLVED</h2>
      <p>Hello <strong>${safeName}</strong>,</p>
      <p>Your reported incident has been marked as resolved.</p>
      <p><strong>Incident ID:</strong> INC-${incidentId.substring(0, 8).toUpperCase()}</p>
      <p><strong>Title:</strong> ${safeTitle}</p>
      <p style="margin-top: 20px;">Thank you for your cooperation.</p>
      <p style="margin-top: 20px; font-size: 12px; color: #888;">This is an automated operational alert generated by OpenTicket.</p>
    </div>
  `
  
  return runAsync(async () => {
    await dispatchMail({
      from,
      to: reporterEmail,
      subject: `[Resolved] INC-${incidentId.substring(0,8).toUpperCase()} - ${incidentTitle}`,
      text: `Your incident has been resolved: ${incidentTitle}`,
      html,
    });
  });
}

export async function sendAssetCompromisedEmail(assetName: string, assetIp: string, targetEmails: string[]) {
  if (targetEmails.length === 0) return
  const from = await getFromAddress()
  const safeAssetName = escapeHtml(assetName)
  const safeAssetIp = escapeHtml(assetIp || "Unknown")
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #444; background-color: #111; color: #fff; padding: 20px; border-radius: 8px;">
      <h2 style="color: #ef4444; border-bottom: 1px solid #333; padding-bottom: 10px;">🔥 ASSET COMPROMISED</h2>
      <p>A corporate asset has been flagged as compromised by SOAR triage or manual override.</p>
      <p><strong>Asset Name:</strong> ${safeAssetName}</p>
      <p><strong>IP Address:</strong> <span style="font-family: monospace;">${safeAssetIp}</span></p>
      <p style="margin-top: 20px; font-size: 12px; color: #888;">This is an automated operational alert generated by OpenTicket.</p>
    </div>
  `
  
  return runAsync(async () => {
    await dispatchMail({
      from,
      to: targetEmails.join(','),
      subject: `[COMPROMISED] Asset Alert: ${assetName}`,
      text: `Asset Compromised: ${assetName} (${assetIp || 'Unknown'})`,
      html,
    });
  });
}

export async function sendNewRegistrationAlertEmail(userEmail: string, userName: string, targetEmails: string[]) {
  if (targetEmails.length === 0) return
  const from = await getFromAddress()
  const safeUserName = escapeHtml(userName)
  const safeUserEmail = escapeHtml(userEmail)
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #444; background-color: #111; color: #fff; padding: 20px; border-radius: 8px;">
      <h2 style="color: #60a5fa; border-bottom: 1px solid #333; padding-bottom: 10px;">👤 NEW USER REGISTRATION</h2>
      <p>A new operator has successfully registered onto the platform.</p>
      <p><strong>Operator Name:</strong> ${safeUserName}</p>
      <p><strong>Email Address:</strong> ${safeUserEmail}</p>
      <p style="margin-top: 20px;">Please verify this user matches structural identity expectations.</p>
      <p style="margin-top: 20px; font-size: 12px; color: #888;">This is an automated operational alert generated by OpenTicket.</p>
    </div>
  `
  
  return runAsync(async () => {
    await dispatchMail({
      from,
      to: targetEmails.join(','),
      subject: `[Registration] New User: ${userName}`,
      text: `New User Registration: ${userName} (${userEmail})`,
      html,
    });
  });
}

export async function sendNewVulnerabilityAlertEmail(vulnTitle: string, severity: string, targetEmails: string[]) {
  if (targetEmails.length === 0) return
  const from = await getFromAddress()
  const safeTitle = escapeHtml(vulnTitle)
  const safeSeverity = escapeHtml(severity)
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #444; background-color: #111; color: #fff; padding: 20px; border-radius: 8px;">
      <h2 style="color: #f59e0b; border-bottom: 1px solid #333; padding-bottom: 10px;">🛡️ NEW VULNERABILITY LOGGED</h2>
      <p>A new vulnerability has been logged to the platform.</p>
      <p><strong>Vulnerability:</strong> ${safeTitle}</p>
      <p><strong>Severity:</strong> <span style="font-weight: bold;">${safeSeverity}</span></p>
      <p style="margin-top: 20px;">Review internal infrastructure components immediately.</p>
      <p style="margin-top: 20px; font-size: 12px; color: #888;">This is an automated operational alert generated by OpenTicket.</p>
    </div>
  `
  
  return runAsync(async () => {
    await dispatchMail({
      from,
      to: targetEmails.join(','),
      subject: `[Vulnerability] ${vulnTitle}`,
      text: `New Vulnerability: ${vulnTitle} (Severity: ${severity})`,
      html,
    });
  });
}

export async function sendVerificationEmail(email: string, userName: string, tokenUrl: string) {
  if (!email) return
  const from = await getFromAddress()
  const safeUserName = escapeHtml(userName)
  const safeTokenUrl = escapeHtml(tokenUrl)
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #444; background-color: #111; color: #fff; padding: 30px; border-radius: 8px;">
      <h2 style="color: #60a5fa; border-bottom: 1px solid #333; padding-bottom: 15px; margin-top: 0;">🛡️ VERIFY YOUR IDENTITY</h2>
      <p>Welcome to OpenTicket, <strong>${safeUserName}</strong>.</p>
      <p>Before you can construct authentication tokens or access the dashboard, you must verify your identity routing.</p>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${safeTokenUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
      </div>
      
      <p style="font-size: 13px; color: #a3a3a3;">Or manually execute the following payload link in your browser:</p>
      <p style="font-size: 11px; word-break: break-all; background-color: #000; padding: 10px; border: 1px solid #333; color: #34d399; font-family: monospace;">${safeTokenUrl}</p>
      
      <p style="margin-top: 30px; font-size: 11px; color: #666; border-top: 1px solid #222; padding-top: 15px;">This is an automated operational alert generated by OpenTicket.</p>
    </div>
  `
  
  return runAsync(async () => {
    await dispatchMail({
      from,
      to: email,
      subject: `[Verify] Action Required: Verify your OpenTicket identity`,
      text: `Welcome to OpenTicket! Please verify your email by navigating to this link: ${tokenUrl}`,
      html,
    });
  });
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  if (!email) return
  const from = await getFromAddress()
  const safeResetUrl = escapeHtml(resetUrl)
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #444; background-color: #111; color: #fff; padding: 30px; border-radius: 8px;">
      <h2 style="color: #ef4444; border-bottom: 1px solid #333; padding-bottom: 15px; margin-top: 0;">🔑 DESTRUCTIVE ACTION: PASSWORD RESET</h2>
      <p>A password reset sequence was initiated for the account associated with this email address.</p>
      <p style="color: #fca5a5; font-size: 14px;"><strong>This link is highly sensitive and will self-destruct in 15 minutes.</strong></p>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${safeResetUrl}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password Overlay</a>
      </div>
      
      <p style="font-size: 13px; color: #a3a3a3;">Or manually execute the following payload link in your browser:</p>
      <p style="font-size: 11px; word-break: break-all; background-color: #000; padding: 10px; border: 1px solid #333; color: #f87171; font-family: monospace;">${safeResetUrl}</p>
      
      <p style="margin-top: 20px; font-size: 12px;">If you did not request this, please disregard this transmission immediately.</p>
      <p style="margin-top: 30px; font-size: 11px; color: #666; border-top: 1px solid #222; padding-top: 15px;">This is an automated operational alert generated by OpenTicket.</p>
    </div>
  `
  
  return runAsync(async () => {
    await dispatchMail({
      from,
      to: email,
      subject: `[Security] Identity Override Request`,
      text: `A password reset sequence was requested. Follow this link to reset your password: ${resetUrl}. It expires in 15 minutes.`,
      html,
    });
  });
}

export async function sendOperatorInvitationEmail(email: string, joinUrl: string, inviterName: string) {
  if (!email) return
  const from = await getFromAddress()
  const safeInviterName = escapeHtml(inviterName)
  const safeJoinUrl = escapeHtml(joinUrl)
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #444; background-color: #111; color: #fff; padding: 30px; border-radius: 8px;">
      <h2 style="color: #60a5fa; border-bottom: 1px solid #333; padding-bottom: 15px; margin-top: 0;">🌐 PLATFORM INVITATION</h2>
      <p>Administrator <strong>${safeInviterName}</strong> has provisioned a secure invitation for you to join the OpenTicket platform.</p>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${safeJoinUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Accept Invitation</a>
      </div>
      
      <p style="font-size: 13px; color: #a3a3a3;">Or manually execute the following payload link in your browser:</p>
      <p style="font-size: 11px; word-break: break-all; background-color: #000; padding: 10px; border: 1px solid #333; color: #34d399; font-family: monospace;">${safeJoinUrl}</p>
      
      <p style="margin-top: 20px; font-size: 12px;">This explicit invitation will expire unconditionally after 72 hours.</p>
      <p style="margin-top: 30px; font-size: 11px; color: #666; border-top: 1px solid #222; padding-top: 15px;">This is an automated operational alert generated by OpenTicket.</p>
    </div>
  `
  
  return runAsync(async () => {
    await dispatchMail({
      from,
      to: email,
      subject: `[Invitation] You've been invited to join OpenTicket`,
      text: `You have been invited to OpenTicket. Join here: ${joinUrl}`,
      html,
    });
  });
}

