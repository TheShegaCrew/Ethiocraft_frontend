"use client"
import React, { lazy, Suspense } from 'react';
import ApprovalsPanel from '@/components/ui/ApprovalsPanel';
import RecentOrders from '@/components/ui/RecentOrders';
import UsersSnapshot from '@/components/ui/UsersSnapshot';
import PlatformHealth, { type HealthMetric } from '@/components/ui/PlatformHealth';
import ActivityFeed from '@/components/ui/ActivityFeed';

const AdminCharts = lazy(() => import('@/components/AdminCharts'));

type Props = {
  kpiCards?: { title: string; value: string; subtitle: string }[];
  quickActions?: { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }>; navigate?: string }[];
  usersSnapshot?: any[];
  activityItems?: { id: string; text: string }[];
  platformHealthMetrics?: HealthMetric[];
  approvalItems?: any[];
  handleApprovalAction?: any;
  rowHeight?: number;
  containerHeight?: number;
  setDetailsOrder?: (o: any) => void;
  setActiveNav?: (s: string) => void;
  showFeedback?: (m: string) => void;
  orders?: any[];
  baseUrl?: string;
  bearerToken?: string;
  selectedRange?: string;
  onSelectedRangeChange?: (range: string) => void;
  overviewLoading?: boolean;
};

export default function DashboardSection({
  kpiCards = [],
  quickActions = [],
  usersSnapshot = [],
  activityItems = [],
  platformHealthMetrics,
  approvalItems = [],
  handleApprovalAction,
  rowHeight = 56,
  containerHeight = 336,
  setDetailsOrder,
  setActiveNav,
  showFeedback,
  orders = [],
  baseUrl,
  bearerToken,
  selectedRange = 'Last 30 days',
  onSelectedRangeChange,
  overviewLoading = false,
}: Props) {
  return (
    <main className="space-y-8 px-6 py-8 lg:px-8">
      <section className="flex flex-wrap items-end justify-between gap-4 rounded-3xl border border-[#e8dece] bg-white p-6 shadow-[0_8px_28px_rgba(62,39,35,0.06)]">
        <div>
          <h1 className="text-3xl uppercase tracking-[0.04em]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif' }}>
            Admin Dashboard
          </h1>
          <p className="mt-2 text-sm text-[#6d645e]">
            Live KPIs use <span className="font-semibold text-[#3E2723]">{selectedRange}</span> where noted · overview API
          </p>
        </div>
        <div className="flex items-center gap-3" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
          <select
            className="rounded-xl border border-[#e1d7c7] bg-white px-3 py-2 text-sm text-[#5f5750] outline-none"
            value={selectedRange}
            disabled={overviewLoading}
            onChange={(e) => onSelectedRangeChange?.(e.target.value)}
          >
            <option value="Last 30 days">Last 30 days</option>
            <option value="Last 90 days">Last 90 days</option>
            <option value="This year">This year</option>
          </select>
          <button
            type="button"
            className="rounded-xl border border-[#e1d7c7] px-4 py-2 text-sm transition hover:bg-[#f5f0e7] disabled:opacity-50"
            disabled={overviewLoading}
            onClick={() => showFeedback?.('Open Reports to export CSV from generated tables.')}
          >
            Export
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpiCards.map((card: any, index: number) => (
          <article
            key={card.title}
            className="rounded-3xl border border-[#e8dece] bg-white p-5 shadow-[0_8px_20px_rgba(62,39,35,0.05)] transition duration-300 hover:-translate-y-1"
            style={{ animation: `kpiIn 360ms ease ${index * 60}ms both` }}
          >
            <p className="text-xs uppercase tracking-[0.08em] text-[#81756b]" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
              {card.title}
            </p>
            <p className="mt-2 text-3xl font-semibold">{overviewLoading ? '…' : card.value}</p>
            <p className="mt-2 text-xs text-[#6d645e]">{card.subtitle}</p>
            <div className="mt-4 h-8 w-full rounded-lg bg-[linear-gradient(90deg,#f3ead8_0%,#eadab8_45%,#d7c08f_100%)] opacity-60" />
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action: any) => {
          const Icon = action.icon;
          return (
            <button
              key={action.title}
              className="rounded-3xl border border-[#e8dece] bg-white p-5 text-left shadow-[0_6px_20px_rgba(62,39,35,0.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(198,167,94,0.2)]"
              type="button"
              onClick={() => {
                if (action.navigate && setActiveNav) {
                  setActiveNav(action.navigate);
                  showFeedback?.(`Opened ${action.navigate}`);
                  return;
                }
                showFeedback?.(`${action.title}`);
              }}
            >
              <Icon className="h-5 w-5 text-[#3E2723]" />
              <p className="mt-3 text-sm font-medium" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                {action.title}
              </p>
              <p className="mt-1 text-xs text-[#7e7268]">{action.subtitle}</p>
            </button>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <ApprovalsPanel approvalItems={approvalItems} handleApprovalAction={handleApprovalAction} />

          <RecentOrders
            containerHeight={containerHeight}
            rowHeight={rowHeight}
            setDetailsOrder={setDetailsOrder}
            setActiveNav={setActiveNav}
            showFeedback={showFeedback}
            baseUrl={baseUrl || (process.env.NEXT_PUBLIC_ORDERS_BASE_URL || 'http://localhost:4000/api/v1')}
            bearerToken={bearerToken || (process.env.NEXT_PUBLIC_ADMIN_BEARER_TOKEN || process.env.NEXT_PUBLIC_ADMIN_API_KEY || '')}
            initialOrders={orders}
            fetchFromApi={true}
          />
        </div>

        <aside className="space-y-6 xl:col-span-4">
          <UsersSnapshot usersSnapshot={usersSnapshot} setActiveNav={setActiveNav} showFeedback={showFeedback} />
          <PlatformHealth metrics={platformHealthMetrics} />
          <ActivityFeed items={activityItems} />
        </aside>
      </section>

      <section className="rounded-3xl border border-[#e8dece] bg-white p-5 shadow-[0_8px_24px_rgba(62,39,35,0.04)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl uppercase tracking-[0.04em]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif' }}>
            Analytics
          </h2>
        </div>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-[#f5efe2]" />}>
          <AdminCharts />
        </Suspense>
      </section>
    </main>
  );
}
