"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  FileCheck,
  Heart,
  Layers,
  Plus,
  Shield,
  Truck,
  Wallet,
} from "lucide-react";
import { AppHeader } from "@/components/shell/app-header";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_WALLET_DOCS,
  daysUntilExpiry,
  expiryColorClass,
  fetchUserDocuments,
  isExpired,
} from "@/lib/document-wallet/queries";
import type { UserDocument } from "@/types/database";
import { APP_ROUTES } from "@/lib/constants";

const ICON_MAP = {
  cdl: CreditCard,
  medical: Heart,
  truck_registration: Truck,
  trailer_registration: Layers,
  cargo_insurance: Shield,
  liability_insurance: FileCheck,
} as const;

function DocumentCard({
  label,
  icon: Icon,
  doc,
  type,
}: {
  label: string;
  icon: typeof CreditCard;
  doc?: UserDocument;
  type: string;
}) {
  const days = daysUntilExpiry(doc?.expiry_date ?? null);
  const expired = isExpired(doc?.expiry_date ?? null);
  const href = doc
    ? `${APP_ROUTES.documents}/${doc.id}`
    : `${APP_ROUTES.documents}/new?type=${type}`;

  return (
    <Link
      href={href}
      className={`tv-glass-card tv-pressable block rounded-2xl p-4 transition-opacity duration-150 active:opacity-90 ${
        days !== null && days < 30 && days >= 0 ? "tv-wallet-expiry-pulse" : ""
      } ${expired ? "border border-[var(--color-danger)]/30" : ""}`}
    >
      <div className="flex items-start gap-3">
        <Icon
          className="size-6 shrink-0 text-[var(--color-accent)]"
          strokeWidth={2}
          aria-hidden
        />
        <div className="flex-1">
          <p className="tv-card-title">{label}</p>
          {expired ? (
            <p className="tv-caption mt-1 text-[var(--color-danger-text)]">
              EXPIRED
            </p>
          ) : doc?.expiry_date ? (
            <p className={`mt-1 text-[16px] ${expiryColorClass(days)}`}>
              Expires {doc.expiry_date}
            </p>
          ) : (
            <p className="mt-1 text-[16px] text-[var(--color-text-muted)]">
              Not added yet
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export function DocumentWalletView() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const data = await fetchUserDocuments(supabase, user.id);
    setDocs(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const docByType = (type: string) =>
    docs.find((d) => d.document_type === type && !d.custom_name);

  const expired = docs.filter((d) => isExpired(d.expiry_date));
  const customDocs = docs.filter((d) => d.document_type === "custom");

  if (loading) {
    return (
      <>
        <AppHeader
          title="My Documents"
          subtitle="All your important documents, expiry dates, and reminders."
        />
        <div className="mt-6 flex flex-col gap-3 px-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="tv-skeleton h-24 rounded-2xl" />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader
        title="My Documents"
        subtitle="All your important documents, expiry dates, and reminders."
      />
      <div className="mt-6 flex flex-col gap-4 px-5 pb-8">
        {expired.length > 0 ? (
          <section>
            <p className="tv-label mb-3 text-[var(--color-danger-text)]">
              Action Required
            </p>
            <div className="flex flex-col gap-3">
              {expired.map((doc) => {
                const def = DEFAULT_WALLET_DOCS.find(
                  (d) => d.type === doc.document_type
                );
                const Icon =
                  ICON_MAP[doc.document_type as keyof typeof ICON_MAP] ??
                  Wallet;
                return (
                  <DocumentCard
                    key={doc.id}
                    label={doc.custom_name ?? def?.label ?? doc.document_type}
                    icon={Icon}
                    doc={doc}
                    type={doc.document_type}
                  />
                );
              })}
            </div>
          </section>
        ) : null}

        <div className="flex flex-col gap-3">
          {DEFAULT_WALLET_DOCS.map((def) => (
            <DocumentCard
              key={def.type}
              label={def.label}
              icon={def.icon}
              doc={docByType(def.type)}
              type={def.type}
            />
          ))}
          {customDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              label={doc.custom_name ?? "Custom Document"}
              icon={Wallet}
              doc={doc}
              type="custom"
            />
          ))}
          <Link
            href={`${APP_ROUTES.documents}/new?type=custom`}
            className="tv-glass-card tv-pressable flex min-h-14 items-center gap-3 rounded-2xl p-4"
          >
            <Plus
              className="size-6 text-[var(--color-accent)]"
              strokeWidth={2}
              aria-hidden
            />
            <span className="tv-card-title">Add Document</span>
          </Link>
        </div>
      </div>
    </>
  );
}
