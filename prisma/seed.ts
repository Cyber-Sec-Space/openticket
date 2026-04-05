import 'dotenv/config';
import { PrismaClient, Role, IncidentStatus, Severity, IncidentType, AssetStatus, AssetType, VulnStatus } from '@prisma/client'
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
  const adminEmail = 'admin@openticket.local'

  // Check if admin exists
  let admin = await prisma.user.findUnique({
    where: { email: adminEmail }
  })

  if (!admin) {
    const rawPassword = process.env.DEFAULT_ADMIN_PASSWORD || require('crypto').randomUUID()
    const passwordHash = await bcrypt.hash(rawPassword, 10)
    admin = await prisma.user.create({
      data: {
        name: 'System Admin',
        email: adminEmail,
        passwordHash,
        roles: [Role.ADMIN, Role.SECOPS],
      }
    })
    console.log(`Created admin account: ${adminEmail} (password: ${rawPassword})`)
  } else {
    console.log(`Admin account ${adminEmail} already exists.`)
  }

  // Create Assets
  const assetCount = await prisma.asset.count()
  if (assetCount === 0) {
    await prisma.asset.createMany({
      data: [
        { name: 'SRV-WEB-01', type: AssetType.SERVER, ipAddress: '192.168.1.10', status: AssetStatus.ACTIVE },
        { name: 'SRV-WEB-02', type: AssetType.SERVER, ipAddress: '192.168.1.11', status: AssetStatus.ACTIVE },
        { name: 'SRV-DB-01', type: AssetType.SERVER, ipAddress: '192.168.1.20', status: AssetStatus.ACTIVE },
        { name: 'SRV-DB-02', type: AssetType.SERVER, ipAddress: '192.168.1.21', status: AssetStatus.MAINTENANCE },
        { name: 'EMPLOYEE-MAC-042', type: AssetType.ENDPOINT, ipAddress: '192.168.2.14', status: AssetStatus.COMPROMISED },
        { name: 'EMPLOYEE-WIN-105', type: AssetType.ENDPOINT, ipAddress: '192.168.2.55', status: AssetStatus.ACTIVE },
        { name: 'SW-CORE-900', type: AssetType.NETWORK, ipAddress: '10.0.0.1', status: AssetStatus.ACTIVE },
        { name: 'FW-EDGE-01', type: AssetType.NETWORK, ipAddress: '10.0.0.2', status: AssetStatus.ACTIVE },
        { name: 'K8S-CLUSTER-PROD', type: AssetType.OTHER, ipAddress: '10.10.0.50', status: AssetStatus.ACTIVE },
        { name: 'GITLAB-CI', type: AssetType.SOFTWARE, ipAddress: '10.10.0.100', status: AssetStatus.ACTIVE },
      ]
    })
    console.log(`Created demo assets.`)
  }

  const assets = await prisma.asset.findMany();

  // Create Vulnerabilities
  const vulnCount = await prisma.vulnerability.count()
  if (vulnCount === 0 && assets.length > 0) {
    const srvWeb01 = assets.find(a => a.name === 'SRV-WEB-01');
    const srvWeb02 = assets.find(a => a.name === 'SRV-WEB-02');
    const gitlab = assets.find(a => a.name === 'GITLAB-CI');
    const fw = assets.find(a => a.name === 'FW-EDGE-01');

    await prisma.vulnerability.create({
      data: {
        title: 'Log4Shell remote code execution',
        cveId: 'CVE-2021-44228',
        cvssScore: 10.0,
        description: 'Apache Log4j2 JNDI features do not protect against attacker controlled LDAP and other JNDI related endpoints.',
        severity: Severity.CRITICAL,
        status: VulnStatus.OPEN,
        affectedAssets: { connect: [{ id: srvWeb01?.id }, { id: srvWeb02?.id }] }
      }
    })

    await prisma.vulnerability.create({
      data: {
        title: 'GitLab CE/EE unauthenticated RCE',
        cveId: 'CVE-2021-22205',
        cvssScore: 10.0,
        description: 'An issue has been discovered in GitLab CE/EE affecting all versions starting from 11.9.',
        severity: Severity.CRITICAL,
        status: VulnStatus.MITIGATED,
        affectedAssets: { connect: [{ id: gitlab?.id }] }
      }
    })

    await prisma.vulnerability.create({
      data: {
        title: 'FortiOS SSL-VPN Heap Buffer Overflow',
        cveId: 'CVE-2022-42475',
        cvssScore: 9.3,
        description: 'A heap-based buffer overflow vulnerability in FortiOS SSL-VPN may allow a remote unauthenticated attacker to execute code.',
        severity: Severity.HIGH,
        status: VulnStatus.OPEN,
        affectedAssets: { connect: [{ id: fw?.id }] }
      }
    })

    await prisma.vulnerability.create({
      data: {
        title: 'Nginx weak ciphers configured',
        cvssScore: 5.3,
        description: 'Server is currently accepting connections using weak TLS ciphers.',
        severity: Severity.MEDIUM,
        status: VulnStatus.OPEN,
        affectedAssets: { connect: [{ id: srvWeb01?.id }, { id: srvWeb02?.id }] }
      }
    })
    
    await prisma.vulnerability.create({
      data: {
        title: 'Internal Server Information Disclosure',
        cvssScore: 3.1,
        description: 'Web server is exposing its precise version number in HTTP headers.',
        severity: Severity.LOW,
        status: VulnStatus.OPEN,
        affectedAssets: { connect: [{ id: srvWeb02?.id }] }
      }
    })
    
    console.log(`Created demo vulnerabilities.`)
  }

  // Create Incidents (14 days history)
  const incidentCount = await prisma.incident.count()
  if (incidentCount === 0 && assets.length > 0) {
    console.log("Seeding timeline incidents...");

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
    ]

    const statuses = [IncidentStatus.NEW, IncidentStatus.IN_PROGRESS, IncidentStatus.PENDING_INFO, IncidentStatus.RESOLVED, IncidentStatus.CLOSED]

    // Create 25 incidents distributed over the last 14 days
    for (let i = 0; i < 25; i++) {
      const template = incidentTemplates[i % incidentTemplates.length]
      const asset = assets[Math.floor(Math.random() * assets.length)]
      const status = statuses[Math.floor(Math.random() * statuses.length)]
      
      const createdDate = randomDate(14)
      let updatedDate = new Date(createdDate)
      
      // If resolved or closed, it should be updated later
      if (status === IncidentStatus.RESOLVED || status === IncidentStatus.CLOSED || status === IncidentStatus.IN_PROGRESS) {
        updatedDate.setDate(updatedDate.getDate() + Math.random() * 3) // updated up to 3 days later
        if (updatedDate > new Date()) { updatedDate = new Date() } // clip to now
      }

      const tags = [template.type.toLowerCase(), 'soc-alert', Math.random() > 0.5 ? 'auto-generated' : 'manual']

      const incident = await prisma.incident.create({
        data: {
          title: template.title,
          description: `Automatically generated demo incident for ${template.title}. Activity observed on ${asset.name}.`,
          type: template.type,
          severity: template.severity,
          status: status,
          assetId: asset.id,
          reporterId: admin.id,
          tags: tags,
          createdAt: createdDate,
          updatedAt: updatedDate,
          assignees: status !== IncidentStatus.NEW ? { connect: [{ id: admin.id }] } : undefined
        }
      })

      // Generate some AuditLogs for each incident to populate activity graphs
      // Add a creation audit log
      await prisma.auditLog.create({
        data: {
          action: 'INCIDENT_CREATED',
          entityType: 'Incident',
          entityId: incident.id,
          userId: admin.id,
          createdAt: createdDate
        }
      })

      if (status !== IncidentStatus.NEW) {
        // Add a random status update log somewhere between start and updatedDate
        const logDate = new Date(createdDate.getTime() + (updatedDate.getTime() - createdDate.getTime()) / 2)
        await prisma.auditLog.create({
          data: {
            action: 'STATUS_CHANGED',
            entityType: 'Incident',
            entityId: incident.id,
            userId: admin.id,
            changes: JSON.stringify({ from: 'NEW', to: status }),
            createdAt: logDate
          }
        })
      }
    }

    console.log(`Generated 25 incidents spanning 14 days of history.`);
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
