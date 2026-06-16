"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/shell/app-header";
import { TvButton } from "@/components/tv/tv-button";
import { TvDateInput } from "@/components/tv/tv-date-input";
import { TvInput } from "@/components/tv/tv-input";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_WALLET_DOCS } from "@/lib/document-wallet/queries";
import type { UserDocument } from "@/types/database";
import { APP_ROUTES } from "@/lib/constants";
import { triggerHaptic } from "@/lib/haptics";
import { isOnline } from "@/lib/offline/queue";

interface DocumentDetailViewProps {
  documentId: string;
}

export function DocumentDetailView({ documentId }: DocumentDetailViewProps) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = documentId === "new";
  const typeParam = searchParams.get("type") ?? "cdl";
  const fileRef = useRef<HTMLInputElement>(null);

  const [doc, setDoc] = useState<UserDocument | null>(null);
  const [customName, setCustomName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  const def = DEFAULT_WALLET_DOCS.find((d) => d.type === typeParam);
  const title =
    doc?.custom_name ??
    def?.label ??
    (typeParam === "custom" ? "Custom Document" : typeParam);

  const load = useCallback(async () => {
    if (!user || isNew) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from("user_documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();
    if (data) {
      setDoc(data as UserDocument);
      setExpiryDate(data.expiry_date ?? "");
      setCustomName(data.custom_name ?? "");
    }
    setLoading(false);
  }, [documentId, isNew, user]);

  useEffect(() => {
    load();
  }, [load]);

  const saveExpiry = async (date: string) => {
    if (!user) return;
    setExpiryDate(date);
    const supabase = createClient();
    if (doc) {
      await supabase
        .from("user_documents")
        .update({ expiry_date: date || null, updated_at: new Date().toISOString() })
        .eq("id", doc.id)
        .eq("user_id", user.id);
    } else if (date) {
      const { data } = await supabase
        .from("user_documents")
        .insert({
          user_id: user.id,
          document_type: typeParam,
          custom_name: typeParam === "custom" ? customName || "Custom" : null,
          expiry_date: date,
        })
        .select("*")
        .single();
      if (data) setDoc(data as UserDocument);
    }
  };

  const handleUpload = async (file: File) => {
    if (!user || !isOnline()) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", doc?.document_type ?? typeParam);
    if (doc?.id) formData.append("documentId", doc.id);
    if (expiryDate) formData.append("expiryDate", expiryDate);
    if (typeParam === "custom" && customName) {
      formData.append("customName", customName);
    }

    const response = await fetch("/api/wallet-documents/upload", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const { document: updated } = await response.json();
      setDoc(updated);
      triggerHaptic("medium");
    }
    setUploading(false);
  };

  if (loading) {
    return (
      <>
        <AppHeader title="Document" />
        <div className="tv-skeleton mx-5 mt-6 h-64 rounded-2xl" />
      </>
    );
  }

  return (
    <>
      <AppHeader title={title} subtitle="View and update your document" />
      <div className="mt-6 flex flex-col gap-4 px-5 pb-8">
        {typeParam === "custom" && isNew ? (
          <TvInput
            label="Document name"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onBlur={() => {
              if (customName) saveExpiry(expiryDate);
            }}
          />
        ) : null}

        {doc?.file_url ? (
          <button
            type="button"
            className="tv-glass-card rounded-2xl p-4 text-left"
            onClick={() => window.open(doc.file_url!, "_blank")}
          >
            <p className="tv-label">Current file</p>
            <p className="tv-link mt-2 text-[16px]">Tap to view full screen</p>
          </button>
        ) : null}

          <TvDateInput
            label="Expiry date"
            value={expiryDate}
            onChange={(e) => saveExpiry(e.target.value)}
          />

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />

        <TvButton
          disabled={uploading || !isOnline()}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? "Uploading..." : "Upload New Document"}
        </TvButton>

        {!isOnline() ? (
          <p className="text-center text-[15px] text-[var(--color-warning-text)]">
            Upload requires an internet connection.
          </p>
        ) : null}

        <TvButton variant="secondary" onClick={() => router.push(APP_ROUTES.documents)}>
          Back to wallet
        </TvButton>
      </div>
    </>
  );
}
