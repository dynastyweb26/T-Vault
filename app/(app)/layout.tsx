import { AppShell } from "@/components/shell/app-shell";
import { RouteGuard } from "@/components/auth/route-guard";
import { NewJobProvider } from "@/components/providers/new-job-provider";
import { AppTourProvider } from "@/components/providers/app-tour-provider";
import { NewJobSheet } from "@/components/jobs/new-job-sheet";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard mode="app">
      <NewJobProvider>
        <AppTourProvider>
          <AppShell>{children}</AppShell>
          <NewJobSheet />
        </AppTourProvider>
      </NewJobProvider>
    </RouteGuard>
  );
}
