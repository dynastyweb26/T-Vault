import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateReferralCode } from "@/lib/referral";
import { TEXT_LIMITS } from "@/lib/constants";
import { sanitizeText, validateReferralCode, validateTextLength } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You need to be signed in before we can finish setting up your account." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const rawName = (body.fullName as string | undefined)?.trim() || "Driver";
    const fullNameError = validateTextLength(
      rawName,
      TEXT_LIMITS.fullName,
      "Full name"
    );
    if (fullNameError) {
      return NextResponse.json({ error: fullNameError }, { status: 400 });
    }
    const fullName = sanitizeText(rawName);

    const referredByInput = (body.referredBy as string | undefined)?.trim().toUpperCase();
    if (referredByInput) {
      const referralError = validateReferralCode(referredByInput);
      if (referralError) {
        return NextResponse.json({ error: referralError }, { status: 400 });
      }
    }

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, alreadyExists: true });
    }

    let referralCode = generateReferralCode(fullName);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data: duplicate } = await admin
        .from("users")
        .select("id")
        .eq("referral_code", referralCode)
        .maybeSingle();

      if (!duplicate) break;
      referralCode = generateReferralCode(fullName);
    }

    let referredBy: string | null = null;
    if (referredByInput) {
      const { data: referrer } = await admin
        .from("users")
        .select("referral_code")
        .eq("referral_code", referredByInput)
        .maybeSingle();

      if (referrer?.referral_code) {
        referredBy = referrer.referral_code;
      }
    }

    const { error: insertError } = await admin.from("users").insert({
      id: user.id,
      email: user.email,
      full_name: fullName,
      referral_code: referralCode,
      referred_by: referredBy,
      onboarding_completed: false,
      profile_setup_completed: false,
      profile_setup_skipped: false,
      streak_days: 1,
      last_active_date: new Date().toISOString().slice(0, 10),
    });

    if (insertError) {
      console.error("complete-signup insert failed:", insertError.message);
      return NextResponse.json(
        {
          error:
            "We could not save your profile yet. Check your connection and try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, referralCode });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong while creating your account. Please try again." },
      { status: 500 }
    );
  }
}
