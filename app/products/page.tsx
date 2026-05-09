"use client";

import { useCallback, useEffect, useMemo, useState, Suspense, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { toggleWishlistProduct, getWishlistProductIds } from "@/lib/wishlist";
import { Heart } from "lucide-react";
import Link from "next/link";
import ChatSupport from "@/components/ChatSupport";
import { toast } from "react-toastify";
import {
  fetchMarketplaceFacets,
  fetchProducts,
  getProductImage,
  type ApiProductSummary,
  type MarketplaceFacetBucket,
  type MarketplaceFacetsResponse,
  type MarketplaceSortBy,
} from "@/lib/api";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  badge?: "Handmade" | "New";
  region?: string;
  material?: string;
  rating: number;
};

const categories = ["All", "Textiles", "Jewelry", "Home", "Accessories"] as const;

const FALLBACK_REGIONS = ["Addis Ababa", "Oromia", "SNNPR", "Amhara", "Tigray"];
const FALLBACK_MATERIALS = ["Clay", "Cotton", "Silver", "Straw", "Leather"];

const PRICE_CAP = 2600;

const SORT_OPTIONS = [
  { id: "curated" as const, label: "Featured" },
  { id: "relevance" as const, label: "Relevance" },
  { id: "newest" as const, label: "Newest arrivals" },
  { id: "popularity" as const, label: "Popularity" },
  { id: "price-low" as const, label: "Price: Low to High" },
  { id: "price-high" as const, label: "Price: High to Low" },
  { id: "rating-high" as const, label: "Rating: High to Low" },
  { id: "rating-low" as const, label: "Rating: Low to High" },
];

type UiSortId = (typeof SORT_OPTIONS)[number]["id"];

const PARAM_TO_SORT = new Map<string, UiSortId>([
  ["newest", "newest"],
  ["relevance", "relevance"],
  ["popularity", "popularity"],
  ["price-low", "price-low"],
  ["price-high", "price-high"],
  ["rating-high", "rating-high"],
  ["rating-low", "rating-low"],
]);

const SORT_TO_PARAM: Record<UiSortId, string | null> = {
  curated: null,
  newest: "newest",
  relevance: "relevance",
  popularity: "popularity",
  "price-low": "price-low",
  "price-high": "price-high",
  "rating-high": "rating-high",
  "rating-low": "rating-low",
};

function sortFromSearchParam(raw: string | null): UiSortId {
  if (!raw) return "curated";
  return PARAM_TO_SORT.get(raw) ?? "curated";
}

/** Curated defaults to relevance when searching, newest otherwise — reflected in API. */
function uiSortToApiSort(sortBy: UiSortId, appliedQuery: string): MarketplaceSortBy | undefined {
  const hasSearch = Boolean(appliedQuery.trim());
  switch (sortBy) {
    case "curated":
      return hasSearch ? "relevance" : undefined;
    case "newest":
      return "newest";
    case "relevance":
      return hasSearch ? "relevance" : undefined;
    case "price-low":
      return "price_asc";
    case "price-high":
      return "price_desc";
    case "rating-high":
      return "rating_desc";
    case "rating-low":
      return "rating_asc";
    case "popularity":
      return "popularity";
    default:
      return undefined;
  }
}

function facetValuesOrFallback(rows: MarketplaceFacetBucket[], fallback: string[]) {
  const active = rows.filter((r) => r.count > 0).map((r) => r.value);
  return active.length ? active : fallback;
}

export default function productPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9]">
          Loading…
        </div>
      }
    >
      <ProductPageContent />
    </Suspense>
  );
}

function ProductPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const { addItem } = useCart();
  const wishlistUserKey = token ?? "guest";
  const gridRef = useRef<HTMLDivElement>(null);

  const [sortBy, setSortBy] = useState<UiSortId>("curated");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Array<string | number>>([]);
  const [wishlistMessage, setWishlistMessage] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productFetchError, setProductFetchError] = useState("");

  /** Any published category label (URL + API may expose values beyond the curated list below). */
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [showHandmadeOnly, setShowHandmadeOnly] = useState(false);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, PRICE_CAP]);

  const [facets, setFacets] = useState<MarketplaceFacetsResponse | null>(null);
  const [facetsLoading, setFacetsLoading] = useState(false);

  const appliedQuery = (searchParams.get("q")?.trim() ?? "");

  /** Hydrate local filter state from the URL whenever it changes (back/share links). */
  useEffect(() => {
    const catParam = searchParams.get("category")?.trim();
    setActiveCategory(catParam || "All");

    setSelectedRegions(
      searchParams.getAll("region").map((r) => r.trim()).filter(Boolean),
    );
    setSelectedMaterials(
      searchParams.getAll("material").map((m) => m.trim()).filter(Boolean),
    );

    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    if (minPrice != null && maxPrice != null) {
      const lo = Number(minPrice);
      const hi = Number(maxPrice);
      if (!Number.isNaN(lo) && !Number.isNaN(hi)) {
        setPriceRange([
          Math.max(0, Math.min(PRICE_CAP, lo)),
          Math.max(0, Math.min(PRICE_CAP, hi)),
        ]);
      }
    } else {
      setPriceRange([0, PRICE_CAP]);
    }

    setSortBy(sortFromSearchParam(searchParams.get("sort")));
  }, [searchParams]);

  const replaceListingUrl = useCallback(
    (
      overrides: Partial<{
        q: string;
        category: string;
        regions: string[];
        materials: string[];
        priceRange: [number, number];
        sort: UiSortId;
      }>,
      opts?: { replace?: boolean }
    ) => {
      const q = overrides.q ?? appliedQuery;
      const categoryLabel = overrides.category ?? activeCategory;
      const regions = overrides.regions ?? selectedRegions;
      const materials = overrides.materials ?? selectedMaterials;
      const pr = overrides.priceRange ?? priceRange;
      const sort = overrides.sort ?? sortBy;

      const sp = new URLSearchParams();
      const qq = q.trim();
      if (qq) sp.set("q", qq);
      if (categoryLabel !== "All") sp.set("category", categoryLabel);

      regions.forEach((r) => sp.append("region", r));
      materials.forEach((m) => sp.append("material", m));

      if (pr[0] > 0) sp.set("minPrice", String(pr[0]));
      const maxApplied = pr[1] < PRICE_CAP;
      if (maxApplied) sp.set("maxPrice", String(pr[1]));

      const sortParam = SORT_TO_PARAM[sort];
      if (sortParam) sp.set("sort", sortParam);

      const target = `${pathname}?${sp.toString()}`;
      if (opts?.replace === false) router.push(target);
      else router.replace(target, { scroll: false });
    },
    [
      appliedQuery,
      activeCategory,
      selectedMaterials,
      selectedRegions,
      priceRange,
      sortBy,
      pathname,
      router,
    ],
  );

  const facetsQuery = useMemo(
    () => ({
      search: appliedQuery.trim() ? appliedQuery.trim() : undefined,
      category: activeCategory !== "All" ? activeCategory : undefined,
      minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
      maxPrice:
        priceRange[1] < PRICE_CAP ? priceRange[1] : undefined,
      regions: selectedRegions.length ? selectedRegions : undefined,
      materials: selectedMaterials.length ? selectedMaterials : undefined,
    }),
    [
      appliedQuery,
      activeCategory,
      priceRange,
      selectedMaterials,
      selectedRegions,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setFacetsLoading(true);
      try {
        const data = await fetchMarketplaceFacets(facetsQuery);
        if (!cancelled) setFacets(data);
      } catch {
        if (!cancelled) setFacets(null);
      } finally {
        if (!cancelled) setFacetsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [facetsQuery]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoadingProducts(true);
        const apiSort = uiSortToApiSort(sortBy, appliedQuery);
        const response = await fetchProducts({
          limit: 100,
          search: appliedQuery.trim() ? appliedQuery.trim() : undefined,
          category: activeCategory !== "All" ? activeCategory : undefined,
          minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
          maxPrice:
            priceRange[1] < PRICE_CAP ? priceRange[1] : undefined,
          sortBy: apiSort,
          regions: selectedRegions.length ? selectedRegions : undefined,
          materials: selectedMaterials.length ? selectedMaterials : undefined,
        });
        const items = response.items;
        const mappedProducts: Product[] = items.map((item: ApiProductSummary) => ({
          id: item.id,
          name: item.title,
          category: item.category || "Other",
          price: item.price ?? 0,
          image: getProductImage(item) || "/placeholder-product.jpg",
          badge: item.publishedAt ? "Handmade" : undefined,
          region: item.artisan?.artisanProfile?.region || undefined,
          material: item.materials?.[0] || undefined,
          rating: item._count?.reviews ? 5 : 4.5,
        }));
        setProducts(mappedProducts);
        setProductFetchError("");
      } catch (error) {
        console.error("Failed to load products", error);
        setProducts([]);
        setProductFetchError("Failed to load products from backend.");
      } finally {
        setIsLoadingProducts(false);
      }
    };

    void loadProducts();
  }, [
    activeCategory,
    appliedQuery,
    priceRange[0],
    priceRange[1],
    sortBy,
    selectedRegions.join("\0"),
    selectedMaterials.join("\0"),
  ]);

  const filteredProducts = useMemo(() => {
    let base = products
      .filter((product) => (showNewOnly ? product.badge === "New" : true))
      .filter((product) =>
        showHandmadeOnly ? product.badge === "Handmade" : true,
      );

    return base;
  }, [products, showHandmadeOnly, showNewOnly]);

  useEffect(() => {
    setVisibleIds([]);

    if (!gridRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const productId = String(
              entry.target.getAttribute("data-product-id"),
            );
            setVisibleIds((prev) =>
              prev.includes(productId) ? prev : [...prev, productId],
            );
          }
        });
      },
      { threshold: 0.15 },
    );

    const items = gridRef.current.querySelectorAll("[data-product-id]");
    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [filteredProducts]);

  useEffect(() => {
    setWishlistIds(getWishlistProductIds(wishlistUserKey));
  }, [wishlistUserKey]);

  useEffect(() => {
    if (!wishlistMessage) return;
    const timeout = setTimeout(() => setWishlistMessage(""), 1800);
    return () => clearTimeout(timeout);
  }, [wishlistMessage]);

  const regionsList = facets?.regions?.length
    ? [...new Set([...facetValuesOrFallback(facets.regions, FALLBACK_REGIONS), ...FALLBACK_REGIONS])]
    : FALLBACK_REGIONS;
  const materialsList = facets?.materials?.length
    ? [...new Set([...facetValuesOrFallback(facets.materials, FALLBACK_MATERIALS), ...FALLBACK_MATERIALS])]
    : FALLBACK_MATERIALS;

  const resetFilters = () => {
    setActiveCategory("All");
    setShowNewOnly(false);
    setShowHandmadeOnly(false);
    setSelectedRegions([]);
    setSelectedMaterials([]);
    setPriceRange([0, PRICE_CAP]);
    setSortBy("curated");
    router.replace(pathname, { scroll: false });
  };

  const toggleArrayFilter = (
    item: string,
    state: string[],
    setState: (val: string[]) => void,
    key: "regions" | "materials",
  ) => {
    const next = state.includes(item)
      ? state.filter((i) => i !== item)
      : [...state, item];
    setState(next);
    if (key === "regions") {
      replaceListingUrl({ regions: next });
    } else {
      replaceListingUrl({ materials: next });
    }
  };

  const handleWishlistToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    productId: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const { ids, added } = toggleWishlistProduct(wishlistUserKey, productId);
    setWishlistIds(ids);
    setWishlistMessage(
      added ? "Added to wishlist" : "Removed from wishlist",
    );
    toast.info(added ? "Added to wishlist" : "Removed from wishlist");
  };

  const handleAddToCart = (
    event: React.MouseEvent<HTMLButtonElement>,
    product: Product,
  ) => {
    event.preventDefault();
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
      category: product.category,
    });
    toast.success(`${product.name} added to cart`);
  };

  const keywordActive = Boolean(appliedQuery.trim());

  const hasActiveFilters =
    activeCategory !== "All" ||
    showNewOnly ||
    showHandmadeOnly ||
    selectedRegions.length > 0 ||
    selectedMaterials.length > 0 ||
    priceRange[0] > 0 ||
    priceRange[1] < PRICE_CAP ||
    keywordActive ||
    sortBy !== "curated";

  const facetCategoryRows = facets?.categories?.filter((x) => x.count > 0) ?? [];

  const onSortChange = (nextSort: UiSortId) => {
    setSortBy(nextSort);
    replaceListingUrl({ sort: nextSort });
  };

  const onFacetCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    replaceListingUrl({
        category: cat,
    });
  };

  const toggleFacetBucket = (
    value: string,
    current: string[],
    key: "regions" | "materials",
  ) => {
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    if (key === "regions") setSelectedRegions(next);
    else setSelectedMaterials(next);
    if (key === "regions") replaceListingUrl({ regions: next });
    else replaceListingUrl({ materials: next });
  };

  const onPickPriceFacet = (
    bucket: MarketplaceFacetsResponse["priceRanges"][number],
  ) => {
    const hi =
      bucket.maxPrice == null
        ? PRICE_CAP
        : Math.min(PRICE_CAP, bucket.maxPrice);
    const lo = Math.max(0, bucket.minPrice);
    const next: [number, number] =
      bucket.maxPrice == null ? [lo, PRICE_CAP] : [lo, hi];
    setPriceRange(next);
    replaceListingUrl({ priceRange: next });
  };

  /** Desktop left column + mobile drawer share identical filter UI (facets + slider + refine). */
  const renderFilterPanels = (variant: "sidebar" | "drawer") => {
    const isSidebar = variant === "sidebar";
    const labelClass = isSidebar
      ? "mb-2 block text-[10px] uppercase tracking-[0.12em] text-[#7a746d]"
      : "mb-3 block text-xs uppercase tracking-[0.1em] text-[#7a746d]";
    const catBtnClass = (active: boolean) =>
      isSidebar
        ? `flex w-full items-center justify-between gap-2 border px-2 py-1.5 text-left text-xs transition-colors ${
            active
              ? "border-[#C6A75E] text-[#C6A75E]"
              : "border-[#e8e5df] hover:border-[#C6A75E]"
          }`
        : `block w-full border px-3 py-2 text-left text-sm transition-colors ${
            active
              ? "border-[#C6A75E] text-[#C6A75E]"
              : "border-[#ddd8cf] hover:border-[#C6A75E]"
          }`;
    const matRegLabelClass = isSidebar
      ? "flex cursor-pointer items-center justify-between gap-2 border border-[#e8e5df] px-2 py-1.5 text-xs"
      : "flex cursor-pointer items-center justify-between gap-2 border border-[#e8e5df] px-3 py-2 text-sm";

    return (
      <>
        {facetsLoading && (
          <p className="mb-3 text-xs text-[#7a746d]">Updating counts…</p>
        )}

        <div>
          <p className={labelClass}>Category</p>
          <ul className={isSidebar ? "space-y-1" : "space-y-2"}>
            <li>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("All");
                  replaceListingUrl({ category: "All" });
                }}
                className={catBtnClass(activeCategory === "All")}
              >
                <span>All</span>
                {isSidebar && (
                  <span className="text-[10px] text-[#9a9289]"> </span>
                )}
              </button>
            </li>
            {facetCategoryRows.length ? (
              facetCategoryRows.map((row) => (
                <li key={row.value}>
                  <button
                    type="button"
                    onClick={() => onFacetCategoryClick(row.value)}
                    className={`flex w-full items-center justify-between gap-2 border text-left transition-colors ${
                      isSidebar ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm"
                    } ${
                      activeCategory === row.value
                        ? "border-[#C6A75E] text-[#C6A75E]"
                        : `${isSidebar ? "border-[#e8e5df]" : "border-[#ddd8cf]"} hover:border-[#C6A75E]`
                    }`}
                  >
                    <span>{row.value}</span>
                    <span className="text-[10px] text-[#9a9289]">{row.count}</span>
                  </button>
                </li>
              ))
            ) : (
              categories
                .filter((c) => c !== "All")
                .map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => onFacetCategoryClick(c)}
                      className={catBtnClass(activeCategory === c)}
                    >
                      <span>{c}</span>
                    </button>
                  </li>
                ))
            )}
          </ul>
        </div>

        <div>
          <p className={labelClass}>Price bands</p>
          <ul className={isSidebar ? "space-y-1" : "space-y-2"}>
            {(facets?.priceRanges ?? []).map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onPickPriceFacet(b)}
                  className={
                    isSidebar
                      ? "flex w-full items-center justify-between gap-2 border border-[#e8e5df] px-2 py-1.5 text-left text-xs hover:border-[#C6A75E]"
                      : "flex w-full items-center justify-between gap-2 border border-[#e8e5df] px-3 py-2 text-left text-sm hover:border-[#C6A75E]"
                  }
                >
                  <span>{b.label}</span>
                  <span className="text-[10px] text-[#9a9289]">{b.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className={labelClass}>Price range</p>
          <Slider
            min={0}
            max={PRICE_CAP}
            step={50}
            value={priceRange}
            onValueChange={(v) => setPriceRange(v)}
            onValueCommit={(v) =>
              replaceListingUrl({ priceRange: v as [number, number] })
            }
            className="mb-3 w-full"
          />
          <div className="flex items-center justify-between text-sm text-[#1c1c1c]">
            <span>${priceRange[0]}</span>
            <span>${priceRange[1]}</span>
          </div>
        </div>

        <div>
          <p className={labelClass}>Materials</p>
          <ul className={isSidebar ? "space-y-1" : "space-y-2"}>
            {materialsList.map((mat) => {
              const count =
                facets?.materials?.find((m) => m.value === mat)?.count ?? null;
              return (
                <li key={mat}>
                  <label className={matRegLabelClass}>
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedMaterials.includes(mat)}
                        onChange={() =>
                          toggleArrayFilter(
                            mat,
                            selectedMaterials,
                            setSelectedMaterials,
                            "materials",
                          )
                        }
                      />
                      {mat}
                    </span>
                    {count != null && count > 0 && (
                      <span className="text-[10px] text-[#9a9289]">{count}</span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className={labelClass}>Regions</p>
          <ul className={isSidebar ? "space-y-1" : "space-y-2"}>
            {regionsList.map((region) => {
              const count =
                facets?.regions?.find((r) => r.value === region)?.count ?? null;
              return (
                <li key={region}>
                  <label className={matRegLabelClass}>
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedRegions.includes(region)}
                        onChange={() =>
                          toggleArrayFilter(
                            region,
                            selectedRegions,
                            setSelectedRegions,
                            "regions",
                          )
                        }
                      />
                      {region}
                    </span>
                    {count != null && count > 0 && (
                      <span className="text-[10px] text-[#9a9289]">{count}</span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className={labelClass}>Refine</p>
          <label
            className={
              isSidebar
                ? "mb-2 flex cursor-pointer items-center gap-2 text-xs"
                : "mb-2 flex cursor-pointer items-center gap-3 text-sm"
            }
          >
            <input
              type="checkbox"
              checked={showHandmadeOnly}
              onChange={(e) => setShowHandmadeOnly(e.target.checked)}
            />
            Handmade only
          </label>
          <label
            className={
              isSidebar
                ? "flex cursor-pointer items-center gap-2 text-xs"
                : "flex cursor-pointer items-center gap-3 text-sm"
            }
          >
            <input
              type="checkbox"
              checked={showNewOnly}
              onChange={(e) => setShowNewOnly(e.target.checked)}
            />
            New arrivals only
          </label>
        </div>

        <button
          type="button"
          onClick={() => resetFilters()}
          className={
            isSidebar
              ? "w-full border border-[#ddd8cf] py-2.5 text-xs uppercase tracking-[0.1em] transition-colors hover:border-[#C6A75E] hover:text-[#C6A75E]"
              : "w-full border border-[#ddd8cf] py-3 text-sm transition-colors hover:border-[#C6A75E] hover:text-[#C6A75E]"
          }
        >
          Reset filters
        </button>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1C1C1C]">
      <Header />
      <main className="mx-auto max-w-[1400px] px-5 pb-12 pt-28 md:px-10 md:pb-14 md:pt-36">
        <section className="mb-8 flex flex-col gap-6 border-b border-[#e8e5df] pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <p
              className="text-3xl uppercase tracking-[0.08em] md:text-4xl"
              style={{
                fontFamily: '"Druk Wide", "Arial Black", sans-serif',
              }}
            >
              Collection
            </p>
            <p
              className="text-sm text-[#5f5b55]"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Authentic handcrafted pieces from Ethiopia
            </p>
            {keywordActive && (
              <p
                className="text-xs uppercase tracking-[0.08em] text-[#7a746d]"
                style={{ fontFamily: "Aeonik, Inter, sans-serif" }}
              >
                Search: "{searchParams.get("q")}"
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#7a746d]">
              <span>
                Showing {filteredProducts.length}
                {!isLoadingProducts && products.length !== filteredProducts.length
                  ? ""
                  : ` (${products.length} loaded)`}{" "}
                products
              </span>
              {sortBy !== "curated" && (
                <span className="text-[10px] uppercase tracking-wider">
                  Sorted:{" "}
                  {SORT_OPTIONS.find((o) => o.id === sortBy)?.label ?? sortBy}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">
            <label className="sr-only" htmlFor="product-sort-top">
              Sort collection
            </label>
            <select
              id="product-sort-top"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as UiSortId)}
              className="h-11 rounded-none border border-[#ddd8cf] bg-transparent px-4 text-sm outline-none transition-colors focus:border-[#C6A75E]"
              style={{ fontFamily: "Aeonik, Inter, sans-serif" }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>

            {/* Filters button - now opens sidebar from top */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="relative h-11 border border-[#ddd8cf] px-5 text-sm transition-colors hover:border-[#C6A75E] hover:text-[#C6A75E]"
            >
              Filters
              {hasActiveFilters && (
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#C6A75E]" />
              )}
            </button>

            {(hasActiveFilters || keywordActive) && (
              <button
                type="button"
                onClick={() => resetFilters()}
                className="h-11 border border-transparent px-2 text-xs uppercase tracking-wider text-[#8d6f4a] underline-offset-4 hover:underline md:px-3"
              >
                Clear all
              </button>
            )}
          </div>
        </section>

        {wishlistMessage && (
          <p className="mb-5 border border-[#ddd8cf] bg-[#f8f6f1] px-4 py-2 text-xs uppercase tracking-wider text-[#5f5b55]">
            {wishlistMessage}
          </p>
        )}
        {isLoadingProducts && (
          <p className="mb-5 border border-[#ddd8cf] bg-[#f8f6f1] px-4 py-2 text-xs uppercase tracking-wider text-[#5f5b55]">
            Loading products from backend…
          </p>
        )}
        {productFetchError && (
          <p className="mb-5 border border-[#e0b7b7] bg-[#fff5f5] px-4 py-2 text-xs uppercase tracking-wider text-[#8d3a3a]">
            {productFetchError}
          </p>
        )}

        <div className="relative">
          {/* Filter Sidebar - slides from right side when clicked */}
          {drawerOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40 bg-black/20"
                onClick={() => setDrawerOpen(false)}
              />
              
              {/* Sidebar */}
              <aside className="fixed right-0 top-0 z-50 h-full w-[320px] overflow-y-auto border-l border-[#e8e0d1] bg-[#FAFAF9] px-6 py-8 transition-transform duration-500 translate-x-0">
                <div className="mb-8 flex items-center justify-between">
                  <p
                    className="text-sm uppercase tracking-[0.12em]"
                    style={{ fontFamily: '"Druk Wide", sans-serif' }}
                  >
                    Filters
                  </p>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="text-[#7a746d] hover:text-[#C6A75E]"
                  >
                    ✕
                  </button>
                </div>
                
                <div
                  className="space-y-6 text-sm"
                  style={{ fontFamily: "Aeonik, Inter, sans-serif" }}
                >
                  {renderFilterPanels("sidebar")}
                </div>
              </aside>
            </>
          )}

          <div className="min-w-0 flex-1">
            {/* Mobile facets strip - keep for quick access */}
            <div className="mb-6 border border-[#ede8e0] bg-[#faf9f6] p-4 lg:hidden">
              <p className="mb-3 text-[10px] uppercase tracking-[0.12em] text-[#7a746d]">
                Quick facets
              </p>
              <div className="flex flex-wrap gap-2">
                {(facets?.materials ?? [])
                  .filter((m) => m.count > 0)
                  .slice(0, 8)
                  .map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() =>
                        toggleFacetBucket(m.value, selectedMaterials, "materials")
                      }
                      className={`border px-2 py-1 text-[10px] uppercase tracking-[0.08em] ${
                        selectedMaterials.includes(m.value)
                          ? "border-[#C6A75E]"
                          : "border-[#ddd8cf]"
                      }`}
                    >
                      {m.value} ({m.count})
                    </button>
                  ))}
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <section className="py-20 text-center">
                <p className="text-lg">No pieces found for this selection.</p>
                <button
                  type="button"
                  onClick={() => resetFilters()}
                  className="mt-6 border border-[#ddd8cf] px-6 py-3 text-sm transition-colors hover:border-[#C6A75E] hover:text-[#C6A75E]"
                  style={{ fontFamily: "Aeonik, Inter, sans-serif" }}
                >
                  Reset filters
                </button>
              </section>
            ) : (
              <section
                ref={gridRef}
                className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 md:gap-x-9 md:gap-y-16 xl:grid-cols-4"
              >
                {filteredProducts.map((product, index) => {
                  const isVisible = visibleIds.includes(product.id);
                  return (
                    <article
                      key={product.id}
                      data-product-id={product.id}
                      className="group"
                      style={{
                        opacity: isVisible ? 1 : 0,
                        transform: isVisible ? "translateY(0)" : "translateY(26px)",
                        transition:
                          `opacity 700ms ease ${index * 70}ms, transform 700ms ease ${index * 70}ms`,
                      }}
                    >
                      <div className="relative block overflow-hidden bg-[#f1eee8]">
                        <Link
                          href={`/products/${product.id}`}
                          className="group block h-full w-full"
                        >
                          {product.badge && (
                            <span
                              className="absolute left-3 top-3 z-10 border border-[#d8c28a] bg-[#fafaf9cc] px-2 py-1 text-[10px] uppercase tracking-[0.1em]"
                              style={{
                                fontFamily: "Aeonik, Inter, sans-serif",
                              }}
                            >
                              {product.badge}
                            </span>
                          )}
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-[240px] w-full object-cover transition duration-500 ease-out group-hover:scale-105 md:h-[320px]"
                          />
                          <div
                            className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 border border-[#e6dfd2] bg-[#fafaf9f0] px-4 py-2 text-xs opacity-0 transition duration-300 group-hover:opacity-100 md:block"
                            style={{
                              fontFamily: "Aeonik, Inter, sans-serif",
                            }}
                          >
                            Quick view
                          </div>
                        </Link>
                        <button
                          type="button"
                          aria-label={
                            wishlistIds.includes(product.id)
                              ? "Remove from wishlist"
                              : "Add to wishlist"
                          }
                          onClick={(event) => handleWishlistToggle(event, product.id)}
                          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center transition-colors"
                        >
                          <Heart
                            className={`h-5 w-5 transition-colors ${
                              wishlistIds.includes(product.id)
                                ? "fill-[#C6A75E] text-[#C6A75E]"
                                : "text-[#cfc3b8] hover:text-[#C6A75E]"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="pt-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] uppercase tracking-[0.1em] text-[#7a746d]">
                            {product.category}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-[#C6A75E]">
                            <span>★</span>
                            <span style={{ fontFamily: "Inter, sans-serif" }}>
                              {product.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        <Link href={`/products/${product.id}`}>
                          <h3
                            className="mt-2 text-sm uppercase tracking-[0.05em] transition-colors duration-300 hover:text-[#C6A75E] md:text-base"
                            style={{
                              fontFamily:
                                '"Druk Wide", Aeonik, Inter, sans-serif',
                            }}
                          >
                            {product.name}
                          </h3>
                        </Link>

                        <div className="mt-4 flex items-center justify-between border-t border-[#e8e5df] pt-4">
                          <p className="text-sm font-medium" style={{ fontFamily: "Inter, sans-serif" }}>
                            ${product.price}
                          </p>
                          <Button
                            onClick={(event) =>
                              handleAddToCart(event, product)
                            }
                            variant="outline"
                            className="h-9 rounded-none border-[#ddd8cf] bg-transparent px-4 text-[10px] uppercase tracking-widest transition-colors hover:border-[#C6A75E] hover:bg-[#C6A75E] hover:text-white"
                          >
                            Add to cart
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </div>
        </div>
      </main>

      <ChatSupport />
      <Footer />
    </div>
  );
}
