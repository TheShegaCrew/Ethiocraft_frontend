
"use client"
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ChevronRight,
  Download,
  ImagePlus,
} from 'lucide-react';
import { ReverifyModal } from '@/components/admin/ReverifyModal';
import { MessagePanelModal } from '@/components/admin/MessagePanelModal';

type PageEntity = 'samples' | 'products' | 'orders' | 'artisans';
type Status = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_MEDIA' | 'SUBMITTED';
type TabKey = 'Details' | 'Admin Review' | 'Agent Verification' | 'Activity Logs';

type SampleData = {
  id: string;
  title: string;
  artisan: string;
  artisanId: string;
  submittedAt: string;
  updatedAt: string;
  description: string;
  culturalContext: string;
  suggestedPrice: number;
  materials: string;
  region: string;
  technique: string;
  dimensions: string;
  culturalTags: string[];
};

type Agent = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status?: string;
  role?: string;
};

const tabs: TabKey[] = ['Details', 'Admin Review', 'Agent Verification', 'Activity Logs'];

const initialSample: SampleData = {
  id: '',
  title: '',
  artisan: '',
  artisanId: '',
  submittedAt: '',
  updatedAt: '',
  description: '',
  culturalContext: '',
  suggestedPrice: 0,
  materials: '',
  region: '',
  technique: '',
  dimensions: '',
  culturalTags: [],
};

type MediaItem = {
  id: string;
  type: string;
  src: string;
  thumb: string;
};

function agentDisplayName(agent: Agent) {
  return `${agent.firstName} ${agent.lastName}`;
}

function agentLocation(agent: Agent) {
  return agent.phone ?? 'No contact info';
}

function calculateReviewTime(submitted: string, updated: string, status: string) {
  if (status === 'PENDING_REVIEW' || status === 'SUBMITTED') return 'Pending';
  if (!submitted || !updated || submitted === 'N/A' || updated === 'N/A') return 'Pending';
  const start = new Date(submitted).getTime();
  const end = new Date(updated).getTime();
  const diff = end - start;
  if (diff <= 0) return 'Pending';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes} min${minutes !== 1 ? 's' : ''}`;
}


function statusStyles(status: Status) {
  if (status === 'PENDING_REVIEW' || status === 'SUBMITTED') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'APPROVED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'REJECTED') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-orange-50 text-orange-700 border-orange-200';
}

function statusLabel(status: Status) {
  if (status === 'PENDING_REVIEW') return 'Pending Review';
  if (status === 'SUBMITTED') return 'Submitted';
  if (status === 'APPROVED') return 'Approved';
  if (status === 'REJECTED') return 'Rejected';
  return 'Needs More Media';
}


function breadcrumbLabel(entity: PageEntity) {
  if (entity === 'samples') return 'Samples';
  if (entity === 'products') return 'Products';
  if (entity === 'orders') return 'Orders';
  return 'Artisans';
}

export default function App() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const [sample, setSample] = useState<SampleData>(initialSample);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [status, setStatus] = useState<Status>('PENDING_REVIEW');
  const [activeTab, setActiveTab] = useState<TabKey>('Details');
  const [selectedMediaId, setSelectedMediaId] = useState('');
  const [show3D, setShow3D] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [showSamplesDropdown, setShowSamplesDropdown] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentSearch, setAgentSearch] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [assignedAgent, setAssignedAgent] = useState<Agent | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRequestMediaModal, setShowRequestMediaModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveNotes, setApproveNotes] = useState('');
  const [activity, setActivity] = useState<string[]>([
    'Artisan submitted sample - 2026-04-10 09:48',
    'Admin opened review panel - 2026-04-17 10:12',
  ]);
  const [artisanSamples, setArtisanSamples] = useState<any[]>([]);
  const [showReverifyModal, setShowReverifyModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);

  // Fetch real verification agents from the backend
  useEffect(() => {
    const fetchAgents = async () => {
      setAgentsLoading(true);
      try {
        const res = await fetch('http://localhost:4000/api/v1/admin/users/role/VERIFICATION_AGENT', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('Failed to fetch agents');
        const json = await res.json();
        // Response shape: { data: { role, items: [...], meta: {...} } }
        const list = json.data?.items ?? [];
        setAgents(list);
      } catch (err) {
        console.error('Agents fetch error:', err);
      } finally {
        setAgentsLoading(false);
      }
    };
    fetchAgents();
  }, []);

  useEffect(() => {
    if (!sample.artisanId) return;
    const fetchArtisanSamples = async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/v1/admin/products/samples?artisanId=${sample.artisanId}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('Failed to fetch artisan samples');
        const json = await res.json();
        const list = json.data?.items ?? [];
        setArtisanSamples(list.filter((s: any) => s.id !== sample.id));
      } catch (err) {
        console.error('Artisan samples fetch error:', err);
      }
    };
    fetchArtisanSamples();
  }, [sample.artisanId, sample.id]);


  useEffect(() => {
    if (!id) return;

    const fetchSample = async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/v1/admin/products/samples/${id}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();

        const item = json.data;
        if (item) {
          setSample({
            id: item.id,
            title: item.title || 'Untitled Sample',
            artisan: item.artisan ? `${item.artisan.firstName} ${item.artisan.lastName}` : 'Unknown Artisan',
            artisanId: item.artisanId,
            submittedAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A',
            updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'N/A',
            description: item.description || 'No description provided.',
            culturalContext: item.culturalMetadata?.culturalSignificance || 'No cultural context available.',
            suggestedPrice: Number(item.price) || 0,
            materials: item.materials && item.materials.length > 0 ? item.materials.join(', ') : 'Not specified',
            region: item.culturalMetadata?.origin || 'Unknown Region',
            technique: item.culturalMetadata?.technique || 'Not specified',
            dimensions: (item.dimensions && (item.dimensions.width || item.dimensions.height))
              ? `${item.dimensions.width || item.dimensions.widthCm || 0}x${item.dimensions.height || item.dimensions.heightCm || 0} cm`
              : 'Dimensions unknown',
            culturalTags: item.tags || [],
          });
          if (item.status) {
            setStatus(item.status as Status);
          }

          if (item.media && item.media.length > 0) {
            const resolveUrl = (url: string) => {
              if (!url) return '';
              if (/^https?:\/\//i.test(url)) return url; // already absolute (Cloudinary etc.)
              return url.startsWith('/') ? `http://localhost:4000${url}` : `http://localhost:4000/${url}`;
            };
            const formattedMedia = item.media.map((m: any) => ({
              id: m.id,
              type: m.kind?.toLowerCase() === 'video' ? 'video' : 'image',
              src: resolveUrl(m.url),
              thumb: resolveUrl(m.url)
            }));
            setMediaList(formattedMedia);
            setSelectedMediaId(formattedMedia[0].id);
          }
        }
      } catch (err) {
        console.error(err);
        showToast('Error fetching sample');
      } finally {
        setLoading(false);
      }
    };
    fetchSample();
  }, [id]);

  const navigate = (path: string) => {
    // prefer router push when available
    try {
      router.push(path);
    } catch (e) {
      if (typeof window !== 'undefined') window.location.href = path;
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    if (typeof window !== 'undefined') window.setTimeout(() => setToast(''), 2200);
  };

  const addActivity = (entry: string) => {
    setActivity((prev) => [`${entry} - ${new Date().toLocaleString()}`, ...prev]);
  };


  const selectedMedia = mediaList.find((item) => item.id === selectedMediaId) ?? mediaList[0];
  const hasRequiredMetadata =
    Boolean(sample.materials && sample.region && sample.technique && sample.dimensions) &&
    sample.culturalTags.length > 0 &&
    sample.suggestedPrice > 0 &&
    mediaList.length > 0;
  const imageOnlyCount = mediaList.filter((item) => item.type === 'image').length;
  const quality = imageOnlyCount >= 3 ? 'High' : imageOnlyCount === 2 ? 'Acceptable' : 'Low';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] text-[#1C1C1C]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#C6A75E] border-t-transparent" />
          <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Loading Sample Details...</p>
        </div>
      </div>
    );
  }

  const updateSampleStatus = async (decision: string, notes?: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/admin/products/samples/${id}/review`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          decision,
          notes: notes || ''
        })
      });
      if (!res.ok) throw new Error('Failed to update status');
      const json = await res.json();
      return json;
    } catch (err) {
      console.error(err);
      showToast('Error updating status');
      return null;
    }
  };

  const approveSample = () => {
    if (status === 'NEEDS_MORE_MEDIA') return showToast('Waiting for artisan resubmission');
    setShowApproveModal(true);
  };

  const confirmApprove = async () => {
    const res = await updateSampleStatus('APPROVE', approveNotes);
    if (res) {
      setStatus('APPROVED');
      setShowApproveModal(false);
      setApproveNotes('');
      addActivity('Admin approved sample');
      showToast('Sample approved successfully');
    }
  };

  const rejectSample = async () => {
    if (!rejectReason.trim()) return showToast('Rejection reason is required');

    const res = await updateSampleStatus('REJECT', rejectReason);
    if (res) {
      setStatus('REJECTED');
      setShowRejectModal(false);
      addActivity(`Admin rejected sample: ${rejectReason}`);
      setRejectReason('');
      showToast('Sample rejected');
    }
  };

  const requestMoreMedia = async () => {
    if (!requestMessage.trim()) return showToast('Please include a message for the artisan');

    const res = await updateSampleStatus('REQUEST_MORE_INFO', requestMessage);
    if (res) {
      setStatus('NEEDS_MORE_MEDIA');
      setShowRequestMediaModal(false);
      addActivity(`Admin requested more media: ${requestMessage}`);
      setRequestMessage('');
      showToast('Request sent to artisan. Waiting for resubmission');
    }
  };

  const assignAgent = async () => {
    if (status !== 'APPROVED') return showToast('Approve sample before assigning an agent');
    const agent = agents.find((item) => item.id === selectedAgentId);
    if (!agent) return showToast('Select an agent to continue');
    try {
      const res = await fetch(`http://localhost:4000/api/v1/admin/samples/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignedVerifierId: agent.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Assignment failed');
      }
      const json = await res.json();
      // Use the returned assignedVerifier if available, otherwise fall back to local agent object
      const verifier: Agent = json.data?.assignedVerifier ?? agent;
      setAssignedAgent(verifier);
      addActivity(`Agent assigned: ${agentDisplayName(verifier)}`);
      showToast(`Assignment sent to ${agentDisplayName(verifier)}`);
    } catch (err: any) {
      console.error(err);
      showToast(err.message ?? 'Failed to assign agent. Please try again.');
    }
  };

  const saveSampleEdit = (formData: FormData) => {
    setSample((prev) => ({
      ...prev,
      title: String(formData.get('title') ?? prev.title),
      description: String(formData.get('description') ?? prev.description),
      culturalContext: String(formData.get('culturalContext') ?? prev.culturalContext),
      materials: String(formData.get('materials') ?? prev.materials),
      technique: String(formData.get('technique') ?? prev.technique),
      dimensions: String(formData.get('dimensions') ?? prev.dimensions),
      region: String(formData.get('region') ?? prev.region),
      suggestedPrice: Number(formData.get('suggestedPrice') ?? prev.suggestedPrice),
      culturalTags: String(formData.get('culturalTags') ?? '').split(',').map((item) => item.trim()).filter(Boolean),
      updatedAt: new Date().toLocaleString(),
    }));
    addActivity('Admin updated sample data');
    showToast('Sample updated successfully');
    navigate(`/admin/samples/${sample.id}`);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] px-4 py-6 text-[#1C1C1C] md:px-8" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl uppercase tracking-[0.04em] md:text-4xl" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif' }}>
                {sample.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs ${statusStyles(status)}`}>{statusLabel(status)}</span>
                <span className="rounded-full bg-[#f6f2ea] px-3 py-1 text-xs text-[#6a5a44]">Sample ID: {sample.id || 'N/A'}</span>
                <a href="#" className="rounded-full bg-[#f6f2ea] px-3 py-1 text-xs text-[#6a5a44] underline underline-offset-4">
                  Artisan: {sample.artisan || 'Unknown Artisan'}
                </a>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#786e66]">
                <span>Submitted: {sample.submittedAt || 'N/A'}</span>
                <span>Last updated: {sample.updatedAt || 'N/A'}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
              <button onClick={() => navigate(`/admin/sample/${sample.id}/edit`)} className="rounded-xl border border-neutral-200 px-3 py-2 text-xs transition duration-300 hover:-translate-y-1 hover:shadow-md">
                Edit Sample
              </button>
              <button onClick={() => navigate(`/admin/sample/${sample.id}/edit`)} className="rounded-xl border border-neutral-200 px-3 py-2 text-xs transition duration-300 hover:-translate-y-1 hover:shadow-md">
                Edit Metadata
              </button>
              <button onClick={() => navigate(`/admin/sample/${sample.id}/media`)} className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 px-3 py-2 text-xs transition duration-300 hover:-translate-y-1 hover:shadow-md">
                <ImagePlus className="h-3.5 w-3.5" /> Edit Media
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="space-y-6 xl:col-span-7">
            <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl uppercase tracking-[0.04em]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif' }}>
                  Sample Media
                </h2>
                <div className="flex items-center gap-2 text-xs" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                  <span className="rounded-full bg-[#f6f2ea] px-3 py-1 text-[#6a5a44]">Image Quality: {quality}</span>
                  <button className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5" onClick={() => showToast('Downloading original assets')}>
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-[#f9f6f1]">
                {!show3D && selectedMedia?.type === 'image' && <img src={selectedMedia.src} alt="Sample" className="h-[420px] w-full object-cover transition duration-300 hover:scale-[1.03]" />}
                {!show3D && selectedMedia?.type === 'video' && <video src={selectedMedia.src} controls className="h-[420px] w-full object-cover" />}
                {(show3D || selectedMedia?.type === 'model') && (
                  <div className="flex h-[420px] items-center justify-center bg-[#efe8db] text-center">
                    <div>
                      <p className="text-sm font-medium">3D Viewer Placeholder</p>
                      <p className="mt-1 text-xs text-[#756a61]">Use model-viewer or Three.js integration for final build</p>
                    </div>
                  </div>
                )}
                {!show3D && !selectedMedia && (
                  <div className="flex h-[420px] items-center justify-center bg-[#efe8db] text-center text-sm text-[#756a61]">
                    No media available
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {mediaList.map((item) => (
                  <button key={item.id} onClick={() => { setSelectedMediaId(item.id); setShow3D(false); }} className={`overflow-hidden rounded-xl border transition duration-300 hover:-translate-y-1 ${selectedMediaId === item.id ? 'border-[#C6A75E]' : 'border-neutral-200'}`}>
                    <img src={item.thumb} alt={item.type} className="h-16 w-16 object-cover" />
                  </button>
                ))}
                <button onClick={() => setShow3D((prev) => !prev)} className="rounded-xl border border-neutral-200 px-3 py-2 text-xs transition duration-300 hover:-translate-y-1 hover:shadow-sm" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                  View in 3D
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl uppercase tracking-[0.04em]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif' }}>Description and Cultural Context</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#554d47]">{sample.description || 'No description provided for this sample.'}</p>
              <p className="mt-3 text-sm leading-relaxed text-[#554d47]">
                {sample.culturalContext
                  ? (expandedDescription ? sample.culturalContext : `${sample.culturalContext.slice(0, 120)}${sample.culturalContext.length > 120 ? '...' : ''}`)
                  : 'No cultural context or historical background provided.'}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {sample.culturalTags.length > 0 ? (
                  sample.culturalTags.map((tag) => (
                    <span key={tag} className="rounded-full bg-[#f7f1e4] px-3 py-1 text-xs text-[#6a5a44]">{tag}</span>
                  ))
                ) : (
                  <span className="text-xs italic text-[#a3978d]">No cultural tags associated</span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                <button className="rounded-lg border border-neutral-200 px-3 py-2" onClick={() => setExpandedDescription((prev) => !prev)}>{expandedDescription ? 'Collapse' : 'Expand'}</button>
                <button className="rounded-lg border border-neutral-200 px-3 py-2" onClick={() => showToast('AI summary feature placeholder')}>Summarize</button>
              </div>
            </article>

            <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap gap-5 border-b border-neutral-200 pb-3" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                {tabs.map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`relative pb-2 text-sm ${activeTab === tab ? 'text-[#3E2723]' : 'text-[#7a6f65] hover:text-[#3E2723]'}`}>
                    {tab}
                    {activeTab === tab && <span className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-[#C6A75E]" />}
                  </button>
                ))}
              </div>

              {activeTab === 'Details' && (
                <div className="grid gap-3 md:grid-cols-2 text-sm">
                  {[
                    ['Materials', sample.materials || 'Not specified'],
                    ['Region', sample.region || 'Unknown'],
                    ['Technique', sample.technique || 'Not specified'],
                    ['Dimensions', sample.dimensions || 'Unknown'],
                    ['Suggested Price', sample.suggestedPrice > 0 ? `${sample.suggestedPrice} ETB` : 'Price not set'],
                    ['Cultural Tags', sample.culturalTags.length > 0 ? sample.culturalTags.join(', ') : 'None'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-neutral-200 p-3 transition hover:-translate-y-1 duration-300">
                      <p className="text-xs uppercase tracking-[0.08em] text-[#7d7268]" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>{label}</p>
                      <p className={`mt-1 ${label === 'Region' ? 'text-[#C6A75E] font-medium' : ''}`}>{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'Admin Review' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-neutral-200 p-3">
                    <p className="text-xs uppercase tracking-[0.08em] text-[#7d7268]" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>Review Checklist</p>
                    <div className="mt-3 space-y-2 text-sm">
                      {[
                        ['Media quality', mediaList.length > 0],
                        ['Description completeness', (sample.description?.length ?? 0) > 10],
                        ['Cultural accuracy', (sample.culturalContext?.length ?? 0) > 10],
                        ['Pricing reasonable', sample.suggestedPrice >= 500 && sample.suggestedPrice <= 1000],
                      ].map(([label, pass]) => (
                        <div key={String(label)} className="flex items-center justify-between rounded-lg bg-[#f9f6f1] px-3 py-2">
                          <span>{label}</span>
                          <span className={pass ? 'text-emerald-700' : 'text-rose-700'}>{pass ? 'Pass' : 'Fail'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                    <button onClick={approveSample} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">Approve Sample</button>
                    <button onClick={() => setShowRejectModal(true)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">Reject Sample</button>
                    <button onClick={() => setShowRequestMediaModal(true)} className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-orange-700">Request More Media</button>
                  </div>
                </div>
              )}

              {activeTab === 'Agent Verification' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-neutral-200 p-3">
                    <p className="text-xs uppercase tracking-[0.08em] text-[#7d7268]" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>Assign Field Agent</p>
                    <input
                      type="text"
                      placeholder="Search agent by name or email..."
                      value={agentSearch}
                      onChange={(e) => setAgentSearch(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#C6A75E]"
                    />
                    <select
                      value={selectedAgentId}
                      onChange={(event) => setSelectedAgentId(event.target.value)}
                      className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#C6A75E]"
                    >
                      <option value="">
                        {agentsLoading ? 'Loading agents...' : agents.length === 0 ? 'No agents available' : 'Select an agent'}
                      </option>
                      {agents
                        .filter((a) => {
                          const q = agentSearch.toLowerCase();
                          return !q || agentDisplayName(a).toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
                        })
                        .map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agentDisplayName(agent)} — {agentLocation(agent)} · {agent.email}
                          </option>
                        ))}
                    </select>
                    <div className="mt-3 flex gap-2 text-xs" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                      <button onClick={assignAgent} disabled={status !== 'APPROVED'} className="rounded-xl border border-neutral-200 px-3 py-2 disabled:opacity-50">{assignedAgent ? 'Reassign Agent' : 'Assign Agent'}</button>
                      <button onClick={() => setShowReverifyModal(true)} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">Request Re-verification</button>
                    </div>
                    {status !== 'APPROVED' && <p className="mt-2 text-xs text-amber-700">Agent assignment is available after sample approval.</p>}
                  </div>

                  {assignedAgent && (
                    <div className="rounded-xl border border-neutral-200 p-3 text-sm">
                      <p className="font-medium">Assigned agent: {agentDisplayName(assignedAgent)}</p>
                      <p className="text-[#72675f]">{agentLocation(assignedAgent)}</p>
                      <p className="text-[#72675f] text-xs mt-0.5">{assignedAgent.email}</p>
                      <p className="mt-2 rounded-full bg-[#f5efe2] px-2 py-1 text-xs inline-block">Task status: Pending</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'Activity Logs' && (
                <ol className="space-y-3 border-l border-neutral-200 pl-4 text-sm">
                  {activity.map((entry) => (
                    <li key={entry} className="relative text-[#61584f]"><span className="absolute -left-[21px] top-2 h-2 w-2 rounded-full bg-[#C6A75E]" />{entry}</li>
                  ))}
                </ol>
              )}
            </article>
            <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.08em] text-[#85796d]" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>Artisan Info</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e9ded0] text-sm font-semibold">
                  {sample.artisan ? sample.artisan.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??'}
                </div>
                <div>
                  <p className="font-medium text-[#C6A75E]">{sample.artisan || 'Unknown Artisan'}</p>
                  <p className="text-xs text-[#6f655d]">Verified Ethiocraft Partner</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-[#6f655d]">{sample.region || 'Region not specified'}</p>
              <span className="mt-2 inline-block rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">Artisan Verified</span>
              <div className="mt-3 flex flex-wrap gap-2 text-xs" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                <button className="rounded-lg border border-neutral-200 px-3 py-1.5 transition hover:bg-neutral-50" onClick={() => navigate(`/admin/users/${sample.artisanId}`)}>View Artisan Profile</button>
                <button className="rounded-lg border border-neutral-200 px-3 py-1.5 transition hover:bg-neutral-50" onClick={() => setShowMessageModal(true)}>Message Artisan</button>
                <div className="relative">
                  <button
                    className="rounded-lg border border-neutral-200 px-3 py-1.5 transition hover:bg-neutral-50"
                    onClick={() => {
                      if (artisanSamples.length === 0) showToast('No other samples found');
                      else setShowSamplesDropdown(!showSamplesDropdown);
                    }}
                  >
                    View All Samples
                  </button>
                  {showSamplesDropdown && artisanSamples.length > 0 && (
                    <div className="absolute top-full left-0 mt-2 w-56 z-50 rounded-xl border border-neutral-200 bg-white shadow-xl overflow-hidden">
                      <div className="max-h-48 overflow-y-auto">
                        {artisanSamples.map(s => (
                          <button
                            key={s.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowSamplesDropdown(false);
                              navigate(`/admin/sample/${s.id}`);
                            }}
                            className="block w-full text-left px-3 py-2 text-xs hover:bg-neutral-50 truncate border-b border-neutral-100 last:border-0 text-[#3E2723]"
                          >
                            {s.title || 'Untitled Sample'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </article>
          </section>

          <aside className="space-y-6 xl:col-span-5">
            <div className="space-y-6 xl:sticky xl:top-6">
              <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-[#85796d]" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>Status Panel</p>
                <div className="mt-3 space-y-2 text-sm">
                  <p className="flex justify-between"><span>Status</span><span className={`rounded-full border px-2 py-1 text-xs ${statusStyles(status)}`}>{statusLabel(status)}</span></p>
                  <p className="flex justify-between"><span>Sample ID</span><span>{sample.id}</span></p>
                </div>
              </article>

              <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-[#85796d]" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>Admin Controls</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                  <button onClick={approveSample} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">Approve</button>
                  <button onClick={() => setShowRejectModal(true)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">Reject</button>
                  <button onClick={() => setShowRequestMediaModal(true)} className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-orange-700">Request Media</button>
                  <button onClick={() => showToast('Sample deleted')} className="rounded-xl border border-rose-200 px-3 py-2 text-rose-700">Delete</button>
                </div>
              </article>

              <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-[#85796d]" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>Agent Assignment</p>
                <select
                  value={selectedAgentId}
                  onChange={(event) => setSelectedAgentId(event.target.value)}
                  className="mt-3 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#C6A75E]"
                >
                  <option value="">
                    {agentsLoading ? 'Loading agents...' : agents.length === 0 ? 'No agents available' : 'Select agent'}
                  </option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agentDisplayName(agent)} · {agentLocation(agent)}
                    </option>
                  ))}
                </select>
                <button onClick={assignAgent} disabled={status !== 'APPROVED'} className="mt-3 w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs transition duration-300 hover:-translate-y-1 hover:shadow-sm disabled:opacity-50" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                  Assign Agent
                </button>
                {assignedAgent && (
                  <div className="mt-3 rounded-xl bg-[#f9f6f1] p-3 text-xs text-[#5f554b] space-y-0.5">
                    <p className="font-medium">{agentDisplayName(assignedAgent)}</p>
                    <p>{agentLocation(assignedAgent)}</p>
                    <p className="text-[#9d938a]">{assignedAgent.email}</p>
                  </div>
                )}
              </article>

              <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-[#85796d]" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>Sample Insights</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-neutral-200 p-2"><p className="text-xs text-[#7b7067]">Views</p><p className="font-semibold">126</p></div>
                  <div className="rounded-xl border border-neutral-200 p-2"><p className="text-xs text-[#7b7067]">Review time</p><p className="font-semibold">{calculateReviewTime(sample.submittedAt, sample.updatedAt, status)}</p></div>
                </div>
              </article>
            </div>
          </aside>
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowRejectModal(false)}>
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-md" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg uppercase tracking-[0.04em]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif' }}>Reject Sample</h3>
            <textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} rows={4} placeholder="Add rejection reason" className="mt-3 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#C6A75E]" />
            <div className="mt-4 flex justify-end gap-2 text-sm" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
              <button className="rounded-xl border border-neutral-200 px-3 py-2" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700" onClick={rejectSample}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}

      {showRequestMediaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowRequestMediaModal(false)}>
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-md" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg uppercase tracking-[0.04em]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif' }}>Request More Media</h3>
            <textarea value={requestMessage} onChange={(event) => setRequestMessage(event.target.value)} rows={4} placeholder="Tell the artisan what to upload" className="mt-3 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#C6A75E]" />
            <div className="mt-4 flex justify-end gap-2 text-sm" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
              <button className="rounded-xl border border-neutral-200 px-3 py-2" onClick={() => setShowRequestMediaModal(false)}>Cancel</button>
              <button className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-orange-700" onClick={requestMoreMedia}>Send Request</button>
            </div>
          </div>
        </div>
      )}

      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowApproveModal(false)}>
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-md" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg uppercase tracking-[0.04em]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif' }}>Approve Sample</h3>
            <textarea value={approveNotes} onChange={(event) => setApproveNotes(event.target.value)} rows={4} placeholder="Add approval notes (optional)" className="mt-3 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#C6A75E]" />
            <div className="mt-4 flex justify-end gap-2 text-sm" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
              <button className="rounded-xl border border-neutral-200 px-3 py-2" onClick={() => setShowApproveModal(false)}>Cancel</button>
              <button className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700" onClick={confirmApprove}>Confirm Approve</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm shadow-md">{toast}</div>}

      <ReverifyModal
        open={showReverifyModal}
        onOpenChange={setShowReverifyModal}
        sampleId={sample.id}
        sampleTitle={sample.title}
        onSuccess={() => {
          setStatus('NEEDS_MORE_MEDIA');
          addActivity('Admin requested re-verification');
        }}
      />

      <MessagePanelModal
        open={showMessageModal}
        onOpenChange={setShowMessageModal}
        userId={sample.artisanId}
        userName={sample.artisan}
      />
    </div>
  );
}
