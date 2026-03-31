import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@agency.com'
  const password = process.env.ADMIN_PASSWORD || 'changeme123'
  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: hashedPassword,
      name: 'Admin',
    },
  })

  console.log(`✅ Admin user created: ${user.email}`)

  // Create sample clients
  const client1 = await prisma.client.upsert({
    where: { id: 'sample-client-1' },
    update: {},
    create: {
      id: 'sample-client-1',
      name: 'Empresa ABC S.A.',
      cuit: '30-71234567-0',
      email: 'contabilidad@empresaabc.com',
      whatsapp: '+5491112345678',
      billingType: 'AFIP',
      notes: 'Cliente corporativo. Facturar a fin de mes.',
    },
  })

  const client2 = await prisma.client.upsert({
    where: { id: 'sample-client-2' },
    update: {},
    create: {
      id: 'sample-client-2',
      name: 'Juan Pérez',
      email: 'juan@gmail.com',
      whatsapp: '+5491198765432',
      billingType: 'COMMON',
      notes: 'Emprendedor. Prefiere factura común.',
    },
  })

  console.log(`✅ Sample clients created`)

  // Create sample charges
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  await prisma.charge.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'sample-charge-1',
        clientId: client1.id,
        amount: 150000,
        description: 'Gestión de redes sociales - Octubre 2024',
        date: lastMonth,
        dueDate: new Date(now.getFullYear(), now.getMonth(), 10),
        status: 'PARTIAL',
      },
      {
        id: 'sample-charge-2',
        clientId: client1.id,
        amount: 80000,
        description: 'Campaña Google Ads - Octubre 2024',
        date: lastMonth,
        dueDate: new Date(now.getFullYear(), now.getMonth(), 10),
        status: 'PENDING',
      },
      {
        id: 'sample-charge-3',
        clientId: client2.id,
        amount: 45000,
        description: 'Diseño web - Landing page',
        date: new Date(now.getFullYear(), now.getMonth(), 1),
        dueDate: new Date(now.getFullYear(), now.getMonth(), 15),
        status: 'PAID',
      },
    ],
  })

  // Create sample payment
  await prisma.payment.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'sample-payment-1',
        clientId: client1.id,
        amount: 75000,
        date: new Date(now.getFullYear(), now.getMonth(), 5),
        method: 'CVU',
        notes: 'Pago parcial transferencia',
      },
      {
        id: 'sample-payment-2',
        clientId: client2.id,
        amount: 45000,
        date: new Date(now.getFullYear(), now.getMonth(), 3),
        method: 'BANK_TRANSFER',
        notes: 'Pago completo',
      },
    ],
  })

  console.log(`✅ Sample charges and payments created`)
  console.log(`\n🚀 Seed completed successfully!`)
  console.log(`   Login with: ${email} / ${password}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
