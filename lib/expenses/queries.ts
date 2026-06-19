import type { SupabaseClient } from "@supabase/supabase-js";
import type { Expense } from "@/types/jobs";
import { getMonthRange } from "@/lib/dashboard/format";
import { isExpenseInMonth } from "@/lib/dashboard/job-status";
import {
  decodeExpenseCursor,
  DEFAULT_PAGE_SIZE,
  encodeExpenseCursor,
} from "@/lib/pagination/cursor";

export const TRUCK_EXPENSES_PAGE_SIZE = DEFAULT_PAGE_SIZE;

export interface ExpenseSummary {
  totalThisMonth: number;
  perLoadThisMonth: number;
  truckThisMonth: number;
}

export interface FetchTruckExpensesPageOptions {
  cursor?: string | null;
  limit?: number;
}

export interface TruckExpensesPageResult {
  expenses: Expense[];
  nextCursor: string | null;
}

function applyExpenseCursor<T extends { or: (filters: string) => T }>(
  query: T,
  cursor: string | null | undefined
): T {
  if (!cursor) return query;
  const decoded = decodeExpenseCursor(cursor);
  if (!decoded) return query;

  return query.or(
    `created_at.lt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.lt.${decoded.id})`
  );
}

export async function fetchTruckExpensesPage(
  supabase: SupabaseClient,
  userId: string,
  options: FetchTruckExpensesPageOptions = {}
): Promise<TruckExpensesPageResult> {
  const limit = options.limit ?? TRUCK_EXPENSES_PAGE_SIZE;

  let query = supabase
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .is("job_id", null);

  query = applyExpenseCursor(query, options.cursor)
    .order("expense_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  const { data, error } = await query;
  if (error) throw new Error("expenses_fetch_failed");

  const rows = (data ?? []) as Expense[];
  const hasMore = rows.length > limit;
  const expenses = hasMore ? rows.slice(0, limit) : rows;

  const last = expenses[expenses.length - 1];
  const nextCursor =
    hasMore && last?.created_at
      ? encodeExpenseCursor(last.created_at, last.id)
      : null;

  return { expenses, nextCursor };
}

export async function fetchExpensesSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<ExpenseSummary> {
  const { start, end } = getMonthRange();

  const { data, error } = await supabase
    .from("expenses")
    .select("amount, expense_date, created_at, job_id")
    .eq("user_id", userId);

  if (error) throw new Error("expenses_summary_fetch_failed");

  const expenses = (data ?? []) as Pick<
    Expense,
    "amount" | "expense_date" | "created_at" | "job_id"
  >[];

  const truckExpenses = expenses.filter((expense) => expense.job_id === null);
  const perLoadExpenses = expenses.filter((expense) => expense.job_id !== null);

  const truckThisMonth = sumExpensesInMonth(truckExpenses, start, end);
  const perLoadThisMonth = sumExpensesInMonth(perLoadExpenses, start, end);

  return {
    totalThisMonth: truckThisMonth + perLoadThisMonth,
    perLoadThisMonth,
    truckThisMonth,
  };
}

function sumExpensesInMonth(
  expenses: Pick<Expense, "amount" | "expense_date" | "created_at">[],
  start: string,
  end: string
): number {
  return expenses
    .filter((expense) =>
      isExpenseInMonth(expense.expense_date, expense.created_at, start, end)
    )
    .reduce((sum, expense) => sum + expense.amount, 0);
}

export async function deleteTruckExpense(
  supabase: SupabaseClient,
  userId: string,
  expenseId: string
): Promise<void> {
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("user_id", userId)
    .is("job_id", null);

  if (error) throw new Error("expense_delete_failed");
}
