import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TEXT_LIMITS } from "@/lib/constants";
import {
  formatDotNumber,
  formatMcNumber,
  sanitizeText,
  validateDotNumber,
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
    const skipped = body.skipped === true;

    let payload: Record<string, unknown>;

    if (skipped) {
      payload = {
        profile_setup_skipped: true,
        profile_setup_completed: true,
      };
    } else {
      const fullName = sanitizeText(String(body.fullName ?? ""));
      const companyName = sanitizeText(String(body.companyName ?? ""));
      const mcNumber = formatMcNumber(String(body.mcNumber ?? ""));
      const dotNumber = formatDotNumber(String(body.dotNumber ?? ""));
      const ein = sanitizeText(String(body.ein ?? ""));

      const fullNameError = validateTextLength(
        fullName,
        TEXT_LIMITS.fullName,
        "Full name"
      );
      const companyNameError = validateTextLength(
        companyName,
        TEXT_LIMITS.company,
        "Company name"
      );
      const mcError = validateMcNumber(mcNumber);
      const dotError = validateDotNumber(dotNumber);

      if (fullNameError || companyNameError || mcError || dotError) {
        return NextResponse.json({ error: "validation_failed" }, { status: 400 });
      }

      payload = {
        full_name: fullName,
        company_name: companyName,
        mc_number: mcNumber,
        dot_number: dotNumber,
        ein: ein || null,
        profile_setup_completed: true,
        profile_setup_skipped: false,
      };
    }

    const admin = createAdminClient();

    const { data: updated, error: updateError } = await admin
      .from("users")
      .update(payload)
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("complete-profile-setup failed:", updateError.message);
      return NextResponse.json({ error: "profile_save_failed" }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "profile_missing" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("complete-profile-setup error:", err);
    return NextResponse.json({ error: "profile_save_failed" }, { status: 500 });
  }
}
