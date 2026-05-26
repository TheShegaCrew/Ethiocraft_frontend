"use client";
import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { Heart } from "lucide-react";
import React from "react";
import { createElement, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ChatSupport from "@/components/ChatSupport";
import { toast } from "react-toastify";
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchProductById,
  getArtisanName,
  getProductImage,
  resolveMediaUrl,
  submitReview,
  type ApiProductSummary,
  type ApiReview,
} from "@/lib/api";

// --- Types ---

type Review = {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  isVerified: boolean;
};

type DetailProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  shortDescription: string;
  story: string;
  material: string;
  dimensions: string;
  care: string;
  badge?: "Handmade" | "New";
  images: string[];
  modelUrl?: string | null;
  artisan: {
    name: string;
    title: string;
    portrait: string;
    story: string;
  };
};

type RelatedProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  badge?: "Handmade" | "New";
};

const initialEmptyProduct: DetailProduct = {
  id: "",
  name: "",
  category: "",
  price: 0,
  shortDescription: "",
  story: "",
  material: "",
  dimensions: "",
  care: "",
  images: [],
  modelUrl: null,
  artisan: {
    name: "",
    title: "",
    portrait: "",
    story: "",
  },
};

function normalizeProductDimensions(
  dimensions?: string | { measurements?: string } | null,
): string {
  if (!dimensions) return "Not specified";
  if (typeof dimensions === "string") return dimensions;
  if (typeof dimensions === "object" && "measurements" in dimensions) {
    return dimensions.measurements ?? "Not specified";
  }
  return JSON.stringify(dimensions);
}

export default function App() {
  const params = useParams<{ id: string }>();
  const routeProductId = params?.id;
  const { token } = useAuth();
  const { addItem } = useCart();
  const { wishlistIds, toggleWishlist } = useWishlist();
  const [product, setProduct] = useState<DetailProduct>(initialEmptyProduct);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [productFetchError, setProductFetchError] = useState("");
  // UI States
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [mediaMode, setMediaMode] = useState<"image" | "3d">("image");
  const [is3DActivated, setIs3DActivated] = useState(false);
  const [isModelViewerReady, setIsModelViewerReady] = useState(false);
  const isWishlisted = wishlistIds.includes(product.id);
  const [loaded, setLoaded] = useState(false);
  const [revealedSections, setRevealedSections] = useState<string[]>([]);

  const [modelUrl, setModelUrl] = useState<string | null>(null);

  // Review Form States (UC17)
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState("");
  const [reviewStatus, setReviewStatus] = useState<
    "idle" | "submitting" | "success"
  >("idle");
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    const loadProduct = async () => {
      if (!routeProductId) return;

      try {
        setIsLoadingProduct(true);
        const apiProduct = await fetchProductById(routeProductId);
        const mediaUrls = apiProduct.media?.map((m) => resolveMediaUrl(m.url)).filter(Boolean) || [];
        const modelUrlFromMedia = mediaUrls.find((url) => {
          const extension = url?.split("?")[0]?.split(".").pop()?.toLowerCase();
          return ["gltf", "glb", "obj", "fbx", "stl", "ply", "usdz"].includes(extension ?? "");
        }) ?? null;

        setProduct({
          id: apiProduct.id,
          name: apiProduct.title,
          category: apiProduct.category,
          price: apiProduct.price,
          shortDescription:
            apiProduct.shortDescription || apiProduct.description,
          story: apiProduct.description,
          material: apiProduct.material || "Handcrafted mixed materials",
          dimensions: normalizeProductDimensions(apiProduct.dimensions),
          care: apiProduct.careInstructions || "Ask artisan for care guide",
          badge: apiProduct.publishedAt ? "Handmade" : undefined,
          images: mediaUrls.filter((url) => {
            const extension = url?.split("?")[0]?.split(".").pop()?.toLowerCase();
            return !["gltf", "glb", "obj", "fbx", "stl", "ply", "usdz"].includes(extension ?? "");
          }),
          modelUrl: modelUrlFromMedia,
          artisan: {
            name: getArtisanName(apiProduct.artisan),
            title: apiProduct.artisan?.artisanProfile?.shopName || "Artisan",
            portrait:
              apiProduct.media?.[0]?.url ||
              "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?auto=format&fit=crop&w=900&q=80",
            story:
              apiProduct.artisan?.artisanProfile?.bio ||
              "Authentic Ethiopian craft expertise.",
          },
        });
        setModelUrl(modelUrlFromMedia);

        setRelatedProducts(
          (apiProduct.relatedProducts || []).map((item: ApiProductSummary) => ({
            id: item.id,
            name: item.title,
            category: item.category,
            price: item.price,
            image: getProductImage(item),
            badge: item.publishedAt ? ("Handmade" as const) : undefined,
          })),
        );

        setReviews(
          (apiProduct.reviews || []).map((review: ApiReview) => ({
            id: review.id,
            author: `${review.customer.firstName} ${review.customer.lastName}`,
            rating: review.rating,
            date: new Date(review.createdAt).toLocaleDateString(),
            comment: review.comment,
            isVerified: true,
          })),
        );
        setProductFetchError("");
      } catch (error) {
        console.error("Failed to load product detail", error);
        setProduct(initialEmptyProduct);
        setRelatedProducts([]);
        setReviews([]);
        const msg = error instanceof Error ? error.message : 'Failed to load product detail from backend.'
        setProductFetchError(msg);
        toast.error(msg)
      } finally {
        setIsLoadingProduct(false);
      }
    };

    loadProduct();
  }, [routeProductId]);

  // Business Rules Mocks (Normally from AuthContext/API)
  const isUserAuthenticated = Boolean(token);
  const hasPurchasedAndReceived = true; // Use Case: "Customer has purchased and received the product"
  const hasAlreadyReviewed = false; // Business Rule: "one review per customer per product"

  useEffect(() => {
    setLoaded(true);
  }, []);




  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const sectionId = entry.target.getAttribute("data-reveal-id");
          if (!sectionId) return;
          setRevealedSections((prev) =>
            prev.includes(sectionId) ? prev : [...prev, sectionId],
          );
        });
      },
      { threshold: 0.1 },
    );
    document
      .querySelectorAll("[data-reveal-id]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!is3DActivated) return;
    let isActive = true;

    if (customElements.get("model-viewer")) {
      if (isActive) setIsModelViewerReady(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"]',
    );
    if (existingScript) {
      if (isActive) setIsModelViewerReady(true);
      return;
    }

    const script = document.createElement("script");
    script.type = "module";
    script.src =
      "https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js";
    script.onload = () => {
      if (isActive) setIsModelViewerReady(true);
    };
    document.head.appendChild(script);

    return () => {
      isActive = false;
      script.onload = null;
    };
  }, [is3DActivated]);

  const isSectionVisible = (id: string) => revealedSections.includes(id);

  // UC17 Submission Logic
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    // Alternative Flow: Missing input check
    if (userRating === 0 || userComment.trim() === "") {
      setReviewError("Please provide both a rating and a comment.");
      return;
    }
    if (!routeProductId || !token) {
      setReviewError("Please sign in to submit a review.");
      return;
    }
    setReviewError("");
    setReviewStatus("submitting");
    try {
      const createdReview = await submitReview(routeProductId, token, {
        rating: userRating,
        comment: userComment.trim(),
      });

      setReviews((prev) => [
        {
          id: createdReview.id,
          author: `${createdReview.customer.firstName} ${createdReview.customer.lastName}`,
          rating: createdReview.rating,
          date: new Date(createdReview.createdAt).toLocaleDateString(),
          comment: createdReview.comment,
          isVerified: true,
        },
        ...prev,
      ]);
      setReviewStatus("success");
      setUserComment("");
      setUserRating(0);
      toast.success("Review submitted successfully.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to submit your review.";
      setReviewError(message);
      toast.error(message);
      setReviewStatus("idle");
    }
  };

  // Share Logic
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.shortDescription,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      alert("Sharing is not supported on this browser.");
    }
  };

  const handleWishlistToggle = () => {
    const { added, whenDone } = toggleWishlist(product.id) as any;
    if (whenDone) {
      whenDone
        .then(() => {
          toast.info(added ? "Added to wishlist" : "Removed from wishlist");
        })
        .catch(() => {
          // context already emits error toast
        });
    } else {
      toast.info(added ? "Added to wishlist" : "Removed from wishlist");
    }
  };

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0] ?? "",
      quantity,
      category: product.category,
    });
    toast.success(`${product.name} added to cart`);
  };
  const showImageMode = () => setMediaMode("image");
  const show3DMode = () => {
    if (!modelUrl) return;
    setMediaMode("3d");
    setIs3DActivated(true);
  };
  const activeImage =
    product.images[selectedImage] || product.images[0] || "/placeholder-product.jpg";

  if (!isLoadingProduct && !product.id) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] text-[#1C1C1C] font-inter">
        <Header />
        <main className="mx-auto max-w-[900px] px-5 pb-20 pt-32 text-center md:px-10 md:pt-40">
          <h1 className="font-druk-medium text-2xl uppercase tracking-[0.06em]">Product Unavailable</h1>
          <p className="mt-4 text-[#4f4b45]">
            This product could not be loaded from the backend.
          </p>
          <Link href="/products" className="mt-8 inline-block border border-[#1C1C1C] bg-[#1C1C1C] px-6 py-3 text-sm text-[#FAFAF9] transition-colors hover:bg-transparent hover:text-[#1C1C1C]">
            Back to Collection
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1C1C1C] font-inter">
      <Header />
      <main
        className="mx-auto max-w-[1320px] px-5 pb-20 pt-32 md:px-10 md:pt-40"
        style={{
          opacity: loaded ? 1 : 0,
          transform: loaded ? "translateY(0px)" : "translateY(14px)",
          transition: "opacity 500ms ease, transform 500ms ease",
        }}
      >
        <a
          href="#"
          className="font-aeonik inline-flex items-center gap-2 text-sm text-[#4f4b45] transition-colors hover:text-[#C6A75E]"
        >
          <span aria-hidden="true">←</span> Back to Collection
        </a>
        {isLoadingProduct && (
          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Skeleton className="h-[62vh] min-h-[420px] w-full rounded" />
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[0,1,2].map(i => <Skeleton key={i} className="h-24 w-full rounded" />)}
              </div>
            </div>
            <div className="lg:col-span-5">
              <Skeleton className="h-6 w-1/3 rounded mb-3" />
              <Skeleton className="h-10 w-3/4 rounded mb-3" />
              <Skeleton className="h-6 w-1/4 rounded mb-3" />
              <Skeleton className="h-3 w-full rounded mt-6" />
              <Skeleton className="h-3 w-5/6 rounded mt-2" />
            </div>
          </div>
        )}
        {/* errors are shown via react-toastify toasts */}

        {/* --- PRODUCT SHOWCASE --- */}
        <section
          className="mt-7 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14"
          data-reveal-id="showcase"
        >
          <div
            className="lg:col-span-7"
            style={{
              opacity: isSectionVisible("showcase") ? 1 : 0,
              transform: isSectionVisible("showcase")
                ? "translateY(0)"
                : "translateY(22px)",
              transition: "opacity 600ms ease, transform 600ms ease",
            }}
          >
            <div className="group relative overflow-hidden bg-[#efeae0]">
              <div className="font-aeonik absolute right-4 top-4 z-20 inline-flex border border-[#dad2c4] bg-[#fafaf9f2] p-1">
                <button
                  onClick={showImageMode}
                  className={`px-3 py-1 text-[10px] uppercase tracking-[0.1em] transition-colors ${mediaMode === "image" ? "bg-[#1C1C1C] text-[#FAFAF9]" : "text-[#4f4b45] hover:text-[#1C1C1C]"}`}
                >
                  Image
                </button>
                <button
                  onClick={show3DMode}
                  disabled={!modelUrl}
                  className={`px-3 py-1 text-[10px] uppercase tracking-[0.1em] transition-colors ${mediaMode === "3d" ? "bg-[#1C1C1C] text-[#FAFAF9]" : modelUrl ? "text-[#4f4b45] hover:text-[#1C1C1C]" : "text-[#a49d92] cursor-not-allowed"}`}
                >
                  3D View
                </button>
              </div>
              {product.badge && (
                <span className="font-aeonik absolute left-4 top-4 z-10 border border-[#d4bc7a] bg-[#fafaf9de] px-2 py-1 text-[10px] uppercase tracking-[0.12em]">
                  {product.badge}
                </span>
              )}
              <div
                className={`absolute inset-0 transition-opacity duration-500 ${mediaMode === "image" ? "opacity-100" : "pointer-events-none opacity-0"}`}
              >
                <img
                  key={selectedImage}
                  src={activeImage}
                  alt={product.name}
                  className="h-[62vh] min-h-[420px] w-full animate-[imageFade_420ms_ease] object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
              </div>
              <div
                className={`h-[62vh] min-h-[420px] w-full transition-opacity duration-500 ${mediaMode === "3d" ? "opacity-100" : "pointer-events-none opacity-0"}`}
              >
                {is3DActivated &&
                  (isModelViewerReady ? (
                    createElement("model-viewer", {
                      src: product.modelUrl ?? "",
                      poster: activeImage,
                      style: {
                        width: "100%",
                        height: "100%",
                        backgroundColor: "#efeae0",
                      },
                      "camera-controls": "",
                      "auto-rotate": "",
                      "interaction-prompt": "none",
                      "shadow-intensity": "0.6",
                      exposure: "1",
                    })
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#5a554d]">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-t-transparent border-[#C6A75E]" />
                        <span>Loading 3D experience</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {product.images.map((image, index) => (
                <button
                  key={image}
                  onClick={() => setSelectedImage(index)}
                  className={`overflow-hidden border transition ${selectedImage === index ? "border-[#C6A75E]" : "border-[#ddd8cf] hover:border-[#C6A75E]"}`}
                >
                  <img
                    src={image}
                    alt={`${product.name} view ${index + 1}`}
                    className="h-24 w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          <div
            className="lg:col-span-5"
            style={{
              opacity: isSectionVisible("showcase") ? 1 : 0,
              transform: isSectionVisible("showcase")
                ? "translateY(0)"
                : "translateY(22px)",
              transition: "opacity 600ms ease 90ms, transform 600ms ease 90ms",
            }}
          >
            <p className="font-aeonik text-[10px] uppercase tracking-[0.12em] text-[#767068]">
              {product.category}
            </p>
            <h1 className="font-druk-medium mt-3 text-lg uppercase tracking-[0.04em] md:text-5xl">
              {product.name}
            </h1>
            <p className="mt-5 text-3xl font-semibold">ETB {Number(product.price).toLocaleString()}</p>
            <p className="mt-5 max-w-[44ch] text-[15px] leading-relaxed text-[#4f4b45]">
              {product.shortDescription}
            </p>
            {/* wishlist messages are shown via react-toastify toasts */}
            <div className="font-aeonik mt-9 flex items-center gap-6">
              <div className="inline-flex items-center border-b border-[#d8d2c8] pb-2 text-sm">
                <button
                  className="px-3 text-xl text-[#4f4b45] hover:text-[#C6A75E]"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                >
                  -
                </button>
                <span className="w-7 text-center">{quantity}</span>
                <button
                  className="px-3 text-xl text-[#4f4b45] hover:text-[#C6A75E]"
                  onClick={() => setQuantity((prev) => prev + 1)}
                >
                  +
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                className="h-12 border border-[#C6A75E] bg-[#C6A75E] px-8 text-[10px] uppercase tracking-widest text-white transition-colors hover:bg-transparent hover:text-[#C6A75E]"
              >
                Add to Cart
              </button>

              {/* WISHLIST BUTTON */}
              <button
                className="transition-colors"
                onClick={handleWishlistToggle}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart
                  className={`h-6 w-6 ${isWishlisted ? "fill-[#C6A75E] text-[#C6A75E]" : "text-[#4f4b45] hover:text-[#C6A75E]"}`}
                />
              </button>

              {/* SHARE BUTTON (ADDED AS REQUESTED) */}
              <button
                className="text-[#4f4b45] hover:text-[#C6A75E] transition-colors"
                onClick={handleShare}
                aria-label="Share product"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </button>

            </div>
            <div className="font-aeonik mt-10 flex flex-wrap gap-x-7 gap-y-3 text-[10px] uppercase tracking-widest text-[#4f4b45]">
              <p>Free Shipping</p>
              <p>Handmade</p>
              <p>Easy Returns</p>
            </div>
          </div>
        </section>

        {/* --- STORY & ARTISAN --- */}
        <section
          className="mt-24"
          data-reveal-id="story"
          style={{
            opacity: isSectionVisible("story") ? 1 : 0,
            transform: isSectionVisible("story")
              ? "translateY(0)"
              : "translateY(22px)",
            transition: "opacity 600ms ease, transform 600ms ease",
          }}
        >
          <h2 className="font-druk-medium text-2xl uppercase tracking-[0.06em]">
            Product Story
          </h2>
          <p className="mt-6 max-w-[72ch] text-lg leading-relaxed text-[#45413b]">
            {product.story}
          </p>
        </section>

        {/* --- DETAILS --- */}
        <section
          className="mt-24"
          data-reveal-id="details"
          style={{
            opacity: isSectionVisible("details") ? 1 : 0,
            transform: isSectionVisible("details")
              ? "translateY(0)"
              : "translateY(22px)",
            transition: "opacity 600ms ease, transform 600ms ease",
          }}
        >
          <h2 className="font-druk-medium text-2xl uppercase tracking-[0.06em]">
            Details
          </h2>
          <div className="mt-7 max-w-[800px] space-y-5">
            <div className="flex flex-col gap-1 border-b border-[#e4dfd5] pb-4 md:flex-row md:items-baseline md:gap-10">
              <p className="font-aeonik w-40 text-[10px] uppercase tracking-[0.12em] text-[#767068]">
                Dimensions
              </p>
              <p>{product.dimensions}</p>
            </div>
            <div className="flex flex-col gap-1 border-b border-[#e4dfd5] pb-4 md:flex-row md:items-baseline md:gap-10">
              <p className="font-aeonik w-40 text-[10px] uppercase tracking-[0.12em] text-[#767068]">
                Material
              </p>
              <p>{product.material}</p>
            </div>
            {/* <div className="flex flex-col gap-1 border-b border-[#e4dfd5] pb-4 md:flex-row md:items-baseline md:gap-10">
              <p className="font-aeonik w-40 text-[10px] uppercase tracking-[0.12em] text-[#767068]">
                Care
              </p>
              <p>{product.care}</p>
            </div> */}
          </div>
        </section>

        {/* --- RELATED PIECES --- */}
        <section
          className="mt-24"
          data-reveal-id="related"
          style={{
            opacity: isSectionVisible("related") ? 1 : 0,
            transform: isSectionVisible("related")
              ? "translateY(0)"
              : "translateY(22px)",
            transition: "opacity 600ms ease, transform 600ms ease",
          }}
        >
          <h2 className="font-druk-medium text-2xl uppercase tracking-[0.06em]">
            Related Pieces
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 md:gap-x-8 md:gap-y-12">
            {relatedProducts.map((item, index) => (
              <article
                key={item.id}
                className="group"
                style={{
                  opacity: isSectionVisible("related") ? 1 : 0,
                  transform: isSectionVisible("related")
                    ? "translateY(0)"
                    : "translateY(18px)",
                  transition: `opacity 650ms ease ${index * 90}ms, transform 650ms ease ${index * 90}ms`,
                }}
              >
                <div className="relative overflow-hidden bg-[#f1eee8]">
                  {item.badge && (
                    <span className="font-aeonik absolute left-3 top-3 z-10 border border-[#d4bc7a] bg-[#fafaf9de] px-2 py-1 text-[10px] uppercase tracking-[0.12em]">
                      {item.badge}
                    </span>
                  )}
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-60 w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                </div>
                <div className="pt-4">
                  <p className="font-druk-medium text-[10px] uppercase tracking-[0.1em] text-[#7a746d]">
                    {item.category}
                  </p>
                  <h3 className="mt-2 text-sm uppercase tracking-[0.05em] transition-colors duration-300 group-hover:text-[#C6A75E] md:text-base">
                    {item.name}
                  </h3>
                  <p className="mt-2 text-sm">ETB {Number(item.price).toLocaleString()}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* --- UC17: PRODUCT REVIEW SECTION --- */}
        <section
          className="mt-32 border-t border-[#e4dfd5] pt-24"
          data-reveal-id="reviews"
          style={{
            opacity: isSectionVisible("reviews") ? 1 : 0,
            transform: isSectionVisible("reviews")
              ? "translateY(0)"
              : "translateY(22px)",
            transition: "opacity 600ms ease, transform 600ms ease",
          }}
        >
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">
            {/* Summary & Form Column */}
            <div className="lg:col-span-5">
              <h2 className="font-druk-medium text-2xl uppercase tracking-[0.06em]">
                Reviews
              </h2>

              <div className="mt-6 flex items-center gap-4">
                <div className="text-5xl font-semibold">4.8</div>
                <div>
                  <div className="flex text-[#C6A75E]">{"★".repeat(5)}</div>
                  <p className="font-aeonik text-[10px] uppercase tracking-widest text-[#767068]">
                    Based on {reviews.length} verified reviews
                  </p>
                </div>
              </div>

              {/* Form implementation based on UC17 logic */}
              <div className="mt-12 bg-[#f4f1ec] p-8">
                {!isUserAuthenticated ? (
                  <p className="text-sm">
                    Please{" "}
                    <Link href="/auth/login" className="underline">
                      sign in
                    </Link>{" "}
                    to leave feedback.
                  </p>
                ) : !hasPurchasedAndReceived ? (
                  <p className="text-sm italic text-[#767068]">
                    Reviews are only available for customers who have received
                    this product.
                  </p>
                ) : hasAlreadyReviewed ? (
                  <p className="text-sm">
                    You have already submitted a review for this piece.
                  </p>
                ) : reviewStatus === "success" ? (
                  <div className="py-4">
                    <p className="font-aeonik text-sm uppercase tracking-widest text-[#C6A75E]">
                      Submission Successful
                    </p>
                    <p className="mt-2 text-xs text-[#4f4b45]">
                      Your review is currently pending moderation and will be
                      visible shortly. Thank you for your feedback.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitReview} className="space-y-6">
                    {/* review errors are shown via react-toastify toasts */}
                    <div>
                      <p className="font-aeonik text-[10px] uppercase tracking-widest text-[#1C1C1C] mb-3">
                        Your Rating
                      </p>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setUserRating(star)}
                            className={`text-2xl transition-colors ${userRating >= star ? "text-[#C6A75E]" : "text-[#d8d2c8]"}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="font-aeonik text-[10px] uppercase tracking-widest text-[#1C1C1C] mb-3">
                        Review Details
                      </p>
                      <textarea
                        className="w-full border border-[#d8d2c8] bg-transparent p-4 text-sm outline-none focus:border-[#C6A75E] transition-colors"
                        placeholder="Share your experience with the craftsmanship and fit..."
                        rows={4}
                        value={userComment}
                        onChange={(e) => setUserComment(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={reviewStatus === "submitting"}
                      className="w-full bg-[#1C1C1C] py-4 text-[10px] uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {reviewStatus === "submitting"
                        ? "Saving..."
                        : "Submit Review"}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Existing Reviews List */}
            <div className="lg:col-span-7 space-y-12">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="border-b border-[#e4dfd5] pb-10"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <p className="font-aeonik text-sm font-medium">
                        {review.author}
                      </p>
                      {review.isVerified && (
                        <span className="bg-[#e8f0e8] text-[#2d5a27] text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full">
                          Verified Buyer
                        </span>
                      )}
                    </div>
                    <span className="font-aeonik text-[10px] text-[#767068]">
                      {review.date}
                    </span>
                  </div>
                  <div className="mt-2 flex text-[#C6A75E] text-xs">
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </div>
                  <p className="mt-5 text-[15px] leading-relaxed text-[#4f4b45]">
                    {review.comment}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <ChatSupport />
      <Footer />

      <style jsx global>{`
        @keyframes imageFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .font-druk-medium {
          font-family: var(--font-druk-medium), sans-serif;
        }
        .font-aeonik {
          font-family: var(--font-aeonik), sans-serif;
        }
        .font-inter {
          font-family: var(--font-inter), sans-serif;
        }
      `}</style>
    </div>
  );
}