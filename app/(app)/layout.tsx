import { AppShell } from "@/components/shell/app-shell";
import { RouteGuard } from "@/components/auth/route-guard";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard mode="app">
      <AppShell>{children}</AppShell>
    </RouteGuard>
  );
}
