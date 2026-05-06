"use client"
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    CircleHelp,
    Copy,
    Plug,
    Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SectionKey =
    | "general"
    | "rolesPermissions"
    | "security"
    | "marketplaceRules"
    | "payments"
    | "logistics"
    | "notifications"
    | "dataAnalytics"
    | "integrations"
    | "appearance";

type PermissionAction = "view" | "edit" | "delete" | "approve" | "assign";
type RoleName = "customer" | "artisan" | "agent" | "admin";

type SettingsState = {
    general: {
        platformName: string;
        timezone: string;
        currency: string;
        language: string;
        logoFileName: string;
    };
    rolesPermissions: {
        selectedRole: RoleName;
        permissions: Record<RoleName, Record<PermissionAction, boolean>>;
    };
    marketplaceRules: {
        commissionRate: number;
        approvalMode: "manual" | "auto";
        returnPolicy: string;
        cancellationWindow: string;
        listingLimit: number;
    };
    payments: {
        providers: { chapa: boolean; stripe: boolean; telebirr: boolean };
        transactionFee: number;
        payoutSchedule: "weekly" | "monthly";
        walletEnabled: boolean;
    };
    logistics: {
        shippingRegions: string[];
        assignmentLogic: "auto" | "manual";
        estimatedDelivery: string;
        pricingTiers: { zone: string; min: number; max: number; fee: number }[];
    };
    security: {
        twoFactorRequired: boolean;
        minPasswordLength: number;
        requireComplexity: boolean;
        sessionTimeout: string;
        loginAlerts: boolean;
    };
    notifications: {
        emailTemplate: string;
        smsTriggers: { orderPlaced: boolean; productApproved: boolean; paymentReceived: boolean };
    };
    dataAnalytics: {
        dataRetentionDays: "30" | "60" | "90";
        trackingEnabled: boolean;
        fraudThreshold: number;
        sensitivityLevel: "low" | "balanced" | "high";
    };
    integrations: {
        apiKey: string;
        webhookUrl: string;
        connected: { chapa: boolean; erp: boolean; crm: boolean };
    };
    appearance: {
        theme: "light" | "dark";
        accentColor: string;
        density: "compact" | "comfortable";
    };
};

const initialSettings: SettingsState = {
    general: {
        platformName: "EthioCraft",
        timezone: "Africa/Addis_Ababa",
        currency: "ETB",
        language: "English",
        logoFileName: "ethiocraft-mark.svg",
    },
    rolesPermissions: {
        selectedRole: "artisan",
        permissions: {
            customer: { view: true, edit: false, delete: false, approve: false, assign: false },
            artisan: { view: true, edit: true, delete: false, approve: false, assign: false },
            agent: { view: true, edit: true, delete: false, approve: true, assign: true },
            admin: { view: true, edit: true, delete: true, approve: true, assign: true },
        },
    },
    marketplaceRules: {
        commissionRate: 12,
        approvalMode: "manual",
        returnPolicy: "Returns accepted within 7 days for undamaged products with original packaging.",
        cancellationWindow: "24 hours",
        listingLimit: 80,
    },
    payments: {
        providers: { chapa: true, stripe: false, telebirr: true },
        transactionFee: 2.5,
        payoutSchedule: "weekly",
        walletEnabled: true,
    },
    logistics: {
        shippingRegions: ["Addis Ababa", "Oromia", "Amhara"],
        assignmentLogic: "auto",
        estimatedDelivery: "2-5 business days",
        pricingTiers: [
            { zone: "Local", min: 0, max: 5, fee: 120 },
            { zone: "Regional", min: 6, max: 20, fee: 180 },
            { zone: "National", min: 21, max: 50, fee: 250 },
        ],
    },
    security: {
        twoFactorRequired: true,
        minPasswordLength: 10,
        requireComplexity: true,
        sessionTimeout: "30 min",
        loginAlerts: true,
    },
    notifications: {
        emailTemplate: "Hello {{name}}, your order {{order_id}} has moved to {{status}}.",
        smsTriggers: { orderPlaced: true, productApproved: true, paymentReceived: false },
    },
    dataAnalytics: {
        dataRetentionDays: "90",
        trackingEnabled: true,
        fraudThreshold: 70,
        sensitivityLevel: "balanced",
    },
    integrations: {
        apiKey: "ec_live_x3f9***v82",
        webhookUrl: "",
        connected: { chapa: true, erp: false, crm: false },
    },
    appearance: {
        theme: "light",
        accentColor: "#C6A75E",
        density: "comfortable",
    },
};

const API_BASE = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:4000/api/v1").replace(/\/$/, "");

function getAuthHeaders() {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("authToken") : "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
}

const navGroups: { label: string; items: { key: SectionKey; label: string }[] }[] = [
    { label: "GENERAL", items: [{ key: "general", label: "General" }] },
    {
        label: "ACCESS CONTROL",
        items: [
            { key: "rolesPermissions", label: "Roles & Permissions" },
            { key: "security", label: "Security" },
        ],
    },
    {
        label: "MARKETPLACE",
        items: [
            { key: "marketplaceRules", label: "Marketplace Rules" },
            { key: "payments", label: "Payments" },
            { key: "logistics", label: "Logistics" },
        ],
    },
    {
        label: "SYSTEM",
        items: [
            { key: "notifications", label: "Notifications" },
            { key: "dataAnalytics", label: "Data & Analytics" },
            { key: "integrations", label: "Integrations" },
        ],
    },
    { label: "OPTIONAL", items: [{ key: "appearance", label: "Appearance" }] },
];

function SectionCard({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer?: ReactNode }) {
    return (
        <section className="rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
            <div className="mb-5">
                <h2 className="font-display text-xl font-bold text-[#1C1C1C]">{title}</h2>
                <p className="mt-1 text-sm text-stone-500">{description}</p>
            </div>
            <div className="space-y-5">{children}</div>
            {footer ? <div className="mt-6 border-t border-stone-100 pt-4">{footer}</div> : null}
        </section>
    );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
        <button
            type="button"
            onClick={onChange}
            className={cn(
                "relative h-6 w-11 rounded-full transition-all duration-200",
                checked ? "bg-[#C6A75E]" : "bg-stone-300"
            )}
        >
            <span
                className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
                    checked ? "translate-x-5" : "translate-x-0.5"
                )}
            />
        </button>
    );
}

function TooltipText({ text }: { text: string }) {
    return (
        <span className="group relative inline-flex">
            <CircleHelp className="h-3.5 w-3.5 text-stone-400" />
            <span className="pointer-events-none absolute left-1/2 top-5 z-10 w-52 -translate-x-1/2 rounded-lg border border-stone-200 bg-white p-2 text-xs text-stone-600 opacity-0 shadow-md transition group-hover:opacity-100">
                {text}
            </span>
        </span>
    );
}

export default function App() {
    const [activeSection, setActiveSection] = useState<SectionKey>("general");
    const [settings, setSettings] = useState<SettingsState>(initialSettings);
    const [savedSettings, setSavedSettings] = useState<SettingsState>(initialSettings);
    const [toast, setToast] = useState("");
    const [errorText, setErrorText] = useState("");
    const [saving, setSaving] = useState(false);
    const [hydrating, setHydrating] = useState(true);
    const [loadingSection, setLoadingSection] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingPermissionChange, setPendingPermissionChange] = useState<null | { role: RoleName; action: PermissionAction; value: boolean }>(null);

    const hasUnsavedChanges = useMemo(() => JSON.stringify(settings) !== JSON.stringify(savedSettings), [settings, savedSettings]);

    const sectionDirtyMap = useMemo(
        () => ({
            general: JSON.stringify(settings.general) !== JSON.stringify(savedSettings.general),
            rolesPermissions: JSON.stringify(settings.rolesPermissions) !== JSON.stringify(savedSettings.rolesPermissions),
            security: JSON.stringify(settings.security) !== JSON.stringify(savedSettings.security),
            marketplaceRules: JSON.stringify(settings.marketplaceRules) !== JSON.stringify(savedSettings.marketplaceRules),
            payments: JSON.stringify(settings.payments) !== JSON.stringify(savedSettings.payments),
            logistics: JSON.stringify(settings.logistics) !== JSON.stringify(savedSettings.logistics),
            notifications: JSON.stringify(settings.notifications) !== JSON.stringify(savedSettings.notifications),
            dataAnalytics: JSON.stringify(settings.dataAnalytics) !== JSON.stringify(savedSettings.dataAnalytics),
            integrations: JSON.stringify(settings.integrations) !== JSON.stringify(savedSettings.integrations),
            appearance: JSON.stringify(settings.appearance) !== JSON.stringify(savedSettings.appearance),
        }),
        [settings, savedSettings]
    );

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/admin/settings`, { headers: getAuthHeaders(), cache: "no-store" });
                if (!res.ok) throw new Error(`Failed to fetch settings: ${res.status}`);
                const json = await res.json();
                const nextSettings = json?.data as SettingsState;
                if (!cancelled && nextSettings) {
                    setSettings(nextSettings);
                    setSavedSettings(nextSettings);
                }
            } catch (error) {
                if (!cancelled) setErrorText(error instanceof Error ? error.message : "Failed to load settings");
            } finally {
                if (!cancelled) setHydrating(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!toast) return;
        const timer = window.setTimeout(() => setToast(""), 2200);
        return () => window.clearTimeout(timer);
    }, [toast]);

    useEffect(() => {
        setLoadingSection(true);
        const timer = window.setTimeout(() => setLoadingSection(false), 300);
        return () => window.clearTimeout(timer);
    }, [activeSection]);

    const saveActiveSection = async () => {
        setSaving(true);
        setErrorText("");
        try {
            const payload = { [activeSection]: settings[activeSection] };
            const res = await fetch(`${API_BASE}/admin/settings`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(`Failed to save section: ${res.status}`);
            const json = await res.json();
            const nextSettings = (json?.data || settings) as SettingsState;
            setSettings(nextSettings);
            setSavedSettings(nextSettings);
            setToast("Section saved successfully");
        } catch (error) {
            setErrorText(error instanceof Error ? error.message : "Failed to save section");
        } finally {
            setSaving(false);
        }
    };

    const saveAll = async () => {
        setSaving(true);
        setErrorText("");
        try {
            const res = await fetch(`${API_BASE}/admin/settings`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(settings),
            });
            if (!res.ok) throw new Error(`Failed to save all settings: ${res.status}`);
            const json = await res.json();
            const nextSettings = (json?.data || settings) as SettingsState;
            setSettings(nextSettings);
            setSavedSettings(nextSettings);
            setToast("All settings saved");
        } catch (error) {
            setErrorText(error instanceof Error ? error.message : "Failed to save all settings");
        } finally {
            setSaving(false);
        }
    };

    const resetActiveSection = () => {
        setSettings((prev) => ({ ...prev, [activeSection]: savedSettings[activeSection] }));
        setToast("Section reset to last saved state");
    };

    const isGeneralInvalid = settings.general.platformName.trim().length < 3;
    const isCommissionInvalid = settings.marketplaceRules.commissionRate < 0 || settings.marketplaceRules.commissionRate > 40;

    const onPermissionToggle = (role: RoleName, action: PermissionAction, value: boolean) => {
        const isCritical = action === "delete" || action === "assign";
        if (isCritical) {
            setPendingPermissionChange({ role, action, value });
            setShowConfirmModal(true);
            return;
        }
        setSettings((prev) => ({
            ...prev,
            rolesPermissions: {
                ...prev.rolesPermissions,
                permissions: {
                    ...prev.rolesPermissions.permissions,
                    [role]: { ...prev.rolesPermissions.permissions[role], [action]: value },
                },
            },
        }));
    };

    const confirmCriticalPermission = () => {
        if (!pendingPermissionChange) return;
        const { role, action, value } = pendingPermissionChange;
        setSettings((prev) => ({
            ...prev,
            rolesPermissions: {
                ...prev.rolesPermissions,
                permissions: {
                    ...prev.rolesPermissions.permissions,
                    [role]: { ...prev.rolesPermissions.permissions[role], [action]: value },
                },
            },
        }));
        setToast("Critical permission updated");
        setPendingPermissionChange(null);
        setShowConfirmModal(false);
    };

    const testIntegrationConnection = async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/settings/integrations/test`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ provider: "chapa", webhookUrl: settings.integrations.webhookUrl }),
            });
            if (!res.ok) throw new Error(`Failed integration test: ${res.status}`);
            const json = await res.json();
            setToast(json?.data?.message || "Integration test completed");
        } catch (error) {
            setErrorText(error instanceof Error ? error.message : "Failed to test integration");
        }
    };

    const regenerateApiKey = async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/settings/integrations/regenerate-key`, {
                method: "POST",
                headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error(`Failed to regenerate key: ${res.status}`);
            const json = await res.json();
            const nextKey = json?.data?.apiKey as string;
            if (nextKey) {
                setSettings((prev) => ({ ...prev, integrations: { ...prev.integrations, apiKey: nextKey } }));
                setSavedSettings((prev) => ({ ...prev, integrations: { ...prev.integrations, apiKey: nextKey } }));
            }
            setToast("API key regenerated");
        } catch (error) {
            setErrorText(error instanceof Error ? error.message : "Failed to regenerate key");
        }
    };

    const renderSection = () => {
        if (loadingSection) {
            return (
                <section className="space-y-4 rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
                    <div className="h-6 w-40 animate-pulse rounded bg-stone-200" />
                    <div className="h-4 w-80 animate-pulse rounded bg-stone-100" />
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-10 animate-pulse rounded-xl bg-stone-100" />
                    ))}
                </section>
            );
        }

        if (activeSection === "general") {
            return (
                <SectionCard
                    title="General Settings"
                    description="Define marketplace identity, locale defaults, and base behavior."
                    footer={<button onClick={saveActiveSection} className="rounded-xl bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white">Save General</button>}
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium">Platform Name</label>
                            <input
                                value={settings.general.platformName}
                                onChange={(event) =>
                                    setSettings((prev) => ({ ...prev, general: { ...prev.general, platformName: event.target.value } }))
                                }
                                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none transition focus:border-[#C6A75E]"
                            />
                            {isGeneralInvalid ? <p className="mt-1 text-xs text-rose-600">Platform name must be at least 3 characters.</p> : null}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">Timezone</label>
                            <select
                                value={settings.general.timezone}
                                onChange={(event) => setSettings((prev) => ({ ...prev, general: { ...prev.general, timezone: event.target.value } }))}
                                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none transition focus:border-[#C6A75E]"
                            >
                                <option>Africa/Addis_Ababa</option>
                                <option>UTC</option>
                                <option>Europe/London</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">Currency</label>
                            <select
                                value={settings.general.currency}
                                onChange={(event) => setSettings((prev) => ({ ...prev, general: { ...prev.general, currency: event.target.value } }))}
                                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none transition focus:border-[#C6A75E]"
                            >
                                <option>ETB</option>
                                <option>USD</option>
                                <option>EUR</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">Default Language</label>
                            <select
                                value={settings.general.language}
                                onChange={(event) => setSettings((prev) => ({ ...prev, general: { ...prev.general, language: event.target.value } }))}
                                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none transition focus:border-[#C6A75E]"
                            >
                                <option>English</option>
                                <option>Amharic</option>
                                <option>Oromiffa</option>
                            </select>
                        </div>
                    </div>

                    <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4">
                        <p className="text-sm font-medium">Logo Upload</p>
                        <p className="mt-1 text-xs text-stone-500">Drag and drop logo files or click to browse. Recommended 512x512 SVG.</p>
                        <div className="mt-3 flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm">
                            <span>{settings.general.logoFileName}</span>
                            <button
                                className="text-[#7A6024]"
                                onClick={() => setSettings((prev) => ({ ...prev, general: { ...prev.general, logoFileName: "ethiocraft-logo-v2.svg" } }))}
                            >
                                Replace
                            </button>
                        </div>
                    </div>
                </SectionCard>
            );
        }

        if (activeSection === "rolesPermissions") {
            const role = settings.rolesPermissions.selectedRole;
            const rolePermissions = settings.rolesPermissions.permissions[role];
            return (
                <SectionCard
                    title="Roles & Permissions"
                    description="Define role capabilities with precision. Critical actions require confirmation."
                    footer={
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-amber-700">Recommended: Keep delete permission restricted to Admin only.</p>
                            <button onClick={saveActiveSection} className="rounded-xl bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white">Save Permissions</button>
                        </div>
                    }
                >
                    <div className="flex flex-wrap items-center gap-2">
                        {(["customer", "artisan", "agent", "admin"] as RoleName[]).map((roleName) => (
                            <button
                                key={roleName}
                                onClick={() => setSettings((prev) => ({ ...prev, rolesPermissions: { ...prev.rolesPermissions, selectedRole: roleName } }))}
                                className={cn(
                                    "rounded-lg border px-3 py-1.5 text-sm font-medium capitalize transition",
                                    roleName === role ? "border-[#C6A75E] bg-[#C6A75E]/15 text-[#7A6024]" : "border-stone-200 text-stone-600"
                                )}
                            >
                                {roleName}
                            </button>
                        ))}
                        <button className="ml-auto rounded-lg border border-stone-200 px-3 py-1.5 text-sm">Create Role</button>
                        <button className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm">Edit Role</button>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-stone-200">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                                <tr>
                                    <th className="px-4 py-3">Action</th>
                                    <th className="px-4 py-3">Permission</th>
                                    <th className="px-4 py-3">Context</th>
                                </tr>
                            </thead>
                            <tbody>
                                {([
                                    ["view", "View records and profiles"],
                                    ["edit", "Modify existing data"],
                                    ["delete", "Remove records from system"],
                                    ["approve", "Approve products and samples"],
                                    ["assign", "Assign verification and tasks"],
                                ] as [PermissionAction, string][]).map(([action, helper], index) => (
                                    <tr key={action} className={cn("border-t border-stone-100", index % 2 === 0 ? "bg-white" : "bg-stone-50/40")}>
                                        <td className="px-4 py-3 capitalize">{action}</td>
                                        <td className="px-4 py-3">
                                            <Toggle
                                                checked={rolePermissions[action]}
                                                onChange={() => onPermissionToggle(role, action, !rolePermissions[action])}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-stone-500">{helper}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            );
        }

        if (activeSection === "marketplaceRules") {
            return (
                <SectionCard
                    title="Marketplace Rules"
                    description="Set platform policies that shape trust, quality, and transaction governance."
                    footer={<button onClick={saveActiveSection} className="rounded-xl bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white">Save Rules</button>}
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 flex items-center gap-2 text-sm font-medium">Commission Rate (%) <TooltipText text="Recommended range is 8% to 15% for balanced growth." /></label>
                            <input
                                type="range"
                                min={0}
                                max={40}
                                value={settings.marketplaceRules.commissionRate}
                                onChange={(event) =>
                                    setSettings((prev) => ({ ...prev, marketplaceRules: { ...prev.marketplaceRules, commissionRate: Number(event.target.value) } }))
                                }
                                className="w-full accent-[#C6A75E]"
                            />
                            <p className="mt-1 text-xs text-stone-500">Current: {settings.marketplaceRules.commissionRate}%</p>
                            {isCommissionInvalid ? <p className="mt-1 text-xs text-rose-600">Commission must be between 0% and 40%.</p> : null}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">Product Approval Mode</label>
                            <select
                                value={settings.marketplaceRules.approvalMode}
                                onChange={(event) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        marketplaceRules: { ...prev.marketplaceRules, approvalMode: event.target.value as "manual" | "auto" },
                                    }))
                                }
                                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                            >
                                <option value="manual">Manual</option>
                                <option value="auto">Auto</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium">Return Policy</label>
                        <textarea
                            rows={4}
                            value={settings.marketplaceRules.returnPolicy}
                            onChange={(event) =>
                                setSettings((prev) => ({ ...prev, marketplaceRules: { ...prev.marketplaceRules, returnPolicy: event.target.value } }))
                            }
                            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium">Cancellation Window</label>
                            <select
                                value={settings.marketplaceRules.cancellationWindow}
                                onChange={(event) =>
                                    setSettings((prev) => ({ ...prev, marketplaceRules: { ...prev.marketplaceRules, cancellationWindow: event.target.value } }))
                                }
                                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                            >
                                <option>1 hour</option>
                                <option>6 hours</option>
                                <option>24 hours</option>
                                <option>48 hours</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">Listing Limit per Artisan</label>
                            <input
                                type="number"
                                value={settings.marketplaceRules.listingLimit}
                                onChange={(event) =>
                                    setSettings((prev) => ({ ...prev, marketplaceRules: { ...prev.marketplaceRules, listingLimit: Number(event.target.value) } }))
                                }
                                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                            />
                        </div>
                    </div>
                </SectionCard>
            );
        }

        if (activeSection === "payments") {
            return (
                <SectionCard
                    title="Payments"
                    description="Configure provider routing, fees, and payout cadence."
                    footer={<button onClick={saveActiveSection} className="rounded-xl bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white">Save Payments</button>}
                >
                    <div className="grid gap-3 md:grid-cols-3">
                        {([
                            ["chapa", "Chapa"],
                            ["stripe", "Stripe"],
                            ["telebirr", "Telebirr"],
                        ] as ["chapa" | "stripe" | "telebirr", string][]).map(([key, label]) => (
                            <div key={key} className="rounded-xl border border-stone-200 p-4">
                                <p className="text-sm font-semibold">{label}</p>
                                <p className="mt-1 text-xs text-stone-500">Payment provider integration</p>
                                <div className="mt-3">
                                    <Toggle
                                        checked={settings.payments.providers[key]}
                                        onChange={() =>
                                            setSettings((prev) => ({
                                                ...prev,
                                                payments: { ...prev.payments, providers: { ...prev.payments.providers, [key]: !prev.payments.providers[key] } },
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium">Transaction Fee (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={settings.payments.transactionFee}
                                onChange={(event) => setSettings((prev) => ({ ...prev, payments: { ...prev.payments, transactionFee: Number(event.target.value) } }))}
                                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">Payout Schedule</label>
                            <select
                                value={settings.payments.payoutSchedule}
                                onChange={(event) =>
                                    setSettings((prev) => ({ ...prev, payments: { ...prev.payments, payoutSchedule: event.target.value as "weekly" | "monthly" } }))
                                }
                                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                            >
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                        <div className="rounded-xl border border-stone-200 p-3">
                            <p className="text-sm font-medium">Wallet System</p>
                            <div className="mt-2">
                                <Toggle
                                    checked={settings.payments.walletEnabled}
                                    onChange={() => setSettings((prev) => ({ ...prev, payments: { ...prev.payments, walletEnabled: !prev.payments.walletEnabled } }))}
                                />
                            </div>
                        </div>
                    </div>
                </SectionCard>
            );
        }

        if (activeSection === "logistics") {
            return (
                <SectionCard
                    title="Logistics"
                    description="Optimize shipping coverage, pricing tiers, and assignment strategy."
                    footer={<button onClick={saveActiveSection} className="rounded-xl bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white">Save Logistics</button>}
                >
                    <div>
                        <p className="mb-2 text-sm font-medium">Shipping Regions</p>
                        <div className="flex flex-wrap gap-2">
                            {["Addis Ababa", "Oromia", "Amhara", "Sidama", "Tigray"].map((region) => (
                                <button
                                    key={region}
                                    onClick={() =>
                                        setSettings((prev) => ({
                                            ...prev,
                                            logistics: {
                                                ...prev.logistics,
                                                shippingRegions: prev.logistics.shippingRegions.includes(region)
                                                    ? prev.logistics.shippingRegions.filter((r) => r !== region)
                                                    : [...prev.logistics.shippingRegions, region],
                                            },
                                        }))
                                    }
                                    className={cn(
                                        "rounded-lg border px-3 py-1.5 text-sm transition",
                                        settings.logistics.shippingRegions.includes(region)
                                            ? "border-[#C6A75E] bg-[#C6A75E]/15 text-[#7A6024]"
                                            : "border-stone-200 text-stone-600"
                                    )}
                                >
                                    {region}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-stone-200">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                                <tr>
                                    <th className="px-4 py-3">Zone</th>
                                    <th className="px-4 py-3">Weight Min</th>
                                    <th className="px-4 py-3">Weight Max</th>
                                    <th className="px-4 py-3">Fee (ETB)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {settings.logistics.pricingTiers.map((tier) => (
                                    <tr key={tier.zone} className="border-t border-stone-100">
                                        <td className="px-4 py-3">{tier.zone}</td>
                                        <td className="px-4 py-3">{tier.min} kg</td>
                                        <td className="px-4 py-3">{tier.max} kg</td>
                                        <td className="px-4 py-3">{tier.fee}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium">Agent Assignment Logic</label>
                            <select
                                value={settings.logistics.assignmentLogic}
                                onChange={(event) =>
                                    setSettings((prev) => ({ ...prev, logistics: { ...prev.logistics, assignmentLogic: event.target.value as "auto" | "manual" } }))
                                }
                                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                            >
                                <option value="auto">Auto assign by region and load</option>
                                <option value="manual">Manual assignment</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">Estimated Delivery Time</label>
                            <input
                                value={settings.logistics.estimatedDelivery}
                                onChange={(event) => setSettings((prev) => ({ ...prev, logistics: { ...prev.logistics, estimatedDelivery: event.target.value } }))}
                                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                            />
                        </div>
                    </div>
                </SectionCard>
            );
        }

        if (activeSection === "security") {
            return (
                <SectionCard
                    title="Security"
                    description="Protect admin access and marketplace integrity through enforced controls."
                    footer={<button onClick={saveActiveSection} className="rounded-xl bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white">Save Security</button>}
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-stone-200 p-4">
                            <p className="text-sm font-medium">Require 2FA for Admins</p>
                            <p className="mt-1 text-xs text-stone-500">Recommended setting for all production environments.</p>
                            <div className="mt-3">
                                <Toggle
                                    checked={settings.security.twoFactorRequired}
                                    onChange={() => setSettings((prev) => ({ ...prev, security: { ...prev.security, twoFactorRequired: !prev.security.twoFactorRequired } }))}
                                />
                            </div>
                        </div>
                        <div className="rounded-xl border border-stone-200 p-4">
                            <p className="text-sm font-medium">Login Alerts</p>
                            <p className="mt-1 text-xs text-stone-500">Notify admins on unusual login attempts.</p>
                            <div className="mt-3">
                                <Toggle
                                    checked={settings.security.loginAlerts}
                                    onChange={() => setSettings((prev) => ({ ...prev, security: { ...prev.security, loginAlerts: !prev.security.loginAlerts } }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium">Minimum Password Length</label>
                            <input
                                type="number"
                                value={settings.security.minPasswordLength}
                                onChange={(event) =>
                                    setSettings((prev) => ({ ...prev, security: { ...prev.security, minPasswordLength: Number(event.target.value) } }))
                                }
                                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">Session Timeout</label>
                            <select
                                value={settings.security.sessionTimeout}
                                onChange={(event) => setSettings((prev) => ({ ...prev, security: { ...prev.security, sessionTimeout: event.target.value } }))}
                                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                            >
                                <option>15 min</option>
                                <option>30 min</option>
                                <option>1 hour</option>
                                <option>4 hours</option>
                            </select>
                        </div>
                        <div className="rounded-xl border border-stone-200 p-3">
                            <p className="text-sm font-medium">Require Complexity Rules</p>
                            <div className="mt-2">
                                <Toggle
                                    checked={settings.security.requireComplexity}
                                    onChange={() => setSettings((prev) => ({ ...prev, security: { ...prev.security, requireComplexity: !prev.security.requireComplexity } }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-stone-200 p-4">
                        <p className="mb-2 text-sm font-medium">Recent Admin Activity</p>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-center justify-between"><span>Admin Hana changed payout schedule</span><span className="text-xs text-stone-500">2h ago</span></li>
                            <li className="flex items-center justify-between"><span>Admin Robel updated commission rate</span><span className="text-xs text-stone-500">5h ago</span></li>
                            <li className="flex items-center justify-between"><span>Admin Sara enabled 2FA enforcement</span><span className="text-xs text-stone-500">1d ago</span></li>
                        </ul>
                    </div>
                </SectionCard>
            );
        }

        if (activeSection === "notifications") {
            return (
                <SectionCard
                    title="Notifications"
                    description="Configure messaging templates and operational event triggers."
                    footer={<button onClick={saveActiveSection} className="rounded-xl bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white">Save Notifications</button>}
                >
                    <div>
                        <label className="mb-1 block text-sm font-medium">Email Template</label>
                        <textarea
                            rows={4}
                            value={settings.notifications.emailTemplate}
                            onChange={(event) =>
                                setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, emailTemplate: event.target.value } }))
                            }
                            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                        />
                        <p className="mt-1 text-xs text-stone-500">{`Supports variables like {{name}}, {{order_id}}, {{status}}.`}</p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                        {([
                            ["orderPlaced", "Order placed"],
                            ["productApproved", "Product approved"],
                            ["paymentReceived", "Payment received"],
                        ] as ["orderPlaced" | "productApproved" | "paymentReceived", string][]).map(([key, label]) => (
                            <div key={key} className="rounded-xl border border-stone-200 p-4">
                                <p className="text-sm font-medium">{label}</p>
                                <div className="mt-3">
                                    <Toggle
                                        checked={settings.notifications.smsTriggers[key]}
                                        onChange={() =>
                                            setSettings((prev) => ({
                                                ...prev,
                                                notifications: {
                                                    ...prev.notifications,
                                                    smsTriggers: { ...prev.notifications.smsTriggers, [key]: !prev.notifications.smsTriggers[key] },
                                                },
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            );
        }

        if (activeSection === "dataAnalytics") {
            return (
                <SectionCard
                    title="Data & Analytics"
                    description="Control data retention, fraud detection, and insight sensitivity across operations."
                    footer={<button onClick={saveActiveSection} className="rounded-xl bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white">Save Data Rules</button>}
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium">Data Retention</label>
                            <select
                                value={settings.dataAnalytics.dataRetentionDays}
                                onChange={(event) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        dataAnalytics: { ...prev.dataAnalytics, dataRetentionDays: event.target.value as "30" | "60" | "90" },
                                    }))
                                }
                                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                            >
                                <option value="30">30 days</option>
                                <option value="60">60 days</option>
                                <option value="90">90 days</option>
                            </select>
                        </div>
                        <div className="rounded-xl border border-stone-200 p-3">
                            <p className="text-sm font-medium">Tracking Enabled</p>
                            <div className="mt-2">
                                <Toggle
                                    checked={settings.dataAnalytics.trackingEnabled}
                                    onChange={() =>
                                        setSettings((prev) => ({ ...prev, dataAnalytics: { ...prev.dataAnalytics, trackingEnabled: !prev.dataAnalytics.trackingEnabled } }))
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 flex items-center gap-2 text-sm font-medium">Fraud Detection Threshold <TooltipText text="Higher values reduce false positives but may miss subtle fraud patterns." /></label>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={settings.dataAnalytics.fraudThreshold}
                            onChange={(event) =>
                                setSettings((prev) => ({ ...prev, dataAnalytics: { ...prev.dataAnalytics, fraudThreshold: Number(event.target.value) } }))
                            }
                            className="w-full accent-[#C6A75E]"
                        />
                        <p className="mt-1 text-xs text-stone-500">Current threshold: {settings.dataAnalytics.fraudThreshold}</p>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium">Insight Sensitivity Level</label>
                        <div className="flex gap-2">
                            {(["low", "balanced", "high"] as const).map((level) => (
                                <button
                                    key={level}
                                    onClick={() => setSettings((prev) => ({ ...prev, dataAnalytics: { ...prev.dataAnalytics, sensitivityLevel: level } }))}
                                    className={cn(
                                        "rounded-lg border px-3 py-1.5 text-sm capitalize",
                                        settings.dataAnalytics.sensitivityLevel === level
                                            ? "border-[#C6A75E] bg-[#C6A75E]/15 text-[#7A6024]"
                                            : "border-stone-200 text-stone-600"
                                    )}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>
                </SectionCard>
            );
        }

        if (activeSection === "integrations") {
            const hasConnected = Object.values(settings.integrations.connected).some(Boolean);
            return (
                <SectionCard
                    title="Integrations"
                    description="Manage API credentials, webhook channels, and external system connectivity."
                    footer={<button onClick={saveActiveSection} className="rounded-xl bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white">Save Integrations</button>}
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium">API Key</label>
                            <div className="flex gap-2">
                                <input value={settings.integrations.apiKey} readOnly className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" />
                                <button
                                    onClick={() => {
                                        navigator.clipboard?.writeText(settings.integrations.apiKey);
                                        setToast("API key copied");
                                    }}
                                    className="rounded-xl border border-stone-200 px-3"
                                >
                                    <Copy className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">Webhook URL</label>
                            <input
                                value={settings.integrations.webhookUrl}
                                onChange={(event) =>
                                    setSettings((prev) => ({ ...prev, integrations: { ...prev.integrations, webhookUrl: event.target.value } }))
                                }
                                placeholder="https://api.example.com/webhooks/ethiocraft"
                                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button onClick={testIntegrationConnection} className="rounded-xl border border-stone-200 px-3 py-2 text-sm">Test connection</button>
                        <button onClick={regenerateApiKey} className="rounded-xl border border-stone-200 px-3 py-2 text-sm">Regenerate key</button>
                    </div>

                    {!hasConnected ? (
                        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
                            <Plug className="mx-auto h-6 w-6 text-stone-400" />
                            <p className="mt-2 font-medium">No integrations connected</p>
                            <p className="mt-1 text-sm text-stone-500">Connect Chapa, ERP, or CRM to enable automation workflows.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-3">
                            {([
                                ["chapa", "Chapa"],
                                ["erp", "ERP"],
                                ["crm", "CRM"],
                            ] as ["chapa" | "erp" | "crm", string][]).map(([key, label]) => (
                                <div key={key} className="rounded-xl border border-stone-200 p-4">
                                    <p className="text-sm font-medium">{label}</p>
                                    <p className="mt-1 text-xs text-stone-500">Status: {settings.integrations.connected[key] ? "Connected" : "Not connected"}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>
            );
        }

        if (activeSection === "appearance") {
            return (
                <SectionCard
                    title="Appearance"
                    description="Customize admin workspace comfort without impacting marketplace data."
                    footer={<button onClick={saveActiveSection} className="rounded-xl bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white">Save Appearance</button>}
                >
                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium">Theme</label>
                            <select
                                value={settings.appearance.theme}
                                onChange={(event) => setSettings((prev) => ({ ...prev, appearance: { ...prev.appearance, theme: event.target.value as "light" | "dark" } }))}
                                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                            >
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">Accent Color</label>
                            <input
                                type="color"
                                value={settings.appearance.accentColor}
                                onChange={(event) => setSettings((prev) => ({ ...prev, appearance: { ...prev.appearance, accentColor: event.target.value } }))}
                                className="h-10 w-full rounded-xl border border-stone-200"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">UI Density</label>
                            <select
                                value={settings.appearance.density}
                                onChange={(event) =>
                                    setSettings((prev) => ({ ...prev, appearance: { ...prev.appearance, density: event.target.value as "compact" | "comfortable" } }))
                                }
                                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                            >
                                <option value="compact">Compact</option>
                                <option value="comfortable">Comfortable</option>
                            </select>
                        </div>
                    </div>
                </SectionCard>
            );
        }

        return (
            <SectionCard
                title="Section"
                description="Configure this module"
                footer={<button onClick={saveActiveSection} className="rounded-xl bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white">Save</button>}
            >
                <p className="text-sm text-stone-500">Section content available here.</p>
            </SectionCard>
        );
    };

    return (
        <main className="min-h-screen bg-[#FAFAF9] text-[#1C1C1C]">
            <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_1fr]">
                <aside className="border-r border-[#E5E5E5] bg-white px-4 py-6 lg:sticky lg:top-0 lg:h-screen">
                    <div className="mb-6 px-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">EthioCraft Admin</p>
                        <h1 className="font-display text-2xl font-bold">Control Center</h1>
                    </div>

                    <div className="space-y-5 overflow-y-auto pr-1">
                        {navGroups.map((group) => (
                            <div key={group.label}>
                                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">{group.label}</p>
                                <div className="space-y-1">
                                    {group.items.map((item) => (
                                        <button
                                            key={item.key}
                                            onClick={() => setActiveSection(item.key)}
                                            className={cn(
                                                "relative flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition",
                                                activeSection === item.key
                                                    ? "border-l-2 border-[#C6A75E] bg-[#C6A75E]/12 text-[#7A6024]"
                                                    : "text-stone-600 hover:bg-stone-100"
                                            )}
                                        >
                                            <span>{item.label}</span>
                                            {sectionDirtyMap[item.key] ? <span className="h-1.5 w-1.5 rounded-full bg-[#C6A75E]" /> : null}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                <section className="px-4 py-6 sm:px-6 lg:px-8">
                    <header className="sticky top-0 z-20 mb-5 rounded-2xl border border-[#E5E5E5] bg-white/95 p-4 shadow-sm backdrop-blur">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C6A75E]">Settings</p>
                                <h2 className="font-display text-3xl font-bold">Settings</h2>
                                <p className="text-sm text-stone-500">Configure platform behavior, security, and operations.</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={resetActiveSection}
                                    className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm"
                                >
                                    Reset Section
                                </button>
                                <button
                                    onClick={saveAll}
                                    disabled={saving || hydrating}
                                    className="inline-flex items-center gap-2 rounded-xl bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-sm"
                                >
                                    <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save All"}
                                </button>
                            </div>
                        </div>
                    </header>

                    {errorText ? (
                        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorText}</div>
                    ) : null}

                    {hydrating ? (
                        <div className="mb-4 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500">Loading saved settings...</div>
                    ) : null}

                    <div className="space-y-5">{renderSection()}</div>

                    {hasUnsavedChanges ? (
                        <div className="fixed bottom-4 left-1/2 z-30 w-[min(92vw,640px)] -translate-x-1/2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-amber-800">You have unsaved changes in settings.</p>
                                <div className="flex gap-2">
                                    <button onClick={saveActiveSection} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-amber-800">Save section</button>
                                    <button onClick={saveAll} className="rounded-lg bg-[#C6A75E] px-3 py-1.5 text-xs font-semibold text-white">Save all</button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </section>
            </div>

            {showConfirmModal && pendingPermissionChange ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4" onClick={() => setShowConfirmModal(false)}>
                    <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center gap-2 text-rose-600">
                            <AlertTriangle className="h-5 w-5" />
                            <h3 className="font-display text-xl font-bold text-[#1C1C1C]">Confirm Critical Change</h3>
                        </div>
                        <p className="mt-3 text-sm text-stone-600">
                            You are changing a high-impact permission: <span className="font-semibold capitalize">{pendingPermissionChange.action}</span> for role
                            <span className="font-semibold capitalize"> {pendingPermissionChange.role}</span>. This can affect platform integrity.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button onClick={() => setShowConfirmModal(false)} className="rounded-xl border border-stone-200 px-4 py-2 text-sm">Cancel</button>
                            <button onClick={confirmCriticalPermission} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Apply Change</button>
                        </div>
                    </div>
                </div>
            ) : null}

            {toast ? (
                <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#1C1C1C] px-4 py-3 text-white shadow-xl">
                    <p className="text-xs font-semibold uppercase tracking-wider">{toast}</p>
                </div>
            ) : null}
        </main>
    );
}