import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { confirm } = await request.json();
    if (confirm !== "DELETE") {
      return NextResponse.json({ error: "confirmation_required" }, { status: 400 });
    }

    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const response = await fetch(
      `${supabaseUrl}/functions/v1/delete-account`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirm: "DELETE" }),
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "delete_failed" }, { status: 500 });
    }

    const result = await response.json();
    await supabase.auth.signOut();

    return NextResponse.json(result);
  } catch (err) {
    console.error("delete account error:", err);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
