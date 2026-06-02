import { useEffect, useMemo, useState } from 'react';
import { PieChart, Activity, ArrowUpRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

type AdminChartsProps = {
  selectedRange?: string;
};

function getRangeFromSelection(selectedRange: string) {
  const to = new Date();
  const from = new Date(to);
  if (selectedRange === 'Last 90 days') {
    from.setDate(to.getDate() - 90);
  } else if (selectedRange === 'This year') {
    from.setMonth(0, 1);
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(to.getDate() - 30);
  }
  return { dateFrom: from.toISOString(), dateTo: to.toISOString() };
}

export default function AdminCharts({ selectedRange = 'Last 30 days' }: AdminChartsProps) {
  const [visible, setVisible] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [months, setMonths] = useState<string[]>(['N/A']);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number[]>([0]);
  const [categories, setCategories] = useState<{ label: string; value: number; color: string }[]>([
    { label: 'No Data', value: 100, color: '#E5D6C1' },
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 150);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCharts = async () => {
      try {
        const q = new URLSearchParams(getRangeFromSelection(selectedRange));
        const [revenueRes, overviewRes] = await Promise.all([
          apiFetch(`/admin/dashboard/revenue?${q.toString()}`),
          apiFetch(`/admin/dashboard/overview?${q.toString()}`),
        ]);
        if (!revenueRes.ok || !overviewRes.ok) throw new Error('Failed to fetch chart data');

        const [revenueJson, overviewJson] = await Promise.all([revenueRes.json(), overviewRes.json()]);
        const byDay = Array.isArray(revenueJson?.data?.byDay) ? revenueJson.data.byDay : [];
        const byMonthMap = new Map<string, number>();
        byDay.forEach((d: any) => {
          const date = new Date(d.day);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          byMonthMap.set(monthKey, (byMonthMap.get(monthKey) || 0) + Number(d.amount || 0));
        });

        const monthRows = [...byMonthMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
        const monthLabels = monthRows.map(([k]) => {
          const [y, m] = k.split('-').map(Number);
          return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short' });
        });
        const monthValues = monthRows.map(([, amount]) => Number((amount / 1000).toFixed(1)));

        const productRows = Array.isArray(overviewJson?.data?.products) ? overviewJson.data.products : [];
        const totalProducts = productRows.reduce((sum: number, p: any) => sum + Number(p.count || 0), 0) || 1;
        const palette = ['#3E2723', '#C6A75E', '#D4C3A1', '#E5D6C1', '#8B7355'];
        const statusRows = productRows
          .filter((p: any) => Number(p.count || 0) > 0)
          .slice(0, 5)
          .map((p: any, idx: number) => ({
            label: String(p.key || 'Unknown').replace(/_/g, ' '),
            value: Math.round((Number(p.count || 0) / totalProducts) * 100),
            color: palette[idx % palette.length],
          }));

        if (!cancelled) {
          setMonths(monthLabels.length ? monthLabels : ['N/A']);
          setMonthlyRevenue(monthValues.length ? monthValues : [0]);
          setCategories(statusRows.length ? statusRows : [{ label: 'No Data', value: 100, color: '#E5D6C1' }]);
        }
      } catch {
        if (!cancelled) {
          setMonths(['N/A']);
          setMonthlyRevenue([0]);
          setCategories([{ label: 'No Data', value: 100, color: '#E5D6C1' }]);
        }
      }
    };

    void loadCharts();
    const interval = window.setInterval(() => {
      void loadCharts();
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [selectedRange]);

  const maxRevenue = Math.max(...monthlyRevenue, 1);
  const points = monthlyRevenue
    .map((value, index) => {
      const x = monthlyRevenue.length > 1 ? (index / (monthlyRevenue.length - 1)) * 100 : 50;
      const y = 100 - (value / maxRevenue) * 90;
      return `${x},${y}`;
    })
    .join(' ');

  const categoryGradient = useMemo(() => {
    let acc = 0;
    return categories
      .map((c) => {
        const start = acc;
        acc += c.value;
        return `${c.color} ${start}% ${acc}%`;
      })
      .join(', ');
  }, [categories]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      {/* Revenue Over Time Section */}
      <article className="xl:col-span-2 group">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3E2723]/5 text-[#3E2723]">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#81756b]">Performance</p>
              <h3 className="text-lg font-display font-bold text-[#1C1C1C]">Revenue Trends</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-500 shadow-sm transition hover:bg-stone-50">
            Yearly <ChevronDown className="h-3 w-3" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all duration-500 group-hover:shadow-xl group-hover:shadow-stone-200/40">
          {/* Chart Header Stats */}
          <div className="mb-8 flex items-end gap-4">
            <div>
              <p className="text-xs font-medium text-stone-400">Monthly Avg.</p>
              <p className="text-2xl font-display font-bold text-[#3E2723]">
                ETB {(monthlyRevenue.reduce((sum, v) => sum + v, 0) / Math.max(monthlyRevenue.length, 1)).toFixed(1)}k
              </p>
            </div>
            <div className="flex items-center gap-1 pb-1 text-xs font-bold text-emerald-600">
              <ArrowUpRight className="h-3 w-3" />
              Live
            </div>
          </div>

          <div className="relative h-64 w-full">
            <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3E2723" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#C6A75E" stopOpacity="0" />
                </linearGradient>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
                  <feOffset dx="0" dy="2" result="offsetblur" />
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.2" />
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Grid Lines */}
              {[0, 25, 50, 75, 100].map((line) => (
                <line key={line} x1="0" y1={line} x2="100" y2={line} stroke="#F1F1F1" strokeWidth="0.5" />
              ))}

              {/* Area Fill */}
              <path
                d={`M 0 100 L ${points} L 100 100 Z`}
                fill="url(#areaGradient)"
                className={cn("transition-opacity duration-1000", visible ? "opacity-100" : "opacity-0")}
              />

              {/* Line */}
              <polyline
                fill="none"
                stroke="#3E2723"
                strokeWidth="1.5"
                points={points}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#shadow)"
                style={{
                  strokeDasharray: 300,
                  strokeDashoffset: visible ? 0 : 300,
                  transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />

              {/* Hover Interaction Markers */}
              {monthlyRevenue.map((val, i) => {
                const xPos = monthlyRevenue.length > 1
                  ? (i / (monthlyRevenue.length - 1)) * 100
                  : 50;
                return (
                  <g key={i} onMouseEnter={() => setHoveredPoint(i)} onMouseLeave={() => setHoveredPoint(null)}>
                    <circle
                      cx={xPos}
                      cy={100 - (val / maxRevenue) * 90}
                      r="1.5"
                      fill="white"
                      stroke="#3E2723"
                      strokeWidth="1"
                      className={cn(
                        "cursor-pointer transition-all duration-300",
                        visible ? "opacity-100" : "opacity-0",
                        hoveredPoint === i ? "r-[3] stroke-width-[1.5]" : "r-[1.5]"
                      )}
                    />
                    {/* Invisible hit area */}
                    <rect
                      x={xPos - 4}
                      y="0"
                      width="8"
                      height="100"
                      fill="transparent"
                      className="cursor-pointer"
                    />
                  </g>
                );
              })}
            </svg>

            {/* X-Axis Labels */}
            <div className="mt-4 flex justify-between px-1">
              {months.map((month, i) => (
                <span key={month} className={cn(
                  "text-[10px] font-bold transition-colors duration-300",
                  hoveredPoint === i ? "text-[#3E2723]" : "text-stone-300"
                )}>
                  {month}
                </span>
              ))}
            </div>

            {/* Floating Tooltip Mockup */}
            {hoveredPoint !== null && (
              <div 
                className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-lg bg-[#3E2723] px-3 py-2 text-white shadow-xl animate-in fade-in zoom-in-95 duration-200"
                style={{
                  left: `${(hoveredPoint / Math.max(monthlyRevenue.length - 1, 1)) * 100}%`,
                  top: `${100 - (monthlyRevenue[hoveredPoint] / maxRevenue) * 90 - 15}%`
                }}
              >
                <p className="text-[10px] font-medium opacity-70">{months[hoveredPoint]}</p>
                <p className="text-xs font-bold">ETB {monthlyRevenue[hoveredPoint]}k</p>
                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#3E2723]" />
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Category Distribution Section */}
      <article className="group">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C6A75E]/10 text-[#C6A75E]">
              <PieChart className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#81756b]">Catalog</p>
              <h3 className="text-lg font-display font-bold text-[#1C1C1C]">Product Status</h3>
            </div>
          </div>
        </div>

        <div className="relative h-full overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all duration-500 group-hover:shadow-xl group-hover:shadow-stone-200/40">
          <div className="relative mb-8 flex justify-center">
            {/* Donut Chart */}
            <div 
              className="relative h-44 w-44 rounded-full transition-transform duration-500 group-hover:scale-105" 
              style={{ 
                background: `conic-gradient(${categoryGradient})`,
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05)'
              }} 
            >
              <div className="absolute inset-4 rounded-full bg-white shadow-inner flex flex-col items-center justify-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total Share</p>
                <p className="text-2xl font-display font-black text-[#3E2723]">100%</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category.label} className="group/item flex items-center justify-between rounded-xl border border-stone-50 bg-stone-50/30 p-2.5 transition hover:bg-stone-50">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
                  <span className="text-xs font-bold text-[#60564e] transition-colors group-hover/item:text-[#1C1C1C]">
                    {category.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-16 rounded-full bg-stone-200 overflow-hidden">
                    <div 
                      className="h-full transition-all duration-1000 ease-out" 
                      style={{ 
                        width: visible ? `${category.value}%` : '0%',
                        backgroundColor: category.color 
                      }} 
                    />
                  </div>
                  <span className="text-xs font-black text-[#3E2723]">{category.value}%</span>
                </div>
              </div>
            ))}
          </div>

          <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-stone-100 bg-stone-50/50 py-2.5 text-xs font-bold text-stone-500 transition hover:bg-[#3E2723] hover:text-white">
            Live backend distribution <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </article>
    </div>
  );
}
