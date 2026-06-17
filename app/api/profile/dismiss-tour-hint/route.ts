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
        tour_banner_dismissed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("id, tour_banner_dismissed")
      .single();

    if (updateError) {
      console.error("dismiss-tour-hint failed:", updateError.message);
      return NextResponse.json({ error: "profile_save_failed" }, { status: 500 });
    }

    if (updated.tour_banner_dismissed !== true) {
      console.error("dismiss-tour-hint: flag not persisted for user", user.id);
      return NextResponse.json({ error: "profile_save_failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, tour_banner_dismissed: true });
  } catch (err) {
    console.error("dismiss-tour-hint error:", err);
    return NextResponse.json({ error: "profile_save_failed" }, { status: 500 });
  }
}
