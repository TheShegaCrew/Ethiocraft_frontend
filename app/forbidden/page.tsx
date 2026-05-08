"use client";

import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAF9] px-6">
      <section className="w-full max-w-xl rounded-2xl border border-[#e6dece] bg-white p-10 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9c8f7e]">403 Forbidden</p>
        <h1 className="mt-4 text-3xl font-semibold text-[#2d2620]">Access denied</h1>
        <p className="mt-3 text-sm text-[#6f655b]">
          Your account does not have permission to open this page.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/auth/login"
            className="rounded-lg bg-[#2d2620] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Go to login
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-[#d9cfbf] px-5 py-2.5 text-sm font-semibold text-[#2d2620]"
          >
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}
