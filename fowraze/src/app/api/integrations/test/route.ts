import { NextResponse } from "next/server";
import { gmail, quickbooks, stripeStub } from "@/lib/integrations";

export async function GET() {
  const g = await gmail.watchLabel("Fowraze");
  const q = await quickbooks.createCustomer({ name: "Acme LLC" });
  const s = await stripeStub.createCheckoutSession({ amount: 1999 });
  return NextResponse.json({ gmail: g, quickbooks: q, stripe: s });
}
