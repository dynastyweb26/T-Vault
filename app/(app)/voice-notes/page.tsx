import { notFound } from "next/navigation";
import { VoiceNotesHistoryView } from "@/components/voice-note/voice-notes-history-view";
import { VOICE_NOTES_ENABLED } from "@/lib/features";

export default function VoiceNotesPage() {
  if (!VOICE_NOTES_ENABLED) notFound();

  return <VoiceNotesHistoryView />;
}
