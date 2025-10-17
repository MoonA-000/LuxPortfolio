import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/signin");

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-gray-500">MTD Revenue</div>
          <div className="text-2xl font-bold">$0.00</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-gray-500">Open Quotes</div>
          <div className="text-2xl font-bold">0</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-gray-500">Pending Invoices</div>
          <div className="text-2xl font-bold">0</div>
        </div>
      </div>
    </div>
  );
}
