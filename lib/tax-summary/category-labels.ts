import { TRUCK_EXPENSE_CATEGORIES } from "@/lib/expenses/constants";
import { JOB_EXPENSE_CATEGORIES } from "@/lib/job-folder/constants";

const TRUCK_TAX_PDF_LABELS: Record<
  (typeof TRUCK_EXPENSE_CATEGORIES)[number]["id"],
  string
> = {
  insurance: "Insurance",
  truck_payment: "Truck Payment (loan/lease interest)",
  trailer: "Trailer",
  registration: "Registration & Permits",
  fuel: "Fuel",
  ifta: "IFTA (fuel tax)",
  eld: "ELD (Software/Equipment)",
  load_board: "Load Board (Software subscription)",
  phone_plan: "Phone Plan",
  roadside: "Roadside Assistance",
  other: "Other",
};

const JOB_CATEGORY_LABELS = Object.fromEntries(
  JOB_EXPENSE_CATEGORIES.map((category) => [category.id, category.label])
) as Record<(typeof JOB_EXPENSE_CATEGORIES)[number]["id"], string>;

export function getTaxSummaryExpenseLabel(categoryId: string): string | null {
  if (categoryId in TRUCK_TAX_PDF_LABELS) {
    return TRUCK_TAX_PDF_LABELS[categoryId as keyof typeof TRUCK_TAX_PDF_LABELS];
  }

  if (categoryId in JOB_CATEGORY_LABELS) {
    return JOB_CATEGORY_LABELS[categoryId as keyof typeof JOB_CATEGORY_LABELS];
  }

  return null;
}
