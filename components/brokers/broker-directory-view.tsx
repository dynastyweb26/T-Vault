"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Search, ShieldCheck, Star } from "lucide-react";
import { AppHeader } from "@/components/shell/app-header";
import { buildFmcsaCompanySnapshotUrl } from "@/lib/brokers/fmcsa-links";
import { searchBrokerDirectory } from "@/lib/brokers/directory-client";
import type { BrokerDirectoryResult } from "@/lib/brokers/types";
import { TEXT_LIMITS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MIN_LENGTH = 2;

function formatBrokerMeta(broker: BrokerDirectoryResult): string {
  const parts: string[] = [];
  if (broker.mcNumber) parts.push(`MC ${broker.mcNumber}`);
  if (broker.dotNumber) parts.push(`DOT ${broker.dotNumber}`);
  return parts.join(" · ");
}

function formatStarAverage(value: number | null): string {
  if (value === null) return "—";
  return value.toFixed(1);
}

function RatingStat({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="tv-caption normal-case tracking-normal text-[var(--color-text-muted)]">
        {label}
      </span>
      <span className="flex items-center gap-1 text-[15px] font-semibold text-[var(--color-text-primary)]">
        <Star
          className="size-4 shrink-0 fill-[var(--color-accent)] text-[var(--color-accent)]"
          strokeWidth={2}
          aria-hidden
        />
        {formatStarAverage(value)}
      </span>
    </div>
  );
}

function BrokerDirectoryResultCard({ broker }: { broker: BrokerDirectoryResult }) {
  const meta = formatBrokerMeta(broker);
  const snapshotUrl =
    broker.verified && broker.dotNumber
      ? buildFmcsaCompanySnapshotUrl(broker.dotNumber)
      : null;

  return (
    <article className="tv-glass-card rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[17px] font-bold text-[var(--color-text-primary)]">
              {broker.displayName}
            </h3>
            {broker.verified ? (
              <ShieldCheck
                className="size-5 shrink-0 text-[var(--color-success-text)]"
                strokeWidth={2}
                aria-label="FMCSA verified"
              />
            ) : null}
          </div>
          {meta ? (
            <p className="mt-1 text-[14px] text-[var(--color-text-muted)]">{meta}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex gap-4">
        <RatingStat label="Paid on time" value={broker.avgPaidOnTimeStars} />
        <RatingStat label="Ease of work" value={broker.avgEaseOfWorkStars} />
      </div>

      <p className="mt-3 text-[14px] text-[var(--color-text-secondary)]">
        {broker.ratingCount === 0
          ? "No ratings yet"
          : `${broker.ratingCount} rating${broker.ratingCount === 1 ? "" : "s"}`}
      </p>

      {snapshotUrl ? (
        <a
          href={snapshotUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-11 items-center text-[14px] text-[var(--color-accent)] underline-offset-2 hover:underline"
        >
          View FMCSA record
        </a>
      ) : null}
    </article>
  );
}

export function BrokerDirectoryView() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BrokerDirectoryResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const runSearch = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < SEARCH_MIN_LENGTH) {
      setResults([]);
      setSearchError(null);
      setLoading(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setSearchError(null);

    try {
      const response = await searchBrokerDirectory(trimmed);
      if (requestId !== requestIdRef.current) return;
      setResults(response.results);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setResults([]);
      if (error instanceof Error && error.message === "pro_required") {
        setSearchError("Pro access is required to search brokers.");
      } else {
        setSearchError("Could not search brokers right now.");
      }
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

  const showEmptyPrompt =
    !loading && query.trim().length < SEARCH_MIN_LENGTH && results.length === 0;

  const showNoResults =
    !loading &&
    query.trim().length >= SEARCH_MIN_LENGTH &&
    results.length === 0 &&
    !searchError;

  return (
    <>
      <AppHeader
        title="Find Broker"
        subtitle="Search nationwide by company name, MC number, or DOT number."
      />

      <div className="px-5 pb-32 pt-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-text-muted)]"
            strokeWidth={2}
            aria-hidden
          />
          <input
            type="search"
            value={query}
            autoComplete="off"
            maxLength={TEXT_LIMITS.broker}
            placeholder="Search by broker name or MC/DOT number"
            className={cn(
              "tv-input-field tv-input-field-gold w-full pl-12 pr-12",
              searchError && "border-[var(--color-danger)]"
            )}
            onChange={(event) => {
              setQuery(event.target.value);
              scheduleSearch(event.target.value);
            }}
          />
          {loading ? (
            <Loader2
              className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 animate-spin text-[var(--color-text-muted)]"
              strokeWidth={2}
              aria-hidden
            />
          ) : null}
        </div>

        {searchError ? (
          <p className="mt-3 text-[14px] text-[var(--color-danger-text)]">
            {searchError}
          </p>
        ) : null}

        {showEmptyPrompt ? (
          <section className="tv-empty-state mt-10">
            <Search
              className="size-12 text-[var(--color-accent)]"
              strokeWidth={2}
              aria-hidden
            />
            <h2 className="tv-card-title mt-4">Search brokers nationwide</h2>
            <p className="tv-body mt-2 max-w-xs text-[var(--color-text-secondary)]">
              Enter a company name, MC number, or DOT number to see FMCSA records
              and community ratings.
            </p>
          </section>
        ) : null}

        {showNoResults ? (
          <section className="tv-empty-state mt-10">
            <h2 className="tv-card-title">No brokers found</h2>
            <p className="tv-body mt-2 max-w-xs text-[var(--color-text-secondary)]">
              Try a different name or MC/DOT number.
            </p>
          </section>
        ) : null}

        {results.length > 0 ? (
          <ul className="mt-5 flex flex-col gap-3">
            {results.map((broker) => (
              <li key={broker.id}>
                <BrokerDirectoryResultCard broker={broker} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  );
}
