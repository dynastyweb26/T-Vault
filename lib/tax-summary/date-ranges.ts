export type TaxRangeId =
  | "this_year"
  | "last_year"
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "custom";

export const TAX_RANGE_TABS: { id: TaxRangeId; label: string }[] = [
  { id: "this_year", label: "This Year" },
  { id: "last_year", label: "Last Year" },
  { id: "q1", label: "Q1" },
  { id: "q2", label: "Q2" },
  { id: "q3", label: "Q3" },
  { id: "q4", label: "Q4" },
  { id: "custom", label: "Custom" },
];

export interface TaxDateRange {
  start: string;
  end: string;
  label: string;
}

export function getTaxDateRange(
  rangeId: TaxRangeId,
  customStart?: string,
  customEnd?: string,
  now = new Date()
): TaxDateRange {
  const year = now.getFullYear();

  switch (rangeId) {
    case "this_year":
      return {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
        label: `${year}`,
      };
    case "last_year":
      return {
        start: `${year - 1}-01-01`,
        end: `${year - 1}-12-31`,
        label: `${year - 1}`,
      };
    case "q1":
      return {
        start: `${year}-01-01`,
        end: `${year}-03-31`,
        label: `Q1 ${year}`,
      };
    case "q2":
      return {
        start: `${year}-04-01`,
        end: `${year}-06-30`,
        label: `Q2 ${year}`,
      };
    case "q3":
      return {
        start: `${year}-07-01`,
        end: `${year}-09-30`,
        label: `Q3 ${year}`,
      };
    case "q4":
      return {
        start: `${year}-10-01`,
        end: `${year}-12-31`,
        label: `Q4 ${year}`,
      };
    case "custom":
      return {
        start: customStart ?? `${year}-01-01`,
        end: customEnd ?? now.toISOString().slice(0, 10),
        label: "Custom Range",
      };
    default:
      return {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
        label: `${year}`,
      };
  }
}
