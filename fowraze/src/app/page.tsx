import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const signedIn = !!session?.user;
  return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full space-y-6 text-center">
        <h1 className="text-3xl font-bold">Fowraze</h1>
        <p className="text-base text-gray-600">
          Automate your daily grind — quotes, invoices, and follow-ups on autopilot.
        </p>
        <div className="flex items-center justify-center gap-3">
          {signedIn ? (
            <Link href="/dashboard" className="h-10 px-4 rounded-md bg-black text-white inline-flex items-center">
              Go to dashboard
            </Link>
          ) : (
            <Link href="/signin" className="h-10 px-4 rounded-md bg-black text-white inline-flex items-center">
              Get started
            </Link>
          )}
          <a
            href="https://nextjs.org"
            target="_blank"
            rel="noreferrer"
            className="h-10 px-4 rounded-md border inline-flex items-center"
          >
            Learn more
          </a>
        </div>
      </div>
    </div>
  );
}
