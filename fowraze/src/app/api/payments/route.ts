import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.organizationMembership.findMany({
    where: { userId: (session.user as any).id },
    select: { organizationId: true },
  });
  const organizationIds = memberships.map((m) => m.organizationId);

  const payments = await prisma.payment.findMany({
    where: { organizationId: { in: organizationIds } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ payments });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { organizationId, invoiceId, amount, source, externalId } = body ?? {};
  if (!organizationId || !invoiceId || !amount || !source) {
    return NextResponse.json({ error: "organizationId, invoiceId, amount, source required" }, { status: 400 });
  }

  const membership = await prisma.organizationMembership.findFirst({
    where: { organizationId, userId: (session.user as any).id },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const created = await prisma.payment.create({
    data: {
      organizationId,
      invoiceId,
      amount: new prisma.Prisma.Decimal(amount),
      source,
      externalId: externalId ?? null,
    },
  });

  // Update invoice paid amount and status
  const agg = await prisma.payment.aggregate({
    where: { invoiceId },
    _sum: { amount: true },
  });
  const sum = new prisma.Prisma.Decimal(agg._sum.amount ?? 0);
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (invoice) {
    const status = sum.greaterThanOrEqualTo(invoice.total) ? "PAID" : invoice.status;
    await prisma.invoice.update({ where: { id: invoiceId }, data: { paidAmount: sum, status } });
  }

  return NextResponse.json({ payment: created }, { status: 201 });
}
