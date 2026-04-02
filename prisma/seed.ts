import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = 'admin@openticket.local'

  // Check if admin exists
  let admin = await prisma.user.findUnique({
    where: { email: adminEmail }
  })

  if (!admin) {
    const passwordHash = await bcrypt.hash('Admin@123', 10)
    admin = await prisma.user.create({
      data: {
        name: 'System Admin',
        email: adminEmail,
        passwordHash,
        roles: [Role.ADMIN, Role.SECOPS],
      }
    })
    console.log(`Created admin account: ${adminEmail} (password: Admin@123)`)
  } else {
    console.log(`Admin account ${adminEmail} already exists.`)
  }

  // Create some initial assets for testing
  const assetCount = await prisma.asset.count()
  if (assetCount === 0) {
    await prisma.asset.createMany({
      data: [
        { name: 'SRV-WEB-01', type: 'SERVER', ipAddress: '192.168.1.10', status: 'ACTIVE' },
        { name: 'SRV-DB-01', type: 'SERVER', ipAddress: '192.168.1.20', status: 'ACTIVE' },
        { name: 'EMPLOYEE-MAC-042', type: 'ENDPOINT', ipAddress: '192.168.2.14', status: 'COMPROMISED' },
        { name: 'SW-CORE-900', type: 'NETWORK', ipAddress: '10.0.0.1', status: 'ACTIVE' }
      ]
    })
    console.log(`Created 4 initial dummy test assets.`)
  }

  const assets = await prisma.asset.findMany();

  // Create Incidents
  const incidentCount = await prisma.incident.count()
  if (incidentCount === 0 && assets.length > 0) {
    const srvDb = assets.find(a => a.name === 'SRV-DB-01');
    const mac042 = assets.find(a => a.name === 'EMPLOYEE-MAC-042');
    const swCore = assets.find(a => a.name === 'SW-CORE-900');

    console.log("Seeding incidents...");

    await prisma.incident.create({
      data: {
        title: 'Suspicious East-West DB Traffic',
        description: 'SOC observed abnormal data exfiltration patterns moving from SRV-WEB-01 to SRV-DB-01 during off-business hours. Spike in SELECT queries pulling user PII.',
        type: 'DATA_BREACH',
        severity: 'CRITICAL',
        status: 'IN_PROGRESS',
        assetId: srvDb?.id,
        reporterId: admin.id,
        tags: ['exfiltration', 'database', 'pii'],
        assignees: {
          connect: [{ id: admin.id }]
        }
      }
    });

    await prisma.incident.create({
      data: {
        title: 'Ransomware indicator on Endpoint',
        description: 'Endpoint Protection flagged multiple blocked attempts to execute known ransomware payload (LockBit 3.0 variant) on EMPLOYEE-MAC-042. Machine has been network isolated.',
        type: 'MALWARE',
        severity: 'HIGH',
        status: 'NEW',
        assetId: mac042?.id,
        reporterId: admin.id,
        tags: ['ransomware', 'endpoint']
      }
    });

    await prisma.incident.create({
      data: {
        title: 'Repeated SSH Brute Force Attempts',
        description: 'Firewall logs show 5,000+ failed SSH login attempts from an anonymous proxy network targeting the core switch.',
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'MEDIUM',
        status: 'PENDING_INFO',
        assetId: swCore?.id,
        reporterId: admin.id,
        tags: ['brute-force', 'ssh']
      }
    });

    await prisma.incident.create({
      data: {
        title: 'Reported Phishing Campaign',
        description: 'Several employees reported receiving targeted spear-phishing emails masquerading as the HR department regarding Q4 bonuses. No clicks recorded yet.',
        type: 'PHISHING',
        severity: 'LOW',
        status: 'RESOLVED',
        reporterId: admin.id,
        tags: ['phishing', 'email']
      }
    });

    console.log(`Created decent realistic Incident test seeds.`);
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
