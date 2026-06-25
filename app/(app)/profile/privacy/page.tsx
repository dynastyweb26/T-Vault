import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/lib/constants";

export default function ProfilePrivacyPage() {
  redirect(APP_ROUTES.privacy);
}
