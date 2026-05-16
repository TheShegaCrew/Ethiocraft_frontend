const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/$/, "") ||
  "http://localhost:4000/api/v1";

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers ?? {});

  return fetch(buildApiUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });
}
/**
 * EthioCraft API Client
 * Base URL: process.env.NEXT_PUBLIC_BASE_URL (e.g. http://localhost:4000/api/v1)
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:4000/api/v1";

// ─── Types returned by the backend ───────────────────────────────────────────

export type ApiMedia = {
  id: string;
  url: string;
  sortOrder: number;
};

export type ApiArtisanProfile = {
  shopName: string | null;
  bio: string | null;
  city: string | null;
  region: string | null;
};

export type ApiArtisan = {
  id: string;
  firstName: string;
  lastName: string;
  artisanProfile: ApiArtisanProfile | null;
};

export type ApiReview = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

export type ApiProductSummary = {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  materials?: string[];
  tags: string[];
  status: string;
  publishedAt: string | null;
  media: ApiMedia[];
  artisan: ApiArtisan;
  _count: { reviews: number };
};

export type ApiProductDetail = ApiProductSummary & {
  shortDescription?: string;
  material?: string;
  dimensions?: string;
  careInstructions?: string;
  reviews: ApiReview[];
  relatedProducts: ApiProductSummary[];
  averageRating: number | null;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ProductListResponse = {
  items: ApiProductSummary[];
  meta: PaginationMeta;
};

export type ApiOrderItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product: {
    id: string;
    title: string;
    slug: string;
  };
};

export type ApiOrder = {
  id: string;
  status: string;
  subtotalAmount: number;
  shippingFee: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
  items: ApiOrderItem[];
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  shippingAddress?: {
    fullName?: string;
    phoneNumber?: string;
    street?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
  } | null;
  deliveryAddress?: {
    fullName?: string;
    phoneNumber?: string;
    street?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
  } | null;
  estimatedDeliveryDate?: string | null;
  deliveredAt?: string | null;
};

export type ApiOrderTrackingEvent = {
  id?: string;
  status: string;
  location?: string | null;
  description?: string | null;
  note?: string | null;
  timestamp?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ApiOrderTracking = {
  orderId: string;
  shipmentStatus?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
  estimatedDeliveryDate?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  events: ApiOrderTrackingEvent[];
};

export type OrderListParams = {
  page?: number;
  limit?: number;
  status?: string;
};

export type OrderListResponse = {
  items: ApiOrder[];
  meta: PaginationMeta;
};

export type ApiNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: any;
  createdAt: string;
};

export type NotificationListResponse = {
  items: ApiNotification[];
  // Backend returns a flat array — meta will be derived client-side
};

// ─── Query params for product list ───────────────────────────────────────────

export type MarketplaceSortBy =
  | "price_asc"
  | "price_desc"
  | "oldest"
  | "newest"
  | "rating_desc"
  | "rating_asc"
  | "popularity"
  | "relevance";

export type ProductListParams = {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: MarketplaceSortBy;
  page?: number;
  limit?: number;
  /** Artisan profile region(s); duplicates become repeated `region=` query keys. */
  regions?: string[];
  /** Product materials array must include at least one of these (OR). */
  materials?: string[];
};

/** Filter context passed to facets (no pagination / sort). */
export type MarketplaceFacetsParams = {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  regions?: string[];
  materials?: string[];
};

export type SearchSuggestionKind = "product" | "artisan" | "material";

export type SearchSuggestionItem = {
  kind: SearchSuggestionKind;
  label: string;
  productId?: string;
  artisanId?: string;
  category?: string;
  score?: number;
};

export type SearchSuggestionsResponse = {
  items: SearchSuggestionItem[];
  meta: { limit: number; query?: string };
};

export type MarketplaceFacetBucket = {
  value: string;
  count: number;
};

export type MarketplacePriceFacet = {
  id: string;
  label: string;
  minPrice: number;
  maxPrice: number | null;
  count: number;
};

export type MarketplaceFacetsResponse = {
  categories: MarketplaceFacetBucket[];
  materials: MarketplaceFacetBucket[];
  regions: MarketplaceFacetBucket[];
  priceRanges: MarketplacePriceFacet[];
};

function appendMarketplaceFilterParams(
  url: URL,
  params: Pick<
    MarketplaceFacetsParams,
    "search" | "category" | "minPrice" | "maxPrice"
  > & {
    regions?: string[];
    materials?: string[];
  }
) {
  if (params.search) url.searchParams.set("search", params.search);
  if (params.category) url.searchParams.set("category", params.category);
  if (params.minPrice !== undefined)
    url.searchParams.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined)
    url.searchParams.set("maxPrice", String(params.maxPrice));
  params.regions?.forEach((region) => url.searchParams.append("region", region));
  params.materials?.forEach((material) =>
    url.searchParams.append("material", material),
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the first media URL for a product, or a placeholder. */
export function getProductImage(product: ApiProductSummary): string {
  return product.media?.[0]?.url || "/placeholder-product.jpg";
}

/** Returns the full artisan display name. */
export function getArtisanName(artisan: ApiArtisan): string {
  return `${artisan.firstName} ${artisan.lastName}`.trim();
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Fetch published products with optional filter/sort/pagination params.
 */
export async function fetchProducts(
  params: ProductListParams = {}
): Promise<ProductListResponse> {
  const url = new URL(`${BASE_URL}/marketplace/products`);

  appendMarketplaceFilterParams(url, params);
  if (params.sortBy) url.searchParams.set("sortBy", params.sortBy);
  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.limit) url.searchParams.set("limit", String(params.limit));

  const res = await fetch(url.toString(), { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch products: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  // Backend returns: { message: string, data: { items, meta } }
  return json.data as ProductListResponse;
}

/** Predictive marketplace search suggestions (2+ chars on server). */
export async function fetchSearchSuggestions(params: {
  q: string;
  limit?: number;
}): Promise<SearchSuggestionsResponse> {
  const url = new URL(`${BASE_URL}/marketplace/products/suggestions`);
  if (params.q) url.searchParams.set("q", params.q.trim());
  if (params.limit) url.searchParams.set("limit", String(params.limit));

  const res = await fetch(url.toString(), { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch suggestions: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  return json.data as SearchSuggestionsResponse;
}

/** Faceted counts for the current marketplace filter context (excludes conflicting facet groups server-side). */
export async function fetchMarketplaceFacets(
  params: MarketplaceFacetsParams = {}
): Promise<MarketplaceFacetsResponse> {
  const url = new URL(`${BASE_URL}/marketplace/products/facets`);
  appendMarketplaceFilterParams(url, params);

  const res = await fetch(url.toString(), { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch facets: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  return json.data as MarketplaceFacetsResponse;
}

/**
 * Fetch a single product by ID (or slug).
 */
export async function fetchProductById(
  idOrSlug: string
): Promise<ApiProductDetail> {
  const res = await fetch(
    `${BASE_URL}/marketplace/products/${idOrSlug}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch product "${idOrSlug}": ${res.status} ${res.statusText}`
    );
  }

  const json = await res.json();
  // Backend returns: { message: string, data: { ...product } }
  return json.data as ApiProductDetail;
}

export async function fetchOrders(
  _token: string | null = null,
  params: OrderListParams = {}
): Promise<OrderListResponse> {
  const url = new URL(`${BASE_URL}/orders`);

  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.status) url.searchParams.set("status", params.status);

  const res = await apiFetch(`/orders`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to fetch orders: ${res.status}`);
  }

  const json = await res.json();
  return json.data as OrderListResponse;
}

export async function fetchOrderById(
  orderId: string,
  _token: string | null = null
): Promise<ApiOrder> {
  const res = await apiFetch(`/orders/${orderId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to fetch order: ${res.status}`);
  }

  const json = await res.json();
  return json.data as ApiOrder;
}

export async function fetchOrderTracking(
  orderId: string,
  _token: string | null = null
): Promise<ApiOrderTracking> {
  const res = await apiFetch(`/orders/${orderId}/tracking`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.message || `Failed to fetch order tracking: ${res.status}`
    );
  }

  const json = await res.json();
  const data = (json.data || {}) as Partial<ApiOrderTracking>;
  return {
    orderId: data.orderId || orderId,
    shipmentStatus: data.shipmentStatus ?? null,
    carrier: data.carrier ?? null,
    trackingNumber: data.trackingNumber ?? null,
    estimatedDeliveryDate: data.estimatedDeliveryDate ?? null,
    shippedAt: data.shippedAt ?? null,
    deliveredAt: data.deliveredAt ?? null,
    events: Array.isArray(data.events) ? data.events : [],
  };
}

/**
 * Submit a product review. Requires a valid JWT token.
 */
export async function submitReview(
  productId: string,
  _token: string | null,
  payload: { rating: number; comment: string }
): Promise<ApiReview> {
  const res = await apiFetch(`/marketplace/products/${productId}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Review submission failed: ${res.status}`);
  }

  const json = await res.json();
  return json.data as ApiReview;
}

export async function fetchNotifications(
  params: { page?: number; limit?: number; unreadOnly?: boolean } = {}
): Promise<NotificationListResponse> {
  const res = await apiFetch("/notifications/me", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch notifications: ${res.status}`);
  }

  const json = await res.json();
  // Backend returns: { message, data: [...] }  (plain array, not paginated)
  const raw = Array.isArray(json.data) ? json.data : [];
  return { items: raw as ApiNotification[] };
}

export async function markNotificationAsRead(id: string): Promise<ApiNotification> {
  const res = await apiFetch(`/notifications/${id}/read`, {
    method: "PATCH",
  });

  if (!res.ok) {
    throw new Error(`Failed to mark notification as read: ${res.status}`);
  }

  const json = await res.json();
  return json.data as ApiNotification;
}

/** Admin: send a manual notification to a specific user (admin-only). */
export async function sendAdminNotification(userId: string, payload: { title: string; message: string; type?: string }) {
  const res = await apiFetch(`/admin/users/${userId}/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to send notification: ${res.status}`);
  }

  const json = await res.json();
  return json.data as ApiNotification;
}

/** Admin: request re-verification for a sample (admin-only). */
export async function adminReverifySample(sampleId: string, payload: { message: string }) {
  const res = await apiFetch(`/admin/samples/${sampleId}/re-verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to request re-verification: ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

// ─── Cart API ───────────────────────────────────────────────────────────────

export type ApiCartItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product: ApiProductSummary;
};

export type ApiCartResponse = {
  items: ApiCartItem[];
  summary: {
    itemCount: number;
    subtotal: number;
    currency: string;
  };
};

export async function fetchCartItems(): Promise<ApiCartResponse> {
  const res = await apiFetch("/cart", { cache: "no-store" });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Failed to fetch cart: ${res.status} - ${errText}`);
  }
  const json = await res.json();
  return json.data as ApiCartResponse;
}

export async function addToCartApi(productId: string, quantity: number = 1): Promise<void> {
  const res = await apiFetch("/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, quantity }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to add to cart: ${res.status}`);
  }
}

export async function updateCartItemApi(productId: string, quantity: number): Promise<void> {
  const res = await apiFetch(`/cart/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to update cart item: ${res.status}`);
  }
}

export async function removeFromCartApi(productId: string): Promise<void> {
  const res = await apiFetch(`/cart/${productId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Failed to remove cart item: ${res.status}`);
  }
}

export async function clearCartApi(): Promise<void> {
  const res = await apiFetch("/cart", {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Failed to clear cart: ${res.status}`);
  }
}

// ─── Wishlist API ───────────────────────────────────────────────────────────

export type ApiWishlistItem = {
  id: string;
  productId: string;
  createdAt: string;
  // product details omitted for brevity since we mostly just need productIds for the context
};

export type WishlistResponse = {
  items: ApiWishlistItem[];
};

export async function fetchWishlistItems(): Promise<WishlistResponse> {
  const res = await apiFetch("/wishlist?limit=100", { cache: "no-store" });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Failed to fetch wishlist: ${res.status} - ${errText}`);
  }
  const json = await res.json();
  return json.data as WishlistResponse;
}

export async function toggleWishlistApi(productId: string): Promise<{ action: "added" | "removed" }> {
  const res = await apiFetch("/wishlist/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to toggle wishlist item: ${res.status}`);
  }
  const json = await res.json();
  return json.data as { action: "added" | "removed" };
}

