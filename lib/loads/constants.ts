export type LoadsTabId = "active" | "awaiting_payment" | "completed";

export const LOADS_TABS: { id: LoadsTabId; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "awaiting_payment", label: "Awaiting Payment" },
  { id: "completed", label: "Completed" },
];

export const COMPLETED_PAGE_SIZE = 10;
