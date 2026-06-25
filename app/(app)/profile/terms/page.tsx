import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/lib/constants";

export default function ProfileTermsPage() {
  redirect(APP_ROUTES.terms);
}
