"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    AlertTriangle,
    BadgeCheck,
    Ban,
    ChevronDown,
    ChevronRight,
    CreditCard,
            try {
                setRoleDetailsLoading(true);
                const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/$/, "") || "http://localhost:4000/api/v1";
                const search = encodeURIComponent(userData?.email || `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim());
                const res = await fetch(`${base}/admin/users/role/ARTISAN?search=${search}&page=1&limit=10`, {
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (!res.ok) throw new Error(`Error: ${res.status}`);
                const json = await res.json();
                const fetched = (json?.data?.items || []).find((item: any) => item.id === userData.id);
                if (fetched?.artisanProfile) {
                    setUserData((prev: any) => ({ ...prev, artisanProfile: fetched.artisanProfile }));
                }
            } catch (err) {
                console.error("Failed to hydrate artisan role details:", err);
            } finally {
                setRoleDetailsLoading(false);
            }
    author: string;
    createdAt: string;
};

type ActivityLog = {
    id: number;
    label: string;
    date: string;
    tone?: "neutral" | "warning" | "danger" | "success";
};

const ROLE_LABEL: Record<Role, string> = {
    customer: "Customer",
    artisan: "Artisan",
    verification_agent: "Verification Agent",
    admin: "Admin",
};

const ROLE_UPPER: Record<Role, string> = {
    customer: "CUSTOMER",
    artisan: "ARTISAN",
    verification_agent: "VERIFICATION_AGENT",
    admin: "ADMIN",
};

const STATUS_LABEL: Record<Status, string> = {
    active: "Active",
    suspended: "Suspended",
};

const STATUS_UPPER: Record<Status, string> = {
    active: "ACTIVE",
    suspended: "SUSPENDED",
};

const BASE_ACTIVITY: ActivityLog[] = [
    { id: 1, label: "User logged in from Addis Ababa", date: "2026-04-22 08:21", tone: "neutral" },
    { id: 2, label: "Profile phone number updated", date: "2026-04-21 15:08", tone: "neutral" },
    { id: 3, label: "Order #ETH-9021 placed", date: "2026-04-20 12:44", tone: "success" },
    { id: 4, label: "Sample #S-113 submitted for review", date: "2026-04-19 09:16", tone: "warning" },
    { id: 5, label: "Admin Hana suspended this user", date: "2026-04-10 18:09", tone: "danger" },
];

function orderStatusStyles(status: string) {
    switch (status) {
        case "DELIVERED": return "border-emerald-100 bg-emerald-50 text-emerald-700";
        case "PAID": return "border-blue-100 bg-blue-50 text-blue-700";
        case "PROCESSING": return "border-indigo-100 bg-indigo-50 text-indigo-700";
        case "SHIPPED": return "border-violet-100 bg-violet-50 text-violet-700";
        case "CANCELLED": return "border-rose-100 bg-rose-50 text-rose-700";
        case "PENDING_PAYMENT": return "border-amber-100 bg-amber-50 text-amber-700";
        default: return "border-neutral-100 bg-neutral-50 text-neutral-600";
    }
}

const riskMessagesByRole: Record<Role, string[]> = {
    customer: [
        "3 failed payments in the last 14 days.",
        "Shipping address changed 4 times this month.",
    ],
    artisan: [
        "Rejected samples above threshold (5 in last 30 days).",
        "Verification note unresolved for 9 days.",
    ],
    verification_agent: [
        "Task completion dropped below 70% this week.",
        "Two active assignments are overdue.",
    ],
    admin: ["No direct risk signals. Audit log review recommended weekly."],
};

const tabs: { key: TabKey; label: string }[] = [
    { key: "activity", label: "Activity" },
    { key: "orders", label: "Orders" },
    { key: "notes", label: "Notes" },
    { key: "tasks", label: "Agent Tasks" },
];

function statusStyles(status: Status) {
    if (status === "active") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
}

function roleStyles(role: Role) {
    if (role === "admin") return "bg-violet-50 text-violet-700 border-violet-200";
    if (role === "verification_agent") return "bg-blue-50 text-blue-700 border-blue-200";
    if (role === "artisan") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-neutral-100 text-neutral-700 border-neutral-200";
}

export default function UserDetailPage() {
    const params = useParams() as { id: string };
    const id = params.id;
    const router = useRouter();

    const [role, setRole] = useState<Role>("customer");
    const [status, setStatus] = useState<Status>("active");
    const [draftRole, setDraftRole] = useState<Role>("customer");
    const [activeTab, setActiveTab] = useState<TabKey>("activity");
    const [showRoleConfirm, setShowRoleConfirm] = useState(false);
    const [draftNote, setDraftNote] = useState("");
    const [editNoteId, setEditNoteId] = useState<number | null>(null);
    const [editText, setEditText] = useState("");
    const [toast, setToast] = useState("");
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<any[]>([]);
    const [ordersMeta, setOrdersMeta] = useState<any>(null);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersPage, setOrdersPage] = useState(1);
    const [roleDetailsLoading, setRoleDetailsLoading] = useState(false);

    // Agent Tasks states
    const [assignMode, setAssignMode] = useState(false);
    const [agentTasks, setAgentTasks] = useState<any[]>([]);
    const [unassignedSamples, setUnassignedSamples] = useState<any[]>([]);

    const [notes, setNotes] = useState<Note[]>([
        {
            id: 1,
            text: "Follow-up needed on verification documents before approving premium listings.",
            author: "Admin Hana",
            createdAt: "2026-04-18",
        },
        {
            id: 2,
            text: "Agent reported delayed sample pickup due to regional strike.",
            author: "Admin Dawit",
            createdAt: "2026-04-12",
        },
    ]);
    const [adminLogs, setAdminLogs] = useState<ActivityLog[]>([]);

    // Fetch Agent Tasks
    useEffect(() => {
        if (activeTab === "tasks" && role === "verification_agent") {
            const fetchTasks = async () => {
                try {
                    const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1';
                    const res = await fetch(`${base}/admin/products/samples`, {
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                    });
                    if (!res.ok) return;
                    const data = await res.json();
                    if (data.data?.items) {
                        const samples = data.data.items;
                        setAgentTasks(samples.filter((s: any) => s.assignedVerifierId === id));
                        setUnassignedSamples(samples.filter((s: any) => s.status === 'APPROVED' && !s.assignedVerifierId));
                    }
                } catch (err) {
                    console.error("Failed to fetch tasks", err);
                }
            };
            fetchTasks();
        }
    }, [activeTab, role, id]);

    // Fetch orders when Orders tab becomes active
    useEffect(() => {
        if (activeTab !== "orders" || !id) return;
        const fetchOrders = async () => {
            setOrdersLoading(true);
                try {
                const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/$/, "") || "http://localhost:4000/api/v1";
                const res = await fetch(`${base}/admin/orders?userId=${id}&page=${ordersPage}&limit=10`, {
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (!res.ok) throw new Error(`Error: ${res.status}`);
                const json = await res.json();
                setOrders(json.data?.items ?? []);
                setOrdersMeta(json.data?.meta ?? null);
            } catch (err) {
                console.error("Failed to fetch orders:", err);
                showToast("Failed to load orders");
            } finally {
                setOrdersLoading(false);
            }
        };
        fetchOrders();
    }, [activeTab, id, ordersPage]);

    useEffect(() => {
        const fetchUser = async () => {
                try {
                const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/$/, "") || "http://localhost:4000/api/v1";
                const res = await fetch(`${base}/admin/users/${id}`, {
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (!res.ok) throw new Error(`Error: ${res.status}`);
                const json = await res.json();
                const data = json.data || json;
                setUserData(data);

                // Sync initial states
                let r = (data.role?.toLowerCase() || "customer") as Role;
                if (data.role === 'VERIFICATION_AGENT') r = 'verification_agent';
                if (data.role === 'USER') r = 'customer';

                setRole(r);
                setDraftRole(r);
                setStatus((data.status?.toLowerCase() || "active") as Status);
            } catch (err) {
                console.error("Failed to fetch user:", err);
                setToast("Failed to load user data");
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchUser();
    }, [id]);

    const user = useMemo(() => {
        if (!userData) return {
            name: "Loading...",
            email: "...",
            phone: "...",
                try {
                setRoleDetailsLoading(true);
                const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1';
                const search = encodeURIComponent(userData?.email || `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim());
                const res = await fetch(`${base}/admin/users/role/ARTISAN?search=${search}&page=1&limit=10`, {
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (!res.ok) throw new Error(`Error: ${res.status}`);
                const json = await res.json();
                const fetched = (json?.data?.items || []).find((item: any) => item.id === userData.id);
                if (fetched?.artisanProfile) {
                    setUserData((prev: any) => ({ ...prev, artisanProfile: fetched.artisanProfile }));
                }
            } catch (err) {
                console.error("Failed to hydrate artisan role details:", err);
            } finally {
                setRoleDetailsLoading(false);
            }
        const extensionData = profile?.extensionData || {};
        const productStats = extensionData?.productStats || {};
        const sampleStats = extensionData?.sampleStats || {};

        return {
            artisan: {
                shopName: profile.shopName || "No shop name",
                bio: profile.bio || "No artisan biography available yet.",
                verificationStatus: profile.verificationStatus || "PENDING",
                region: profile.region || "—",
                city: profile.city || "—",
                culturalMetadata: profile.culturalMetadata || "—",
                products: Number(productStats.total ?? 0),
                approvedProducts: Number(productStats.approved ?? 0),
                pendingSamples: Number(sampleStats.pending ?? 0),
            },
            verification_agent: {
                assignedSamples: Number(userData?.agentSummary?.assignedSamples ?? 0),
                approvedSamples: Number(userData?.agentSummary?.approvedSamples ?? 0),
                rejectedSamples: Number(userData?.agentSummary?.rejectedSamples ?? 0),
            },
        };
    }, [userData]);

    useEffect(() => {
        const hydrateRoleDetails = async () => {
            if (!userData?.id || role !== "artisan" || userData?.artisanProfile) return;
            try {
                setRoleDetailsLoading(true);
                const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/$/, "") || "http://localhost:4000/api/v1";
                const search = encodeURIComponent(userData?.email || `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim());
                const res = await fetch(`${base}/admin/users/role/ARTISAN?search=${search}&page=1&limit=10`, {
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (!res.ok) throw new Error(`Error: ${res.status}`);
                const json = await res.json();
                const fetched = (json?.data?.items || []).find((item: any) => item.id === userData.id);
                if (fetched?.artisanProfile) {
                    setUserData((prev: any) => ({ ...prev, artisanProfile: fetched.artisanProfile }));
                }
            } catch (err) {
                console.error("Failed to hydrate artisan role details:", err);
            } finally {
                setRoleDetailsLoading(false);
            }
        };
        hydrateRoleDetails();
    }, [id, role, userData]);

    const combinedLogs = useMemo(() => {
        return [...adminLogs, ...BASE_ACTIVITY].sort((a, b) => (a.date < b.date ? 1 : -1));
    }, [adminLogs]);

    useEffect(() => {
        if (!toast) return;
        const timer = window.setTimeout(() => setToast(""), 2200);
        return () => window.clearTimeout(timer);
    }, [toast]);

    const showToast = (message: string) => setToast(message);

    const pushLog = (label: string, tone: ActivityLog["tone"] = "neutral") => {
        const now = new Date();
        const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
            now.getDate()
        ).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        setAdminLogs((prev) => [{ id: Date.now(), label, date: stamp, tone }, ...prev]);
    };

    const handleStatusChange = async (next: Status) => {
        try {
            const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/$/, "") || "http://localhost:4000/api/v1";
            const res = await fetch(`${base}/admin/users/${id}`, {
                method: "PATCH",
                credentials: 'include',
                headers: { 
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: STATUS_UPPER[next] })
            });

            if (!res.ok) throw new Error("Failed to update status");
            
            setStatus(next);
            pushLog(
                `Admin changed status to ${STATUS_LABEL[next]}.`,
                next === "suspended" ? "warning" : "success"
            );
            showToast(`Status set to ${STATUS_UPPER[next]}`);
        } catch (error) {
            console.error(error);
            showToast("Failed to update status");
        }
    };

    const handleRoleUpdate = async () => {
        try {
            const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/$/, "") || "http://localhost:4000/api/v1";
            const res = await fetch(`${base}/admin/users/${id}`, {
                method: "PATCH",
                credentials: 'include',
                headers: { 
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ role: ROLE_UPPER[draftRole] })
            });

            if (!res.ok) throw new Error("Failed to update role");

            setRole(draftRole);
            setShowRoleConfirm(false);
            pushLog(`Admin changed role to ${ROLE_LABEL[draftRole]}.`, "warning");
            showToast(`Role updated to ${ROLE_UPPER[draftRole]}`);
        } catch (error) {
            console.error(error);
            showToast("Failed to update role");
            setShowRoleConfirm(false);
        }
    };

    const handleAddNote = (event: FormEvent) => {
        event.preventDefault();
        if (!draftNote.trim()) return;
        const nextNote: Note = {
            id: Date.now(),
            text: draftNote.trim(),
            author: "Admin You",
            createdAt: new Date().toISOString().slice(0, 10),
        };
        setNotes((prev) => [nextNote, ...prev]);
        setDraftNote("");
        pushLog("Admin added an internal note.", "neutral");
        showToast("Internal note saved");
    };

    const saveNoteEdit = (id: number) => {
        if (!editText.trim()) return;
        setNotes((prev) => prev.map((note) => (note.id === id ? { ...note, text: editText.trim() } : note)));
        setEditNoteId(null);
        setEditText("");
        pushLog("Admin edited an internal note.", "neutral");
        showToast("Note updated");
    };

    const deleteNote = (id: number) => {
        setNotes((prev) => prev.filter((note) => note.id !== id));
        pushLog("Admin deleted an internal note.", "danger");
        showToast("Note deleted");
    };

    const assignSample = async (sampleId: string) => {
        try {
            const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1';
            const res = await fetch(`${base}/admin/products/samples/${sampleId}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ assignedVerifierId: id })
            });
            if (!res.ok) throw new Error('Failed to assign task');
            
            showToast('Task assigned successfully');
            pushLog(`Admin assigned verification task (Sample ID: ${sampleId})`, "success");
            
            const sample = unassignedSamples.find(s => s.id === sampleId);
            if (sample) {
                setUnassignedSamples(prev => prev.filter(s => s.id !== sampleId));
                setAgentTasks(prev => [{...sample, assignedVerifierId: id}, ...prev]);
            }
        } catch (error) {
            console.error(error);
            showToast('Failed to assign task');
        }
    };

    const insightItems = [
        {
            label: "Joined",
            value: userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—",
            icon: History,
        },
        {
            label: role === "verification_agent" ? "Assignments" : "Orders",
            value: role === "customer"
                ? String(userData?.customerSummary?.totalOrders ?? "—")
                : role === "artisan"
                    ? String(roleDetails.artisan.products ?? "—")
                    : String(roleDetails.verification_agent.assignedSamples ?? "—"),
            icon: ShoppingBag,
        },
        {
            label: role === "artisan" ? "Verification" : "Status",
            value: role === "artisan"
                ? (roleDetails.artisan.verificationStatus ?? "—")
                : (userData?.status ?? status.toUpperCase()),
            icon: ShieldAlert,
        },
        {
            label: role === "artisan" ? "Region" : role === "customer" ? "Spent ETB" : "Samples Approved",
            value: role === "customer"
                ? userData?.customerSummary?.totalSpent != null
                    ? Number(userData.customerSummary.totalSpent).toLocaleString()
                    : "—"
                : role === "artisan"
                    ? (roleDetails.artisan.region ?? "—")
                    : String(roleDetails.verification_agent.approvedSamples ?? "—"),
            icon: CreditCard,
        },
    ];

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] text-[#1C1C1C]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#C6A75E] border-t-transparent" />
                    <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Loading User Profile...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#FAFAF9] px-4 py-6 text-[#1C1C1C] md:px-8">
            <div className="mx-auto max-w-[1440px]">
                <nav className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    <button onClick={() => router.push('/admin/dashboard')} className="hover:text-[#C6A75E] transition">Dashboard</button>
                    <span>/</span>
                    <span className="text-[#C6A75E]">User Details</span>
                </nav>

                <header className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-5">
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                <img src={user.avatar} className="h-16 w-16 rounded-full border-2 border-white object-cover shadow-md" alt={user.name} />
                                <span
                                    className={cn(
                                        "absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-2 border-white",
                                        status === "active" ? "bg-emerald-500" : "bg-rose-500"
                                    )}
                                />
                            </div>
                            <div>
                                <h1 className="font-display text-3xl font-black uppercase tracking-[0.04em] md:text-4xl">{user.name}</h1>
                                <p className="mt-2 text-sm text-neutral-500">
                                    {user.email} | {user.phone}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide", roleStyles(role))}>
                                        {ROLE_UPPER[role]}
                                    </span>
                                    <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide", statusStyles(status))}>
                                        {STATUS_UPPER[status]}
                                    </span>
                                    <span className="text-[11px] text-[#786e66]">UID: {user.id}</span>
                                    <span className="text-[11px] text-neutral-400">Joined: {user.joined}</span>
                                    <span className="text-[11px] text-neutral-400">Last Active: {user.lastActive}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => router.push(`/admin/users/${id}/edit`)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs transition duration-300 hover:-translate-y-1 hover:shadow-md"
                            >
                                <Pencil className="h-3.5 w-3.5" /> Edit User
                            </button>
                            <button
                                onClick={() => handleStatusChange("suspended")}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700 transition duration-300 hover:-translate-y-1 hover:shadow-md"
                            >
                                <Lock className="h-3.5 w-3.5" /> Suspend
                            </button>
                            <button
                                onClick={() => handleStatusChange("active")}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700 transition duration-300 hover:-translate-y-1 hover:shadow-md"
                            >
                                <UserCheck className="h-3.5 w-3.5" /> Reactivate
                            </button>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                    <section className="space-y-6 xl:col-span-7">
                        {role === "customer" && (
                            <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md">
                                <h2 className="font-display text-xl uppercase tracking-[0.04em]">Customer Summary</h2>
                                <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
                                    <div className="rounded-xl border border-neutral-100 bg-neutral-50/30 p-4">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Orders</p>
                                        <p className="mt-1 text-2xl font-bold">{userData?.customerSummary?.totalOrders || 0}</p>
                                    </div>
                                    <div className="rounded-xl border border-neutral-100 bg-neutral-50/30 p-4">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Spent</p>
                                        <p className="mt-1 text-2xl font-bold text-[#C6A75E]">{(userData?.customerSummary?.totalSpent || 0).toLocaleString()} ETB</p>
                                    </div>
                                    <div className="rounded-xl border border-neutral-100 bg-neutral-50/30 p-4">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Last Order</p>
                                        <p className="mt-2 text-sm font-bold">{userData?.customerSummary?.lastOrderDate ? new Date(userData?.customerSummary?.lastOrderDate).toISOString().split('T')[0] : "N/A"}</p>
                                    </div>
                                </div>
                                <div className="mt-6 flex flex-wrap gap-3 text-[11px] font-bold uppercase tracking-wider">
                                    <button
                                        onClick={() => {
                                            setActiveTab("orders");
                                            pushLog("Admin action: View Orders.");
                                        }}
                                        className="rounded-lg bg-[#1C1C1C] px-4 py-2 text-[#FAFAF9] transition hover:opacity-90"
                                    >
                                        View Orders
                                    </button>
                                    <button
                                        onClick={() => {
                                            pushLog("Admin action: Message Customer.");
                                            showToast("Message panel opened");
                                        }}
                                        className="rounded-lg border border-neutral-200 px-4 py-2 transition hover:bg-neutral-50"
                                    >
                                        Message
                                    </button>
                                    <button
                                        onClick={() => {
                                            pushLog("Admin action: Flag for Fraud.", "danger");
                                            showToast("Fraud flag submitted");
                                        }}
                                        className="px-2 py-2 text-rose-600 transition hover:underline"
                                    >
                                        Flag for fraud
                                    </button>
                                </div>
                            </article>
                        )}

                        {role === "artisan" && (
                            <div className="space-y-6">
                                <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md">
                                    <h2 className="font-display text-xl uppercase tracking-[0.04em]">Artisan Profile</h2>
                                    <div className="mt-6 space-y-5">
                                        <div>
                                            <p className="text-lg font-bold text-[#C6A75E]">{roleDetails.artisan.shopName}</p>
                                            <p className="mt-2 max-w-lg text-sm leading-relaxed text-neutral-600">
                                                {roleDetails.artisan.bio}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                            {[
                                                { l: "Products", v: String(roleDetails.artisan.products) },
                                                { l: "Approved", v: String(roleDetails.artisan.approvedProducts) },
                                                { l: "Pending Samples", v: String(roleDetails.artisan.pendingSamples) },
                                                { l: "Verification", v: roleDetails.artisan.verificationStatus },
                                            ].map((stat) => (
                                                <div key={stat.l} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">{stat.l}</p>
                                                    <p className="mt-0.5 text-lg font-bold">{stat.v}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                                            <div className="flex items-center gap-3">
                                                <BadgeCheck className="h-5 w-5 text-emerald-700" />
                                                <p className="text-sm font-bold">Verification Status: {roleDetails.artisan.verificationStatus}</p>
                                            </div>
                                            <p className="mt-2 text-xs text-neutral-600">
                                                Region/City: {roleDetails.artisan.region}/{roleDetails.artisan.city}. Cultural metadata: {roleDetails.artisan.culturalMetadata}.
                                            </p>
                                            {!userData?.artisanProfile && (
                                                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                                                    {roleDetailsLoading ? "Loading artisan details..." : "Some artisan details are not available."}
                                                </p>
                                            )}
                                            <button
                                                onClick={() => {
                                                    pushLog("Admin opened verification pipeline view.");
                                                    router.push('/admin/sample');
                                                }}
                                                className="mt-3 rounded-lg bg-[#C6A75E] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white"
                                            >
                                                View Verification Pipeline
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex flex-wrap gap-3 text-[11px] font-bold uppercase tracking-wider">
                                        <button
                                            className="rounded-lg bg-[#1C1C1C] px-4 py-2 text-[#FAFAF9]"
                                            onClick={() => {
                                                pushLog("Admin action: View Products.");
                                                router.push('/admin/products');
                                            }}
                                        >
                                            View Products
                                        </button>
                                        <button
                                            className="rounded-lg border border-neutral-200 px-4 py-2"
                                            onClick={() => {
                                                pushLog("Admin action: View Submitted Samples.");
                                                router.push('/admin/sample');
                                            }}
                                        >
                                            View Samples
                                        </button>
                                        <button
                                            className="rounded-lg border border-neutral-200 px-4 py-2"
                                            onClick={() => {
                                                pushLog("Admin action: Message Artisan.");
                                                showToast("Message artisan opened");
                                            }}
                                        >
                                            Message Artisan
                                        </button>
                                        <button
                                            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-rose-700"
                                            onClick={() => {
                                                pushLog("Admin action: Suspend Artisan.", "warning");
                                                handleStatusChange("suspended");
                                            }}
                                        >
                                            Suspend Artisan
                                        </button>
                                    </div>
                                </article>
                            </div>
                        )}

                        {role === "verification_agent" && (
                            <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md">
                                <h2 className="font-display text-xl uppercase tracking-[0.04em]">Agent Overview</h2>
                                <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold uppercase tracking-widest text-neutral-400">Profile Region</span>
                                            <span className="font-bold">{roleDetails.artisan.region}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold uppercase tracking-widest text-neutral-400">Approved Samples</span>
                                            <span className="font-bold text-emerald-600">{roleDetails.verification_agent.approvedSamples}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold uppercase tracking-widest text-neutral-400">Rejected Samples</span>
                                            <span className="font-bold">{roleDetails.verification_agent.rejectedSamples}</span>
                                        </div>
                                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                                            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, roleDetails.verification_agent.assignedSamples * 10)}%` }} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 shadow-inner">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">Active tasks</p>
                                            <p className="mt-1 text-3xl font-black text-blue-800">{roleDetails.verification_agent.assignedSamples}</p>
                                        </div>
                                        <div className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4 shadow-inner">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Approved</p>
                                            <p className="mt-1 text-3xl font-black text-neutral-800">{roleDetails.verification_agent.approvedSamples}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 flex flex-wrap gap-3 text-[11px] font-bold uppercase tracking-wider">
                                    <button
                                        className="rounded-lg bg-[#3E2723] px-5 py-2.5 text-white shadow-lg transition hover:opacity-90"
                                        onClick={() => {
                                            pushLog("Admin action: Opened Assign New Verification.");
                                            setActiveTab("tasks");
                                            setAssignMode(true);
                                        }}
                                    >
                                        Assign New Verification
                                    </button>
                                    <button
                                        className="rounded-lg border border-neutral-200 px-5 py-2.5 transition hover:bg-neutral-50"
                                        onClick={() => {
                                            pushLog("Admin action: Opened View Assigned Tasks.");
                                            setActiveTab("tasks");
                                            setAssignMode(false);
                                        }}
                                    >
                                        View All Tasks
                                    </button>
                                </div>
                            </article>
                        )}

                        {role === "admin" && (
                            <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md">
                                <h2 className="font-display text-xl uppercase tracking-[0.04em]">Admin Visibility</h2>
                                <div className="mt-4 space-y-3 text-sm text-neutral-700">
                                    <p>Role permissions include finance visibility, moderation, verification override, and role assignment.</p>
                                    <p>Account created on {user.joined}. Current status: {STATUS_UPPER[status]}.</p>
                                </div>
                                <div className="mt-6 flex flex-wrap gap-3 text-[11px] font-bold uppercase tracking-wider">
                                    <button
                                        onClick={() => setShowRoleConfirm(true)}
                                        className="rounded-lg border border-[#C6A75E]/30 bg-[#C6A75E]/10 px-4 py-2 text-[#7E6322]"
                                    >
                                        Change Role
                                    </button>
                                    <button
                                        onClick={() => {
                                            pushLog("Admin opened audit actions.");
                                            router.push('/admin/report');
                                        }}
                                        className="rounded-lg border border-neutral-200 px-4 py-2"
                                    >
                                        Audit Actions
                                    </button>
                                </div>
                            </article>
                        )}

                        <article className="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                            <div className="mb-6 flex flex-wrap gap-7 border-b border-neutral-100 pb-4">
                                {tabs.filter(t => {
                                    if (t.key === "orders") return role === "customer";
                                    if (t.key === "tasks") return role === "verification_agent";
                                    return true;
                                }).map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={cn(
                                            "relative pb-2 text-xs font-bold uppercase tracking-widest transition",
                                            activeTab === tab.key ? "text-[#3E2723]" : "text-neutral-400 hover:text-neutral-600"
                                        )}
                                    >
                                        {tab.label}
                                        {activeTab === tab.key && <span className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-[#C6A75E]" />}
                                    </button>
                                ))}
                            </div>

                            <div className="min-h-[340px]">
                                {activeTab === "activity" && (
                                    <ol className="mt-4 space-y-8 border-l border-neutral-100 pl-5">
                                        {combinedLogs.map((item) => (
                                            <li key={item.id} className="relative">
                                                <span
                                                    className={cn(
                                                        "absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white",
                                                        item.tone === "danger" && "bg-rose-500",
                                                        item.tone === "warning" && "bg-amber-500",
                                                        item.tone === "success" && "bg-emerald-500",
                                                        (!item.tone || item.tone === "neutral") && "bg-[#C6A75E]"
                                                    )}
                                                />
                                                <p className="text-sm font-bold leading-none text-neutral-800">{item.label}</p>
                                                <p className="mt-1.5 text-[11px] font-medium uppercase text-neutral-400">{item.date}</p>
                                            </li>
                                        ))}
                                    </ol>
                                )}

                                {activeTab === "orders" && (
                                    <div className="mt-2">
                                        {ordersLoading ? (
                                            <div className="flex items-center justify-center py-16">
                                                <Loader2 className="h-7 w-7 animate-spin text-[#C6A75E]" />
                                            </div>
                                        ) : orders.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-14 text-neutral-400">
                                                <ShoppingBag className="mb-3 h-10 w-10 opacity-30" />
                                                <p className="text-sm font-bold uppercase tracking-widest">No orders found</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="overflow-hidden rounded-xl border border-neutral-100">
                                                    <table className="w-full text-left text-xs">
                                                        <thead className="bg-neutral-50 uppercase tracking-widest text-neutral-400">
                                                            <tr>
                                                                <th className="px-5 py-4">Order ID</th>
                                                                <th className="px-5 py-4">Status</th>
                                                                <th className="px-5 py-4">Total</th>
                                                                <th className="px-5 py-4 text-right">Date</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-neutral-100">
                                                            {orders.map((order: any) => (
                                                                <tr
                                                                    key={order.id}
                                                                    className="group cursor-pointer transition hover:bg-neutral-50"
                                                                    onClick={() => pushLog(`Opened order ${order.id}.`)}
                                                                >
                                                                    <td className="px-5 py-4 font-mono font-bold text-neutral-700">
                                                                        {order.id.slice(0, 10)}…
                                                                    </td>
                                                                    <td className="px-5 py-4">
                                                                        <span className={cn("rounded-full border px-2.5 py-1 text-[9px] font-black tracking-widest", orderStatusStyles(order.status))}>
                                                                            {order.status.replace("_", " ")}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-5 py-4 font-bold text-[#C6A75E]">
                                                                        {Number(order.totalAmount).toLocaleString()} {order.currency || "ETB"}
                                                                    </td>
                                                                    <td className="px-5 py-4 text-right font-medium text-neutral-400">
                                                                        {new Date(order.createdAt).toLocaleDateString()}
                                                                        <ChevronRight className="ml-1 inline h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                {ordersMeta && ordersMeta.totalPages > 1 && (
                                                    <div className="mt-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-neutral-400">
                                                        <span>Page {ordersMeta.page} of {ordersMeta.totalPages} · {ordersMeta.total} orders</span>
                                                        <div className="flex gap-2">
                                                            <button
                                                                disabled={ordersPage <= 1}
                                                                onClick={() => setOrdersPage((p) => p - 1)}
                                                                className="rounded-lg border border-neutral-200 px-3 py-1.5 transition hover:bg-neutral-50 disabled:opacity-30"
                                                            >
                                                                Prev
                                                            </button>
                                                            <button
                                                                disabled={ordersPage >= ordersMeta.totalPages}
                                                                onClick={() => setOrdersPage((p) => p + 1)}
                                                                className="rounded-lg border border-neutral-200 px-3 py-1.5 transition hover:bg-neutral-50 disabled:opacity-30"
                                                            >
                                                                Next
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {activeTab === "notes" && (
                                    <div className="mt-2 space-y-5">
                                        <form onSubmit={handleAddNote} className="space-y-3">
                                            <textarea
                                                rows={4}
                                                value={draftNote}
                                                onChange={(event) => setDraftNote(event.target.value)}
                                                placeholder="Type an internal administrative note..."
                                                className="w-full rounded-2xl border border-neutral-200 bg-[#fffcf9] p-4 text-sm outline-none transition focus:border-[#C6A75E]"
                                            />
                                            <button className="rounded-xl bg-[#3E2723] px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-[#FAFAF9] shadow-lg transition hover:opacity-90">
                                                Save Note
                                            </button>
                                        </form>

                                        <div className="space-y-3">
                                            {notes.map((note) => (
                                                <div key={note.id} className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-5">
                                                    {editNoteId === note.id ? (
                                                        <div className="space-y-2">
                                                            <textarea
                                                                value={editText}
                                                                onChange={(event) => setEditText(event.target.value)}
                                                                rows={3}
                                                                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none ring-[#C6A75E] focus:ring"
                                                            />
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => saveNoteEdit(note.id)}
                                                                    className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                                                                >
                                                                    Save
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditNoteId(null)}
                                                                    className="rounded-lg bg-stone-200 px-3 py-1 text-xs font-semibold"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <p className="text-sm text-neutral-700">{note.text}</p>
                                                            <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                                                                {note.author} - {note.createdAt}
                                                            </p>
                                                            <div className="mt-3 flex gap-3 text-[11px] font-bold uppercase tracking-wider">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditNoteId(note.id);
                                                                        setEditText(note.text);
                                                                    }}
                                                                    className="text-[#7E6322]"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button type="button" onClick={() => deleteNote(note.id)} className="text-rose-600">
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === "tasks" && role === "verification_agent" && (
                                    <div className="mt-2 space-y-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400">
                                                {assignMode ? "Assign New Task" : "Assigned Tasks"}
                                            </h3>
                                            <button 
                                                onClick={() => setAssignMode(!assignMode)}
                                                className="text-[10px] font-bold text-[#C6A75E] uppercase hover:underline"
                                            >
                                                {assignMode ? "Switch to View Tasks" : "Switch to Assign Tasks"}
                                            </button>
                                        </div>
                                        
                                        {assignMode ? (
                                            <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
                                               <p className="text-xs text-neutral-500 mb-4">Select an approved sample to assign to this agent for verification.</p>
                                               <div className="space-y-3">
                                                  {unassignedSamples.length === 0 ? (
                                                      <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                                                          <ClipboardCheck className="mb-3 h-10 w-10 opacity-30" />
                                                          <p className="text-xs italic font-bold uppercase tracking-widest">No unassigned tasks available</p>
                                                      </div>
                                                  ) : (
                                                      unassignedSamples.map(sample => (
                                                          <div key={sample.id} className="flex justify-between items-center p-4 border border-neutral-100 rounded-xl hover:bg-neutral-50 transition">
                                                              <div>
                                                                  <p className="font-bold text-sm text-[#2D2620]">{sample.title}</p>
                                                                  <p className="text-xs text-neutral-400 mt-1 uppercase tracking-wider">{sample.artisan?.shopName || 'Unknown Artisan'}</p>
                                                              </div>
                                                              <button 
                                                                  onClick={() => assignSample(sample.id)}
                                                                  className="rounded-lg bg-[#C6A75E] px-4 py-2 text-[10px] font-bold uppercase text-white hover:opacity-90 shadow-sm transition"
                                                              >
                                                                  Assign Task
                                                              </button>
                                                          </div>
                                                      ))
                                                  )}
                                               </div>
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
                                               {agentTasks.length === 0 ? (
                                                   <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                                                       <Box className="mb-3 h-10 w-10 opacity-30" />
                                                       <p className="text-xs italic font-bold uppercase tracking-widest">No tasks currently assigned</p>
                                                   </div>
                                               ) : (
                                                   <div className="space-y-3">
                                                       {agentTasks.map(task => (
                                                           <div key={task.id} className="p-4 border border-neutral-100 rounded-xl hover:bg-neutral-50 transition flex justify-between items-start">
                                                              <div>
                                                                  <p className="font-bold text-sm text-[#2D2620]">{task.title}</p>
                                                                  <div className="flex items-center gap-2 mt-2">
                                                                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                                                          {task.status}
                                                                      </span>
                                                                      <span className="text-xs text-neutral-400">{new Date(task.createdAt).toLocaleDateString()}</span>
                                                                  </div>
                                                              </div>
                                                              <button 
                                                                  onClick={() => router.push(`/admin/sample/${task.id}`)}
                                                                  className="text-[10px] font-bold uppercase text-neutral-400 hover:text-[#C6A75E] transition"
                                                              >
                                                                  View Details
                                                              </button>
                                                           </div>
                                                       ))}
                                                   </div>
                                               )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </article>
                    </section>

                    <aside className="space-y-6 xl:col-span-5">
                        <div className="space-y-6 xl:sticky xl:top-6">
                            <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                                <h3 className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Profile Information</h3>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#C6A75E]/20 font-display text-lg font-bold text-[#7E6322]">
                                        {(user.name || "U").split(' ').filter(Boolean).map((n: any[]) => n[0]).join('').toUpperCase().slice(0, 2)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold">{user.name}</p>
                                        <p className="text-xs text-neutral-500">{user.email}</p>
                                        <p className="text-xs text-neutral-500">{user.phone}</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <button
                                        onClick={() => {
                                            pushLog("Admin sent password reset email.", "warning");
                                            showToast("Password reset sent");
                                        }}
                                        className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold transition hover:-translate-y-1"
                                    >
                                        Reset Password
                                    </button>
                                    <button
                                        onClick={() => {
                                            pushLog("Admin initiated direct email.");
                                            showToast("Email composer opened");
                                        }}
                                        className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold transition hover:-translate-y-1"
                                    >
                                        Send Email
                                    </button>
                                </div>
                            </article>

                            <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                                <h3 className="mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Status Control</h3>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { s: "active", i: UserCheck, c: "text-emerald-700 bg-emerald-50 border-emerald-100" },
                                        { s: "suspended", i: Lock, c: "text-amber-700 bg-amber-50 border-amber-100" },
                                    ].map((item) => {
                                        const Icon = item.i;
                                        const isActive = status === item.s;
                                        return (
                                            <button
                                                key={item.s}
                                                onClick={() => handleStatusChange(item.s as Status)}
                                                className={cn(
                                                    "group flex w-full items-center gap-4 rounded-2xl border p-4 transition",
                                                    isActive
                                                        ? `${item.c} shadow-sm`
                                                        : "border-neutral-50 bg-white text-neutral-400 hover:border-neutral-200 hover:text-neutral-600"
                                                )}
                                            >
                                                <div className={cn("rounded-lg p-2 transition", isActive ? "bg-white/50" : "bg-neutral-50 group-hover:bg-neutral-100")}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <span className="text-[11px] font-black uppercase tracking-widest">{STATUS_UPPER[item.s as Status]}</span>
                                                {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-current" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </article>

                            <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                                <h3 className="mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Role Management</h3>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <select
                                            value={draftRole}
                                            onChange={(event) => setDraftRole(event.target.value as Role)}
                                            className="w-full appearance-none rounded-2xl border border-neutral-100 bg-neutral-50/50 px-5 py-3.5 text-[11px] font-black uppercase tracking-widest outline-none transition focus:border-[#C6A75E]"
                                        >
                                            <option value="customer">Customer</option>
                                            <option value="artisan">Artisan</option>
                                            <option value="verification_agent">Verification Agent</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                                    </div>
                                    <button
                                        onClick={() => setShowRoleConfirm(true)}
                                        className="w-full rounded-2xl bg-[#C6A75E] py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-xl transition duration-300 hover:-translate-y-[2px]"
                                    >
                                        Update Role
                                    </button>
                                </div>
                            </article>

                            <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                                <h3 className="mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Quick Insights</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {insightItems.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <div key={item.label} className="rounded-2xl border border-neutral-50 bg-neutral-50/30 p-4 transition hover:shadow-inner">
                                                <Icon className="mb-3 h-4 w-4 text-[#C6A75E] opacity-80" />
                                                <p className="text-xl font-black leading-none text-neutral-800">{item.value}</p>
                                                <p className="mt-2 text-[9px] font-black uppercase tracking-tight text-neutral-400">{item.label}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </article>

                            <article className="rounded-2xl border border-amber-100 bg-amber-50/30 p-6 shadow-sm">
                                <div className="mb-5 flex items-center gap-3">
                                    <ShieldAlert className="h-5 w-5 text-amber-600" />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Risk Indicators</h3>
                                </div>
                                <div className="space-y-3">
                                    {(riskMessagesByRole[role] || riskMessagesByRole.customer).map((risk) => (
                                        <div key={risk} className="flex items-start gap-3 rounded-xl border border-amber-100/50 bg-white/80 p-3.5 shadow-sm">
                                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                            <p className="text-[10px] font-bold uppercase leading-relaxed tracking-tighter text-amber-800">{risk}</p>
                                        </div>
                                    ))}
                                </div>
                            </article>

                            <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                                <h3 className="mb-5 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Cross Navigation</h3>
                                <div className="grid grid-cols-2 gap-2 text-[11px] font-bold uppercase tracking-wider">
                                    {["View Orders", "View Products", "View Samples", "View Tasks"].map((label) => (
                                        <button
                                            key={label}
                                            onClick={() => {
                                                pushLog(`Cross navigation: ${label}.`);
                                                if (label === "View Orders") {
                                                    setActiveTab("orders");
                                                } else if (label === "View Products") {
                                                    router.push('/admin/products');
                                                } else if (label === "View Samples" || label === "View Tasks") {
                                                    router.push('/admin/sample');
                                                }
                                            }}
                                            className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2 text-left transition hover:-translate-y-1"
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </article>
                        </div>
                    </aside>
                </div>
            </div>

            {showRoleConfirm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-[#1c1c1c]/60 p-4 backdrop-blur-sm"
                    onClick={() => setShowRoleConfirm(false)}
                >
                    <div
                        className="w-full max-w-md rounded-[2rem] border border-neutral-200 bg-white p-8 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h3 className="font-display text-xl font-black uppercase tracking-tight leading-none">Modify Access</h3>
                        <p className="mt-6 text-sm font-medium leading-relaxed text-neutral-600">
                            Changing role from
                            <span className="mx-1 rounded border border-neutral-100 bg-neutral-50 px-1.5 py-0.5 font-black text-[#C6A75E]">
                                {ROLE_UPPER[role]}
                            </span>
                            to
                            <span className="mx-1 rounded border border-neutral-100 bg-neutral-50 px-1.5 py-0.5 font-black text-[#C6A75E]">
                                {ROLE_UPPER[draftRole]}
                            </span>
                            will reconfigure this user's marketplace permissions.
                        </p>
                        <div className="mt-10 flex flex-col gap-3">
                            <button
                                className="w-full rounded-2xl bg-[#1C1C1C] py-4 text-[11px] font-black uppercase tracking-widest text-white shadow-xl transition active:scale-95"
                                onClick={handleRoleUpdate}
                            >
                                Confirm Elevation
                            </button>
                            <button
                                className="w-full rounded-2xl border border-neutral-200 bg-white py-4 text-[11px] font-black uppercase tracking-widest text-neutral-400 transition hover:bg-neutral-50"
                                onClick={() => setShowRoleConfirm(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className="fixed bottom-8 right-8 z-50 rounded-2xl border border-neutral-100 bg-[#1C1C1C] px-6 py-4 shadow-2xl">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-[#C6A75E]" />
                        <p className="text-xs font-black uppercase tracking-widest text-white">{toast}</p>
                    </div>
                </div>
            )}
        </main>
    );
}