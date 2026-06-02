"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showBackToDashboard = pathname !== "/admin/dashboard";

  return (
    <>
      {showBackToDashboard ? (
        <div className="sticky top-0 z-40 px-4 pt-4 sm:px-6 lg:px-8">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm backdrop-blur transition hover:bg-stone-100"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
        </div>
      ) : null}
      {children}
    </>
  );
}
