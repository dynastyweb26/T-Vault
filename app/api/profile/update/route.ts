import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
      return NextResponse.json(
        { error: "Please sign in to update your profile." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const fullName = sanitizeText(String(body.fullName ?? ""));
    const companyName = sanitizeText(String(body.companyName ?? ""));
    const mcNumber = formatMcNumber(String(body.mcNumber ?? ""));
    const dotNumber = formatDotNumber(String(body.dotNumber ?? ""));
    const ein = sanitizeText(String(body.ein ?? ""));
    const truckInfo = sanitizeText(String(body.truckInfo ?? ""));

    const fullNameError = validateTextLength(
      fullName,
      TEXT_LIMITS.fullName,
      "Full name"
    );
    const companyNameError = companyName
      ? validateTextLength(companyName, TEXT_LIMITS.company, "Company name")
      : null;
    const mcError = mcNumber ? validateMcNumber(mcNumber) : null;
    const dotError = dotNumber
      ? validateDotNumber(dotNumber, { required: false })
      : null;
    const truckInfoError =
      truckInfo.length > TEXT_LIMITS.truckInfo
        ? `Truck info must be ${TEXT_LIMITS.truckInfo} characters or fewer.`
        : null;

    if (fullNameError || companyNameError || mcError || dotError || truckInfoError) {
      return NextResponse.json(
        {
          error:
            fullNameError ||
            companyNameError ||
            mcError ||
            dotError ||
            truckInfoError,
        },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update({
        full_name: fullName,
        company_name: companyName || null,
        mc_number: mcNumber || null,
        dot_number: dotNumber || null,
        ein: ein || null,
        truck_info: truckInfo || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("profile update failed:", updateError.message);
      return NextResponse.json(
        {
          error:
            "We could not save your profile. Check your connection and try again.",
        },
        { status: 500 }
      );
    }

    if (!updated) {
      return NextResponse.json(
        {
          error:
            "We could not find your profile. Try signing out and back in.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("profile update error:", err);
    return NextResponse.json(
      {
        error:
          "We could not save your profile. Check your connection and try again.",
      },
      { status: 500 }
    );
  }
}
