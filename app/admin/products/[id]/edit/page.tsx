"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Globe,
  ImageUp,
  Layout,
  Layers,
  Save,
  ShieldCheck,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react';

export default function ProductEditPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: 0,
    stock: 0,
    status: '',
    featured: false,
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
    }
  });

  const [materialsInput, setMaterialsInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3000);
  };

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
        
        setFormData({
          title: data.title || '',
          description: data.description || '',
          category: data.category || '',
          price: data.price || 0,
          stock: data.stock || 0,
          status: data.status || '',
          featured: data.featured || false,
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
          }
        });
        
        setMaterialsInput((data.materials || []).join(', '));
        setTagsInput((data.tags || []).join(', '));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1';
      
      const payload = {
        ...formData,
        materials: materialsInput.split(',').map(s => s.trim()).filter(Boolean),
        tags: tagsInput.split(',').map(s => s.trim()).filter(Boolean),
      };

      const res = await fetch(`${base}/admin/products/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update product');
      }
      
      showToast('Product updated successfully');
      setTimeout(() => router.push(`/admin/products/${id}`), 1000);
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F4F0]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#C6A75E] border-t-transparent" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#A39B8F]">Synchronizing Inventory Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F4F0] text-[#1C1C1C] font-sans">
      {/* Sticky Action Header */}
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
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-0.5">Management Portal</p>
              <h1 className="text-xl font-bold tracking-tight text-[#2D2620]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif', textTransform: 'uppercase' }}>
                Editing {formData.title || 'Product'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="px-6 py-2.5 text-xs font-bold text-[#A39B8F] uppercase tracking-widest hover:text-[#3E2723] transition-colors"
            >
              Discard
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-3 bg-[#3E2723] text-white rounded-xl text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#2A1A17] transition-all shadow-lg shadow-[#3E2723]/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? 'Processing' : 'Commit Changes'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-10">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Main Editing Column */}
          <div className="xl:col-span-8 space-y-8">
            
            {/* Core Identification */}
            <article className="rounded-3xl border border-[#EAE5D9] bg-white p-8 shadow-sm">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-8 flex items-center gap-2">
                <Layout className="w-4 h-4 text-[#C6A75E]" />
                Identity & Story
              </h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest ml-1">Product Title</label>
                  <input 
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Enter descriptive title..."
                    className="w-full bg-[#FBFaf8] border border-[#F0EBE0] rounded-2xl px-5 py-4 text-lg font-bold text-[#2D2620] outline-none focus:border-[#C6A75E] focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest ml-1">Cultural Narrative</label>
                  <textarea 
                    rows={6}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Tell the story of this artifact..."
                    className="w-full bg-[#FBFaf8] border border-[#F0EBE0] rounded-2xl px-5 py-4 text-sm font-medium text-[#5C5449] leading-relaxed outline-none focus:border-[#C6A75E] focus:bg-white transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest ml-1">Primary Category</label>
                    <div className="relative">
                      <select 
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full bg-[#FBFaf8] border border-[#F0EBE0] rounded-2xl px-5 py-4 text-sm font-bold text-[#2D2620] outline-none focus:border-[#C6A75E] focus:bg-white transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Select Category</option>
                        <option value="POTTERY">Pottery & Ceramics</option>
                        <option value="WEAVING">Weaving & Textiles</option>
                        <option value="LEATHER">Leatherwork</option>
                        <option value="JEWELRY">Traditional Jewelry</option>
                        <option value="WOODWORK">Woodwork & Carving</option>
                        <option value="ART">Fine Art & Icons</option>
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A39B8F] pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest ml-1">Artisan Technique</label>
                    <input 
                      type="text"
                      value={formData.culturalMetadata.artisanTechnique}
                      onChange={(e) => setFormData({...formData, culturalMetadata: {...formData.culturalMetadata, artisanTechnique: e.target.value}})}
                      placeholder="e.g. Hand-spun, Pit-fired..."
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
                Geographic & Temporal Context
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest ml-1">Region of Origin</label>
                  <input 
                    type="text"
                    value={formData.culturalMetadata.region}
                    onChange={(e) => setFormData({...formData, culturalMetadata: {...formData.culturalMetadata, region: e.target.value}})}
                    placeholder="e.g. Axum, Konso, Harar..."
                    className="w-full bg-[#FBFaf8] border border-[#F0EBE0] rounded-2xl px-5 py-4 text-sm font-bold text-[#2D2620] outline-none focus:border-[#C6A75E] focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest ml-1">Historical Era</label>
                  <input 
                    type="text"
                    value={formData.culturalMetadata.era}
                    onChange={(e) => setFormData({...formData, culturalMetadata: {...formData.culturalMetadata, era: e.target.value}})}
                    placeholder="e.g. Contemporary, 19th Century..."
                    className="w-full bg-[#FBFaf8] border border-[#F0EBE0] rounded-2xl px-5 py-4 text-sm font-bold text-[#2D2620] outline-none focus:border-[#C6A75E] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="mt-8 space-y-2">
                <label className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest ml-1">Detailed Heritage Story</label>
                <textarea 
                  rows={4}
                  value={formData.culturalMetadata.story}
                  onChange={(e) => setFormData({...formData, culturalMetadata: {...formData.culturalMetadata, story: e.target.value}})}
                  placeholder="Provide deeper context on the heritage of this piece..."
                  className="w-full bg-[#FBFaf8] border border-[#F0EBE0] rounded-2xl px-5 py-4 text-sm font-medium text-[#5C5449] leading-relaxed outline-none focus:border-[#C6A75E] focus:bg-white transition-all resize-none"
                />
              </div>
            </article>

            {/* Physical Attributes */}
            <article className="rounded-3xl border border-[#EAE5D9] bg-white p-8 shadow-sm">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-8 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#C6A75E]" />
                Physical Characteristics
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest ml-1">Materials Used (Comma separated)</label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={materialsInput}
                      onChange={(e) => setMaterialsInput(e.target.value)}
                      placeholder="Clay, Teff Straw, Natural Pigment..."
                      className="w-full bg-[#FBFaf8] border border-[#F0EBE0] rounded-2xl px-5 py-4 text-sm font-bold text-[#2D2620] outline-none focus:border-[#C6A75E] focus:bg-white transition-all"
                    />
                    <Tag className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A39B8F]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest ml-1">SEO & Search Tags</label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="Handmade, Decor, Tradition..."
                      className="w-full bg-[#FBFaf8] border border-[#F0EBE0] rounded-2xl px-5 py-4 text-sm font-bold text-[#2D2620] outline-none focus:border-[#C6A75E] focus:bg-white transition-all"
                    />
                    <Tag className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A39B8F]" />
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest ml-1 mb-4">Dimensions (cm)</p>
                <div className="grid grid-cols-3 gap-4">
                  {['widthCm', 'heightCm', 'depthCm'].map((dim) => (
                    <div key={dim} className="space-y-2">
                      <label className="text-[10px] font-medium text-[#766A5D] uppercase tracking-wider block text-center">
                        {dim.replace('Cm', '')}
                      </label>
                      <input 
                        type="number"
                        value={formData.dimensions[dim as keyof typeof formData.dimensions]}
                        onChange={(e) => setFormData({
                          ...formData, 
                          dimensions: {...formData.dimensions, [dim]: parseFloat(e.target.value) || 0}
                        })}
                        className="w-full bg-[#FBFaf8] border border-[#F0EBE0] rounded-xl px-4 py-3 text-center font-bold text-[#2D2620] outline-none focus:border-[#C6A75E] focus:bg-white transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>

          {/* Side Control Column */}
          <div className="xl:col-span-4 space-y-6">
            
            {/* Status & Visibility */}
            <article className="rounded-3xl border border-[#EAE5D9] bg-white p-6 shadow-sm">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-6">Status & Visibility</h2>
              
              <div className="space-y-6">
                <div className="p-4 bg-[#FBFaf8] rounded-2xl border border-[#F0EBE0] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#766A5D] uppercase tracking-wider">Market Status</span>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="bg-white border border-[#EAE5D9] rounded-lg px-3 py-1.5 text-[11px] font-black text-[#3E2723] outline-none cursor-pointer uppercase"
                    >
                      <option value="APPROVED">Approved</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#F0EBE0]">
                    <span className="text-xs font-bold text-[#766A5D] uppercase tracking-wider">Featured Asset</span>
                    <button 
                      onClick={() => setFormData({...formData, featured: !formData.featured})}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${formData.featured ? 'bg-[#3E2723]' : 'bg-[#EAE5D9]'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${formData.featured ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-800">Verification Active</p>
                    <p className="text-[10px] font-medium text-emerald-600 mt-0.5">Modifications will be logged in the administrative audit trail.</p>
                  </div>
                </div>
              </div>
            </article>

            {/* Inventory & Commercials */}
            <article className="rounded-3xl border border-[#EAE5D9] bg-white p-6 shadow-sm">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-6">Inventory Controls</h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest ml-1">Listing Price (ETB)</label>
                  <input 
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#FBFaf8] border border-[#F0EBE0] rounded-2xl px-5 py-4 text-xl font-black text-[#3E2723] outline-none focus:border-[#C6A75E] focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest ml-1">Current Stock Levels</label>
                  <input 
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                    className="w-full bg-[#FBFaf8] border border-[#F0EBE0] rounded-2xl px-5 py-4 text-xl font-black text-[#2D2620] outline-none focus:border-[#C6A75E] focus:bg-white transition-all"
                  />
                </div>
              </div>
            </article>

            {/* Risk & Safety */}
            <article className="rounded-3xl border border-amber-50 bg-amber-50/30 p-6 shadow-sm border-dashed">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-amber-800 uppercase tracking-widest">Safety Guardrails</h3>
              </div>
              <p className="text-[10px] font-medium text-amber-700 leading-relaxed">
                Changes to status or price may impact active cart sessions and pending orders. Ensure stock levels are verified with the artisan before committing large adjustments.
              </p>
            </article>

            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-4 rounded-2xl border border-rose-200 text-rose-600 text-xs font-bold uppercase tracking-[0.2em] hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Permanent Archive
            </button>
          </div>
        </div>
      </main>

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[70] animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border border-[#EAE5D9] bg-white text-[#2D2620]">
            <CheckCircle2 className="w-5 h-5 text-[#C6A75E]" />
            <p className="text-sm font-bold tracking-tight">{toast}</p>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
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
                    const res = await fetch(`${base}/admin/products/${id}`, {
                      method: 'DELETE',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                    });
                    if (!res.ok) throw new Error('Failed to archive');
                    showToast('Product archived successfully');
                    setTimeout(() => router.push('/admin/products'), 1500);
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
    </div>
  );
}
