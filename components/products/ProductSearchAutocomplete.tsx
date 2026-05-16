"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MutableRefObject,
  type Ref,
} from "react";
import {
  fetchSearchSuggestions,
  type SearchSuggestionItem,
  type SearchSuggestionKind,
} from "@/lib/api";

const KIND_LABELS: Record<SearchSuggestionKind, string> = {
  product: "Product",
  artisan: "Artisan",
  material: "Material",
};

const DEBOUNCE_MS = 280;
const MIN_CHARS = 2;

type ProductSearchAutocompleteProps = {
  /** Current applied URL search (committed `q`). */
  committedQuery: string;
  className?: string;
  placeholder?: string;
  /** Submit free-text search or the chosen suggestion label. */
  onApplySearch: (query: string, options?: { immediate?: boolean }) => void;
  /** Optional ref to the underlying input (e.g. header focus animations). */
  inputRef?: Ref<HTMLInputElement | null>;
};

function assignMergedRef<T>(
  refs: Array<Ref<T | null> | undefined>,
  value: T | null,
) {
  for (const ref of refs) {
    if (!ref) continue;
    if (typeof ref === "function") ref(value);
    else (ref as MutableRefObject<T | null>).current = value;
  }
}

export default function ProductSearchAutocomplete({
  committedQuery,
  className,
  placeholder = "Search products, artisans, materials…",
  onApplySearch,
  inputRef: forwardedInputRef,
}: ProductSearchAutocompleteProps) {
  const listId = useId();
  const innerInputRef = useRef<HTMLInputElement>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [value, setValue] = useState(committedQuery);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SearchSuggestionItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setValue(committedQuery);
  }, [committedQuery]);

  const clearDebounce = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  };

  const loadSuggestions = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < MIN_CHARS) {
      setItems([]);
      setLoading(false);
      setFetchError(null);
      setOpen(false);
      return;
    }

    try {
      setLoading(true);
      setFetchError(null);
      const res = await fetchSearchSuggestions({ q: trimmed, limit: 10 });
      setItems(res.items);
      setOpen(res.items.length > 0);
    } catch {
      setFetchError("Suggestions unavailable.");
      setItems([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (next: string) => {
    setValue(next);
    setActiveIndex(-1);
    clearDebounce();

    const trimmed = next.trim();
    if (trimmed.length < MIN_CHARS) {
      setItems([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      void loadSuggestions(next);
    }, DEBOUNCE_MS);
  };

  const commitClose = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const selectItem = (item: SearchSuggestionItem) => {
    const q = item.label.trim();
    setValue(q);
    onApplySearch(q, { immediate: true });
    commitClose();
    innerInputRef.current?.blur();
  };

  const submitCurrent = () => {
    const q = value.trim();
    onApplySearch(q, { immediate: true });
    commitClose();
  };

  useEffect(() => () => clearDebounce(), []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        submitCurrent();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1 >= items.length ? 0 : i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick =
        activeIndex >= 0 && activeIndex < items.length
          ? items[activeIndex]
          : undefined;
      if (pick) selectItem(pick);
      else submitCurrent();
    } else if (e.key === "Escape") {
      e.preventDefault();
      commitClose();
    }
  };

  return (
    <div className={className}>
      <div className="relative">
        <input
          ref={(el) =>
            assignMergedRef([innerInputRef, forwardedInputRef], el)
          }
          type="search"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          placeholder={placeholder}
          value={value}
          className="h-11 w-full min-w-[200px] bg-transparent px-2 pr-10 text-sm outline-none border-none focus:ring-0"
          style={{ fontFamily: "Aeonik, Inter, sans-serif" }}
          onChange={(ev) => handleChange(ev.target.value)}
          onFocus={() => {
            if (items.length && value.trim().length >= MIN_CHARS) setOpen(true);
          }}
          onBlur={() => {
            blurTimeout.current = setTimeout(commitClose, 120);
          }}
          onKeyDown={handleKeyDown}
        />
        {loading && (
          <span
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wide text-[#9a9289]"
            aria-busy="true"
          >
            …
          </span>
        )}
        {open && items.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1 max-h-[min(360px,calc(100vh-220px))] w-full overflow-y-auto border border-[#e8e5df] bg-[#fafaf9] shadow-lg"
          >
            {items.map((item, idx) => {
              const active = idx === activeIndex;
              return (
                <li key={`${item.kind}-${item.label}-${idx}`} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`flex w-full flex-col gap-0.5 border-b border-[#f0ebe3] px-3 py-2.5 text-left text-sm transition-colors last:border-b-0 ${active
                        ? "bg-[#f3ebe0]"
                        : "bg-transparent hover:bg-[#f7f4ef]"
                      }`}
                    style={{ fontFamily: "Aeonik, Inter, sans-serif" }}
                    onMouseDown={(ev) => ev.preventDefault()}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => selectItem(item)}
                  >
                    <span className="text-[#1c1c1c]">{item.label}</span>
                    <span className="text-[10px] uppercase tracking-[0.08em] text-[#9a9289]">
                      {KIND_LABELS[item.kind]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {open &&
          !loading &&
          value.trim().length >= MIN_CHARS &&
          items.length === 0 &&
          !fetchError && (
            <p
              className="absolute z-50 mt-1 w-full border border-[#e8e5df] bg-[#fafaf9] px-3 py-2 text-xs text-[#7a746d]"
              style={{ fontFamily: "Aeonik, Inter, sans-serif" }}
            >
              No suggestions — press Enter to search.
            </p>
          )}
        {fetchError && (
          <p className="mt-1 text-xs text-[#8d5a43]">{fetchError}</p>
        )}
      </div>
    </div>
  );
}
