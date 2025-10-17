import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  // Create a demo organization if none exists
  const existing = await prisma.organization.findFirst();
  if (existing) return NextResponse.json({ organization: existing });

  const org = await prisma.organization.create({
    data: {
      name: "Demo Org",
      slug: "demo",
    },
  });

  // Create demo client
  const client = await prisma.client.create({
    data: {
      organizationId: org.id,
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "+1 555-0100",
      address: "123 Main St, Springfield",
    },
  });

  // Create demo quote
  const quote = await prisma.quote.create({
    data: {
      organizationId: org.id,
      clientId: client.id,
      number: 1,
      status: "DRAFT",
      subtotal: new prisma.Prisma.Decimal(200),
      tax: new prisma.Prisma.Decimal(0),
      total: new prisma.Prisma.Decimal(200),
      items: {
        create: [
          { description: "Consultation", quantity: 2, unitPrice: new prisma.Prisma.Decimal(100), lineTotal: new prisma.Prisma.Decimal(200) },
        ],
      },
    },
  });

  // Create demo invoice
  const invoice = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      clientId: client.id,
      number: 1,
      status: "DRAFT",
      subtotal: new prisma.Prisma.Decimal(200),
      tax: new prisma.Prisma.Decimal(0),
      total: new prisma.Prisma.Decimal(200),
      items: {
        create: [
          { description: "Consultation", quantity: 2, unitPrice: new prisma.Prisma.Decimal(100), lineTotal: new prisma.Prisma.Decimal(200) },
        ],
      },
    },
  });

  return NextResponse.json({ organization: org, client, quote, invoice });
}
