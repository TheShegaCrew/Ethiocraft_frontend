"use client";
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Flag,
  ImageUp,
  MessageSquare,
  Pencil,
  ShieldCheck,
  Star,
  Trash2,
  X,
} from 'lucide-react';

type TabKey = 'Details' | 'Verification' | 'Reviews' | 'Activity';

type ReviewItem = {
  id: string;
  author: string;
  rating: number;
  text: string;
  flagged?: boolean;
  hidden?: boolean;
};

const tabs: TabKey[] = ['Details', 'Verification', 'Reviews', 'Activity'];

export default function App() {
  const { id } = useParams();
  const router = useRouter();
  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('Details');
  const [selectedImage, setSelectedImage] = useState(0);
  const [show3D, setShow3D] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isFeatured, setIsFeatured] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState('');
  const [details, setDetails] = useState<any>({});
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1';
        const res = await fetch(`${base}/admin/products/${id}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`Error: ${res.status}`);
        const json = await res.json();
        const data = json.data;
        setProductData(data);
        
        // Sync internal states with fetched data
        setIsVisible(data.status === 'PUBLISHED');
        setIsFeatured(data.featured || false);
        setDetails({
          title: data.title || '',
          description: data.description || '',
          category: data.category || '',
          price: data.price?.toString() || '0',
          stock: data.stock?.toString() || '0',
          materials: data.materials?.join(', ') || '',
          tags: data.tags?.join(', ') || '',
          dimensions: data.dimensions ? `${data.dimensions.widthCm || ''}x${data.dimensions.heightCm || ''}x${data.dimensions.depthCm || ''}` : '',
        });
        setReviews((data.reviews || []).map((review: any) => ({
          id: review.id,
          author: `${review.customer?.firstName || ''} ${review.customer?.lastName || ''}`.trim() || 'Unknown',
          rating: review.rating,
          text: review.comment || '',
        })));
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const gallery = useMemo(() => {
    const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1';
    const apiImages = (productData?.media || []).map((m: any) => {
      if (m.url.startsWith('http') || m.url.startsWith('data:')) return m.url;
      return `${base}${m.url}`;
    });
    return apiImages;
  }, [productData]);

  const longDescription = productData?.description || 'Not found';

  const riskAlerts = Array.isArray(productData?.riskAlerts) ? productData.riskAlerts : [];

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };

  const shortDescription = useMemo(() => longDescription.slice(0, 230), [longDescription]);

  const handleHideReview = (id: string) => {
    setReviews((prev) => prev.map((review) => (review.id === id ? { ...review, hidden: !review.hidden } : review)));
    showToast('Review visibility updated');
  };

  const handleRemoveReview = (id: string) => {
    setReviews((prev) => prev.filter((review) => review.id !== id));
    showToast('Review removed');
  };

  const handleSaveDetails = async () => {
    setIsSaving(true);
    try {
      const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1';
      const payload: any = {
        title: details.title,
        description: details.description,
        category: details.category,
        price: parseFloat(details.price) || 0,
        stock: parseInt(details.stock, 10) || 0,
        materials: details.materials?.split(',').map((s: string) => s.trim()).filter(Boolean) || [],
        tags: details.tags?.split(',').map((s: string) => s.trim()).filter(Boolean) || [],
      };

      if (details.dimensions) {
        const dimParts = details.dimensions.split('x').map((s: string) => parseFloat(s.trim()));
        if (dimParts.length >= 2) {
          payload.dimensions = {
            widthCm: dimParts[0] || null,
            heightCm: dimParts[1] || null,
            depthCm: dimParts[2] || null,
          };
        }
      }

      const res = await fetch(`${base}/admin/products/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to update product details');
      
      showToast('Changes saved successfully');
      setProductData((prev: any) => ({ ...prev, ...payload }));
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] text-[#1C1C1C]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#C6A75E] border-t-transparent" />
          <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Fetching Product Details...</p>
        </div>
      </div>
    );
  }

  if (error) return (
    <div className="flex h-screen items-center justify-center bg-[#FAFAF9]">
      <div className="text-center">
        <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto" />
        <h2 className="mt-4 text-xl font-semibold">Failed to load product</h2>
        <p className="mt-2 text-sm text-[#6f655d]">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-[#3E2723] px-6 py-2 text-sm text-white">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F4F0] text-[#1C1C1C] font-sans overflow-x-hidden relative">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[#EAE5D9] px-6 py-5 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-1" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
              Product Inventory
            </p>
            <h1 className="text-2xl md:text-3xl tracking-tight text-[#2D2620]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif', textTransform: 'uppercase' }}>
              {productData?.title || 'Not found'}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${isVisible ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-neutral-50 text-neutral-700 border-neutral-100'}`}>
                {isVisible ? 'LIVE' : 'HIDDEN'}
              </span>
              <span className="inline-flex items-center px-3 py-1 bg-[#FBFaf8] border border-[#EAE5D9] rounded-full text-[11px] font-bold text-[#766A5D] uppercase tracking-wider">
                {productData?.category || 'General'}
              </span>
              <div className="h-4 w-[1px] bg-[#EAE5D9] mx-1 hidden sm:block" />
              <div className="flex gap-4 text-[11px] font-medium text-[#8B7F72] uppercase tracking-wider">
                <span>ID: {productData?.id}</span>
                <span>Updated: {productData?.updatedAt ? new Date(productData.updatedAt).toLocaleDateString() : '—'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-4 text-right hidden sm:block">
              <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-0.5">Market Price</p>
              <p className="text-2xl font-bold text-[#3E2723] leading-none">{details.price} <span className="text-sm">ETB</span></p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Link href={`/admin/products/${id}/edit`} className="px-4 py-2 bg-white border border-[#EAE5D9] rounded-xl text-xs font-bold text-[#766A5D] hover:bg-[#FBFaf8] hover:text-[#3E2723] transition-all shadow-sm flex items-center gap-2">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Link>
              <button
                onClick={async () => {
                  const newState = !isVisible;
                  setIsVisible(newState);
                  const status = newState ? 'PUBLISHED' : 'APPROVED';
                  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1';
                  try {
                    await fetch(`${base}/admin/products/${id}`, {
                      method: 'PATCH',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status }),
                    });
                    showToast(newState ? 'Product is now live' : 'Product hidden from marketplace');
                  } catch (e) {
                    setIsVisible(!newState);
                    showToast('Failed to update visibility status');
                  }
                }}
                className="px-4 py-2 bg-white border border-[#EAE5D9] rounded-xl text-xs font-bold text-[#766A5D] hover:bg-[#FBFaf8] transition-all shadow-sm flex items-center gap-2"
              >
                {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {isVisible ? 'Hide' : 'Publish'}
              </button>
              <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-100 transition-all shadow-sm flex items-center gap-2">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="space-y-6 xl:col-span-7">
            <article className="rounded-3xl border border-[#EAE5D9] bg-white p-6 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] flex items-center gap-2" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C6A75E]" />
                  Product Gallery
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => setShow3D(true)} className="px-3 py-1.5 bg-[#FBFaf8] border border-[#EAE5D9] rounded-lg text-[10px] font-bold text-[#766A5D] uppercase tracking-widest hover:bg-white hover:border-[#C6A75E]/30 transition-all">
                    View 3D
                  </button>
                </div>
              </div>
              
              <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#FBFaf8] border border-[#F0EBE0]">
                {gallery.length > 0 ? (
                  <img
                    src={gallery[selectedImage]}
                    alt="Product media"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#A39B8F] uppercase tracking-widest">
                    No Media Uploaded
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {gallery.map((image: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      index === selectedImage ? 'border-[#C6A75E] scale-95' : 'border-[#F0EBE0] opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={image} alt={`Thumbnail ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-[#EAE5D9] bg-white p-6 shadow-sm overflow-hidden">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-6 flex items-center gap-2" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#C6A75E]" />
                Product Narrative
              </h2>
              <div className="prose prose-sm max-w-none">
                <p className="text-[15px] leading-relaxed text-[#5C5449] font-medium">
                  {showFullDescription ? longDescription : `${shortDescription}${longDescription.length > 230 ? '...' : ''}`}
                </p>
                {productData?.culturalMetadata?.story && (
                  <div className="mt-6 p-4 bg-[#FBFaf8] rounded-2xl border-l-4 border-[#C6A75E]">
                    <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-1">Cultural Significance</p>
                    <p className="text-sm font-bold text-[#3E2723] italic leading-relaxed">{productData.culturalMetadata.story}</p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowFullDescription((prev) => !prev)}
                  className="px-5 py-2.5 bg-white border border-[#EAE5D9] rounded-xl text-xs font-bold text-[#766A5D] hover:bg-[#FBFaf8] transition-all"
                >
                  {showFullDescription ? 'Show Brief' : 'Read Full Story'}
                </button>
              </div>
            </article>

            <article className="rounded-3xl border border-[#EAE5D9] bg-white p-6 shadow-sm overflow-hidden min-h-[400px]">
              <div className="mb-6 flex flex-wrap gap-6 border-b border-[#F0EBE0]" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative pb-4 text-xs font-bold uppercase tracking-widest transition-colors ${
                      activeTab === tab ? 'text-[#3E2723]' : 'text-[#A39B8F] hover:text-[#3E2723]'
                    }`}
                  >
                    {tab}
                    {activeTab === tab && <span className="absolute inset-x-0 bottom-[-1px] h-0.5 bg-[#C6A75E] rounded-full" />}
                  </button>
                ))}
              </div>

              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                {activeTab === 'Details' && (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {Object.entries(details).map(([key, value]) => (
                      <div key={key} className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-[0.1em] ml-1">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                        <input
                          value={(value as string) || ''}
                          onChange={(event) => setDetails((prev: any) => ({ ...prev, [key]: event.target.value }))}
                          className="w-full rounded-xl border border-[#F0EBE0] bg-[#FBFaf8] px-4 py-3 text-sm font-bold text-[#2D2620] outline-none transition-all focus:border-[#C6A75E] focus:bg-white focus:shadow-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'Verification' && (
                  <div className="space-y-6 py-2">
                    {[
                      { title: 'Digital Submission', date: productData?.verification?.submittedAt, icon: ShieldCheck, color: "text-blue-600", bg: "bg-blue-50" },
                      { title: 'Peer Review', date: productData?.verification?.reviewedAt, icon: Eye, color: "text-amber-600", bg: "bg-amber-50" },
                      { title: 'Final Publication', date: productData?.verification?.publishedAt, icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
                    ].map((step, i) => (
                      <div key={step.title} className="relative flex gap-6 group">
                        {i < 2 && <span className="absolute left-[23px] top-10 h-10 w-0.5 bg-[#F0EBE0]" />}
                        <div className={`h-12 w-12 rounded-2xl ${step.bg} ${step.color} flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-110`}>
                          <step.icon className="h-5 w-5" />
                        </div>
                        <div className="pt-1">
                          <p className="text-sm font-bold text-[#2D2620]">{step.title}</p>
                          <p className="text-xs font-medium text-[#766A5D]">
                            {step.date ? `Verified on ${new Date(step.date).toLocaleDateString()}` : 'Process pending'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'Reviews' && (
                  <div className="space-y-4">
                    {reviews.length > 0 ? reviews.map((review) => (
                      <div key={review.id} className="p-5 bg-[#FBFaf8] rounded-2xl border border-[#F0EBE0] group hover:bg-white hover:border-[#C6A75E]/30 transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#EAE5D9] rounded-xl flex items-center justify-center font-bold text-[#766A5D] text-xs">
                              {review.author?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#2D2620]">{review.author}</p>
                              <div className="flex gap-1 mt-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'fill-[#C6A75E] text-[#C6A75E]' : 'text-[#EAE5D9]'}`} />
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleHideReview(review.id)} className="p-2 text-[#A39B8F] hover:text-[#3E2723] hover:bg-white rounded-lg border border-transparent hover:border-[#EAE5D9] transition-all">
                              {review.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </button>
                            <button onClick={() => handleRemoveReview(review.id)} className="p-2 text-[#A39B8F] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-[#5C5449] leading-relaxed pl-1">"{review.text}"</p>
                      </div>
                    )) : (
                      <div className="py-20 text-center">
                        <MessageSquare className="h-10 w-10 text-[#EAE5D9] mx-auto mb-3" />
                        <p className="text-sm font-bold text-[#A39B8F] uppercase tracking-widest">No customer feedback yet</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'Activity' && (
                  <div className="py-2">
                    <ol className="space-y-6 border-l-2 border-[#F0EBE0] ml-3 pl-8 text-sm">
                      {(productData?.activity || ['No activity log recorded']).map((entry: string, i: number) => (
                        <li key={i} className="relative group">
                          <span className="absolute -left-[37px] top-1 h-4 w-4 rounded-full bg-white border-2 border-[#C6A75E] shadow-sm group-hover:scale-125 transition-transform" />
                          <div className="p-4 bg-[#FBFaf8] rounded-xl border border-[#F0EBE0] group-hover:bg-white group-hover:border-[#C6A75E]/30 transition-all">
                            <p className="font-bold text-[#2D2620] mb-1">{entry.split(' on ')[0]}</p>
                            <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest">
                              {entry.split(' on ')[1] || 'Timestamp Unavailable'}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </article>
          </section>

          <aside className="space-y-6 xl:col-span-5">
            <div className="space-y-6 xl:sticky xl:top-6">
              <article className="rounded-3xl border border-[#EAE5D9] bg-white p-6 shadow-sm overflow-hidden">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-6 flex items-center gap-2" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C6A75E]" />
                  Artisan Proprietor
                </p>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-[#EAE5D9] text-[#766A5D] rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner uppercase">
                    {(productData?.artisan?.firstName?.[0] || 'A')}{(productData?.artisan?.lastName?.[0] || '')}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[#2D2620]">{`${productData?.artisan?.firstName || ''} ${productData?.artisan?.lastName || ''}`.trim() || 'EthioCraft Artisan'}</p>
                    <p className="text-xs font-semibold text-[#C6A75E] uppercase tracking-widest">{productData?.artisan?.artisanProfile?.shopName || 'Authentic Workshop'}</p>
                  </div>
                </div>

                <div className="space-y-4 bg-[#FBFaf8] p-4 rounded-2xl border border-[#F0EBE0]">
                  <div>
                    <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-1">Origin Location</p>
                    <p className="text-sm font-bold text-[#2D2620]">{productData?.artisan?.artisanProfile?.city || 'Addis Ababa'}, {productData?.artisan?.artisanProfile?.region || 'Ethiopia'}</p>
                  </div>
                  <div className="pt-3 border-t border-[#F0EBE0] flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Verified Identity</span>
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                  <button onClick={() => window.location.href = `/admin/users/${productData?.artisan?.id}`} className="flex-1 py-2.5 bg-white border border-[#EAE5D9] rounded-xl text-xs font-bold text-[#766A5D] hover:bg-[#FBFaf8] transition-all">
                    View Studio
                  </button>
                  <button onClick={() => showToast('Message sent')} className="flex-1 py-2.5 bg-[#3E2723] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#2A1A17] flex items-center justify-center gap-2 transition-all">
                    <MessageSquare className="h-3 w-3" /> Connect
                  </button>
                </div>
              </article>

              <article className="rounded-3xl border border-[#EAE5D9] bg-white p-6 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-6 flex items-center gap-2" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C6A75E]" />
                  Commercial Insights
                </p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    { label: "Total Revenue", value: `${(productData?.analytics?.totalRevenue ?? 0).toLocaleString()} ETB`, color: "text-[#3E2723]" },
                    { label: "Units Sold", value: productData?.analytics?.totalUnitsSold ?? 0, color: "text-[#2D2620]" },
                    { label: "Avg Rating", value: productData?.analytics?.averageRating ?? '4.8', color: "text-[#C6A75E]" },
                    { label: "Review Count", value: productData?.analytics?.totalReviews ?? 0, color: "text-[#2D2620]" },
                  ].map((insight, i) => (
                    <div key={i} className="p-4 bg-[#FBFaf8] rounded-2xl border border-[#F0EBE0] transition-all hover:bg-white hover:border-[#C6A75E]/30 group">
                      <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-1 group-hover:text-[#C6A75E] transition-colors">{insight.label}</p>
                      <p className={`text-lg font-bold ${insight.color}`}>{insight.value}</p>
                    </div>
                  ))}
                </div>
                <button onClick={handleSaveDetails} disabled={isSaving} className="w-full py-3.5 bg-[#3E2723] text-white rounded-xl text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#2A1A17] transition-all shadow-lg shadow-[#3E2723]/20 disabled:opacity-50">
                  {isSaving ? 'Synchronizing...' : 'Save All Changes'}
                </button>
              </article>

              {riskAlerts.length > 0 && (
                <article className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.08em] text-amber-700" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>Operational Alerts</p>
                  <div className="mt-3 space-y-2 text-xs text-amber-800">
                    {riskAlerts.map((alert: string, i: number) => (
                      <p key={i} className="rounded-lg bg-white/70 px-3 py-2 flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3" /> {alert}
                      </p>
                    ))}
                  </div>
                </article>
              )}
            </div>
          </aside>
        </div>
      </main>

      {show3D && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1C1C1C]/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShow3D(false)} />
          <div className="relative bg-white rounded-[2rem] shadow-2xl border border-[#EAE5D9] w-full max-w-3xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#2D2620]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif', textTransform: 'uppercase' }}>3D Artifact Preview</h3>
              <button onClick={() => setShow3D(false)} className="p-2 hover:bg-[#FBFaf8] rounded-full transition-colors"><X className="h-5 w-5 text-[#A39B8F]" /></button>
            </div>
            <div className="aspect-video rounded-2xl bg-[#FBFaf8] border border-[#F0EBE0] flex items-center justify-center text-center p-12">
              <div>
                <div className="w-16 h-16 bg-[#EAE5D9] rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="h-8 w-8 text-[#766A5D]" />
                </div>
                <p className="text-lg font-bold text-[#2D2620] mb-1">Rendering Engine Unavailable</p>
                <p className="text-sm text-[#766A5D]">3D visualization for this artifact is currently in the verification pipeline.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1C1C1C]/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-[2rem] shadow-2xl border border-[#EAE5D9] w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-[#2D2620] mb-2" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif', textTransform: 'uppercase' }}>Archive Product</h3>
            <p className="text-sm font-medium text-[#766A5D] mb-8 leading-relaxed">This will permanently remove the product from the marketplace. This action is irreversible and will be logged in the artisan audit trail.</p>
            
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-3 text-xs font-bold text-[#A39B8F] uppercase tracking-widest hover:text-[#3E2723] transition-colors"
              >
                Go Back
              </button>
              <button 
                onClick={async () => {
                  setShowDeleteConfirm(false);
                  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1';
                  try {
                    await fetch(`${base}/admin/products/${id}`, {
                      method: 'DELETE',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                    });
                    showToast('Product archived successfully');
                    setTimeout(() => window.location.href = '/admin/products', 1500);
                  } catch (e) {
                    showToast('Failed to archive product');
                  }
                }}
                className="px-6 py-3 bg-rose-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all active:scale-95"
              >
                Confirm Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[70] animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border border-[#EAE5D9] bg-white text-[#2D2620]">
            <CheckCircle2 className="w-5 h-5 text-[#C6A75E]" />
            <p className="text-sm font-bold tracking-tight">{toast}</p>
          </div>
        </div>
      )}
    </div>
  );
}