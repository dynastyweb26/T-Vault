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

// TEMP DEBUG (remove after diagnosing profile save failures)
function debugProfileUpdate(label: string, payload: unknown) {
  console.error(`[TEMP DEBUG profile/update] ${label}`, payload);
}

export async function POST(request: Request) {
  try {
    debugProfileUpdate("request:start", { method: request.method });

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      debugProfileUpdate("auth:failed", {
        authError,
        hasUser: Boolean(user),
      });
      return NextResponse.json(
        { error: "Please sign in to update your profile." },
        { status: 401 }
      );
    }

    debugProfileUpdate("auth:ok", { userId: user.id });

    const body = await request.json();
    const fullName = sanitizeText(String(body.fullName ?? ""));
    const companyName = sanitizeText(String(body.companyName ?? ""));
    const mcNumber = formatMcNumber(String(body.mcNumber ?? ""));
    const dotNumber = formatDotNumber(String(body.dotNumber ?? ""));
    const ein = sanitizeText(String(body.ein ?? ""));
    const truckInfo = sanitizeText(String(body.truckInfo ?? ""));

    debugProfileUpdate("payload:sanitized", {
      fullName,
      companyName,
      mcNumber,
      dotNumber,
      ein,
      truckInfo,
    });

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

    debugProfileUpdate("validation:results", {
      fullNameError,
      companyNameError,
      mcError,
      dotError,
      truckInfoError,
    });

    if (fullNameError || companyNameError || mcError || dotError || truckInfoError) {
      debugProfileUpdate("validation:rejected", {
        status: 400,
        error:
          fullNameError ||
          companyNameError ||
          mcError ||
          dotError ||
          truckInfoError,
      });
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

    const updatePayload = {
      full_name: fullName,
      company_name: companyName || null,
      mc_number: mcNumber || null,
      dot_number: dotNumber || null,
      ein: ein || null,
      truck_info: truckInfo || null,
      updated_at: new Date().toISOString(),
    };

    debugProfileUpdate("db:update:start", { userId: user.id, updatePayload });

    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update(updatePayload)
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    debugProfileUpdate("db:update:result", {
      updated,
      updateError,
      updateErrorDetails: updateError
        ? {
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code,
          }
        : null,
    });

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
      debugProfileUpdate("db:update:no-row", {
        userId: user.id,
        note: "Update returned no error but no row — likely RLS blocked write or row missing",
      });
      return NextResponse.json(
        {
          error:
            "We could not find your profile. Try signing out and back in.",
        },
        { status: 404 }
      );
    }

    debugProfileUpdate("request:success", { userId: user.id, updatedId: updated.id });
    return NextResponse.json({ success: true });
  } catch (err) {
    debugProfileUpdate("request:exception", {
      err,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
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
