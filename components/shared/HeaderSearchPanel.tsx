"use client";

import type { RefObject } from "react";
import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import ProductSearchAutocomplete from "@/components/products/ProductSearchAutocomplete";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type HeaderSearchPanelProps = {
  onClose: () => void;
  /** Optional ref for programmatic focus (matches previous header input ref). */
  inputRef?: RefObject<HTMLInputElement | null>;
};

/**
 * Full-text + suggestions search for the site header. Keeps existing `/products`
 * query params when the user is already on the collection page.
 */
export default function HeaderSearchPanel({
  onClose,
  inputRef,
}: HeaderSearchPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  // Avoid using `useSearchParams()` here to prevent SSR prerender issues —
  // read from `window.location` on the client instead.
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();

  const committedQuery = pathname === "/products" ? (searchParams.get("q") ?? "").trim() : "";

  const applySearch = useCallback(
    (raw: string) => {
      const q = raw.trim();

      if (pathname === "/products") {
        const sp = new URLSearchParams(searchParams.toString());
        if (q) sp.set("q", q);
        else sp.delete("q");
        const qs = sp.toString();
        router.push(qs ? `/products?${qs}` : "/products");
        onClose();
        return;
      }

      if (!q) return;
      router.push(`/products?q=${encodeURIComponent(q)}`);
      onClose();
    },
    [pathname, router, onClose],
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl items-start gap-3">
      <ProductSearchAutocomplete
        className="min-w-0 flex-1"
        committedQuery={committedQuery}
        placeholder="Search products, artisans, materials…"
        onApplySearch={(query) => applySearch(query)}
        inputRef={inputRef}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-[#1C1C1C]"
        aria-label="Close search"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </Button>
    </div>
  );
}
