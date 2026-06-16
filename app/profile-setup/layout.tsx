import { RouteGuard } from "@/components/auth/route-guard";

export default function ProfileSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RouteGuard>{children}</RouteGuard>;
}
