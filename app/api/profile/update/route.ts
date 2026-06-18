import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TEXT_LIMITS } from "@/lib/constants";
import {
  formatMcNumber,
  sanitizeText,
  validateMcNumber,
  validateTextLength,
} from "@/lib/validation";

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

    const body = await request.json();
    const fullName = sanitizeText(String(body.fullName ?? ""));
    const mcNumber = formatMcNumber(String(body.mcNumber ?? ""));
    const ein = sanitizeText(String(body.ein ?? ""));
    const truckInfo = sanitizeText(String(body.truckInfo ?? ""));

    const fullNameError = validateTextLength(
      fullName,
      TEXT_LIMITS.fullName,
      "Full name"
    );
    const mcError = mcNumber ? validateMcNumber(mcNumber) : null;
    const truckInfoError =
      truckInfo.length > TEXT_LIMITS.truckInfo
        ? `Truck info must be ${TEXT_LIMITS.truckInfo} characters or fewer.`
        : null;

    if (fullNameError || mcError || truckInfoError) {
      return NextResponse.json(
        { error: fullNameError || mcError || truckInfoError },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update({
        full_name: fullName,
        mc_number: mcNumber || null,
        ein: ein || null,
        truck_info: truckInfo || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("profile update failed:", updateError.message);
      return NextResponse.json({ error: "profile_save_failed" }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "profile_missing" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("profile update error:", err);
    return NextResponse.json({ error: "profile_save_failed" }, { status: 500 });
  }
}
