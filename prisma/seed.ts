import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = 'admin@openticket.local'

  // Check if admin exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  })

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@123', 10)
    await prisma.user.create({
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
        { name: 'EMPLOYEE-MAC-042', type: 'ENDPOINT', ipAddress: '192.168.2.14', status: 'COMPROMISED' }
      ]
    })
    console.log(`Created 3 initial dummy test assets.`)
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
