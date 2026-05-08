"use client"
import { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Download,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { apiFetch } from '@/lib/api';

/** Utility for tailwind classes */
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type OverviewResponse = {
  users: { key: string; count: number }[];
  orders: { key: string; count: number }[];
};

type RevenueResponse = {
  totals: { successfulPayments: number; amount: number };
  byDay: { day: string; amount: number }[];
};

type TopArtisanResponse = {
  items: {
    artisanId: string;
    artisan: {
      firstName: string;
      lastName: string;
      artisanProfile?: { shopName?: string | null };
    } | null;
    revenue: number;
    orderItems: number;
  }[];
};

// --- COMPONENTS ---



const KpiCard = ({ label, value, trend, isUp, data }: {
  label: string;
  value: string;
  trend: string;
  isUp: boolean;
  data: { value: number }[];
}) => (
  <div className="bg-white border border-[#E5E5E5] p-6 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
    <div className="flex justify-between items-start mb-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#737373]">{label}</p>
      <div className={cn('flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full', isUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-rose-600')}>
        {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {trend}
      </div>
    </div>
    <div className="flex items-end justify-between">
      <h3 className="text-2xl font-bold text-[#1C1C1C] tracking-tight">{value}</h3>
      <div className="h-10 w-24 opacity-40 group-hover:opacity-100 transition-opacity">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line type="monotone" dataKey="value" stroke={isUp ? '#10b981' : '#f43f5e'} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

const App = () => {
  const [activeDate, setActiveDate] = useState('Last 30 days');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [revenue, setRevenue] = useState<RevenueResponse | null>(null);
  const [topArtisans, setTopArtisans] = useState<TopArtisanResponse['items']>([]);

  const roleColor: Record<string, string> = {
    CUSTOMER: '#1C1C1C',
    ARTISAN: '#C6A75E',
    VERIFICATION_AGENT: '#525252',
    ADMIN: '#A3A3A3',
  };

  const getRange = () => {
    const now = new Date();
    const from = new Date(now);
    if (activeDate === 'Last 7 days') from.setDate(now.getDate() - 7);
    else from.setDate(now.getDate() - 30);
    return { dateFrom: from.toISOString(), dateTo: now.toISOString() };
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams(getRange());
        const topParams = new URLSearchParams({ ...getRange(), limit: '5' });

        const [overviewRes, revenueRes, topRes] = await Promise.all([
          apiFetch(`/admin/dashboard/overview?${params.toString()}`),
          apiFetch(`/admin/dashboard/revenue?${params.toString()}`),
          apiFetch(`/admin/dashboard/artisans/top?${topParams.toString()}`),
        ]);
        if (!overviewRes.ok || !revenueRes.ok || !topRes.ok) throw new Error('Failed to fetch analytics data');

        const [overviewJson, revenueJson, topJson] = await Promise.all([overviewRes.json(), revenueRes.json(), topRes.json()]);
        setOverview(overviewJson.data);
        setRevenue(revenueJson.data);
        setTopArtisans(topJson.data?.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [activeDate]);

  const chartByDay = useMemo(() => (revenue?.byDay || []).map((d) => ({
    name: new Date(d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    revenue: Number(d.amount || 0),
    value: Number(d.amount || 0),
  })), [revenue]);

  const roleData = useMemo(() => (overview?.users || []).map((u) => {
    const key = String(u?.key ?? '');
    return {
      name: key.replace(/_/g, ' '),
      value: u.count,
      color: roleColor[key] || '#A3A3A3',
    };
  }), [overview]);

  const totalUsers = roleData.reduce((sum, r) => sum + r.value, 0);
  const totalOrders = (overview?.orders || []).reduce((sum, o) => sum + o.count, 0);
  const totalRevenue = revenue?.totals?.amount || 0;
  const conversion = totalOrders > 0 ? ((revenue?.totals?.successfulPayments || 0) / totalOrders) * 100 : 0;
  const avgOrderValue = (revenue?.totals?.successfulPayments || 0) > 0
    ? totalRevenue / (revenue?.totals?.successfulPayments || 1)
    : 0;

  const insights = [
    `Revenue in selected range: ${totalRevenue.toLocaleString()} ETB`,
    `Total orders across statuses: ${totalOrders.toLocaleString()}`,
    `Top artisan revenue leader: ${topArtisans[0]?.revenue?.toLocaleString?.() || 0} ETB`,
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1C1C1C] font-sans selection:bg-[#C6A75E] selection:text-white">
      <main className="flex-1 p-6 lg:p-10 overflow-x-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 sticky top-0 z-20 bg-[#FAFAF9]/80 backdrop-blur-xl py-4 -mt-4 border-b border-transparent">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
            <p className="text-sm text-[#737373]">Live system analytics from admin backend.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white border border-[#E5E5E5] rounded-xl flex items-center p-1 shadow-sm">
              {['Last 7 days', 'Last 30 days'].map((range) => (
                <button
                  key={range}
                  onClick={() => setActiveDate(range)}
                  className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-all', activeDate === range ? 'bg-[#FAFAF9] text-[#1C1C1C] border border-[#E5E5E5] shadow-sm' : 'text-[#737373] hover:text-[#1C1C1C]')}
                >
                  {range}
                </button>
              ))}
            </div>
            <button className="bg-white border border-[#E5E5E5] rounded-xl px-4 py-2 text-xs font-semibold shadow-sm hover:bg-neutral-50 transition-colors flex items-center gap-2">
              <Download size={14} /> Export
            </button>
          </div>
        </header>

        {loading ? <p className="text-sm text-[#737373]">Loading analytics...</p> : error ? <p className="text-sm text-rose-600">{error}</p> : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <KpiCard label="Total Revenue" value={`${Math.round(totalRevenue).toLocaleString()} ETB`} trend="live" isUp={true} data={chartByDay.map((d) => ({ value: d.revenue }))} />
              <KpiCard label="Total Orders" value={totalOrders.toLocaleString()} trend="live" isUp={true} data={chartByDay.map((d) => ({ value: d.revenue }))} />
              <KpiCard label="Total Users" value={totalUsers.toLocaleString()} trend="live" isUp={true} data={chartByDay.map((d) => ({ value: d.revenue }))} />
              <KpiCard label="Conversion" value={`${conversion.toFixed(2)}%`} trend="live" isUp={conversion >= 0} data={chartByDay.map((d) => ({ value: d.revenue }))} />
              <KpiCard label="Avg Order Value" value={`${Math.round(avgOrderValue).toLocaleString()} ETB`} trend="live" isUp={avgOrderValue >= 0} data={chartByDay.map((d) => ({ value: d.revenue }))} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <div className="lg:col-span-2 bg-white border border-[#E5E5E5] p-6 rounded-2xl shadow-sm">
                <h4 className="font-bold text-lg tracking-tight mb-1">Revenue Trend</h4>
                <p className="text-xs text-[#737373] mb-8">From successful payments</p>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartByDay}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F5F5" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#737373' }} dy={10} />
                      <YAxis hide />
                      <Tooltip />
                      <Line type="monotone" dataKey="revenue" stroke="#C6A75E" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: '#C6A75E' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-[#E5E5E5] p-6 rounded-2xl shadow-sm">
                <h4 className="font-bold text-lg tracking-tight mb-1">User Distribution</h4>
                <p className="text-xs text-[#737373] mb-8">By platform role</p>
                <div className="h-64 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={roleData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" strokeWidth={0}>
                        {roleData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold">{totalUsers.toLocaleString()}</span>
                    <span className="text-[10px] text-[#737373] uppercase font-bold tracking-widest">Total Users</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 bg-white border border-[#E5E5E5] p-6 rounded-2xl shadow-sm">
                <h4 className="font-bold text-lg tracking-tight mb-1">Top Artisans</h4>
                <p className="text-xs text-[#737373] mb-8">By sales volume</p>
                <div className="space-y-5">
                  {topArtisans.map((artisan) => {
                    const fullName = `${artisan.artisan?.firstName || ''} ${artisan.artisan?.lastName || ''}`.trim();
                    const name = artisan.artisan?.artisanProfile?.shopName || fullName || 'Unknown artisan';
                    const avatar = name.slice(0, 2).toUpperCase();
                    return (
                      <div key={artisan.artisanId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#FAFAF9] border border-[#E5E5E5] flex items-center justify-center text-xs font-bold text-[#1C1C1C]">{avatar}</div>
                          <div>
                            <p className="text-sm font-bold tracking-tight">{name}</p>
                            <p className="text-[10px] text-[#737373] uppercase font-bold">{artisan.orderItems} Order Items</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold">{Math.round(artisan.revenue).toLocaleString()} ETB</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <section className="bg-[#1C1C1C] p-10 rounded-3xl text-white">
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                <div className="max-w-md">
                  <h3 className="text-2xl font-bold tracking-tight mb-2">Automated Insights</h3>
                  <div className="grid gap-3">
                    {insights.map((insight) => (
                      <div key={insight} className="flex items-start gap-3 bg-white/5 border border-white/10 p-4 rounded-xl">
                        <div className="mt-1 w-2 h-2 rounded-full bg-[#C6A75E]" />
                        <p className="text-sm leading-tight text-[#E5E5E5]">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#C6A75E] p-8 rounded-2xl text-white flex flex-col items-center justify-center text-center max-w-[280px]">
                  <TrendingUp size={48} className="mb-4 text-white/50" />
                  <h5 className="font-bold text-lg mb-2 leading-none">Live Data Connected</h5>
                  <p className="text-xs text-white/80 leading-relaxed">Analytics cards and charts now render from backend admin endpoints.</p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
