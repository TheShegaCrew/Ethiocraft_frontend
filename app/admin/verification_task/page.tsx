"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  Check,
  X,
  AlertCircle,
  Eye,
  ChevronRight,
  MoreVertical,
  Clock,
  CheckCircle2,
  XCircle,
  Archive,
  ArrowUpRight,
  FileText,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  ExternalLink,
  Ban
} from "lucide-react";
import { useRouter } from "next/navigation";

type DraftStatus = 'ADMIN_CREATED' | 'AGENT_IN_PROGRESS' | 'AGENT_VERIFIED' | 'ADMIN_REVIEW' | 'REJECTED' | 'PUBLISHED';

interface VerificationTask {
  id: string;
  productName: string;
  artisanName: string;
  category: string;
  submittedAt: string;
  status: DraftStatus;
  priority: "HIGH" | "MEDIUM" | "LOW";
  imageUrl: string;
  description: string;
  materials: string[];
  region: string;
}

export default function VerificationControlCenter() {
  const router = useRouter();
  const [tasks, setTasks] = useState<VerificationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DraftStatus | "ALL">("ALL");
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<VerificationTask | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1';

      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search) params.append('search', search);

      const res = await fetch(`${base}/verifications/products/drafts?${params.toString()}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!res.ok) throw new Error('Failed to fetch verification queue');
      
      const json = await res.json();
      const data = json.data;
      
      const mappedTasks: VerificationTask[] = data.map((d: any) => ({
        id: d.id,
        productName: d.title,
        artisanName: `${d.artisan?.firstName} ${d.artisan?.lastName}`,
        category: d.category,
        submittedAt: d.updatedAt,
        status: d.status,
        priority: "MEDIUM", // Backend doesn't have priority yet
        imageUrl: d.media?.[0]?.url || "",
        description: d.description,
        materials: d.materials || [],
        region: d.artisan?.artisanProfile?.region || "Unknown",
      }));
      
      setTasks(mappedTasks);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredTasks = useMemo(() => {
      // Backend already filters by status and search, but we can do a secondary local filter for responsiveness
    return tasks.filter((task) => {
      const matchesSearch = 
        task.productName.toLowerCase().includes(search.toLowerCase()) || 
        task.artisanName.toLowerCase().includes(search.toLowerCase()) ||
        task.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, search, statusFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTasks.length && filteredTasks.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTasks.map((t) => t.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleApprove = async (id: string) => {
      try {
        const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1';
        
        const res = await fetch(`${base}/verifications/products/drafts/${id}/review`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ decision: 'APPROVE' })
        });

        if (!res.ok) throw new Error('Failed to approve');
        
        showToast(`Approved & Published ${id}`, "success");
        fetchTasks();
        if (selectedTask?.id === id) setSelectedTask(null);
    } catch (e: any) {
        showToast(e.message, 'error');
    }
  };

  const handleReject = async () => {
    if (!selectedTask) return;
    if (!rejectReason.trim()) {
      showToast("Rejection reason is required", "error");
      return;
    }
    
      try {
        const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1';
        
        const res = await fetch(`${base}/verifications/products/drafts/${selectedTask.id}/review`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ decision: 'REJECT', notes: rejectReason })
        });

        if (!res.ok) throw new Error('Failed to reject');

        showToast(`Rejected ${selectedTask.id}`, "success");
        setShowRejectModal(false);
        setRejectReason("");
        fetchTasks();
        setSelectedTask(null);
    } catch (e: any) {
        showToast(e.message, 'error');
    }
  };

  const stats = useMemo(() => {
    return {
      pending: tasks.filter(t => t.status !== "PUBLISHED" && t.status !== "REJECTED").length,
      approved: tasks.filter(t => t.status === "PUBLISHED").length,
      rejected: tasks.filter(t => t.status === "REJECTED").length,
    };
  }, [tasks]);

  return (
    <div className="min-h-screen bg-[#F6F4F0] text-[#1C1C1C] font-sans overflow-x-hidden relative">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[#EAE5D9] px-6 py-5 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl tracking-tight text-[#2D2620]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif', textTransform: 'uppercase' }}>
              Verification Control
            </h1>
            <p className="text-sm text-[#766A5D] mt-1 font-medium">Review and manage all product verification tasks</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A39B8F] group-focus-within:text-[#C6A75E] transition-colors" />
              <input
                type="text"
                placeholder="Search products, artisans..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-[#FBFaf8] border border-[#EAE5D9] rounded-xl text-sm focus:outline-none focus:border-[#C6A75E] focus:ring-1 focus:ring-[#C6A75E] transition-all w-[260px]"
              />
            </div>
            
            <div className="flex items-center bg-[#FBFaf8] border border-[#EAE5D9] rounded-xl p-1">
              {(["ALL", "ADMIN_CREATED", "AGENT_IN_PROGRESS", "AGENT_VERIFIED", "ADMIN_REVIEW", "REJECTED", "PUBLISHED"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${
                    statusFilter === s 
                      ? "bg-[#3E2723] text-white shadow-sm" 
                      : "text-[#766A5D] hover:text-[#3E2723]"
                  }`}
                >
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            <button onClick={() => fetchTasks()} className="flex items-center gap-2 px-3 py-2 bg-white border border-[#EAE5D9] rounded-xl text-sm font-medium hover:bg-[#FBFaf8] transition-colors">
              <Clock className={`h-4 w-4 text-[#766A5D] ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        
        {/* Analytics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active Queue", value: stats.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
            { label: "Published Total", value: stats.approved, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
            { label: "Rejected Total", value: stats.rejected, icon: XCircle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
            { label: "Efficiency", value: "94%", icon: AlertCircle, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
          ].map((stat, i) => (
            <div key={i} className={`p-5 rounded-2xl border ${stat.border} bg-white shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300`}>
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#8B7F72] uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold text-[#2D2620] mt-0.5">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Verification Queue Table */}
        <div className="bg-white border border-[#EAE5D9] rounded-3xl shadow-sm overflow-hidden">
          {loading && tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-[#A39B8F]">
              <Loader2 className="h-8 w-8 animate-spin text-[#C6A75E] mb-4" />
              <p className="text-sm font-medium tracking-wide">Synchronizing verification queue...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-16 h-16 bg-[#FBFaf8] rounded-full flex items-center justify-center mb-4 border border-[#EAE5D9]">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-[#2D2620]">Queue Clear</h3>
              <p className="text-sm text-[#766A5D] mt-1">No tasks matching your current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-[#FBFaf8] border-b border-[#EAE5D9]">
                    <th className="px-6 py-4 font-semibold text-[#766A5D] w-12">
                      <input 
                        type="checkbox" 
                        className="rounded border-[#C8BEB2] text-[#C6A75E] focus:ring-[#C6A75E] h-4 w-4 cursor-pointer"
                        checked={selectedIds.size === filteredTasks.length && filteredTasks.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-6 py-4 font-semibold text-[#766A5D]">Product Artifact</th>
                    <th className="px-6 py-4 font-semibold text-[#766A5D]">Artisan Source</th>
                    <th className="px-6 py-4 font-semibold text-[#766A5D]">Last Update</th>
                    <th className="px-6 py-4 font-semibold text-[#766A5D]">Status</th>
                    <th className="px-6 py-4 font-semibold text-[#766A5D] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE5D9]">
                  {filteredTasks.map((task) => {
                    const isSelected = selectedIds.has(task.id);
                    return (
                      <tr 
                        key={task.id} 
                        className={`group transition-colors hover:bg-[#FAF9F7] ${isSelected ? 'bg-[#FBFaf8]' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <input 
                            type="checkbox" 
                            className="rounded border-[#C8BEB2] text-[#C6A75E] focus:ring-[#C6A75E] h-4 w-4 cursor-pointer"
                            checked={isSelected}
                            onChange={() => toggleSelect(task.id)}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl border border-[#EAE5D9] overflow-hidden bg-[#FBFaf8] flex-shrink-0">
                              {task.imageUrl ? (
                                <img src={task.imageUrl} alt={task.productName} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-6 h-6 text-[#A39B8F] m-auto mt-3" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-[#2D2620] group-hover:text-[#C6A75E] transition-colors cursor-pointer" onClick={() => setSelectedTask(task)}>{task.productName}</p>
                              <p className="text-xs text-[#8B7F72] mt-0.5">{task.id} • {task.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-[#2D2620]">{task.artisanName}</p>
                          <p className="text-xs text-[#8B7F72] mt-0.5">{task.region}</p>
                        </td>
                        <td className="px-6 py-4 text-[#5C5449]">
                          {new Date(task.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            task.status === 'PUBLISHED' ? 'bg-emerald-100/50 text-emerald-700' :
                            task.status === 'REJECTED' ? 'bg-rose-100/50 text-rose-700' :
                            'bg-amber-100/50 text-amber-700'
                          }`}>
                            {task.status === 'PUBLISHED' && <Check className="w-3 h-3" />}
                            {task.status === 'REJECTED' && <X className="w-3 h-3" />}
                            {task.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setSelectedTask(task)}
                              className="p-1.5 text-[#766A5D] hover:text-[#3E2723] hover:bg-[#EAE5D9] rounded-lg transition-colors"
                              title="Quick Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => router.push(`/admin/verification_task/draft/${task.id}`)}
                              className="p-1.5 text-[#C6A75E] hover:bg-[#FBFaf8] rounded-lg transition-colors"
                              title="Full Review Workspace"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Side Drawer for Detail Review */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-[#1C1C1C]/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedTask(null)} />
          <div className="relative w-full max-w-xl bg-[#FAFAF9] h-full shadow-2xl flex flex-col transform transition-transform animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE5D9] bg-white">
              <div>
                <h2 className="text-sm font-semibold text-[#8B7F72] uppercase tracking-wider">Quick Review</h2>
                <p className="font-bold text-[#2D2620] text-lg">{selectedTask.id}</p>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-2 text-[#A39B8F] hover:bg-[#FBFaf8] rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Enhanced Review Link */}
            <div className="px-6 py-3 bg-amber-50/50 border-b border-amber-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">Full Workspace Available</span>
              <button 
                onClick={() => router.push(`/admin/verification_task/draft/${selectedTask.id}`)}
                className="text-[10px] font-bold text-[#C6A75E] uppercase tracking-widest flex items-center gap-1 hover:underline"
              >
                Open Enhanced Editor <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                selectedTask.status === 'PUBLISHED' ? 'bg-emerald-50 border-emerald-200' :
                selectedTask.status === 'REJECTED' ? 'bg-rose-50 border-rose-200' :
                'bg-amber-50 border-amber-200'
              }`}>
                <div className="flex items-center gap-3">
                  <Clock className="text-amber-600 w-5 h-5" />
                  <div>
                    <p className="font-semibold text-amber-800">Status: {selectedTask.status.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-[#A39B8F] uppercase tracking-wider mb-3">Product Media</h3>
                <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-[#EAE5D9] bg-white relative">
                  {selectedTask.imageUrl ? (
                    <img src={selectedTask.imageUrl} alt={selectedTask.productName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                      No Image
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#EAE5D9] p-5 shadow-sm">
                <h3 className="text-xl font-bold text-[#2D2620] mb-4">{selectedTask.productName}</h3>
                <p className="text-[#5C5449] text-sm leading-relaxed mb-6">{selectedTask.description}</p>
                
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <div>
                    <p className="text-[#A39B8F] text-xs font-semibold uppercase tracking-wider mb-1">Materials</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedTask.materials.map((m, i) => (
                        <span key={i} className="px-2 py-0.5 bg-[#F6F4F0] text-[#5C5449] rounded text-xs">{m}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[#A39B8F] text-xs font-semibold uppercase tracking-wider mb-1">Origin</p>
                    <p className="font-medium text-[#2D2620]">{selectedTask.region}</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="border-t border-[#EAE5D9] bg-white p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
              {(selectedTask.status === "ADMIN_REVIEW" || selectedTask.status === "AGENT_VERIFIED") ? (
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setShowRejectModal(true)}
                    className="flex items-center justify-center gap-2 py-3 border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl font-semibold transition-colors"
                  >
                    <Ban className="w-5 h-5" /> Reject
                  </button>
                  <button 
                    onClick={() => handleApprove(selectedTask.id)}
                    className="flex items-center justify-center gap-2 py-3 bg-[#3E2723] text-white hover:bg-[#2A1A17] shadow-lg shadow-[#3E2723]/20 rounded-xl font-semibold transition-all"
                  >
                    <Check className="w-5 h-5" /> Approve & Publish
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => router.push(`/admin/verification_task/draft/${selectedTask.id}`)}
                  className="w-full py-3 bg-[#3E2723] text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  Go to Verification Workspace <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1C1C1C]/60 backdrop-blur-sm" onClick={() => setShowRejectModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-[#2D2620] mb-2 uppercase">Reject Submission</h3>
            <p className="text-sm text-[#766A5D] mb-5">Please provide a reason for rejecting <span className="font-semibold">{selectedTask?.productName}</span>.</p>
            
            <textarea 
              autoFocus
              placeholder="E.g., Images are blurry, description lacks details..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full h-28 p-3 bg-[#FBFaf8] border border-[#EAE5D9] rounded-xl text-sm focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 transition-all resize-none mb-5"
            />
            
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowRejectModal(false)}
                className="px-5 py-2.5 text-sm font-semibold text-[#766A5D] hover:bg-[#FBFaf8] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleReject}
                className="px-5 py-2.5 text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-600/20 rounded-xl transition-all"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[70] animate-in slide-in-from-bottom-5">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg border ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
            toast.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' :
            'bg-white text-[#2D2620] border-[#EAE5D9]'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-500" />}
            {toast.type === 'info' && <AlertCircle className="w-5 h-5 text-[#C6A75E]" />}
            <p className="text-sm font-semibold">{toast.message}</p>
          </div>
        </div>
      )}

    </div>
  );
}