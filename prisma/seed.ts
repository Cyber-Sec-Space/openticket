import 'dotenv/config';
import { PrismaClient, Permission, IncidentStatus, Severity, IncidentType, AssetStatus, AssetType, VulnStatus } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

// Helper to get a random date between now and X days ago
const randomDate = (daysAgo: number) => {
  const date = new Date()
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo))
  date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60))
  return date
}

async function main() {
  console.log("Starting massive database wipe to prepare pristine demo environment...")
  // Wipe everything safely in reverse cascade priority
  await prisma.auditLog.deleteMany({})
  await prisma.attachment.deleteMany({})
  await prisma.comment.deleteMany({})
  await prisma.incident.deleteMany({})
  await prisma.vulnerability.deleteMany({})
  await prisma.asset.deleteMany({})
  await prisma.user.deleteMany({})
  await prisma.customRole.deleteMany({})

  console.log("Database wiped perfectly. Injecting enterprise-scale data...")

  // 1. Create Users
  const rawPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(rawPassword, 10)

  console.log('Creating diverse user roster...')

  // Create Custom Roles
  const adminRole = await prisma.customRole.create({
    data: {
      name: 'System Administrator',
      isSystem: true,
      permissions: Object.values(Permission)
    }
  });

  const secopsRole = await prisma.customRole.create({
    data: {
      name: 'Security Operations',
      isSystem: true,
      permissions: [Permission.VIEW_INCIDENTS, Permission.CREATE_INCIDENTS, Permission.MANAGE_INCIDENT_STATUS, Permission.ASSIGN_INCIDENTS, Permission.VIEW_ASSETS, Permission.MANAGE_ASSETS, Permission.VIEW_USERS, Permission.API_ISSUE_TOKEN]
    }
  });

  const reporterRole = await prisma.customRole.create({
    data: {
      name: 'Standard Reporter',
      isSystem: true,
      permissions: [Permission.VIEW_INCIDENTS, Permission.CREATE_INCIDENTS]
    }
  });

  const adminUser = await prisma.user.create({
    data: {
      name: 'System Admin', email: 'admin@openticket.local', passwordHash, customRoles: { connect: [{ id: adminRole.id }] }
    }
  });

  const secopsLead = await prisma.user.create({
    data: { name: 'Sarah Connor (Lead)', email: 'sarah@openticket.local', passwordHash, customRoles: { connect: [{ id: secopsRole.id }] } }
  });

  const analyst1 = await prisma.user.create({
    data: { name: 'John Doe (Analyst)', email: 'john@openticket.local', passwordHash, customRoles: { connect: [{ id: reporterRole.id }] } }
  });

  const analyst2 = await prisma.user.create({
    data: { name: 'Jane Smith (Analyst)', email: 'jane@openticket.local', passwordHash, customRoles: { connect: [{ id: reporterRole.id }] } }
  });

  const auditor = await prisma.user.create({
    data: { name: 'Compliance Auditor', email: 'audit@openticket.local', passwordHash, customRoles: { connect: [{ id: reporterRole.id }] } }
  });

  const allUsers = [adminUser, secopsLead, analyst1, analyst2, auditor];

  // Map settings
  await prisma.systemSetting.upsert({
    where: { id: "global" },
    update: { defaultUserRoles: { connect: [{ id: reporterRole.id }] } },
    create: { id: "global", defaultUserRoles: { connect: [{ id: reporterRole.id }] } }
  });

  // 2. Create Assets
  console.log('Provisioning global asset infrastructure...')
  const assetData: Array<{ name: string, type: AssetType, ipAddress: string, status: AssetStatus }> = [
    { name: 'SRV-WEB-01', type: AssetType.SERVER, ipAddress: '192.168.1.10', status: AssetStatus.ACTIVE },
    { name: 'SRV-WEB-02', type: AssetType.SERVER, ipAddress: '192.168.1.11', status: AssetStatus.ACTIVE },
    { name: 'SRV-DB-01', type: AssetType.SERVER, ipAddress: '192.168.1.20', status: AssetStatus.ACTIVE },
    { name: 'SRV-DB-02', type: AssetType.SERVER, ipAddress: '192.168.1.21', status: AssetStatus.MAINTENANCE },
    { name: 'SW-CORE-900', type: AssetType.NETWORK, ipAddress: '10.0.0.1', status: AssetStatus.ACTIVE },
    { name: 'FW-EDGE-01', type: AssetType.NETWORK, ipAddress: '10.0.0.2', status: AssetStatus.ACTIVE },
    { name: 'FW-INT-02', type: AssetType.NETWORK, ipAddress: '10.0.0.3', status: AssetStatus.ACTIVE },
    { name: 'K8S-CLUSTER-PROD', type: AssetType.OTHER, ipAddress: '10.10.0.50', status: AssetStatus.ACTIVE },
    { name: 'K8S-CLUSTER-DEV', type: AssetType.OTHER, ipAddress: '10.10.0.51', status: AssetStatus.INACTIVE },
    { name: 'GITLAB-CI', type: AssetType.SOFTWARE, ipAddress: '10.10.0.100', status: AssetStatus.ACTIVE },
    { name: 'JIRA-TRACKER', type: AssetType.SOFTWARE, ipAddress: '10.10.0.101', status: AssetStatus.ACTIVE },
    { name: 'AZURE-AD-SYNC', type: AssetType.SERVER, ipAddress: '172.16.5.10', status: AssetStatus.ACTIVE },
    { name: 'AWS-BASTION-01', type: AssetType.SERVER, ipAddress: '172.16.10.5', status: AssetStatus.ACTIVE },
    { name: 'AWS-S3-BUCKET-DATA', type: AssetType.OTHER, ipAddress: '', status: AssetStatus.ACTIVE },
  ];

  // Sprinkle 25 endpoints dynamically
  for (let i = 1; i <= 25; i++) {
    const status = Math.random() < 0.1 ? AssetStatus.COMPROMISED : (Math.random() < 0.2 ? AssetStatus.INACTIVE : AssetStatus.ACTIVE);
    assetData.push({
      name: `EMPLOYEE-${Math.random() > 0.5 ? 'WIN' : 'MAC'}-${i.toString().padStart(3, '0')}`,
      type: AssetType.ENDPOINT,
      ipAddress: `192.168.2.${100 + i}`,
      status: status
    });
  }

  await prisma.asset.createMany({ data: assetData });
  const assets = await prisma.asset.findMany();

  // 3. Create Vulnerabilities
  console.log('Injecting Vulnerabilities and mapping topologies...')
  const vulnBlueprints = [
    { title: 'Log4Shell RCE', cveId: 'CVE-2021-44228', score: 10.0, severity: Severity.CRITICAL, desc: 'Log4j2 JNDI exploit mapping.' },
    { title: 'GitLab CE/EE RCE', cveId: 'CVE-2021-22205', score: 10.0, severity: Severity.CRITICAL, desc: 'GitLab unauth RCE issue.' },
    { title: 'FortiOS SSL-VPN BOF', cveId: 'CVE-2022-42475', score: 9.3, severity: Severity.HIGH, desc: 'Heap-based buffer overflow.' },
    { title: 'Nginx weak ciphers', cveId: '', score: 5.3, severity: Severity.MEDIUM, desc: 'Server accepts TLS 1.0/1.1 connections.' },
    { title: 'OpenSSH Username Enum', cveId: 'CVE-2018-15473', score: 5.0, severity: Severity.MEDIUM, desc: 'OpenSSH through 7.7 is prone to user enum.' },
    { title: 'Windows Print Spooler LPE', cveId: 'CVE-2021-34527', score: 8.8, severity: Severity.HIGH, desc: 'PrintNightmare LPE exploit.' },
    { title: 'S3 Bucket Public Read', cveId: '', score: 7.5, severity: Severity.HIGH, desc: 'AWS S3 configuration exposed publicly.' },
    { title: 'Jenkins Unauth XSS', cveId: 'CVE-2022-43401', score: 6.1, severity: Severity.MEDIUM, desc: 'Jenkins Plugin vulnerability.' },
    { title: 'Spring4Shell RCE', cveId: 'CVE-2022-22965', score: 9.8, severity: Severity.CRITICAL, desc: 'Spring Framework RCE via data binding.' },
    { title: 'Server Info Disclosure', cveId: '', score: 3.1, severity: Severity.LOW, desc: 'Exposing Server details.' },
    { title: 'Kubelet Unauth Access', cveId: 'CVE-2018-1002105', score: 9.8, severity: Severity.CRITICAL, desc: 'K8S unauth privilege escalation.' },
    { title: 'Confluence OGNL Injection', cveId: 'CVE-2022-26134', score: 9.8, severity: Severity.CRITICAL, desc: 'Confluence Server arbitrary code exec.' },
    { title: 'SQL Injection in Legacy App', cveId: '', score: 8.5, severity: Severity.HIGH, desc: 'Legacy endpoint missing input sanitization.' },
    { title: 'Default Admin Passwords', cveId: '', score: 9.0, severity: Severity.CRITICAL, desc: 'Hardcoded admin/admin found on switches.' },
    { title: 'Outdated jQuery Library', cveId: '', score: 4.3, severity: Severity.LOW, desc: 'jQuery version is vulnerable to XSS.' },
  ];

  for (const bp of vulnBlueprints) {
    // Pick random assets
    const affected = assets.filter(() => Math.random() > 0.85); // 15% chance to link any given asset

    const statusRoll = Math.random();
    const status = statusRoll < 0.5 ? VulnStatus.OPEN : (statusRoll < 0.8 ? VulnStatus.MITIGATED : VulnStatus.RESOLVED);

    await prisma.vulnerability.create({
      data: {
        title: bp.title,
        cveId: bp.cveId || null,
        cvssScore: bp.score,
        description: bp.desc + '\n\nAutomatically generated for demo purposes to simulate diverse structural mappings.',
        severity: bp.severity,
        status: status,
        affectedAssets: { connect: affected.map(a => ({ id: a.id })) }
      }
    });
  }

  // 4. Create Incidents
  console.log("Generating 150 incidents over 30 days of telemetry...")

  const incidentTemplates = [
    { title: 'Suspicious East-West DB Traffic', type: IncidentType.DATA_BREACH, severity: Severity.CRITICAL },
    { title: 'Ransomware indicator on Endpoint', type: IncidentType.MALWARE, severity: Severity.HIGH },
    { title: 'Repeated SSH Brute Force Attempts', type: IncidentType.UNAUTHORIZED_ACCESS, severity: Severity.MEDIUM },
    { title: 'Reported Phishing Campaign', type: IncidentType.PHISHING, severity: Severity.LOW },
    { title: 'DDoS Attack on Edge Firewall', type: IncidentType.NETWORK_ANOMALY, severity: Severity.HIGH },
    { title: 'Unauthorized API Access Token Used', type: IncidentType.UNAUTHORIZED_ACCESS, severity: Severity.CRITICAL },
    { title: 'Malicious PDF Execution Blocked', type: IncidentType.MALWARE, severity: Severity.MEDIUM },
    { title: 'C2 Beaconing Detected', type: IncidentType.NETWORK_ANOMALY, severity: Severity.HIGH },
    { title: 'Excessive Login Failures for Admin', type: IncidentType.UNAUTHORIZED_ACCESS, severity: Severity.MEDIUM },
    { title: 'Data Exfiltration via DNS Tunneling', type: IncidentType.DATA_BREACH, severity: Severity.CRITICAL },
    { title: 'Suspicious Powershell Execution', type: IncidentType.MALWARE, severity: Severity.HIGH },
    { title: 'Spear Phishing targeting Executive', type: IncidentType.PHISHING, severity: Severity.HIGH },
    { title: 'Spike in 500 Internal Server Errors', type: IncidentType.NETWORK_ANOMALY, severity: Severity.LOW },
    { title: 'Misconfigured S3 Bucket Alert', type: IncidentType.OTHER, severity: Severity.MEDIUM },
    { title: 'Crypto Miner activity on Web Node', type: IncidentType.MALWARE, severity: Severity.HIGH },
    { title: 'Unusual VPN Login from New Country', type: IncidentType.UNAUTHORIZED_ACCESS, severity: Severity.LOW },
    { title: 'XSS Attack Blocked by WAF', type: IncidentType.NETWORK_ANOMALY, severity: Severity.LOW },
    { title: 'Database Backup Failure', type: IncidentType.OTHER, severity: Severity.MEDIUM },
    { title: 'Privilege Escalation attempt on Core', type: IncidentType.UNAUTHORIZED_ACCESS, severity: Severity.CRITICAL },
    { title: 'Mass Email Forwarding Rule Created', type: IncidentType.DATA_BREACH, severity: Severity.HIGH },
    { title: 'Off-hours Remote Desktop Login', type: IncidentType.UNAUTHORIZED_ACCESS, severity: Severity.MEDIUM },
    { title: 'Unexpected Domain Admin Grouper Change', type: IncidentType.UNAUTHORIZED_ACCESS, severity: Severity.CRITICAL },
    { title: 'Port Scan originating from Internal VIP', type: IncidentType.NETWORK_ANOMALY, severity: Severity.HIGH },
  ]

  const statuses = [IncidentStatus.NEW, IncidentStatus.IN_PROGRESS, IncidentStatus.PENDING_INFO, IncidentStatus.RESOLVED, IncidentStatus.CLOSED]

  for (let i = 0; i < 150; i++) {
    const template = incidentTemplates[Math.floor(Math.random() * incidentTemplates.length)]
    const asset = assets[Math.floor(Math.random() * assets.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]

    const createdDate = randomDate(30)
    let updatedDate = new Date(createdDate.getTime() + Math.random() * 86400000 * 5) // Up to 5 days later
    if (updatedDate > new Date()) updatedDate = new Date()

    const reporter = allUsers[Math.floor(Math.random() * allUsers.length)]
    let assignedUsers = allUsers.filter(() => Math.random() > 0.7)
    if (status !== IncidentStatus.NEW && assignedUsers.length === 0) assignedUsers = [secopsLead]

    const tags = [template.type.toLowerCase(), Math.random() > 0.5 ? 'soc-alert' : 'heuristics', `severity-${template.severity.toLowerCase()}`]

    const incident = await prisma.incident.create({
      data: {
        title: template.title,
        description: `Automated telemetry engine generated this incident pattern related to ${template.title}. Behavioral deviations spotted on node: ${asset.name}. Investigation mandatory.`,
        type: template.type,
        severity: template.severity,
        status: status,
        assetId: asset.id,
        reporterId: reporter.id,
        tags: tags,
        createdAt: createdDate,
        updatedAt: updatedDate,
        assignees: status !== IncidentStatus.NEW && assignedUsers.length > 0 ? { connect: assignedUsers.map(u => ({ id: u.id })) } : undefined
      }
    })

    // Creation Log
    await prisma.auditLog.create({
      data: { action: 'INCIDENT_CREATED', entityType: 'Incident', entityId: incident.id, userId: reporter.id, createdAt: createdDate }
    })

    // Status / Assignment changes if applicable
    if (status !== IncidentStatus.NEW) {
      const logDate = new Date(createdDate.getTime() + 1000 * 60 * 60) // 1 hr later
      if (logDate < updatedDate) {
        await prisma.auditLog.create({
          data: { action: 'STATUS_CHANGED', entityType: 'Incident', entityId: incident.id, userId: secopsLead.id, changes: JSON.stringify({ from: 'NEW', to: status }), createdAt: logDate }
        })
      }
    }

    // Add 0-4 random comments to make the timeline feel alive!
    const numComments = Math.floor(Math.random() * 5);
    for (let c = 0; c < numComments; c++) {
      const commenter = allUsers[Math.floor(Math.random() * allUsers.length)]
      const commentDate = new Date(createdDate.getTime() + Math.random() * (updatedDate.getTime() - createdDate.getTime() || 1000));

      const commentPool = [
        "I'm claiming this one for initial triage.",
        "Looking at the firewall logs now, seeing outbound traffic to known bad IPs.",
        "False positive maybe? The user claims they authorized the VPN session.",
        "Escalating to SecOps tier 2.",
        "Remediation playbook initiated. System isolated.",
        "Please check the EDR alerts connected to this.",
        "I've contacted the system owner. Awaiting their response.",
        "Patching the affected node soon. Downtime scheduled.",
        "Closing this as dup alert.",
        "Payload extracted and sent to sandbox."
      ];

      const commentText = commentPool[Math.floor(Math.random() * commentPool.length)];

      await prisma.comment.create({
        data: {
          content: commentText,
          incidentId: incident.id,
          authorId: commenter.id,
          createdAt: commentDate,
          updatedAt: commentDate
        }
      })
    }
  }

  console.log(`Massive DB Injection Completed Fully! 150 incidents generated.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
