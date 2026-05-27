"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Globe,
  ImageUp,
  Layout,
  Layers,
  Save,
  ShieldCheck,
  Tag,
  X,
  AlertTriangle,
  History,
  Send,
  Check,
  Ban,
  Clock,
  Loader2,
  Trash2,
  ExternalLink
} from 'lucide-react';

type DraftStatus = 'ADMIN_CREATED' | 'AGENT_IN_PROGRESS' | 'AGENT_VERIFIED' | 'ADMIN_REVIEW' | 'REJECTED' | 'PUBLISHED';

interface ProductDraft {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  status: DraftStatus;
  materials: string[];
  tags: string[];
  dimensions: any;
  culturalMetadata: any;
  submissionNotes?: string;
  verificationNotes?: string;
  artisan?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  media: Array<{
    id: string;
    url: string;
    altText?: string;
  }>;
}

export default function ProductDraftReviewPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: 0,
    stock: 0,
    materials: [] as string[],
    tags: [] as string[],
    dimensions: {
      widthCm: 0,
      heightCm: 0,
      depthCm: 0
    },
    culturalMetadata: {
      story: '',
      region: '',
      era: '',
      artisanTechnique: ''
    },
    agentVerificationData: {
      measurements: '',
      notes: '',
      suggestedPricing: '',
      mediaFiles: [] as string[],
      modelUrl: null as string | null
    }
  });

  const [materialsInput, setMaterialsInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3000);
  };

  const fetchDraft = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1';
      const res = await fetch(`${base}/verifications/products/drafts/${id}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`Error: ${res.status}`);
      const json = await res.json();
      const data = json.data;

      setDraft(data);
      setFormData({
        title: data.title || '',
        description: data.description || '',
        category: data.category || '',
        price: Number(data.price) || 0,
        stock: data.stock || 0,
        materials: data.materials || [],
        tags: data.tags || [],
        dimensions: {
          widthCm: data.dimensions?.widthCm || 0,
          heightCm: data.dimensions?.heightCm || 0,
          depthCm: data.dimensions?.depthCm || 0
        },
        culturalMetadata: {
          story: data.culturalMetadata?.story || '',
          region: data.culturalMetadata?.region || '',
          era: data.culturalMetadata?.era || '',
          artisanTechnique: data.culturalMetadata?.artisanTechnique || ''
        },
        agentVerificationData: {
          measurements: data.dimensions?.measurements || '',
          notes: data.culturalMetadata?.notes || '',
          suggestedPricing: data.extensionData?.suggestedPricing || '',
          mediaFiles: data.extensionData?.mediaFiles || [],
          modelUrl: data.extensionData?.modelUrl || null
        }
      });

      setMaterialsInput((data.materials || []).join(', '));
      setTagsInput((data.tags || []).join(', '));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDraft();
  }, [fetchDraft]);

  const handleSave = async (silent = false) => {
    if (!draft) return;
    setIsSaving(true);
      try {
      const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1';

      const payload = {
        ...formData,
        materials: materialsInput.split(',').map(s => s.trim()).filter(Boolean),
        tags: tagsInput.split(',').map(s => s.trim()).filter(Boolean),
      };

      const res = await fetch(`${base}/verifications/products/drafts/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update draft');
      }

      if (!silent) showToast('Draft saved successfully');
      return true;
    } catch (err: any) {
      showToast(err.message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const updateStatus = async (status: DraftStatus) => {
    if (!draft) return;
    setIsUpdatingStatus(true);
    try {
      const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1';

      const res = await fetch(`${base}/verifications/products/drafts/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update status');
      }

      showToast(`Draft moved to ${status.replace(/_/g, ' ')}`);
      fetchDraft();
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleReviewDecision = async (decision: 'APPROVE' | 'REJECT', notes?: string) => {
    if (!draft) return;
    setIsUpdatingStatus(true);
    try {
      const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1';

      const res = await fetch(`${base}/verifications/products/drafts/${id}/review`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ decision, notes }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to submit review');
      }

      showToast(decision === 'APPROVE' ? 'Product Published!' : 'Draft Rejected');
      if (decision === 'APPROVE') {
        router.push('/admin/verification_task');
      } else {
        setShowRejectModal(false);
        setRejectReason('');
        fetchDraft();
      }
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F4F0]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#C6A75E]" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#A39B8F]">Loading Verification Workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F4F0]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#2D2620]">Initialization Failed</h2>
          <p className="text-sm text-[#766A5D] mt-2">{error || 'Draft not found'}</p>
          <button onClick={() => router.back()} className="mt-6 px-6 py-2 bg-white border border-[#EAE5D9] rounded-xl text-sm font-bold text-[#3E2723]">Return to Queue</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F4F0] text-[#1C1C1C] font-sans">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[#EAE5D9] px-6 py-4 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.back()}
              className="p-2.5 hover:bg-[#FBFaf8] rounded-xl transition-colors border border-[#EAE5D9]"
            >
              <ArrowLeft className="w-5 h-5 text-[#766A5D]" />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-0.5">Verification Workspace</p>
              <h1 className="text-xl font-bold tracking-tight text-[#2D2620]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif', textTransform: 'uppercase' }}>
                {draft.id} / {formData.title || 'Untitled Draft'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-6 py-3 bg-white border border-[#EAE5D9] text-[#3E2723] rounded-xl text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#FBFaf8] transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Progress
            </button>

            {draft.status === 'ADMIN_CREATED' && (
              <button
                onClick={() => updateStatus('AGENT_IN_PROGRESS')}
                disabled={isUpdatingStatus}
                className="px-8 py-3 bg-[#C6A75E] text-white rounded-xl text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#B5964D] transition-all shadow-lg shadow-[#C6A75E]/20 flex items-center gap-2"
              >
                {isUpdatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Start Verification
              </button>
            )}

            {draft.status === 'AGENT_IN_PROGRESS' && (
              <button
                onClick={() => updateStatus('AGENT_VERIFIED')}
                disabled={isUpdatingStatus}
                className="px-8 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
              >
                {isUpdatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Mark Verified
              </button>
            )}

            {(draft.status === 'AGENT_VERIFIED' || draft.status === 'ADMIN_REVIEW') && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={isUpdatingStatus}
                  className="px-6 py-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-xs font-bold uppercase tracking-[0.2em] hover:bg-rose-100 transition-all flex items-center gap-2"
                >
                  <Ban className="w-4 h-4" /> Reject
                </button>
                <button
                  onClick={() => handleReviewDecision('APPROVE')}
                  disabled={isUpdatingStatus}
                  className="px-8 py-3 bg-[#3E2723] text-white rounded-xl text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#2A1A17] transition-all shadow-lg shadow-[#3E2723]/20 flex items-center gap-2"
                >
                  {isUpdatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Final Approval & Publish
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-10">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

          <div className="xl:col-span-8 space-y-8">
            {/* Agent Verification Data */}
            <article className="rounded-3xl border border-[#EAE5D9] bg-white p-8 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700 mb-6 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Agent Field Notes
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest">Measurements</p>
                  <p className="text-sm font-semibold text-[#2D2620]">{formData.agentVerificationData.measurements || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest">Suggested Pricing</p>
                  <p className="text-sm font-semibold text-[#2D2620]">{formData.agentVerificationData.suggestedPricing || 'N/A'}</p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest">Cultural/Verification Notes</p>
                  <p className="text-sm font-medium text-[#5C5449]">{formData.agentVerificationData.notes || 'N/A'}</p>
                </div>
              </div>
              
              {(formData.agentVerificationData.mediaFiles.length > 0 || formData.agentVerificationData.modelUrl) && (
                <div className="mt-6">
                  <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-3">Agent Uploaded Media (incl. 3D Models)</p>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {formData.agentVerificationData.modelUrl && (
                      <a href={formData.agentVerificationData.modelUrl} target="_blank" rel="noreferrer" className="flex-shrink-0 w-20 h-20 rounded-xl border border-[#EAE5D9] overflow-hidden group relative">
                        <div className="w-full h-full bg-[#FBFaf8] flex items-center justify-center text-[#C6A75E]">
                          <Layers className="w-6 h-6" />
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ExternalLink className="w-4 h-4 text-white" />
                        </div>
                      </a>
                    )}
                    {formData.agentVerificationData.mediaFiles.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer" className="flex-shrink-0 w-20 h-20 rounded-xl border border-[#EAE5D9] overflow-hidden group relative">
                        <img src={url} alt={`Agent media ${idx+1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ExternalLink className="w-4 h-4 text-white" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </article>

            {/* Identity */}
            <article className="rounded-3xl border border-[#EAE5D9] bg-white p-8 shadow-sm">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-8 flex items-center gap-2">
                <Layout className="w-4 h-4 text-[#C6A75E]" />
                Identity & Information
              </h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest ml-1">Draft Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-[#FBFaf8] border border-[#F0EBE0] rounded-2xl px-5 py-4 text-lg font-bold text-[#2D2620] outline-none focus:border-[#C6A75E] focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest ml-1">Market Description</label>
                  <textarea
                    rows={6}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-[#FBFaf8] border border-[#F0EBE0] rounded-2xl px-5 py-4 text-sm font-medium text-[#5C5449] leading-relaxed outline-none focus:border-[#C6A75E] focus:bg-white transition-all resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest ml-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-[#FBFaf8] border border-[#F0EBE0] rounded-2xl px-5 py-4 text-sm font-bold text-[#2D2620] outline-none focus:border-[#C6A75E] focus:bg-white transition-all"
                    >
                      <option value="">Select Category</option>
                      <option value="POTTERY">Pottery & Ceramics</option>
                      <option value="WEAVING">Weaving & Textiles</option>
                      <option value="LEATHER">Leatherwork</option>
                      <option value="JEWELRY">Traditional Jewelry</option>
                      <option value="WOODWORK">Woodwork & Carving</option>
                      <option value="ART">Fine Art & Icons</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest ml-1">Technique</label>
                    <input
                      type="text"
                      value={formData.culturalMetadata.artisanTechnique}
                      onChange={(e) => setFormData({ ...formData, culturalMetadata: { ...formData.culturalMetadata, artisanTechnique: e.target.value } })}
                      className="w-full bg-[#FBFaf8] border border-[#F0EBE0] rounded-2xl px-5 py-4 text-sm font-bold text-[#2D2620] outline-none focus:border-[#C6A75E] focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>
            </article>

            {/* Cultural Context */}
            <article className="rounded-3xl border border-[#EAE5D9] bg-white p-8 shadow-sm">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-8 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#C6A75E]" />
                Cultural Heritage Data
              </h2>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest ml-1">Region of Origin</label>
                  <input
                    type="text"
                    value={formData.culturalMetadata.region}
                    onChange={(e) => setFormData({ ...formData, culturalMetadata: { ...formData.culturalMetadata, region: e.target.value } })}
                    className="w-full bg-[#FBFaf8] border border-[#F0EBE0] rounded-2xl px-5 py-4 text-sm font-bold text-[#2D2620] outline-none focus:border-[#C6A75E] focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest ml-1">Historical Era</label>
                  <input
                    type="text"
                    value={formData.culturalMetadata.era}
                    onChange={(e) => setFormData({ ...formData, culturalMetadata: { ...formData.culturalMetadata, era: e.target.value } })}
                    className="w-full bg-[#FBFaf8] border border-[#F0EBE0] rounded-2xl px-5 py-4 text-sm font-bold text-[#2D2620] outline-none focus:border-[#C6A75E] focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div className="mt-8 space-y-2">
                <label className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest ml-1">The Story Behind</label>
                <textarea
                  rows={4}
                  value={formData.culturalMetadata.story}
                  onChange={(e) => setFormData({ ...formData, culturalMetadata: { ...formData.culturalMetadata, story: e.target.value } })}
                  className="w-full bg-[#FBFaf8] border border-[#F0EBE0] rounded-2xl px-5 py-4 text-sm font-medium text-[#5C5449] leading-relaxed outline-none focus:border-[#C6A75E] focus:bg-white transition-all resize-none"
                />
              </div>
            </article>

            {/* Media Gallery */}
            <article className="rounded-3xl border border-[#EAE5D9] bg-white p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] flex items-center gap-2">
                  <ImageUp className="w-4 h-4 text-[#C6A75E]" />
                  Product Imagery
                </h2>
                <button className="text-[10px] font-bold text-[#C6A75E] uppercase tracking-widest hover:underline">Upload More</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {draft.media.map((m) => (
                  <div key={m.id} className="aspect-square rounded-2xl border border-[#EAE5D9] overflow-hidden group relative">
                    <img src={m.url} alt={m.altText || ''} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <button className="absolute top-2 right-2 p-1.5 bg-white/20 backdrop-blur-md rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button className="aspect-square rounded-2xl border-2 border-dashed border-[#EAE5D9] flex flex-col items-center justify-center gap-2 text-[#A39B8F] hover:border-[#C6A75E] hover:text-[#C6A75E] transition-all bg-[#FBFaf8]">
                  <ImageUp className="w-6 h-6" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Add Image</span>
                </button>
              </div>
            </article>
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-4 space-y-6">
            {/* Status Panel */}
            <article className="rounded-3xl border border-[#EAE5D9] bg-white p-6 shadow-sm">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-6">Verification Status</h2>
              <div className="p-4 bg-[#FBFaf8] rounded-2xl border border-[#F0EBE0] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#766A5D] uppercase tracking-wider">Current State</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${draft.status === 'REJECTED' ? 'bg-rose-500' :
                      draft.status === 'PUBLISHED' ? 'bg-emerald-500' :
                        'bg-amber-500'
                      }`} />
                    <span className="text-xs font-black text-[#3E2723] uppercase">{draft.status.replace(/_/g, ' ')}</span>
                  </div>
                </div>
                {draft.submissionNotes && (
                  <div className="pt-4 border-t border-[#F0EBE0]">
                    <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-1">Artisan Submission Notes</p>
                    <p className="text-xs text-[#5C5449] italic">"{draft.submissionNotes}"</p>
                  </div>
                )}
              </div>
            </article>

            {/* Artisan Info */}
            <article className="rounded-3xl border border-[#EAE5D9] bg-white p-6 shadow-sm">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-6">Artisan Source</h2>
              <div className="flex items-center gap-4 p-4 bg-[#FBFaf8] rounded-2xl border border-[#F0EBE0]">
                <div className="w-12 h-12 bg-[#3E2723] rounded-2xl flex items-center justify-center text-white font-bold text-lg">
                  {draft.artisan?.firstName?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#2D2620]">{draft.artisan?.firstName} {draft.artisan?.lastName}</p>
                  <p className="text-xs text-[#766A5D]">{draft.artisan?.email}</p>
                </div>
              </div>
              <button className="w-full mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-[#C6A75E] uppercase tracking-widest hover:underline">
                Explore Portfolio <ExternalLink className="w-3 h-3" />
              </button>
            </article>

            {/* Inventory Controls */}
            <article className="rounded-3xl border border-[#EAE5D9] bg-white p-6 shadow-sm">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-6">Commerce Settings</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest ml-1">Market Price (ETB)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) || 0 })}
                    className="w-full bg-[#FBFaf8] border border-[#F0EBE0] rounded-2xl px-5 py-4 text-xl font-black text-[#3E2723] outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest ml-1">Stock Readiness</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) || 0 })}
                    className="w-full bg-[#FBFaf8] border border-[#F0EBE0] rounded-2xl px-5 py-4 text-xl font-black text-[#2D2620] outline-none"
                  />
                </div>
              </div>
            </article>

            {/* Audit Trail Preview */}
            <article className="rounded-3xl border border-[#EAE5D9] bg-white p-6 shadow-sm">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-6">Recent Activity</h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#F6F4F0] flex items-center justify-center flex-shrink-0">
                    <History className="w-4 h-4 text-[#766A5D]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#2D2620]">Draft Created</p>
                    <p className="text-[9px] text-[#A39B8F]">Verified by System Automations</p>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </main>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1C1C1C]/60 backdrop-blur-sm" onClick={() => setShowRejectModal(false)} />
          <div className="relative bg-white rounded-[2rem] shadow-2xl border border-[#EAE5D9] w-full max-w-md p-8">
            <h3 className="text-xl font-bold text-[#2D2620] mb-2 uppercase" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif' }}>Return to Artisan</h3>
            <p className="text-sm font-medium text-[#766A5D] mb-8 leading-relaxed">Please provide a detailed explanation of why this product cannot be verified yet. The artisan will receive this feedback to make corrections.</p>

            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="E.g. Heritage story requires more detail, region is incorrectly specified..."
              className="w-full bg-[#FBFaf8] border border-[#F0EBE0] rounded-2xl px-5 py-4 text-sm font-medium text-[#2D2620] outline-none focus:border-rose-400 focus:bg-white transition-all resize-none mb-6"
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-6 py-3 text-xs font-bold text-[#A39B8F] uppercase tracking-widest hover:text-[#3E2723]"
              >
                Go Back
              </button>
              <button
                onClick={() => handleReviewDecision('REJECT', rejectReason)}
                disabled={isUpdatingStatus}
                className="px-6 py-3 bg-rose-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all"
              >
                {isUpdatingStatus ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[70] animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border border-[#EAE5D9] bg-white text-[#2D2620]">
            <CheckCircle2 className="w-5 h-5 text-[#C6A75E]" />
            <p className="text-sm font-bold tracking-tight">{toast}</p>
          </div>
        </div>
      )}
    </div>
  );
}
