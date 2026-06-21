"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { createManualBroker, searchBrokers } from "@/lib/brokers/client";
import type { BrokerSearchResult, BrokerSearchSource } from "@/lib/brokers/types";
import type { BrokerSelection } from "@/lib/brokers/selection";
import { TEXT_LIMITS } from "@/lib/constants";
import { getTextCounter } from "@/lib/validation";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MIN_LENGTH = 2;

function formatBrokerMeta(broker: BrokerSearchResult): string {
  const parts: string[] = [];
  if (broker.mcNumber) parts.push(`MC ${broker.mcNumber}`);
  if (broker.dotNumber) parts.push(`DOT ${broker.dotNumber}`);
  return parts.join(" · ");
}

export type { BrokerSelection };

interface BrokerAutocompleteProps {
  value: string;
  brokerId: string | null;
  verified: boolean;
  onChange: (selection: BrokerSelection) => void;
  error?: string | null;
}

export function BrokerAutocomplete({
  value,
  brokerId,
  verified,
  onChange,
  error,
}: BrokerAutocompleteProps) {
  const inputId = useId();
  const listId = `${inputId}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [results, setResults] = useState<BrokerSearchResult[]>([]);
  const [source, setSource] = useState<BrokerSearchSource | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const runSearch = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < SEARCH_MIN_LENGTH) {
      setResults([]);
      setSource(null);
      setLoading(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setSearchError(null);

    try {
      const response = await searchBrokers(trimmed);
      if (requestId !== requestIdRef.current) return;
      setResults(response.results);
      setSource(response.source);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setResults([]);
      setSource("fmcsa_unavailable");
      setSearchError("Could not search brokers right now.");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const scheduleSearch = useCallback(
    (term: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void runSearch(term);
      }, SEARCH_DEBOUNCE_MS);
    },
    [runSearch]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleInputChange = (next: string) => {
    setQuery(next);
    setOpen(true);
    onChange({
      brokerId: null,
      brokerName: next,
      verified: false,
    });
    scheduleSearch(next);
  };

  const handleSelect = (broker: BrokerSearchResult) => {
    setQuery(broker.displayName);
    setOpen(false);
    onChange({
      brokerId: broker.id,
      brokerName: broker.displayName,
      verified: broker.verified,
    });
  };

  const handleManualEntry = async () => {
    const trimmed = query.trim();
    if (trimmed.length < SEARCH_MIN_LENGTH || manualLoading) return;

    setManualLoading(true);
    setSearchError(null);

    try {
      const broker = await createManualBroker(trimmed);
      handleSelect(broker);
    } catch {
      setSearchError("Could not save that broker. Try again.");
    } finally {
      setManualLoading(false);
    }
  };

  const showManualFallback =
    open &&
    !loading &&
    !manualLoading &&
    query.trim().length >= SEARCH_MIN_LENGTH &&
    results.length === 0;

  const counter = getTextCounter(query, TEXT_LIMITS.broker);

  return (
    <div ref={rootRef} className="flex w-full flex-col gap-2">
      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          maxLength={TEXT_LIMITS.broker}
          value={query}
          placeholder="Search broker by company name"
          className={cn(
            "tv-input-field tv-input-field-gold pr-11",
            error && "border-[var(--color-danger)]"
          )}
          onFocus={() => {
            setOpen(true);
            if (query.trim().length >= SEARCH_MIN_LENGTH) {
              scheduleSearch(query);
            }
          }}
          onChange={(event) => handleInputChange(event.target.value)}
        />

        {loading ? (
          <Loader2
            className="pointer-events-none absolute right-3 top-3 size-5 animate-spin text-[var(--color-text-muted)]"
            strokeWidth={2}
            aria-hidden
          />
        ) : null}

        {open && (results.length > 0 || showManualFallback) ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-[var(--color-shell-border)] bg-[var(--color-panel-solid)] py-1 shadow-lg"
          >
            {results.map((broker) => {
              const meta = formatBrokerMeta(broker);
              return (
                <li key={broker.id} role="option">
                  <button
                    type="button"
                    className="flex min-h-11 w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-elevated)]"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(broker)}
                  >
                    <span className="flex w-full items-center gap-2 text-[15px] font-medium text-[var(--color-text-primary)]">
                      <span className="min-w-0 flex-1 truncate">
                        {broker.displayName}
                      </span>
                      {broker.verified ? (
                        <ShieldCheck
                          className="size-4 shrink-0 text-[var(--color-success-text)]"
                          strokeWidth={2}
                          aria-hidden
                        />
                      ) : null}
                    </span>
                    {meta ? (
                      <span className="tv-caption normal-case tracking-normal text-[var(--color-text-muted)]">
                        {meta}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}

            {showManualFallback ? (
              <li role="option">
                <button
                  type="button"
                  disabled={manualLoading}
                  className="flex min-h-11 w-full items-center px-4 py-3 text-left text-[15px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-elevated)] disabled:opacity-60"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void handleManualEntry()}
                >
                  {manualLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                      Saving manual entry...
                    </span>
                  ) : (
                    <>
                      Use &ldquo;{query.trim()}&rdquo; as manual entry
                      {source === "fmcsa_unavailable" ? (
                        <span className="ml-1 text-[var(--color-text-muted)]">
                          (FMCSA lookup unavailable)
                        </span>
                      ) : null}
                    </>
                  )}
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {error ? (
            <p className="text-[14px] text-[var(--color-danger-text)]">{error}</p>
          ) : searchError ? (
            <p className="text-[14px] text-[var(--color-danger-text)]">
              {searchError}
            </p>
          ) : brokerId && verified ? (
            <p className="flex items-center gap-1.5 text-[14px] text-[var(--color-success-text)]">
              <ShieldCheck className="size-4 shrink-0" strokeWidth={2} aria-hidden />
              FMCSA verified broker
            </p>
          ) : brokerId ? (
            <p className="text-[14px] text-[var(--color-text-secondary)]">
              Manual broker entry
            </p>
          ) : (
            <p className="text-[14px] text-[var(--color-text-secondary)]">
              Search FMCSA records or add manually if not listed
            </p>
          )}
        </div>
        {counter ? <span className="tv-caption shrink-0">{counter}</span> : null}
      </div>
    </div>
  );
}
