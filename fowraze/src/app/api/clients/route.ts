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

  const clients = await prisma.client.findMany({
    where: { organizationId: { in: organizationIds } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { organizationId, name, email, phone, address } = body ?? {};
  if (!organizationId || !name) {
    return NextResponse.json({ error: "organizationId and name are required" }, { status: 400 });
  }

  const membership = await prisma.organizationMembership.findFirst({
    where: { organizationId, userId: (session.user as any).id },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const client = await prisma.client.create({ data: { organizationId, name, email, phone, address } });
  return NextResponse.json({ client }, { status: 201 });
}
