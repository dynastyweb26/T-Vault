"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/shell/app-header";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { NotificationPreferences } from "@/types/database";

const PREFS: Array<{ key: keyof NotificationPreferences; label: string }> = [
  { key: "weekly_earnings", label: "Weekly earnings summary" },
  { key: "missing_docs", label: "Missing document reminders" },
  { key: "invoice_reminder", label: "Invoice reminders" },
  { key: "payment_overdue", label: "Payment overdue alerts" },
  { key: "streak_at_risk", label: "Streak at risk" },
  { key: "document_expiry", label: "Document expiry warnings" },
  { key: "welcome", label: "Welcome messages" },
];

export default function NotificationPrefsPage() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { data, error: loadError } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (loadError) {
      setError("We could not load your notification settings.");
      return;
    }

    if (data) {
      setPrefs(data as NotificationPreferences);
    } else {
      setPrefs({
        user_id: user.id,
        push_enabled: true,
        weekly_earnings: true,
        missing_docs: true,
        invoice_reminder: true,
        payment_overdue: true,
        streak_at_risk: true,
        document_expiry: true,
        welcome: true,
        push_subscription: null,
        updated_at: new Date().toISOString(),
      });
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (key: keyof NotificationPreferences) => {
    if (!user || !prefs) return;
    const previous = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setError(null);
    const supabase = createClient();
    const { error: saveError } = await supabase.from("notification_preferences").upsert({
      ...next,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    });

    if (saveError) {
      setPrefs(previous);
      setError("We could not save that preference. Try again.");
    }
  };

  if (!prefs) {
    return (
      <>
        <AppHeader title="Notifications" />
        {error ? (
          <div className="tv-error-state mx-5 mt-6 px-4 py-3">
            <p className="text-[14px]">{error}</p>
          </div>
        ) : (
          <div className="tv-skeleton mx-5 mt-6 h-48 rounded-2xl" />
        )}
      </>
    );
  }

  return (
    <>
      <AppHeader title="Notification Preferences" />
      <div className="mt-6 flex flex-col gap-2 px-5 pb-8">
        {error ? (
          <div className="tv-error-state mt-4 px-4 py-3">
            <p className="text-[14px]">{error}</p>
          </div>
        ) : null}
        {PREFS.map(({ key, label }) => (
          <label
            key={key}
            className="tv-glass-card flex min-h-14 cursor-pointer items-center justify-between rounded-2xl px-4"
          >
            <span className="text-[16px]">{label}</span>
            <input
              type="checkbox"
              checked={Boolean(prefs[key])}
              onChange={() => toggle(key)}
              className="size-5 accent-[var(--color-accent)]"
            />
          </label>
        ))}
      </div>
    </>
  );
}
