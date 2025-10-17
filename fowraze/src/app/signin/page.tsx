"use client";

import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border p-6 space-y-4">
        <h1 className="text-xl font-semibold">Sign in to Fowraze</h1>
        <button
          className="w-full h-10 rounded-md bg-black text-white hover:opacity-90"
          onClick={() => signIn("google")}
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
