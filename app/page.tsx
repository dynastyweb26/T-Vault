import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/lib/constants";

export default function HomePage() {
  redirect(APP_ROUTES.splash);
}
