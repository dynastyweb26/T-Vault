import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    const admin = createAdminClient();

    const { data: updated, error: updateError } = await admin
      .from("users")
      .update({ onboarding_completed: true })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("complete-onboarding update failed:", updateError.message);
      return NextResponse.json(
        { error: "onboarding_save_failed" },
        { status: 500 }
      );
    }

    if (!updated) {
      console.error("complete-onboarding: no users row for", user.id);
      return NextResponse.json({ error: "profile_missing" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("complete-onboarding error:", err);
    return NextResponse.json(
      { error: "onboarding_save_failed" },
      { status: 500 }
    );
  }
}
