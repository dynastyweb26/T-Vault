import { NextResponse } from "next/server";
import { VOICE_NOTES_ENABLED } from "@/lib/features";

export async function GET() {
  if (!VOICE_NOTES_ENABLED) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}

export async function POST() {
  if (!VOICE_NOTES_ENABLED) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}
