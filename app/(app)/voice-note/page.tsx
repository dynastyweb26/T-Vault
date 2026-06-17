import { VoiceNoteView } from "@/components/voice-note/voice-note-view";
import { AppHeader } from "@/components/shell/app-header";

export default function VoiceNotePage() {
  return (
    <>
      <AppHeader title="Voice Note" subtitle="Hands-free logging" />
      <VoiceNoteView />
    </>
  );
}
