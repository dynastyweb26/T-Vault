import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update({
        has_dismissed_tour_hint: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("dismiss-tour-hint failed:", updateError.message);
      return NextResponse.json({ error: "profile_save_failed" }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "profile_missing" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("dismiss-tour-hint error:", err);
    return NextResponse.json({ error: "profile_save_failed" }, { status: 500 });
  }
}
