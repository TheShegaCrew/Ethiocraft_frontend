"use client";
import { useState, useEffect, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Role = "customer" | "artisan" | "verification_agent" | "admin";
type Status = "active" | "suspended";

export default function UserEditPage() {
    const params = useParams() as { id: string };
    const id = params.id;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState("");

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        role: "customer" as Role,
        status: "active" as Status,
        artisanProfile: {
            shopName: "",
            bio: "",
            region: "",
            city: "",
        }
    });

    useEffect(() => {
        if (!id) return;
        const fetchUser = async () => {
            try {
                const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/$/, "") || "http://localhost:4000/api/v1";
                const res = await fetch(`${base}/admin/users/${id}`, {
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                });
                if (!res.ok) throw new Error("Failed to load user data");
                const json = await res.json();
                const data = json.data || json;

                let role = "customer";
                if (data.role === "VERIFICATION_AGENT") role = "verification_agent";
                else if (data.role === "ARTISAN") role = "artisan";
                else if (data.role === "ADMIN") role = "admin";

                setFormData({
                    firstName: data.firstName || "",
                    lastName: data.lastName || "",
                    email: data.email || "",
                    phone: data.phone || data.phoneNumber || "",
                    role: role as Role,
                    status: (data.status?.toLowerCase() || "active") as Status,
                    artisanProfile: {
                        shopName: data.artisanProfile?.shopName || "",
                        bio: data.artisanProfile?.bio || "",
                        region: data.artisanProfile?.region || "",
                        city: data.artisanProfile?.city || "",
                    }
                });
            } catch (err: any) {
                console.error(err);
                setError(err.message || "An error occurred");
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [id]);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(""), 3000);
        return () => clearTimeout(timer);
    }, [toast]);

    const handleInputChange = (field: string, value: any, isArtisanField = false) => {
        if (isArtisanField) {
            setFormData(prev => ({
                ...prev,
                artisanProfile: { ...prev.artisanProfile, [field]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/$/, "") || "http://localhost:4000/api/v1";

            const mappedRole = formData.role.toUpperCase();

            const payload: any = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                role: mappedRole,
                status: formData.status.toUpperCase(),
            };

            if (formData.role === "artisan") {
                payload.artisanProfile = formData.artisanProfile;
            }

            const res = await fetch(`${base}/admin/users/${id}`, {
                method: "PATCH",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to update user");
            }

            setToast("User updated successfully");
            setTimeout(() => {
                router.push(`/admin/users/${id}`);
            }, 1000);
        } catch (err: any) {
            setError(err.message || "An error occurred during update");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-neutral-50/50">
                <Loader2 className="h-8 w-8 animate-spin text-[#C6A75E]" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-neutral-50/50 pb-20 pt-10">
            {toast && (
                <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-[#2D2620] px-6 py-3 font-medium text-white shadow-xl">
                    {toast}
                </div>
            )}
            <div className="mx-auto max-w-4xl px-4 md:px-8">
                <Link
                    href={`/admin/users/${id}`}
                    className="mb-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-400 transition hover:text-[#C6A75E]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Profile
                </Link>

                <div className="mb-8 flex items-end justify-between">
                    <div>
                        <h1 className="font-display text-4xl font-bold tracking-tight text-[#2D2620]">Edit User</h1>
                        <p className="mt-2 text-neutral-500">Update user details and permissions</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <article className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8 shadow-sm">
                        <h2 className="mb-6 font-display text-xl tracking-[0.04em] text-[#2D2620]">Basic Information</h2>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">First Name</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm transition focus:border-[#C6A75E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C6A75E]"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Last Name</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm transition focus:border-[#C6A75E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C6A75E]"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Email Address</label>
                                <input
                                    required
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange("email", e.target.value)}
                                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm transition focus:border-[#C6A75E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C6A75E]"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Phone Number</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange("phone", e.target.value)}
                                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm transition focus:border-[#C6A75E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C6A75E]"
                                />
                            </div>
                        </div>
                    </article>

                    <article className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8 shadow-sm">
                        <h2 className="mb-6 font-display text-xl tracking-[0.04em] text-[#2D2620]">Account Status</h2>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">System Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => handleInputChange("role", e.target.value)}
                                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm transition focus:border-[#C6A75E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C6A75E]"
                                >
                                    <option value="customer">Customer</option>
                                    <option value="artisan">Artisan</option>
                                    <option value="verification_agent">Verification Agent</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Account Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => handleInputChange("status", e.target.value)}
                                    className={cn(
                                        "w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium transition focus:border-[#C6A75E] focus:outline-none focus:ring-1 focus:ring-[#C6A75E]",
                                        formData.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                    )}
                                >
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>
                        </div>
                    </article>

                    {formData.role === "artisan" && (
                        <article className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8 shadow-sm">
                            <h2 className="mb-6 font-display text-xl tracking-[0.04em] text-[#2D2620]">Artisan Profile</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Shop Name</label>
                                    <input
                                        type="text"
                                        value={formData.artisanProfile.shopName}
                                        onChange={(e) => handleInputChange("shopName", e.target.value, true)}
                                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm transition focus:border-[#C6A75E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C6A75E]"
                                    />
                                </div>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Region</label>
                                        <input
                                            type="text"
                                            value={formData.artisanProfile.region}
                                            onChange={(e) => handleInputChange("region", e.target.value, true)}
                                            className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm transition focus:border-[#C6A75E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C6A75E]"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">City</label>
                                        <input
                                            type="text"
                                            value={formData.artisanProfile.city}
                                            onChange={(e) => handleInputChange("city", e.target.value, true)}
                                            className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm transition focus:border-[#C6A75E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C6A75E]"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Biography / About</label>
                                    <textarea
                                        rows={4}
                                        value={formData.artisanProfile.bio}
                                        onChange={(e) => handleInputChange("bio", e.target.value, true)}
                                        className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm transition focus:border-[#C6A75E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C6A75E]"
                                    />
                                </div>
                            </div>
                        </article>
                    )}

                    <div className="flex justify-end gap-4 pt-6">
                        <button
                            type="button"
                            onClick={() => router.push(`/admin/users/${id}`)}
                            className="rounded-xl px-6 py-3 text-sm font-bold tracking-wide text-neutral-500 transition hover:bg-neutral-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 rounded-xl bg-[#2D2620] px-8 py-3 text-sm font-bold tracking-wide text-white shadow-lg transition hover:bg-[#3E2723] disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}
