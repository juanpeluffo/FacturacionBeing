import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLast6Months } from '@/lib/utils'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  // Run all queries in parallel
  const [
    totalChargedAllTime,
    totalPaidAllTime,
    totalChargedThisMonth,
    totalPaidThisMonth,
    overdueClients,
    last6MonthsData,
    recentActivity,
  ] = await Promise.all([
    // Total charged all time
    prisma.charge.aggregate({ _sum: { amount: true } }),

    // Total paid all time
    prisma.payment.aggregate({ _sum: { amount: true } }),

    // Total charged this month
    prisma.charge.aggregate({
      where: { date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),

    // Total paid this month
    prisma.payment.aggregate({
      where: { date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),

    // Clients with overdue balance
    getOverdueClients(),

    // Last 6 months data for chart
    getLast6MonthsChartData(),

    // Recent activity (latest charges + payments)
    prisma.charge.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { client: { select: { id: true, name: true } } },
    }),
  ])

  const totalCharged = Number(totalChargedAllTime._sum.amount || 0)
  const totalPaid = Number(totalPaidAllTime._sum.amount || 0)
  const totalPending = totalCharged - totalPaid

  return NextResponse.json({
    kpis: {
      allTime: {
        totalCharged,
        totalPaid,
        totalPending,
      },
      thisMonth: {
        totalCharged: Number(totalChargedThisMonth._sum.amount || 0),
        totalPaid: Number(totalPaidThisMonth._sum.amount || 0),
      },
    },
    overdueClients,
    chartData: last6MonthsData,
    recentActivity,
  })
}

async function getOverdueClients() {
  const now = new Date()

  // Get clients with overdue charges (due date passed, not fully paid)
  const overdueCharges = await prisma.charge.findMany({
    where: {
      dueDate: { lt: now },
      status: { in: ['PENDING', 'PARTIAL'] },
    },
    include: {
      client: true,
    },
  })

  // Group by client
  const clientMap = new Map<string, {
    client: typeof overdueCharges[0]['client']
    totalOverdue: number
    chargeCount: number
  }>()

  for (const charge of overdueCharges) {
    const existing = clientMap.get(charge.clientId)
    if (existing) {
      existing.totalOverdue += Number(charge.amount)
      existing.chargeCount++
    } else {
      clientMap.set(charge.clientId, {
        client: charge.client,
        totalOverdue: Number(charge.amount),
        chargeCount: 1,
      })
    }
  }

  return Array.from(clientMap.values())
    .sort((a, b) => b.totalOverdue - a.totalOverdue)
    .slice(0, 10)
}

async function getLast6MonthsChartData() {
  const months = getLast6Months()
  const data = []

  for (const month of months) {
    const [charged, paid] = await Promise.all([
      prisma.charge.aggregate({
        where: { date: { gte: month.start, lte: month.end } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { date: { gte: month.start, lte: month.end } },
        _sum: { amount: true },
      }),
    ])

    data.push({
      month: month.label,
      facturado: Number(charged._sum.amount || 0),
      cobrado: Number(paid._sum.amount || 0),
    })
  }

  return data
}
