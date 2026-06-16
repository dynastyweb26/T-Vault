import {
  FileText,
  Fuel,
  Layout,
  LifeBuoy,
  MapPinned,
  MoreHorizontal,
  Phone,
  Shield,
  Truck,
  Wifi,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const TRUCK_EXPENSE_FOLDER = "truck";

export const TRUCK_EXPENSE_CATEGORIES = [
  { id: "insurance", label: "Insurance", icon: Wrench, filter: "insurance" },
  { id: "truck_payment", label: "Truck Payment", icon: Shield, filter: "payments" },
  { id: "trailer", label: "Trailer", icon: Truck, filter: "payments" },
  { id: "registration", label: "Registration", icon: FileText, filter: "other" },
  { id: "fuel", label: "Fuel", icon: Fuel, filter: "fuel" },
  { id: "ifta", label: "IFTA", icon: MapPinned, filter: "ifta" },
  { id: "eld", label: "ELD", icon: Wifi, filter: "ifta" },
  { id: "load_board", label: "Load Board", icon: Layout, filter: "payments" },
  { id: "phone_plan", label: "Phone Plan", icon: Phone, filter: "payments" },
  { id: "roadside", label: "Roadside", icon: LifeBuoy, filter: "other" },
  { id: "other", label: "Other", icon: MoreHorizontal, filter: "other" },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  icon: LucideIcon;
  filter: ExpenseFilterId;
}>;

export type TruckExpenseCategoryId = (typeof TRUCK_EXPENSE_CATEGORIES)[number]["id"];

export const EXPENSE_FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "fuel", label: "Fuel" },
  { id: "insurance", label: "Insurance" },
  { id: "payments", label: "Payments" },
  { id: "ifta", label: "IFTA" },
  { id: "other", label: "Other" },
] as const;

export type ExpenseFilterId = (typeof EXPENSE_FILTER_TABS)[number]["id"];

const PAYMENTS_CATEGORIES = new Set([
  "truck_payment",
  "trailer",
  "phone_plan",
  "load_board",
]);

const IFTA_CATEGORIES = new Set(["ifta", "eld"]);

const OTHER_CATEGORIES = new Set(["registration", "roadside", "other"]);

export function getCategoryMeta(categoryId: string) {
  return (
    TRUCK_EXPENSE_CATEGORIES.find((category) => category.id === categoryId) ?? {
      id: categoryId,
      label: categoryId.replace(/_/g, " "),
      icon: MoreHorizontal,
      filter: "other" as ExpenseFilterId,
    }
  );
}

export function matchesExpenseFilter(
  categoryId: string,
  filter: ExpenseFilterId
): boolean {
  if (filter === "all") return true;
  if (filter === "fuel") return categoryId === "fuel";
  if (filter === "insurance") return categoryId === "insurance";
  if (filter === "payments") return PAYMENTS_CATEGORIES.has(categoryId);
  if (filter === "ifta") return IFTA_CATEGORIES.has(categoryId);
  if (filter === "other") return OTHER_CATEGORIES.has(categoryId);
  return true;
}
