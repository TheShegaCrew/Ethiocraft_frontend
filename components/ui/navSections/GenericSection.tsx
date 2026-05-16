import React from 'react';
import { Button } from '@/components/ui/button';
import { Inbox } from 'lucide-react';

type Metric = {
  label: string;
  value: string | number;
  description: string;
};

type Props = {
  title: string;
  description?: string;
  placeholderRows?: any[];
  loading?: boolean;
  showFeedback?: (m: string) => void;
  setActiveNav?: (s: string) => void;
  onViewDetails?: (row: any) => void;
  metrics?: Metric[];
  isPlaceholder?: boolean;
  onCreateNew?: () => void;
};

export default function GenericSection({
  title,
  description,
  placeholderRows = [],
  loading = false,
  showFeedback,
  setActiveNav,
  onViewDetails,
  metrics,
  isPlaceholder = true,
  onCreateNew,
}: Props) {
  const defaultMetrics: Metric[] = [
    { label: 'Overview', value: 24, description: `Temporary placeholder metric for ${title}` },
    { label: 'Work Queue', value: 48, description: `Temporary placeholder metric for ${title}` },
    { label: 'Performance', value: 72, description: `Temporary placeholder metric for ${title}` },
  ];

  const displayMetrics = metrics || defaultMetrics;

  return (
    <main className="space-y-6 px-6 py-8 lg:px-8">
      <section className="rounded-3xl border border-[#e8dece] bg-white p-6 shadow-[0_8px_24px_rgba(62,39,35,0.05)]">
        <h1 className="text-3xl uppercase tracking-[0.04em]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif' }}>
          {title}
        </h1>
        <p className="mt-2 text-sm text-[#6f655d]">{description}</p>
        <div className="mt-5 flex flex-wrap gap-3" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
          {onCreateNew && (
            <button
              className="rounded-xl bg-[#3E2723] px-4 py-2 text-sm text-[#FAFAF9] transition hover:opacity-90"
              onClick={onCreateNew}
            >
              New {title.slice(0, -1)}
            </button>
          )}
          <button
            className="rounded-xl border border-[#dfd3c1] px-4 py-2 text-sm text-[#5f564e] transition hover:bg-[#f5f0e7]"
            onClick={() => setActiveNav?.('Reports')}
          >
            Export CSV
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {displayMetrics.map((item) => (
          <article key={item.label} className="rounded-3xl border border-[#e8dece] bg-white p-5 shadow-[0_6px_20px_rgba(62,39,35,0.04)]">
            <p className="text-xs uppercase tracking-[0.08em] text-[#82766b]" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
              {item.label}
            </p>
            <p className="mt-2 text-3xl font-semibold">{item.value}</p>
            <p className="mt-2 text-xs text-[#6f655d]">{item.description}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-[#e8dece] bg-white p-5 shadow-[0_8px_24px_rgba(62,39,35,0.04)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl uppercase tracking-[0.04em]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif' }}>
            {title} Queue
          </h2>
          {isPlaceholder ? (
            <span className="rounded-full bg-[#f4ead6] px-2 py-1 text-xs text-[#5f4f33]">Placeholder Data</span>
          ) : (
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700 font-medium">Live Feed</span>
          )}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#ece2d3]">
          <div className="grid min-w-[800px] grid-cols-[1fr_1.6fr_1fr_1fr_1fr_0.5fr] gap-4 bg-[#f8f4ec] px-4 py-3 text-xs uppercase tracking-[0.08em] text-[#7e7268] lg:min-w-full">
            <span className="truncate">ID</span>
            <span className="truncate">Name</span>
            <span className="truncate">Owner</span>
            <span className="truncate">Status</span>
            <span className="truncate">Updated</span>
            {onViewDetails && <span className="truncate text-center">Actions</span>}
          </div>
          <div className="divide-y divide-[#f1e8da]" style={{ fontFamily: 'Inter, sans-serif' }}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="relative mb-4">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#c6a75e] border-t-transparent" />
                  <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-[#c6a75e]/10" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#c6a75e] animate-pulse">Syncing {title}</h3>
                <p className="mt-2 text-[10px] text-[#85786d] uppercase tracking-widest font-bold">Please wait while we refresh the data feed</p>
              </div>
            ) : placeholderRows.length === 1 && placeholderRows[0].id === '—' && !placeholderRows[0].name.includes('Loading') ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f8f4ec] mb-4">
                  <Inbox className="h-10 w-10 text-[#c6a75e]" />
                </div>
                <h3 className="text-lg font-semibold text-[#3E2723]" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>No Records Found</h3>
                <p className="mt-2 max-w-xs text-sm text-[#85786d]">
                  No data available for this section yet.
                </p>
              </div>
            ) : (
              (placeholderRows || []).map((row) => (
                <div key={row.id} className="grid min-w-[800px] grid-cols-[1fr_1.6fr_1fr_1fr_1fr_0.5fr] gap-4 items-center px-4 py-3 text-sm transition hover:bg-[#fcf8f0] lg:min-w-full">
                  <span className="min-w-0 truncate font-medium text-[#3E2723]">{row.id}</span>
                  <span className="min-w-0 truncate" title={row.name}>{row.name}</span>
                  <span className="min-w-0 truncate" title={row.owner}>{row.owner}</span>
                  <span className="min-w-0">
                    <span className="inline-block max-w-full truncate rounded-full bg-[#f5efe2] px-2 py-1 text-xs text-[#6b5f53]">{row.status}</span>
                  </span>
                  <span className="min-w-0 truncate text-[#766a60]">{row.updated}</span>
                  {onViewDetails && (
                    <div className="flex justify-center">
                      <Button variant="ghost" size="sm" onClick={() => onViewDetails(row)}>View</Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
