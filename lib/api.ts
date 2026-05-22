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

/** Remove all read notifications for the authenticated user. */
export async function clearReadNotifications(): Promise<{ deletedCount: number }> {
  const res = await apiFetch("/notifications/read", {
    method: "DELETE",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err?.message === "string"
        ? err.message
        : `Failed to clear read notifications: ${res.status}`,
    );
  }

  const json = await res.json();
  return (json.data ?? { deletedCount: 0 }) as { deletedCount: number };
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

// ─── User Profile API ────────────────────────────────────────────────────────

export type ApiUserArtisanProfile = {
  shopName: string;
  bio?: string | null;
  region?: string | null;
  city?: string | null;
  extensionData?: {
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
    [key: string]: unknown;
  } | null;
  artisanBankDetail?: {
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
    branch?: string | null;
    accountType?: string | null;
    currency?: string | null;
    verifiedAt?: string | null;
  } | null;
};

export type ApiUserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  avatarUrl: string | null;
  status: string;
  createdAt: string;
  artisanProfile?: ApiUserArtisanProfile | null;
};

export type UpdateProfilePayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  artisanProfile?: {
    shopName?: string;
    bio?: string;
    region?: string;
    city?: string;
    extensionData?: Record<string, unknown>;
  };
  artisanBankDetail?: {
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
    branch?: string;
    accountType?: string;
    currency?: string;
  };
};

/** Fetch the authenticated user's profile. */
export async function fetchUserProfile(): Promise<ApiUserProfile> {
  const res = await apiFetch("/users/me", { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to fetch profile: ${res.status}`);
  }
  const json = await res.json();
  return json.data as ApiUserProfile;
}

/** Update the authenticated user's profile. */
export async function updateUserProfile(payload: UpdateProfilePayload): Promise<ApiUserProfile> {
  const res = await apiFetch("/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to update profile: ${res.status}`);
  }
  const json = await res.json();
  return json.data as ApiUserProfile;
}

// ─── Address API ─────────────────────────────────────────────────────────────

export type ApiAddress = {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string;
  region: string;
  city: string;
  subCity: string | null;
  woreda: string | null;
  kebele: string | null;
  line1: string;
  line2: string | null;
  postalCode: string | null;
  isDefault: boolean;
};

export type AddressPayload = {
  label?: string;
  recipientName: string;
  phone: string;
  region: string;
  city: string;
  subCity?: string;
  woreda?: string;
  kebele?: string;
  line1: string;
  line2?: string;
  postalCode?: string;
  isDefault?: boolean;
};

/** Fetch all saved addresses for the authenticated user. */
export async function fetchUserAddresses(): Promise<ApiAddress[]> {
  const res = await apiFetch("/users/me/addresses", { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to fetch addresses: ${res.status}`);
  }
  const json = await res.json();
  return json.data as ApiAddress[];
}

/** Create a new address for the authenticated user. */
export async function createUserAddress(payload: AddressPayload): Promise<ApiAddress> {
  const res = await apiFetch("/users/me/addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to create address: ${res.status}`);
  }
  const json = await res.json();
  return json.data as ApiAddress;
}

/** Update an existing address by ID. */
export async function updateUserAddress(
  addressId: string,
  payload: Partial<AddressPayload>
): Promise<ApiAddress> {
  const res = await apiFetch(`/users/me/addresses/${addressId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to update address: ${res.status}`);
  }
  const json = await res.json();
  return json.data as ApiAddress;
}

/** Delete an address by ID. */
export async function deleteUserAddress(addressId: string): Promise<void> {
  const res = await apiFetch(`/users/me/addresses/${addressId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to delete address: ${res.status}`);
  }
}

// ─── Artisan product workflow ────────────────────────────────────────────────

export type ApiArtisanSample = {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  price?: number | string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  media: ApiMedia[];
};

export type ApiArtisanDraft = {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  price?: number | string | null;
  stock?: number | null;
  status: string;
  verificationNotes?: string | null;
  submissionNotes?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  updatedAt: string;
  createdAt: string;
  media: ApiMedia[];
  sampleId?: string | null;
};

export type ArtisanSamplePayload = {
  title: string;
  description: string;
  category: string;
  price?: number;
  stock?: number;
  materials?: string[];
  tags?: string[];
};

function formatApiError(err: Record<string, unknown>, fallback: string): string {
  const details = err.details;
  if (Array.isArray(details) && details.length > 0) {
    const parts = details.map((d: { path?: string; message?: string }) =>
      d.path ? `${d.path}: ${d.message}` : d.message
    );
    return parts.filter(Boolean).join("; ") || fallback;
  }
  return typeof err.message === "string" ? err.message : fallback;
}

const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

/** Resolve relative upload paths or pass through Cloudinary HTTPS URLs. */
export function resolveMediaUrl(url?: string | null, fallback = "/placeholder.svg?height=150&width=150"): string {
  if (!url) return fallback;
  if (/^https?:\/\//i.test(url)) return url;
  return url.startsWith("/") ? `${API_ORIGIN}${url}` : `${API_ORIGIN}/${url}`;
}

export async function fetchArtisanSamples(): Promise<ApiArtisanSample[]> {
  const res = await apiFetch("/artisan/products/samples", { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to fetch samples: ${res.status}`);
  }
  const json = await res.json();
  return (json.data ?? []) as ApiArtisanSample[];
}

export async function createArtisanSample(payload: ArtisanSamplePayload): Promise<string> {
  const res = await apiFetch("/artisan/products/samples", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiError(err, `Failed to create sample: ${res.status}`));
  }
  const json = await res.json();
  const data = json.data ?? json;
  return data.sampleId ?? data.id;
}

export async function uploadArtisanSampleImages(sampleId: string, files: File[]): Promise<void> {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  const res = await apiFetch(`/artisan/products/samples/${sampleId}/images`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiError(err, `Failed to upload sample images: ${res.status}`));
  }
}

export async function fetchArtisanDrafts(status?: string): Promise<ApiArtisanDraft[]> {
  const path = status ? `/artisan/products/drafts?status=${encodeURIComponent(status)}` : "/artisan/products/drafts";
  const res = await apiFetch(path, { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to fetch drafts: ${res.status}`);
  }
  const json = await res.json();
  return (json.data ?? []) as ApiArtisanDraft[];
}

export async function fetchArtisanPublishedProducts(
  status?: "APPROVED" | "PUBLISHED" | "ALL"
): Promise<ApiProductSummary[]> {
  const path = status
    ? `/artisan/products/published?status=${encodeURIComponent(status)}`
    : "/artisan/products/published";
  const res = await apiFetch(path, { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to fetch products: ${res.status}`);
  }
  const json = await res.json();
  return (json.data ?? []) as ApiProductSummary[];
}

export async function fetchArtisanSample(sampleId: string): Promise<ApiArtisanSample> {
  const res = await apiFetch(`/artisan/products/samples/${sampleId}`, { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to fetch sample: ${res.status}`);
  }
  const json = await res.json();
  return json.data as ApiArtisanSample;
}

export async function updateArtisanSample(
  sampleId: string,
  payload: Partial<ArtisanSamplePayload>,
): Promise<ApiArtisanSample> {
  const res = await apiFetch(`/artisan/products/samples/${sampleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiError(err, `Failed to update sample: ${res.status}`));
  }
  const json = await res.json();
  return json.data as ApiArtisanSample;
}

export async function resubmitArtisanSample(sampleId: string): Promise<ApiArtisanSample> {
  const res = await apiFetch(`/artisan/products/samples/${sampleId}/resubmit`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiError(err, `Failed to resubmit sample: ${res.status}`));
  }
  const json = await res.json();
  return json.data as ApiArtisanSample;
}

export async function deleteArtisanSample(sampleId: string): Promise<{ deletedId: string }> {
  const res = await apiFetch(`/artisan/products/samples/${sampleId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiError(err, `Failed to delete sample: ${res.status}`));
  }
  const json = await res.json();
  return (json.data ?? { deletedId: sampleId }) as { deletedId: string };
}

export type ArtisanDraftPayload = {
  title?: string;
  description?: string;
  category?: string;
  price?: number;
  stock?: number;
  materials?: string[];
  tags?: string[];
};

export async function fetchArtisanDraft(draftId: string): Promise<ApiArtisanDraft> {
  const res = await apiFetch(`/artisan/products/drafts/${draftId}`, { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to fetch draft: ${res.status}`);
  }
  const json = await res.json();
  return json.data as ApiArtisanDraft;
}

export async function updateArtisanDraft(
  draftId: string,
  payload: ArtisanDraftPayload,
): Promise<ApiArtisanDraft> {
  const res = await apiFetch(`/artisan/products/drafts/${draftId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiError(err, `Failed to update draft: ${res.status}`));
  }
  const json = await res.json();
  return json.data as ApiArtisanDraft;
}

export async function uploadArtisanDraftImages(draftId: string, files: File[]): Promise<ApiArtisanDraft> {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  const res = await apiFetch(`/artisan/products/drafts/${draftId}/images`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiError(err, `Failed to upload draft images: ${res.status}`));
  }
  const json = await res.json();
  return json.data as ApiArtisanDraft;
}

export async function submitArtisanDraft(
  draftId: string,
  submissionNotes?: string,
): Promise<ApiArtisanDraft> {
  const res = await apiFetch(`/artisan/products/drafts/${draftId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(submissionNotes ? { submissionNotes } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiError(err, `Failed to submit draft: ${res.status}`));
  }
  const json = await res.json();
  return json.data as ApiArtisanDraft;
}

