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

    const { error: insertError } = await supabase.from("pro_waitlist").upsert(
      { user_id: user.id, email: user.email },
      { onConflict: "user_id" }
    );

    if (insertError) {
      console.error("pro_waitlist failed:", insertError.message);
      return NextResponse.json({ error: "waitlist_failed" }, { status: 500 });
    }

    await supabase
      .from("users")
      .update({ pro_tier: "waitlist" })
      .eq("id", user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("pro waitlist error:", err);
    return NextResponse.json({ error: "waitlist_failed" }, { status: 500 });
  }
}
