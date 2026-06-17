import { notFound } from "next/navigation";
import { VoiceNoteView } from "@/components/voice-note/voice-note-view";
import { AppHeader } from "@/components/shell/app-header";
import { VOICE_NOTES_ENABLED } from "@/lib/features";

export default function VoiceNotePage() {
  if (!VOICE_NOTES_ENABLED) notFound();

  return (
    <>
      <AppHeader title="Voice Note" subtitle="Hands-free logging" />
      <VoiceNoteView />
    </>
  );
}
