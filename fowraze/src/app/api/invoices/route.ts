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

  const invoices = await prisma.invoice.findMany({
    where: { organizationId: { in: organizationIds } },
    include: { items: true, client: true, payments: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { organizationId, clientId, quoteId, items, dueDate } = body ?? {};
  if (!organizationId || !clientId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "organizationId, clientId, items required" }, { status: 400 });
  }

  const membership = await prisma.organizationMembership.findFirst({
    where: { organizationId, userId: (session.user as any).id },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const last = await prisma.invoice.findFirst({
    where: { organizationId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const nextNumber = (last?.number ?? 0) + 1;

  const computedItems = items.map((it: any) => ({
    description: it.description,
    quantity: Number(it.quantity ?? 1),
    unitPrice: new prisma.Prisma.Decimal(it.unitPrice),
    lineTotal: new prisma.Prisma.Decimal((Number(it.quantity ?? 1) * Number(it.unitPrice)).toFixed(2)),
  }));

  const subtotal = computedItems.reduce((sum: any, it: any) => sum.plus(it.lineTotal), new prisma.Prisma.Decimal(0));
  const tax = new prisma.Prisma.Decimal(0);
  const total = subtotal.plus(tax);

  const invoice = await prisma.invoice.create({
    data: {
      organizationId,
      clientId,
      quoteId: quoteId ?? null,
      number: nextNumber,
      status: "DRAFT",
      subtotal,
      tax,
      total,
      items: { create: computedItems },
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    include: { items: true },
  });

  return NextResponse.json({ invoice }, { status: 201 });
}
