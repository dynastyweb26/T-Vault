import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { markVaultIntroSeen } from "@/lib/profile/vault-intro";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const result = await markVaultIntroSeen(supabase, user.id);

    if (!result.ok) {
      console.error("dismiss-vault-intro failed:", result.error);
      return NextResponse.json({ error: "profile_save_failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, has_seen_vault_intro: true });
  } catch (err) {
    console.error("dismiss-vault-intro error:", err);
    return NextResponse.json({ error: "profile_save_failed" }, { status: 500 });
  }
}
