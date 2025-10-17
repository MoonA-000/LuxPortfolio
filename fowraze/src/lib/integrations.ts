export type GmailStub = {
  watchLabel: (label?: string) => Promise<{ success: boolean }>;
  parsePotentialQuote: (rawEmail: string) => Promise<{
    confidence: number;
    client?: { name?: string; email?: string; phone?: string };
    items?: Array<{ description: string; quantity: number; unitPrice: number }>;
  }>;
};

export const gmail: GmailStub = {
  async watchLabel(label?: string) {
    console.log("[gmail] watchLabel", label ?? "INBOX");
    return { success: true };
  },
  async parsePotentialQuote(rawEmail: string) {
    const lowered = rawEmail.toLowerCase();
    const looksLikeQuote = lowered.includes("quote") || lowered.includes("estimate");
    return {
      confidence: looksLikeQuote ? 0.7 : 0.2,
      client: undefined,
      items: [],
    };
  },
};

export type QuickBooksStub = {
  createCustomer: (input: { name: string; email?: string }) => Promise<{ externalId: string }>;
  createEstimate: (input: { customerExternalId: string; total: number }) => Promise<{ externalId: string }>;
  createInvoice: (input: { customerExternalId: string; total: number }) => Promise<{ externalId: string }>;
};

export const quickbooks: QuickBooksStub = {
  async createCustomer(input) {
    console.log("[qbo] createCustomer", input.name);
    return { externalId: `cust_${Math.random().toString(36).slice(2, 8)}` };
  },
  async createEstimate(input) {
    console.log("[qbo] createEstimate", input.customerExternalId, input.total);
    return { externalId: `est_${Math.random().toString(36).slice(2, 8)}` };
  },
  async createInvoice(input) {
    console.log("[qbo] createInvoice", input.customerExternalId, input.total);
    return { externalId: `inv_${Math.random().toString(36).slice(2, 8)}` };
  },
};

export type StripeStub = {
  createCheckoutSession: (input: { amount: number; currency?: string }) => Promise<{ url: string }>;
};

export const stripeStub: StripeStub = {
  async createCheckoutSession({ amount, currency = "usd" }) {
    console.log("[stripe] createCheckoutSession", amount, currency);
    return { url: "https://checkout.stripe.com/test-session" };
  },
};
