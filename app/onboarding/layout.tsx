import { RouteGuard } from "@/components/auth/route-guard";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RouteGuard>{children}</RouteGuard>;
}
