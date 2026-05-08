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
import ActivityFeed from '@/components/ui/ActivityFeed';
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

type Order = {
  id: string;
  customer: string;
  amount: string;
  status: 'Completed' | 'Processing' | 'Shipped';
  date: string;
};

type NotificationItem = {
  id: string;
  title: string;
  time: string;
  read: boolean;
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

const kpiCards = [
  { title: 'Total Users', value: '12,480', trend: '+12.4%' },
  { title: 'Revenue', value: '$245,900', trend: '+18.1%' },
  { title: 'Orders', value: '1,842', trend: '+6.9%' },
  { title: 'Pending Approvals', value: '27', trend: '-8.0%' },
  { title: 'Active Artisans', value: '403', trend: '+9.7%' },
  { title: 'Conversion Rate', value: '4.2%', trend: '+0.8%' },
];
// KPI cards: sample metrics shown on the dashboard.
// In production these should be backed by real analytics / reporting APIs.

const initialApprovalItems: ApprovalItem[] = [];
// Sample pending approvals used to populate the 'Pending Approvals' panel.
// Replace with a real approval queue fetched from the server; wire approve/reject actions.

const initialNotifications: NotificationItem[] = [
  { id: 'N-1', title: '9 artisan applications waiting for review', time: '5m ago', read: false },
  { id: 'N-2', title: 'Order ORD-4190 was marked shipped', time: '18m ago', read: false },
  { id: 'N-3', title: '1 product report needs moderation', time: '1h ago', read: true },
  { id: 'N-4', title: 'Weekly marketplace snapshot is ready', time: '3h ago', read: true },
];
// Notification sample data. In production, pull notifications from server and support actions.

const quickActions = [
  { title: 'Approve Artisans', subtitle: '9 applications waiting', icon: ShieldCheck },
  { title: 'Review Products', subtitle: '11 listings pending', icon: Package },
  { title: 'Manage Orders', subtitle: '32 in processing', icon: ShoppingCart },
  { title: 'Handle Reports', subtitle: '4 flagged incidents', icon: AlertCircle },
];
// Quick action cards: dashboard shortcuts shown on the main page.
// They are visual shortcuts and currently trigger placeholder handlers.

const usersSnapshot = [
  { name: 'Meklit Abebe', role: 'Artisan' },
  { name: 'Samuel Bekele', role: 'Customer' },
  { name: 'Rahel Tsegaye', role: 'Agent' },
  { name: 'Dawit Kebede', role: 'Artisan' },
];
// Users snapshot: temporary demo data for quick glance. Replace with server data.

const activityFeed = [
  'New artisan registered: Taitu Pottery House',
  'Order #ORD-4124 completed',
  'Product flagged for review: Filigree Ring Set',
  'Verification approved: Hanan Textile Studio',
];

const baseOrders: Order[] = [
  { id: 'ORD-4102', customer: 'Marta T.', amount: '$189.00', status: 'Completed', date: 'Dec 12' },
  { id: 'ORD-4103', customer: 'Helen A.', amount: '$78.00', status: 'Processing', date: 'Dec 12' },
  { id: 'ORD-4104', customer: 'Yonas B.', amount: '$246.00', status: 'Shipped', date: 'Dec 11' },
  { id: 'ORD-4105', customer: 'Ruth S.', amount: '$112.00', status: 'Processing', date: 'Dec 11' },
  { id: 'ORD-4106', customer: 'Nati G.', amount: '$91.00', status: 'Completed', date: 'Dec 10' },
  { id: 'ORD-4107', customer: 'Semhal D.', amount: '$165.00', status: 'Shipped', date: 'Dec 10' },
];

function statusClass(status: any) {
  if (!status) return 'bg-sky-50 text-sky-700';
  const s = String(status).toLowerCase();
  if (/paid|success|complete|deliv|fulfilled/.test(s)) return 'bg-emerald-50 text-emerald-700';
  if (/process|pending|waiting/.test(s)) return 'bg-amber-50 text-amber-700';
  return 'bg-sky-50 text-sky-700';
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
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);

  useEffect(() => {
    const fetchGlobalOrders = async () => {
      try {
        const res = await apiFetch('/orders', {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = await res.json();

        let items: any[] = [];
        if (Array.isArray(json?.data?.items)) items = json.data.items;
        else if (Array.isArray(json)) items = json;
        else if (Array.isArray(json?.items)) items = json.items;
        else if (Array.isArray(json?.data)) items = json.data;
        else if (json && typeof json === 'object') {
          items = Object.values(json).flat().filter(Boolean);
        }
        setGlobalOrders(items);
      } catch (err) {
        console.error('Failed to fetch global orders', err);
      } finally {
        setOrdersLoading(false);
      }
    };
    fetchGlobalOrders();

    const fetchGlobalUsers = async () => {
      try {
        const res = await apiFetch('/admin/users', {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = await res.json();

        let items: any[] = [];
        if (json.data && Array.isArray(json.data.items)) items = json.data.items;
        else if (Array.isArray(json)) items = json;
        else if (json.data && Array.isArray(json.data)) items = json.data;
        else if (json.users && Array.isArray(json.users)) items = json.users;

        setGlobalUsers(items);
      } catch (err) {
        console.error('Failed to fetch global users', err);
      } finally {
        setUsersLoading(false);
      }
    };
    fetchGlobalUsers();

    const fetchPendingSamples = async () => {
      try {
        const res = await apiFetch('/admin/samples/pending?limit=5', {
          headers: { 'Content-Type': 'application/json' },
        });
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
            type: 'Verification',
            name: s.title,
            date: dateStr,
            priority: diffInHours > 48 ? 'high' : 'medium',
          };
        });
        setApprovalItems(mapped);
      } catch (err) {
        console.error('Failed to fetch pending samples', err);
      }
    };
    fetchPendingSamples();
  }, []);

  const rowHeight = 56;
  const containerHeight = 336;

  const unreadNotifications = notifications.filter((item) => !item.read).length;

  const quickActionCommands = [
    { label: 'Add Product', note: 'Create a placeholder listing draft' },
    { label: 'Verify Artisan', note: 'Open artisan verification queue' },
    { label: 'Export Orders', note: 'Prepare a CSV export job' },
  ];
  // Quick action commands: these drive the '+ Quick Actions' popover.
  // Currently they are UI stubs that show an ephemeral feedback message.
  // Replace handlers in `runQuickAction` with real API-driven behavior.

  const searchResults = useMemo(() => {
    const source = [
      ...navigation.map((item) => ({ type: 'Section', name: item.label })),
      ...globalOrders.slice(0, 8).map((order) => ({ type: 'Order', name: order.id })),
      ...usersSnapshot.map((user) => ({ type: 'User', name: user.name })),
    ];

    if (!searchQuery.trim()) return [];
    const needle = searchQuery.toLowerCase();
    return source.filter((entry) => entry.name.toLowerCase().includes(needle)).slice(0, 6);
  }, [searchQuery]);

  const showFeedback = (message: string) => {
    setFeedbackMessage(message);
    window.setTimeout(() => setFeedbackMessage(''), 2100);
  };
  const handleLogout = () => {
    // Use centralized logout to ensure server-side session cleared and redirect happens
    try {
      logout()
    } catch (err) {
      // Fallback: clear known keys and navigate
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('authToken');
      localStorage.removeItem('authRole');
      router.push('/auth/login');
    }
  };

  const handleProfileMenuClick = (entry: string) => {
    setProfileMenuOpen(false);
    if (entry === 'Sign out') {
      handleLogout();
    } else {
      showFeedback(`Placeholder action: ${entry}`);
    }
  };
  const handleApprovalAction = (id: string, action: 'approve' | 'reject') => {
    // Navigate to detail page instead of local state update for samples
    router.push(`/admin/sample/${id}`);
  };

  const runQuickAction = (label: string) => {
    // NOTE: quick actions currently perform local navigation / feedback only.
    // Replace with backend calls to perform real admin tasks (create product draft,
    // enqueue verification, start export jobs, etc.) and show progress status.
    if (label === 'Verify Artisan') {
      setActiveNav('Approvals');
    }
    if (label === 'Add Product') {
      setActiveNav('Products');
    }
    setQuickActionsOpen(false);
    showFeedback(`Placeholder action executed: ${label}`);
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
                    <div className="h-full w-full bg-gradient-to-br from-[#d6c6b3] to-[#b0a497] flex items-center justify-center text-white font-bold">A</div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
                </div>
                <div className="hidden text-left md:block">
                  <p className="text-xs font-black uppercase tracking-wider text-[#3E2723]">Admin</p>
                  <p className="text-[10px] font-bold text-[#83786f]">System Ops</p>
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
                      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
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
                        setNotifications((current) =>
                          current.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)),
                        );
                        showFeedback(`Opened notification: ${item.title}`);
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
              setActiveNav={setActiveNav}
              showFeedback={showFeedback}
              sectionDescriptions={sectionDescriptions}
              placeholderRows={placeholderRows}
              kpiCards={kpiCards}
              quickActions={quickActions}
              usersSnapshot={usersSnapshot}
              activityFeed={activityFeed}
              approvalItems={approvalItems}
              handleApprovalAction={handleApprovalAction}
              rowHeight={rowHeight}
              containerHeight={containerHeight}
              orders={globalOrders}
              ordersLoading={ordersLoading}
              users={globalUsers}
              usersLoading={usersLoading}
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
