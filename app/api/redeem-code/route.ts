import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  redeemCodeErrorMessage,
  redeemProCode,
} from "@/lib/pro-access";

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

    const body = await request.json().catch(() => ({}));
    const code = String((body as { code?: unknown }).code ?? "").trim();

    if (!code || code.length > 64) {
      return NextResponse.json({ error: "invalid_code" }, { status: 400 });
    }

    const result = await redeemProCode(supabase, code);

    if (!result.ok) {
      const status =
        result.error === "unauthorized"
          ? 401
          : result.error === "too_many_attempts"
            ? 429
            : 400;

      return NextResponse.json(
        {
          error: result.error,
          message: redeemCodeErrorMessage(result.error),
        },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      alreadyRedeemed: result.alreadyRedeemed,
      hasProAccess: result.hasProAccess,
    });
  } catch (err) {
    console.error("redeem-code route error:", err);
    return NextResponse.json({ error: "redeem_failed" }, { status: 500 });
  }
}
