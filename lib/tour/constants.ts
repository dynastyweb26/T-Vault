export const TOUR_TARGET = {
  dashboardRevenue: "dashboard-revenue",
  dashboardQuickActions: "dashboard-quick-actions",
  dashboardLedgerInsight: "dashboard-ledger-insight",
  dashboardCostPerMile: "dashboard-cost-per-mile",
  dashboardNeedsAttention: "dashboard-needs-attention",
  loadsSearchTabs: "loads-search-tabs",
  loadsJobCard: "loads-job-card",
  jobFolderDetails: "job-folder-details",
  jobFolderDetention: "job-folder-detention",
  expensesSummary: "expenses-summary",
  expensesRow: "expenses-row",
  addExpenseForm: "add-expense-form",
  taxSummaryOverview: "tax-summary-overview",
  profileSettings: "profile-settings",
  profileInvite: "profile-invite",
} as const;

export type TourTargetId = (typeof TOUR_TARGET)[keyof typeof TOUR_TARGET];

export const TOUR_STEP_COUNT = 15;

/** Page-level steps 7–14 force bottom placement with flip disabled (app-tour-provider). */
export const TOUR_FORCE_BOTTOM_FROM_INDEX = 7;

export interface TourStepContent {
  target: TourTargetId;
  content: string;
  placement?: "top" | "bottom" | "left" | "right" | "auto";
}

export const TOUR_STEP_CONTENT: TourStepContent[] = [
  {
    target: TOUR_TARGET.dashboardRevenue,
    content:
      "This is your home base — see your revenue stream, completed loads, and active period at a glance.",
    placement: "bottom",
  },
  {
    target: TOUR_TARGET.dashboardQuickActions,
    content:
      "Quick actions: log a new load, check load status, or jump to your metrics — all from here.",
    placement: "bottom",
  },
  {
    target: TOUR_TARGET.dashboardLedgerInsight,
    content: "Ledger Insight flags when expenses are outpacing revenue.",
    placement: "top",
  },
  {
    target: TOUR_TARGET.dashboardCostPerMile,
    content:
      "Cost Per Mile tracks your real cost — tap it weekly to beat your number.",
    placement: "top",
  },
  {
    target: TOUR_TARGET.dashboardNeedsAttention,
    content:
      "Anything needing action — like missing documents — shows up here first.",
    placement: "top",
  },
  {
    target: TOUR_TARGET.loadsSearchTabs,
    content:
      "Find any load instantly, and filter by Active, Awaiting Payment, or Completed.",
    placement: "bottom",
  },
  {
    target: TOUR_TARGET.loadsJobCard,
    content:
      "Each card shows your route, broker, and document progress — tap to open the full job folder.",
    placement: "top",
  },
  {
    target: TOUR_TARGET.jobFolderDetails,
    content:
      "Edit any field directly, and upload your Rate Confirmation, BOL, and POD here — or generate your invoice once you're done.",
    placement: "bottom",
  },
  {
    target: TOUR_TARGET.jobFolderDetention,
    content:
      "Brokers owe you after 2 hours of waiting — log detention time here so you don't leave money on the table.",
    placement: "bottom",
  },
  {
    target: TOUR_TARGET.expensesSummary,
    content:
      "Track your truck costs separately from per-load expenses. Tap Add Truck Expense to log one.",
    placement: "bottom",
  },
  {
    target: TOUR_TARGET.expensesRow,
    content: "Swipe left on any expense to delete it.",
    placement: "bottom",
  },
  {
    target: TOUR_TARGET.addExpenseForm,
    content:
      "Pick a category, snap or upload a receipt, and save — it's logged in seconds.",
    placement: "bottom",
  },
  {
    target: TOUR_TARGET.taxSummaryOverview,
    content:
      "Your tax-ready numbers, broken down by year or quarter — including expense category breakdown and a load-by-load summary.",
    placement: "bottom",
  },
  {
    target: TOUR_TARGET.profileSettings,
    content:
      "Manage your app settings, get help, or review your privacy info — all from your Profile.",
    placement: "bottom",
  },
  {
    target: TOUR_TARGET.profileInvite,
    content: "Invite other drivers and share your code right from here.",
    placement: "bottom",
  },
];

export function tourSelector(target: TourTargetId): string {
  return `[data-tour="${target}"]`;
}
