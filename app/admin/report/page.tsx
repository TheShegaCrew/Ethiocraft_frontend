"use client"
import { useMemo, useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileDown,
  FileText,
  Filter,
  Gem,
  LayoutDashboard,
  LoaderCircle,
  Package,
  Printer,
  Search,
  ShoppingCart,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DateRange = "7d" | "30d" | "custom";
type ReportType = "orders" | "revenue" | "users" | "artisans" | "agents";
type SortKey = "date" | "amount";
type SortDirection = "asc" | "desc";

type ReportRow = {
  id: string;
  name: string;
  status: string;
  amount: number;
  date: string;
  region: string;
  role: string;
};

type HeaderFilter = "all" | "role" | "status" | "region";

type ReportPreset = {
  id: string;
  name: string;
  description: string;
  reportType: ReportType;
  dateRange: DateRange;
  icon?: any;
};

/** One-click shortcuts: only adjust report type + date range (no server-side “saved” entity). */
const REPORT_PRESETS: ReportPreset[] = [
  {
    id: "orders-7d",
    name: "Recent orders",
    description: "Orders created in the last 7 days (table above uses live API data).",
    reportType: "orders",
    dateRange: "7d",
    icon: ShoppingCart,
  },
  {
    id: "revenue-30d",
    name: "Revenue snapshot",
    description: "Top artisans by line revenue over the last 30 days.",
    reportType: "revenue",
    dateRange: "30d",
    icon: Gem,
  },
  {
    id: "artisans-30d",
    name: "Artisan performance",
    description: "Same revenue basis as analytics; sorted by sales in range.",
    reportType: "artisans",
    dateRange: "30d",
    icon: Users,
  },
  {
    id: "agents-7d",
    name: "Agent workload",
    description: "Samples assigned in the last 7 days per verification agent.",
    reportType: "agents",
    dateRange: "7d",
    icon: BarChart3,
  },
  {
    id: "users-roster",
    name: "Account roster",
    description: "Latest registered users with lifetime order counts (not filtered by the date range).",
    reportType: "users",
    dateRange: "30d",
    icon: FileText,
  },
];

const reportTypeOptions: { value: ReportType; label: string }[] = [
  { value: "orders", label: "Orders" },
  { value: "revenue", label: "Revenue" },
  { value: "users", label: "Users" },
  { value: "artisans", label: "Artisans" },
  { value: "agents", label: "Agents" },
];

const regions = ["Addis Ababa", "Oromia", "Amhara", "Sidama", "Tigray"];
const roles = ["Customer", "Artisan", "Agent", "Admin"];
const statuses = ["Active", "Pending", "Suspended", "Completed", "Cancelled", "Paid", "Processing", "Shipped"];

function getApiBase() {
  return (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/$/, "") || "http://localhost:4000/api/v1";
}

function getReportDateRange(dateRange: DateRange, customFrom: string, customTo: string) {
  const now = new Date();
  const to = new Date(now);
  let from = new Date(now);
  if (dateRange === "7d") {
    from.setDate(now.getDate() - 7);
  } else if (dateRange === "30d") {
    from.setDate(now.getDate() - 30);
  } else if (customFrom && customTo) {
    const a = new Date(customFrom);
    const b = new Date(customTo);
    if (!Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime()) && a <= b) {
      from = a;
      to.setTime(b.getTime());
      to.setHours(23, 59, 59, 999);
    } else {
      from.setDate(now.getDate() - 30);
    }
  } else {
    from.setDate(now.getDate() - 30);
  }
  return { dateFrom: from.toISOString(), dateTo: to.toISOString() };
}

function formatAmount(type: ReportType, value: number) {
  if (type === "orders") return `ETB ${value.toLocaleString()}`;
  if (type === "revenue") return `ETB ${value.toLocaleString()}`;
  if (type === "users") return `${value} orders`;
  if (type === "artisans") return `ETB ${value.toLocaleString()}`;
  return `${value} tasks`;
}

function SummaryCards({ rows, reportType, enabled }: { rows: ReportRow[]; reportType: ReportType; enabled: boolean }) {
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const completed = rows.filter((row) => row.status === "Completed" || row.status === "Active").length;
  const average = rows.length ? total / rows.length : 0;
  const successRate = rows.length ? (completed / rows.length) * 100 : 0;

  const cards =
    reportType === "orders"
      ? [
          { label: "Gross (ETB)", value: `ETB ${total.toLocaleString()}` },
          { label: "Orders", value: rows.length.toLocaleString() },
          { label: "Avg order (ETB)", value: formatAmount(reportType, Math.round(average)) },
          { label: "Delivered / active share", value: `${successRate.toFixed(1)}%` },
        ]
      : reportType === "users"
        ? [
            { label: "Lifetime orders (sum)", value: total.toLocaleString() },
            { label: "Accounts (latest)", value: rows.length.toLocaleString() },
            { label: "Avg orders / user", value: rows.length ? (total / rows.length).toFixed(1) : "0" },
            { label: "Active share", value: `${successRate.toFixed(1)}%` },
          ]
        : reportType === "agents"
          ? [
              { label: "Tasks in range", value: total.toLocaleString() },
              { label: "Agents listed", value: rows.length.toLocaleString() },
              { label: "Avg tasks / agent", value: rows.length ? (total / rows.length).toFixed(1) : "0" },
              { label: "Active share", value: `${successRate.toFixed(1)}%` },
            ]
          : [
              { label: "Revenue (ETB)", value: `ETB ${total.toLocaleString()}` },
              { label: "Artisans", value: rows.length.toLocaleString() },
              { label: "Avg (ETB)", value: formatAmount(reportType, Math.round(average)) },
              { label: "Active / approved share", value: `${successRate.toFixed(1)}%` },
            ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{card.label}</p>
          <p className={cn("mt-2 text-xl font-bold", !enabled && "text-stone-300")}>{enabled ? card.value : "--"}</p>
        </div>
      ))}
    </section>
  );
}

function ReportFilters({
  selectedRoles,
  selectedStatuses,
  selectedRegions,
  includeInactive,
  search,
  onToggleRole,
  onToggleStatus,
  onToggleRegion,
  onToggleInactive,
  onSearch,
}: {
  selectedRoles: string[];
  selectedStatuses: string[];
  selectedRegions: string[];
  includeInactive: boolean;
  search: string;
  onToggleRole: (value: string) => void;
  onToggleStatus: (value: string) => void;
  onToggleRegion: (value: string) => void;
  onToggleInactive: () => void;
  onSearch: (value: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-4 w-4 text-[#C6A75E]" />
        <h3 className="font-display text-lg font-bold">Report Builder</h3>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-500">Search IDs</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search by user ID, order ID, artisan ID..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#C6A75E]"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-500">Role</label>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => onToggleRole(role)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs font-medium transition",
                  selectedRoles.includes(role)
                    ? "border-[#C6A75E] bg-[#C6A75E]/15 text-[#7A6024]"
                    : "border-stone-200 text-stone-600"
                )}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-500">Status</label>
          <div className="flex flex-wrap gap-2">
            {statuses.slice(0, 4).map((status) => (
              <button
                key={status}
                onClick={() => onToggleStatus(status)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs font-medium transition",
                  selectedStatuses.includes(status)
                    ? "border-[#C6A75E] bg-[#C6A75E]/15 text-[#7A6024]"
                    : "border-stone-200 text-stone-600"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
        <div className="flex flex-wrap gap-2">
          {regions.map((region) => (
            <button
              key={region}
              onClick={() => onToggleRegion(region)}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs font-medium transition",
                selectedRegions.includes(region)
                  ? "border-[#C6A75E] bg-[#C6A75E]/15 text-[#7A6024]"
                  : "border-stone-200 text-stone-600"
              )}
            >
              {region}
            </button>
          ))}
        </div>

        <button
          onClick={onToggleInactive}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-wider transition",
            includeInactive ? "border-[#C6A75E] bg-[#C6A75E]/15 text-[#7A6024]" : "border-stone-200 text-stone-500"
          )}
        >
          <span
            className={cn(
              "relative h-4 w-8 rounded-full transition",
              includeInactive ? "bg-[#C6A75E]" : "bg-stone-300"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-3 w-3 rounded-full bg-white transition",
                includeInactive ? "left-4" : "left-0.5"
              )}
            />
          </span>
          Include inactive users
        </button>
      </div>
    </section>
  );
}

function DataTable({
  rows,
  reportType,
  loading,
  generated,
  sortKey,
  sortDirection,
  onSort,
}: {
  rows: ReportRow[];
  reportType: ReportType;
  loading: boolean;
  generated: boolean;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  if (!generated) {
    return (
      <section className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#C6A75E]/15 text-[#7A6024]">
          <FileText className="h-6 w-6" />
        </div>
        <h3 className="font-display text-xl font-bold">No Report Generated</h3>
        <p className="mt-2 text-sm text-stone-500">Select filters and generate a report.</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="max-h-[460px] overflow-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-4 py-3">{reportType === "orders" ? "Order ID" : "Record ID"}</th>
              <th className="px-4 py-3">{reportType === "orders" ? "Customer" : "Name"}</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">
                <button onClick={() => onSort("amount")} className="inline-flex items-center gap-1 font-semibold">
                  {reportType === "users" ? "Orders placed" : reportType === "agents" ? "Tasks" : "Amount (ETB)"}
                  {sortKey === "amount" ? <ChevronDown className={cn("h-3.5 w-3.5", sortDirection === "asc" && "rotate-180")} /> : null}
                </button>
              </th>
              <th className="px-4 py-3">Region</th>
              <th className="px-4 py-3">
                <button onClick={() => onSort("date")} className="inline-flex items-center gap-1 font-semibold">
                  Date
                  {sortKey === "date" ? <ChevronDown className={cn("h-3.5 w-3.5", sortDirection === "asc" && "rotate-180")} /> : null}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="border-t border-stone-100">
                  {Array.from({ length: 6 }).map((__, col) => (
                    <td key={col} className="px-4 py-3">
                      <div className="h-4 w-full animate-pulse rounded bg-stone-200" />
                    </td>
                  ))}
                </tr>
              ))
              : rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={cn(
                    "cursor-pointer border-t border-stone-100 transition hover:bg-[#C6A75E]/10",
                    index % 2 === 0 ? "bg-white" : "bg-stone-50/40"
                  )}
                >
                  <td className="px-4 py-3 font-medium">{row.id}</td>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-xs font-semibold",
                        row.status === "Completed" || row.status === "Active"
                          ? "bg-emerald-100 text-emerald-700"
                          : row.status === "Pending"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                      )}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {reportType === "users" || reportType === "agents"
                      ? row.amount.toLocaleString()
                      : `ETB ${row.amount.toLocaleString()}`}
                  </td>
                  <td className="px-4 py-3">{row.region}</td>
                  <td className="px-4 py-3 text-stone-500">{row.date}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ExportActions({
  generated,
  rows,
  reportType,
}: {
  generated: boolean;
  rows: ReportRow[];
  reportType: ReportType;
}) {
  const [mounted, setMounted] = useState(false);
  const [generatedOn, setGeneratedOn] = useState("");

  useEffect(() => {
    setMounted(true);
    setGeneratedOn(new Date().toLocaleString());
  }, []);

  const downloadCsv = () => {
    const headers = ["id", "name", "status", "amount", "region", "date", "role"];
    const lines = [headers.join(",")].concat(
      rows.map((r) =>
        [r.id, `"${r.name.replace(/"/g, '""')}"`, r.status, r.amount, `"${r.region}"`, r.date, r.role].join(","),
      ),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ethicraft-report-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold">Export Report</h3>
          <p className="text-xs text-stone-500">Generated on: {mounted ? generatedOn : "--"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!generated || rows.length === 0}
            onClick={downloadCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileDown className="h-4 w-4" /> Export CSV
          </button>
          <button
            disabled={!generated}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> Export PDF
          </button>
          <button
            disabled={!generated}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1C1C1C] px-3 py-2 text-sm font-medium text-white transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [reportType, setReportType] = useState<ReportType>("orders");
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [headerFilter, setHeaderFilter] = useState<HeaderFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [apiRows, setApiRows] = useState<ReportRow[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 6;

  const loadReport = useCallback(async (type: ReportType) => {
    setLoading(true);
    setFetchError("");
    try {
      const base = getApiBase();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const { dateFrom, dateTo } = getReportDateRange(dateRange, customFrom, customTo);
      const params = new URLSearchParams({
        type,
        dateFrom,
        dateTo,
        limit: "500",
      });
      const res = await fetch(`${base}/admin/dashboard/reports?${params.toString()}`, { headers, credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || "Failed to load report");
      }
      const rows = (json?.data?.rows || []) as ReportRow[];
      setApiRows(Array.isArray(rows) ? rows : []);
      setGenerated(true);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Failed to load report");
      setApiRows([]);
      setGenerated(false);
    } finally {
      setLoading(false);
    }
  }, [dateRange, customFrom, customTo]);

  useEffect(() => {
    void loadReport(reportType);
  }, [reportType, loadReport]);

  const filteredRows = useMemo(() => {
    return apiRows.filter((row) => {
      const matchSearch =
        !search ||
        row.id.toLowerCase().includes(search.toLowerCase()) ||
        row.name.toLowerCase().includes(search.toLowerCase());
      const matchRole = selectedRoles.length === 0 || selectedRoles.includes(row.role);
      const matchStatus = selectedStatuses.length === 0 || selectedStatuses.includes(row.status);
      const matchRegion = selectedRegions.length === 0 || selectedRegions.includes(row.region);
      const matchHeaderFilter =
        headerFilter === "all" ||
        (headerFilter === "role" && matchRole) ||
        (headerFilter === "status" && matchStatus) ||
        (headerFilter === "region" && matchRegion);
      const matchInactive = includeInactive || row.status !== "Suspended";
      return matchSearch && matchRole && matchStatus && matchRegion && matchHeaderFilter && matchInactive;
    });
  }, [apiRows, search, selectedRoles, selectedStatuses, selectedRegions, includeInactive, headerFilter]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      if (sortKey === "amount") {
        return sortDirection === "asc" ? a.amount - b.amount : b.amount - a.amount;
      }
      return sortDirection === "asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    });
  }, [filteredRows, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const paginatedRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleFromList = (value: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("desc");
  };

  const handleGenerateReport = () => {
    setCurrentPage(1);
    void loadReport(reportType);
  };

  const applyPreset = (preset: ReportPreset) => {
    setCurrentPage(1);
    setReportType(preset.reportType);
    setDateRange(preset.dateRange);
    if (preset.dateRange !== "custom") {
      setCustomFrom("");
      setCustomTo("");
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F6F4] text-[#1C1C1C]">
      <div className="min-h-screen">


        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <header className="sticky top-0 z-20 mb-5 rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={reportType}
                onChange={(event) => setReportType(event.target.value as ReportType)}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#C6A75E]"
              >
                {reportTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={dateRange}
                onChange={(event) => setDateRange(event.target.value as DateRange)}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#C6A75E]"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="custom">Custom range</option>
              </select>

              {dateRange === "custom" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="rounded-xl border border-stone-200 bg-white px-2 py-2 text-sm outline-none focus:border-[#C6A75E]"
                  />
                  <span className="text-stone-400">–</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="rounded-xl border border-stone-200 bg-white px-2 py-2 text-sm outline-none focus:border-[#C6A75E]"
                  />
                </div>
              ) : null}

              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                <select
                  value={headerFilter}
                  onChange={(event) => setHeaderFilter(event.target.value as HeaderFilter)}
                  className="rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-8 text-sm outline-none transition focus:border-[#C6A75E]"
                >
                  <option value="all">All filters</option>
                  <option value="role">Role focused</option>
                  <option value="status">Status focused</option>
                  <option value="region">Region focused</option>
                </select>
              </div>

              <button
                onClick={handleGenerateReport}
                className="inline-flex items-center gap-2 rounded-xl bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Generate Report
              </button>

              <button className="ml-auto rounded-xl border border-stone-200 bg-white p-2 text-stone-500 transition hover:text-stone-900">
                <Bell className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="space-y-5">
            {fetchError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{fetchError}</div>
            ) : null}

            <ReportFilters
              selectedRoles={selectedRoles}
              selectedStatuses={selectedStatuses}
              selectedRegions={selectedRegions}
              includeInactive={includeInactive}
              search={search}
              onToggleRole={(value) => toggleFromList(value, selectedRoles, setSelectedRoles)}
              onToggleStatus={(value) => toggleFromList(value, selectedStatuses, setSelectedStatuses)}
              onToggleRegion={(value) => toggleFromList(value, selectedRegions, setSelectedRegions)}
              onToggleInactive={() => setIncludeInactive((prev) => !prev)}
              onSearch={setSearch}
            />

            <SummaryCards rows={sortedRows} reportType={reportType} enabled={generated && !loading} />

            <DataTable
              rows={paginatedRows}
              reportType={reportType}
              loading={loading}
              generated={generated || loading}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600 shadow-sm">
              <p>
                Page {currentPage} of {totalPages} - {sortedRows.length} records
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={!generated || currentPage === 1 || loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={!generated || currentPage === totalPages || loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <ExportActions generated={generated && !loading} rows={sortedRows} reportType={reportType} />

            <section className="relative overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#C6A75E]/5 blur-3xl" />
              <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-[#C6A75E]/5 blur-3xl" />
              
              <div className="relative mb-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#C6A75E]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7A6024]">
                  Efficiency Tools
                </div>
                <h3 className="mt-2 font-display text-2xl font-bold text-[#1C1C1C]">Quick Presets</h3>
                <p className="mt-1 max-w-2xl text-sm text-stone-500">
                  Instantly configure report parameters with optimized defaults. These shortcuts help you access the most frequent analytical views in one click.
                </p>
              </div>

              <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {REPORT_PRESETS.map((preset) => {
                  const Icon = preset.icon || FileText;
                  const colorMap = {
                    orders: "hover:border-emerald-200 hover:shadow-emerald-500/5",
                    revenue: "hover:border-amber-200 hover:shadow-amber-500/5",
                    artisans: "hover:border-blue-200 hover:shadow-blue-500/5",
                    agents: "hover:border-purple-200 hover:shadow-purple-500/5",
                    users: "hover:border-rose-200 hover:shadow-rose-500/5",
                  };
                  const iconBgMap = {
                    orders: "group-hover:bg-emerald-500",
                    revenue: "group-hover:bg-amber-500",
                    artisans: "group-hover:bg-blue-500",
                    agents: "group-hover:bg-purple-500",
                    users: "group-hover:bg-rose-500",
                  };
                  const textMap = {
                    orders: "group-hover:text-emerald-600",
                    revenue: "group-hover:text-amber-600",
                    artisans: "group-hover:text-blue-600",
                    agents: "group-hover:text-purple-600",
                    users: "group-hover:text-rose-600",
                  };

                  return (
                    <article
                      key={preset.id}
                      className={cn(
                        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-100 bg-stone-50/30 p-5 transition-all duration-300 hover:bg-white hover:shadow-xl",
                        colorMap[preset.reportType]
                      )}
                    >
                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-stone-200 transition-all duration-300 group-hover:scale-110 group-hover:text-white group-hover:ring-0",
                            iconBgMap[preset.reportType]
                          )}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col items-end">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-tighter text-stone-400 transition-colors",
                              textMap[preset.reportType]
                            )}>
                              {reportTypeOptions.find((o) => o.value === preset.reportType)?.label}
                            </span>
                            <span className="text-[10px] font-medium text-stone-400">
                              {preset.dateRange === "7d" ? "7 days" : preset.dateRange === "30d" ? "30 days" : "Custom"}
                            </span>
                          </div>
                        </div>
                        
                        <h4 className="font-display text-base font-bold text-stone-800 transition-colors group-hover:text-[#1C1C1C]">
                          {preset.name}
                        </h4>
                        <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
                          {preset.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className={cn(
                          "mt-5 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all",
                          preset.reportType === 'orders' ? "border-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white hover:border-emerald-500" :
                          preset.reportType === 'revenue' ? "border-amber-100 text-amber-700 hover:bg-amber-500 hover:text-white hover:border-amber-500" :
                          preset.reportType === 'artisans' ? "border-blue-100 text-blue-700 hover:bg-blue-500 hover:text-white hover:border-blue-500" :
                          preset.reportType === 'agents' ? "border-purple-100 text-purple-700 hover:bg-purple-500 hover:text-white hover:border-purple-500" :
                          "border-rose-100 text-rose-700 hover:bg-rose-500 hover:text-white hover:border-rose-500"
                        )}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Generate Now
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;