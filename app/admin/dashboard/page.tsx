"use client"
import { lazy, Suspense, useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BarChart3,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  GanttChartSquare,
  Home,
  Menu,
  Package,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  UserCog,
  Users,
  X,
  Box,
  ClipboardCheck,
  UserCheck,
} from 'lucide-react';

const AdminCharts = lazy(() => import('@/components/AdminCharts'));
import ActivNavs from '@/components/ui/activnavs';
import ApprovalsPanel from '@/components/ui/ApprovalsPanel';
import RecentOrders from '@/components/ui/RecentOrders';
import UsersSnapshot from '@/components/ui/UsersSnapshot';
import PlatformHealth from '@/components/ui/PlatformHealth';
import DashboardSection from '@/components/ui/navSections/DashboardSection';
import UsersSection from '@/components/ui/navSections/UsersSection';
import ArtisansSection from '@/components/ui/navSections/ArtisansSection';
import ProductsSection from '@/components/ui/navSections/ProductsSection';
import OrdersSection from '@/components/ui/navSections/OrdersSection';
import ApprovalsSection from '@/components/ui/navSections/ApprovalsSection';
import GenericSection from '@/components/ui/navSections/GenericSection';
import SamplesSection from '@/components/ui/navSections/SamplesSection';
import AgentsSection from '@/components/ui/navSections/AgentsSection';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useNotifications } from '@/hooks/useNotifications';
/* Admin Dashboard Overview
 - This component composes the main admin interface and several panels.
 - Mapping of admin responsibilities to UI areas in this file:
   • Manage Users and Roles: sidebar 'Users' and 'Users Snapshot' panel.
   • Review Samples / Approvals: 'Approvals' sidebar + 'Pending Approvals' panel.
   • Create Draft from Sample, Review Drafts, Publish Product: 'Products' section + approvals workflow.
   • Assign/Monitor Verification Agents: 'Work Queue' + approval actions (placeholders).
   • Order Oversight: 'Orders' section and 'Recent Orders' panel.
   • Reports / Analytics / System Health: 'Analytics' and 'Platform Health' panels.
 - Notes: many buttons and quick actions are currently placeholders and should be wired
   to real API endpoints (see TODO comments where present).
*/

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type ApprovalItem = {
  id: string;
  type: 'Artisan' | 'Product' | 'Verification';
  name: string;
  date: string;
  priority: 'high' | 'medium';
};

type NotificationItem = {
  id: string;
  title: string;
  time: string;
  read: boolean;
  notificationId: string;
};

const navigation: NavItem[] = [
  { label: 'Dashboard', icon: Home },
  { label: 'Users', icon: Users },
  { label: 'Artisans', icon: UserCog },
  { label: 'Samples', icon: Box },
  { label: 'Products', icon: Package },
  { label: 'Orders', icon: ShoppingCart },
  { label: 'Verification Tasks', icon: ClipboardCheck },
  { label: 'Agents', icon: UserCheck },
  { label: 'Approvals', icon: ShieldCheck },
  { label: 'Analytics', icon: BarChart3 },
  { label: 'Reports', icon: FileText },
  { label: 'Settings', icon: Settings },
];

const initialApprovalItems: ApprovalItem[] = [];
// Replace with a real approval queue fetched from the server; wire approve/reject actions.

type AdminProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

function roleLabel(role: string) {
  const m: Record<string, string> = {
    CUSTOMER: 'Customer',
    ARTISAN: 'Artisan',
    ADMIN: 'Admin',
    VERIFICATION_AGENT: 'Agent',
  };
  return m[role] || role || '—';
}

function sumRows(rows: { count?: number }[]) {
  return rows.reduce((s, r) => s + (Number(r.count) || 0), 0);
}

function rowByKey(rows: { key: string; count?: number }[], key: string) {
  return rows.find((r) => r.key === key)?.count ?? 0;
}

function draftPipelineTotal(drafts: { key: string; count?: number }[]) {
  const keys = new Set(['ADMIN_CREATED', 'AGENT_IN_PROGRESS', 'AGENT_VERIFIED', 'ADMIN_REVIEW']);
  return drafts.filter((d) => keys.has(d.key)).reduce((s, d) => s + (Number(d.count) || 0), 0);
}

function ordersFulfillmentInFlight(orders: { key: string; count?: number }[]) {
  const keys = new Set(['PAID', 'PROCESSING', 'SHIPPED']);
  return orders.filter((d) => keys.has(d.key)).reduce((s, d) => s + (Number(d.count) || 0), 0);
}

function pct(part: number, whole: number) {
  if (!whole) return 0;
  return Math.min(100, Math.round((part / whole) * 100));
}

function pctChangeLabel(cur: number, prev: number) {
  if (prev === 0) return cur === 0 ? 'Flat vs prior window' : 'No prior window baseline';
  const ch = ((cur - prev) / prev) * 100;
  const sign = ch >= 0 ? '+' : '';
  return `${sign}${ch.toFixed(1)}% vs prior window`;
}

function getDashboardRange(label: string): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to);
  if (label === 'Last 30 days') {
    from.setDate(to.getDate() - 30);
  } else if (label === 'Last 90 days') {
    from.setDate(to.getDate() - 90);
  } else if (label === 'This year') {
    from.setMonth(0, 1);
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(to.getDate() - 30);
  }
  return { from, to };
}

function previousRange(from: Date, to: Date): { from: Date; to: Date } {
  const ms = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime());
  const prevFrom = new Date(from.getTime() - ms);
  return { from: prevFrom, to: prevTo };
}

function getApiBase() {
  return (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1';
}

function getAuthHeaders() {
  return { 'Content-Type': 'application/json' };
}

function timeAgo(iso: string) {
  const now = new Date();
  const date = new Date(iso);
  const diffMinutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / (1000 * 60)));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function App() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('Dashboard');
  const { logout } = useAuth();

  const handleNavChange = useCallback((nav: string) => {
    if (nav === 'Analytics') {
      router.push('/admin/analytics');
    } else if (nav === 'Reports') {
      router.push('/admin/report');
    } else if (nav === 'Settings') {
      router.push('/admin/setting');
    } else if (nav === 'Verification Tasks') {
      router.push('/admin/verification_task');
    } else {
      setActiveNav(nav);
    }
  }, [router]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRange, setSelectedRange] = useState('Last 30 days');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Centralized Data States
  const [globalOrders, setGlobalOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [globalUsers, setGlobalUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [approvalItems, setApprovalItems] = useState<ApprovalItem[]>(initialApprovalItems);
  const { notifications: rawNotifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const notifications = useMemo(() => {
    return rawNotifications.slice(0, 12).map((n: any) => ({
      id: String(n.id),
      notificationId: String(n.id),
      title: n.title || n.message || 'Notification',
      time: n.createdAt ? timeAgo(n.createdAt) : 'Just now',
      read: Boolean(n.isRead),
    }));
  }, [rawNotifications]);

  const [overview, setOverview] = useState<Record<string, any> | null>(null);
  const [overviewPrev, setOverviewPrev] = useState<Record<string, any> | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [activityItems, setActivityItems] = useState<{ id: string; text: string }[]>([]);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    const base = getApiBase();
    const headers = getAuthHeaders();

    const fetchAdminOrders = async () => {
      try {
        const res = await fetch(`${base}/admin/orders?page=1&limit=40`, { headers });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = await res.json();
        const items = Array.isArray(json?.data?.items) ? json.data.items : [];
        setGlobalOrders(items);
      } catch (err) {
        console.error('Failed to fetch admin orders', err);
      } finally {
        setOrdersLoading(false);
      }
    };

    const fetchGlobalUsers = async () => {
      try {
        const res = await fetch(`${base}/admin/users?page=1&limit=50`, { headers });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = await res.json();
        const items = json?.data?.items && Array.isArray(json.data.items) ? json.data.items : [];
        setGlobalUsers(items);
      } catch (err) {
        console.error('Failed to fetch global users', err);
      } finally {
        setUsersLoading(false);
      }
    };

    const fetchPendingSamples = async () => {
      try {
        const res = await fetch(`${base}/admin/samples/pending?limit=5`, { headers });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = await res.json();
        const samples = json.data?.items || [];
        const mapped: ApprovalItem[] = samples.map((s: any) => {
          const createdAt = new Date(s.createdAt);
          const now = new Date();
          const diffInHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
          let dateStr = 'Just now';
          if (diffInHours > 0 && diffInHours < 24) dateStr = `${diffInHours}h ago`;
          else if (diffInHours >= 24) dateStr = `${Math.floor(diffInHours / 24)}d ago`;
          else if (diffInHours === 0) {
            const diffInMins = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
            if (diffInMins > 0) dateStr = `${diffInMins}m ago`;
          }
          return {
            id: s.id,
            type: 'Verification' as const,
            name: s.title,
            date: dateStr,
            priority: diffInHours > 48 ? ('high' as const) : ('medium' as const),
          };
        });
        setApprovalItems(mapped);
      } catch (err) {
        console.error('Failed to fetch pending samples', err);
      }
    };

    const fetchProfile = async () => {
      try {
        const res = await fetch(`${base}/users/me`, { headers });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = await res.json();
        setAdminProfile(json?.data || null);
      } catch (err) {
        console.error('Failed to fetch admin profile', err);
      }
    };

    fetchAdminOrders();
    fetchGlobalUsers();
    fetchPendingSamples();
    fetchProfile();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const base = getApiBase();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    (async () => {
      setOverviewLoading(true);
      try {
        const { from, to } = getDashboardRange(selectedRange);
        const { from: pf, to: pt } = previousRange(from, to);
        const params = new URLSearchParams({ dateFrom: from.toISOString(), dateTo: to.toISOString() });
        const prevParams = new URLSearchParams({ dateFrom: pf.toISOString(), dateTo: pt.toISOString() });

        const [ovRes, ovPrevRes, auditRes] = await Promise.all([
          fetch(`${base}/admin/dashboard/overview?${params}`, { headers }),
          fetch(`${base}/admin/dashboard/overview?${prevParams}`, { headers }),
          fetch(`${base}/admin/audit-logs?page=1&limit=10`, { headers }),
        ]);

        if (cancelled) return;

        if (ovRes.ok) {
          const j = await ovRes.json();
          setOverview(j.data ?? null);
        } else setOverview(null);

        if (ovPrevRes.ok) {
          const j = await ovPrevRes.json();
          setOverviewPrev(j.data ?? null);
        } else setOverviewPrev(null);

        if (auditRes.ok) {
          const j = await auditRes.json();
          const items = j.data?.items || [];
          setActivityItems(
            items.map((a: any) => ({
              id: String(a.id),
              text: `${a.description}${a.actor ? ` · ${[a.actor.firstName, a.actor.lastName].filter(Boolean).join(' ')}`.trim() : ''} · ${new Date(a.createdAt).toLocaleString()}`,
            })),
          );
        } else setActivityItems([]);
      } catch (e) {
        console.error('Dashboard overview fetch failed', e);
        if (!cancelled) {
          setOverview(null);
          setOverviewPrev(null);
        }
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedRange]);

  const rowHeight = 56;
  const containerHeight = 336;

  const unreadNotifications = unreadCount;

  const usersSnapshotComputed = useMemo(
    () =>
      globalUsers.slice(0, 4).map((u: any) => ({
        id: u.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'User',
        role: roleLabel(u.role),
      })),
    [globalUsers],
  );

  const kpiCards = useMemo(() => {
    const loadingCard = (title: string) => ({ title, value: '—', subtitle: overviewLoading ? 'Loading…' : 'No data' });
    if (!overview || overviewLoading) {
      return [
        loadingCard('Total Users'),
        loadingCard('Revenue (ETB)'),
        loadingCard('Orders (period)'),
        loadingCard('Pending pipeline'),
        loadingCard('Active Artisans'),
        loadingCard('Paid / orders'),
      ];
    }
    const c = overview.counts || {};
    const rev = Number(overview.revenue?.amount || 0);
    const revPrev = Number(overviewPrev?.revenue?.amount ?? 0);
    const ordersRows = overview.orders || [];
    const ordersPrevRows = overviewPrev?.orders || [];
    const ordersTotal = sumRows(ordersRows);
    const ordersPrevTotal = sumRows(ordersPrevRows);
    const payments = Number(overview.revenue?.successfulPayments || 0);
    const paymentsPrev = Number(overviewPrev?.revenue?.successfulPayments ?? 0);
    const pendingDrafts = draftPipelineTotal(overview.drafts || []);
    const pendingApprovals = Number(c.pendingSamples || 0) + pendingDrafts;
    const conversion = ordersTotal > 0 ? (payments / ordersTotal) * 100 : 0;
    const conversionPrev = ordersPrevTotal > 0 ? (paymentsPrev / ordersPrevTotal) * 100 : 0;

    return [
      { title: 'Total Users', value: Number(c.totalUsers || 0).toLocaleString(), subtitle: 'All roles · live count' },
      {
        title: 'Revenue (ETB)',
        value: `ETB ${rev.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        subtitle: pctChangeLabel(rev, revPrev),
      },
      {
        title: 'Orders (period)',
        value: ordersTotal.toLocaleString(),
        subtitle: pctChangeLabel(ordersTotal, ordersPrevTotal),
      },
      {
        title: 'Pending pipeline',
        value: pendingApprovals.toLocaleString(),
        subtitle: 'Submitted samples + drafts in workflow',
      },
      {
        title: 'Active Artisans',
        value: Number(c.activeArtisans || 0).toLocaleString(),
        subtitle: 'Accounts ACTIVE with ARTISAN role',
      },
      {
        title: 'Paid / orders',
        value: `${conversion.toFixed(1)}%`,
        subtitle: pctChangeLabel(conversion, conversionPrev),
      },
    ];
  }, [overview, overviewPrev, overviewLoading]);

  const quickActionsDashboard = useMemo(() => {
    if (!overview) {
      return [
        { title: 'Review samples', subtitle: 'Open approvals', icon: ShieldCheck, navigate: 'Approvals' },
        { title: 'Review products', subtitle: 'Draft pipeline', icon: Package, navigate: 'Products' },
        { title: 'Manage orders', subtitle: 'Fulfillment', icon: ShoppingCart, navigate: 'Orders' },
        { title: 'Reports', subtitle: 'Exports & presets', icon: AlertCircle, navigate: 'Reports' },
      ];
    }
    const c = overview.counts || {};
    const drafts = draftPipelineTotal(overview.drafts || []);
    const inFlight = ordersFulfillmentInFlight(overview.orders || []);
    const jobs = overview.aiUsage?.reportJobs ?? 0;
    return [
      {
        title: 'Review samples',
        subtitle: `${c.pendingSamples ?? 0} submitted sample(s)`,
        icon: ShieldCheck,
        navigate: 'Approvals',
      },
      { title: 'Review products', subtitle: `${drafts} draft(s) in pipeline`, icon: Package, navigate: 'Products' },
      {
        title: 'Manage orders',
        subtitle: `${inFlight} order(s) paid → shipped`,
        icon: ShoppingCart,
        navigate: 'Orders',
      },
      {
        title: 'Reports',
        subtitle: `${jobs} AI report job(s) in selected range`,
        icon: AlertCircle,
        navigate: 'Reports',
      },
    ];
  }, [overview]);

  const platformHealthMetrics = useMemo(() => {
    if (!overview) return [];
    const products = overview.products || [];
    const totalP = sumRows(products);
    const published = rowByKey(products, 'PUBLISHED');
    const ordersRows = overview.orders || [];
    const delivered = rowByKey(ordersRows, 'DELIVERED');
    const nonCancelled = sumRows(ordersRows.filter((o: { key: string }) => o.key !== 'CANCELLED'));
    const usersByRole = overview.users || [];
    const artisans = rowByKey(usersByRole, 'ARTISAN');
    const tu = Number(overview.counts?.totalUsers || 1);

    return [
      {
        label: 'Catalog published',
        value: pct(published, totalP),
        hint: `${published} / ${totalP || 0} products`,
      },
      {
        label: 'Delivered (period)',
        value: pct(delivered, nonCancelled),
        hint: `${delivered} of ${nonCancelled} orders`,
      },
      {
        label: 'Artisan share of users',
        value: pct(artisans, tu),
        hint: `${artisans} artisans`,
      },
    ];
  }, [overview]);

  const quickActionCommands = [
    { label: 'Add Product', note: 'Open product management workspace' },
    { label: 'Verify Artisan', note: 'Review pending verification samples' },
    { label: 'Export Orders', note: 'Open report center with order filters' },
  ];

  const searchResults = useMemo(() => {
    const source = [
      ...navigation.map((item) => ({ type: 'Section', name: item.label })),
      ...globalOrders.slice(0, 8).map((order) => ({ type: 'Order', name: order.id })),
      ...usersSnapshotComputed.map((user) => ({ type: 'User', name: user.name })),
    ];

    if (!searchQuery.trim()) return [];
    const needle = searchQuery.toLowerCase();
    return source.filter((entry) => entry.name.toLowerCase().includes(needle)).slice(0, 6);
  }, [searchQuery, globalOrders, usersSnapshotComputed]);

  const showFeedback = (message: string) => {
    setFeedbackMessage(message);
    window.setTimeout(() => setFeedbackMessage(''), 2100);
  };
  const handleLogout = () => {
    // Use centralized logout to ensure server-side session cleared and redirect happens
    try {
      logout()
    } catch (err) {
      // Fallback: navigate
      router.push('/auth/login');
    }
  };

  const handleProfileMenuClick = (entry: string) => {
    setProfileMenuOpen(false);
    if (entry === 'Sign out') {
      handleLogout();
      return;
    }

    if (entry === 'Profile') {
      if (adminProfile?.id) router.push(`/admin/users/${adminProfile.id}`);
      return;
    }

    if (entry === 'Preferences') {
      router.push('/admin/setting');
    }
  };
  const handleApprovalAction = (id: string, action: 'approve' | 'reject') => {
    // Navigate to detail page instead of local state update for samples
    router.push(`/admin/sample/${id}`);
  };

  const runQuickAction = (label: string) => {
    if (label === 'Verify Artisan') {
      handleNavChange('Approvals');
      showFeedback('Opened approvals queue');
    }
    if (label === 'Add Product') {
      handleNavChange('Products');
      showFeedback('Opened products workspace');
    }
    if (label === 'Export Orders') {
      router.push('/admin/report');
      showFeedback('Opened report center');
    }
    setQuickActionsOpen(false);
  };

  const sectionDescriptions: Record<string, string> = {
    Users: 'Manage customer and agent accounts, activity, and access.',
    Artisans: 'Review artisan profiles, onboarding progress, and verification.',
    Samples: 'Manage and review product samples submitted by artisans.',
    Products: 'Oversee listings, quality checks, and marketplace assortment.',
    Orders: 'Track fulfillment performance and delivery pipeline.',
    'Verification Tasks': 'Monitor and assign physical verification tasks to agents.',
    Agents: 'Manage field agents and their active assignments.',
    Approvals: 'Process pending artisan, product, and verification requests.',
    Analytics: 'Inspect growth, conversion, and category performance.',
    Reports: 'Resolve reports, moderation flags, and policy incidents.',
    Settings: 'Configure platform rules, permissions, and integrations.',
  };

  const placeholderRows = Array.from({ length: 6 }, (_, index) => ({
    id: `${activeNav.slice(0, 3).toUpperCase()}-${100 + index}`,
    name: `${activeNav} record ${index + 1}`,
    owner: ['Meklit A.', 'Dawit K.', 'Rahel T.', 'Marta S.'][index % 4],
    status: ['Active', 'Pending', 'In Review'][index % 3],
    updated: ['2h ago', 'Today', 'Yesterday'][index % 3],
  }));
  // Placeholder rows for the Work Queue table. Replace with API-driven queue:
  // - filter by status/agent/region
  // - support assignment and escalation actions

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1C1C1C]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Premium background mesh gradient */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.4]" 
           style={{ background: 'radial-gradient(circle at 50% 50%, #fdfbf7 0%, #FAFAF9 100%)' }} />

      <aside
        className={`fixed inset-y-0 left-0 z-40 border-r border-[#e8e0d2]/60 bg-gradient-to-b from-[#fdfbf7] to-[#f5f0e6] px-4 py-6 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          collapsed ? 'lg:w-20' : 'lg:w-72'
        } w-72 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} shadow-2xl lg:shadow-none`}
      >
        <div className="flex items-center justify-between px-2 mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-[#3E2723] text-[#FAFAF9] rounded-xl shadow-lg shadow-[#3E2723]/20 font-black">
              E
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#3E2723]" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                  EthioCraft
                </p>
                <p className="text-[10px] uppercase tracking-[0.1em] text-[#C6A75E] font-bold">Admin Console</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className="group flex h-8 w-8 items-center justify-center rounded-full border border-[#e8e0d2] bg-white text-[#74685f] transition-all hover:bg-[#3E2723] hover:text-white"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <ActivNavs
          navigation={navigation}
          activeNav={activeNav}
          setActiveNav={handleNavChange}
          collapsed={collapsed}
          setMobileSidebarOpen={setMobileSidebarOpen}
        />
      </aside>

      {mobileSidebarOpen && (
        <button
          className="fixed inset-0 z-30 bg-[#1c1c1c]/20 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close menu overlay"
        />
      )}

      <div className={`transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${collapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
        <header className="sticky top-0 z-30 border-b border-[#ece3d5]/40 bg-white/70 backdrop-blur-xl transition-all duration-300">
          <div className="relative flex items-center gap-6 px-6 py-4 lg:px-10">
            <button
              className="group rounded-xl border border-[#e4dacb] p-2.5 text-[#6d645e] transition-all hover:bg-[#3E2723] hover:text-white lg:hidden"
              aria-label="Open menu"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="flex flex-1 items-center gap-4 group">
              <div className="flex flex-1 items-center gap-3 rounded-2xl border border-[#e4dacb]/60 bg-[#fdfbf7]/50 px-4 py-2.5 transition-all duration-300 focus-within:border-[#C6A75E] focus-within:bg-white focus-within:shadow-xl focus-within:shadow-[#C6A75E]/5">
                <Search className="h-4 w-4 text-[#9b8f83] transition-colors group-focus-within:text-[#C6A75E]" />
                <input
                  placeholder="Search dashboard..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[#b0a497] font-medium"
                  value={searchQuery}
                  onFocus={() => {
                    setNotificationsOpen(false);
                    setQuickActionsOpen(false);
                  }}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 md:gap-5">
              <button
                className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e4dacb]/60 bg-white text-[#5f5750] transition-all hover:bg-[#f3ede2] hover:shadow-lg"
                onClick={() => {
                  setNotificationsOpen((prev) => !prev);
                  setQuickActionsOpen(false);
                  setProfileMenuOpen(false);
                }}
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C6A75E] border-2 border-white px-1 text-[10px] font-black text-white shadow-sm">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              <button
                className="hidden items-center gap-2 rounded-2xl bg-[#3E2723] px-5 py-2.5 text-xs font-black uppercase tracking-widest text-[#FAFAF9] transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#3E2723]/20 active:translate-y-0 md:inline-flex"
                style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}
                onClick={() => {
                  setQuickActionsOpen((prev) => !prev);
                  setNotificationsOpen(false);
                  setProfileMenuOpen(false);
                }}
              >
                <X className={`h-3.5 w-3.5 transition-transform duration-300 ${quickActionsOpen ? 'rotate-0' : 'rotate-45'}`} />
                Actions
              </button>

              <div className="h-8 w-px bg-[#ece3d5]/60 hidden md:block" />

              <button
                className="group flex items-center gap-3 rounded-2xl p-1 pr-3 transition-all hover:bg-[#fdfbf7]"
                onClick={() => {
                  setProfileMenuOpen((prev) => !prev);
                  setNotificationsOpen(false);
                  setQuickActionsOpen(false);
                }}
              >
                <div className="relative">
                  <div className="h-10 w-10 overflow-hidden rounded-2xl border-2 border-[#e8dece] bg-[#d6c6b3] transition-all group-hover:border-[#C6A75E] shadow-sm">
                    <div className="h-full w-full bg-gradient-to-br from-[#d6c6b3] to-[#b0a497] flex items-center justify-center text-white font-bold">
                      {`${adminProfile?.firstName?.[0] || ''}${adminProfile?.lastName?.[0] || ''}`.trim() || 'A'}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
                </div>
                <div className="hidden text-left md:block">
                  <p className="text-xs font-black uppercase tracking-wider text-[#3E2723]">
                    {`${adminProfile?.firstName || ''} ${adminProfile?.lastName || ''}`.trim() || 'Admin'}
                  </p>
                  <p className="text-[10px] font-bold text-[#83786f]">{roleLabel(adminProfile?.role || 'ADMIN')}</p>
                </div>
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="absolute left-6 right-6 top-[calc(100%-2px)] z-40 rounded-2xl border border-[#e8dece] bg-white p-2 shadow-[0_12px_30px_rgba(62,39,35,0.08)] lg:left-8 lg:right-[390px]">
                {searchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.name}`}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[#f8f2e7]"
                    onClick={() => {
                      if (result.type === 'Section') {
                        handleNavChange(result.name);
                      }
                      setSearchQuery('');
                      showFeedback(`Opened ${result.type}: ${result.name}`);
                    }}
                  >
                    <span>{result.name}</span>
                    <span className="text-xs text-[#8b7f73]">{result.type}</span>
                  </button>
                ))}
              </div>
            )}

            {notificationsOpen && (
              <div className="absolute right-8 top-[calc(100%+8px)] z-40 w-[340px] rounded-2xl border border-[#e8dece] bg-white p-3 shadow-[0_12px_30px_rgba(62,39,35,0.08)]">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-sm font-medium">Notifications</p>
                  <button
                    className="text-xs text-[#7d7268] underline underline-offset-2"
                    onClick={() => {
                      markAllAsRead();
                      showFeedback('All notifications marked as read');
                    }}
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-72 space-y-1 overflow-y-auto">
                  {notifications.map((item) => (
                    <button
                      key={item.id}
                      className="w-full rounded-xl px-3 py-2 text-left transition hover:bg-[#f8f2e7]"
                      onClick={() => {
                        if (!item.read) markAsRead(item.notificationId);
                        showFeedback(item.title);
                      }}
                    >
                      <p className={`text-sm ${item.read ? 'text-[#73685f]' : 'font-medium text-[#302521]'}`}>{item.title}</p>
                      <p className="mt-1 text-xs text-[#8a7f73]">{item.time}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {quickActionsOpen && (
              <div className="absolute right-36 top-[calc(100%+8px)] z-40 w-[300px] rounded-2xl border border-[#e8dece] bg-white p-3 shadow-[0_12px_30px_rgba(62,39,35,0.08)]">
                <p className="mb-2 px-1 text-sm font-medium">Quick Actions</p>
                <div className="space-y-1">
                  {quickActionCommands.map((action) => (
                    <button
                      key={action.label}
                      className="w-full rounded-xl px-3 py-2 text-left transition hover:bg-[#f8f2e7]"
                      onClick={() => runQuickAction(action.label)}
                    >
                      <p className="text-sm font-medium">{action.label}</p>
                      <p className="text-xs text-[#84776d]">{action.note}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {profileMenuOpen && (
              <div className="absolute right-8 top-[calc(100%+8px)] z-40 w-52 rounded-2xl border border-[#e8dece] bg-white p-2 shadow-[0_12px_30px_rgba(62,39,35,0.08)]">
                {['Profile', 'Preferences', 'Sign out'].map((entry) => (
                  <button
                    key={entry}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[#f8f2e7]"
                    onClick={() => handleProfileMenuClick(entry)}
                  >
                    {entry}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {(() => {
          const SectionMap: Record<string, any> = {
            Dashboard: DashboardSection,
            Users: UsersSection,
            Artisans: ArtisansSection,
            Samples: SamplesSection,
            Products: ProductsSection,
            Orders: OrdersSection,
            Agents: AgentsSection,
            Approvals: ApprovalsSection,
          };
          const ActiveSection = SectionMap[activeNav] ?? GenericSection;
          return (
            <ActiveSection
              activeNav={activeNav}
              setActiveNav={handleNavChange}
              showFeedback={showFeedback}
              sectionDescriptions={sectionDescriptions}
              placeholderRows={placeholderRows}
              kpiCards={kpiCards}
              quickActions={quickActionsDashboard}
              usersSnapshot={usersSnapshotComputed}
              activityItems={activityItems}
              platformHealthMetrics={platformHealthMetrics}
              selectedRange={selectedRange}
              onSelectedRangeChange={setSelectedRange}
              overviewLoading={overviewLoading}
              approvalItems={approvalItems}
              handleApprovalAction={handleApprovalAction}
              rowHeight={rowHeight}
              containerHeight={containerHeight}
              orders={globalOrders}
              ordersLoading={ordersLoading}
              users={globalUsers}
              usersLoading={usersLoading}
              baseUrl={getApiBase()}
              bearerToken=""
            />
          );
        })()}
      </div>

      {feedbackMessage && (
        <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3 rounded-2xl border border-[#3E2723]/10 bg-white px-6 py-4 text-sm font-bold text-[#3E2723] shadow-[0_20px_50px_rgba(62,39,35,0.15)] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check className="h-3.5 w-3.5" />
          </div>
          {feedbackMessage}
        </div>
      )}
    </div>
  );
}
