"use client"
import { useMemo } from "react";

interface Props {
  items: { id: string; text: string }[];
  /** Max rows to show; keeps the block short. */
  maxItems?: number;
}

function splitActivityLine(text: string): { description: string; meta: string } {
  const parts = text.split(" · ").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { description: text, meta: "" };
  if (parts.length === 1) return { description: parts[0], meta: "" };
  if (parts.length === 2) return { description: parts[0], meta: parts[1] };
  const meta = parts.slice(-2).join(" · ");
  const description = parts.slice(0, -2).join(" · ") || parts[0];
  return { description, meta };
}

export default function ActivityFeed({ items, maxItems = 5 }: Props) {
  const rows = useMemo(() => {
    const base = items.length > 0 ? items : [{ id: "empty", text: "No recent audit events yet." }];
    return base.slice(0, maxItems);
  }, [items, maxItems]);

  return (
    <article className="rounded-3xl border border-[#e8dece] bg-white p-4 shadow-[0_6px_20px_rgba(62,39,35,0.04)]">
      <div className="flex items-start justify-between gap-2 border-b border-[#f1e8da] pb-2">
        <div>
          <h3
            className="text-sm font-semibold uppercase tracking-[0.06em] text-[#3E2723]"
            style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif' }}
          >
            Activity
          </h3>
          <p className="mt-0.5 text-[10px] leading-tight text-[#8a7f73]">Recent admin audit log</p>
        </div>
        <span className="shrink-0 rounded-md bg-[#f5efe2] px-1.5 py-0.5 text-[10px] font-medium text-[#6d645e]">
          {items.length === 0
            ? "0"
            : items.length > maxItems
              ? `${maxItems}/${items.length}`
              : String(items.length)}
        </span>
      </div>

      <ul className="mt-2 divide-y divide-[#f1e8da]">
        {rows.map((item) => {
          const { description, meta } = splitActivityLine(item.text);
          return (
            <li key={item.id} className="flex gap-2 py-2 first:pt-0">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C6A75E]"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium leading-snug text-[#302521] line-clamp-2">{description}</p>
                {meta ? (
                  <p className="mt-0.5 truncate text-[10px] leading-tight text-[#8a7f73]">{meta}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
