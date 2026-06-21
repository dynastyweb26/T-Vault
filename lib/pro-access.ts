import type { SupabaseClient } from "@supabase/supabase-js";

export type RedeemCodeResult =
  | {
      ok: true;
      alreadyRedeemed: boolean;
      hasProAccess: boolean;
    }
  | {
      ok: false;
      error: "invalid_code" | "too_many_attempts" | "unauthorized" | "redeem_failed";
    };

export async function fetchUserHasProAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("user_has_pro_access", {
    p_user_id: userId,
  });

  if (error) {
    console.error("user_has_pro_access failed:", error.message);
    return false;
  }

  return Boolean(data);
}

export async function redeemProCode(
  supabase: SupabaseClient,
  code: string
): Promise<RedeemCodeResult> {
  const { data, error } = await supabase.rpc("redeem_code", {
    p_code: code.trim(),
  });

  if (error) {
    console.error("redeem_code failed:", error.message);
    return { ok: false, error: "redeem_failed" };
  }

  const payload = data as {
    ok?: boolean;
    error?: string;
    already_redeemed?: boolean;
    has_pro_access?: boolean;
  };

  if (!payload?.ok) {
    if (payload.error === "too_many_attempts") {
      return { ok: false, error: "too_many_attempts" };
    }
    if (payload.error === "unauthorized") {
      return { ok: false, error: "unauthorized" };
    }
    return { ok: false, error: "invalid_code" };
  }

  return {
    ok: true,
    alreadyRedeemed: Boolean(payload.already_redeemed),
    hasProAccess: Boolean(payload.has_pro_access),
  };
}

export function redeemCodeErrorMessage(
  error: Exclude<RedeemCodeResult, { ok: true }>["error"]
): string {
  switch (error) {
    case "too_many_attempts":
      return "Too many attempts. Wait a few minutes and try again.";
    case "invalid_code":
      return "That code didn't work. Check it and try again.";
    case "unauthorized":
      return "Please sign in to redeem a code.";
    default:
      return "Could not redeem that code. Try again.";
  }
}
