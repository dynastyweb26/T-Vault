import type { SupabaseClient } from "@supabase/supabase-js";
import type { Expense } from "@/types/jobs";
import { getMonthRange } from "@/lib/dashboard/format";
import { isExpenseInMonth } from "@/lib/dashboard/job-status";

export interface ExpenseSummary {
  totalThisMonth: number;
  perLoadThisMonth: number;
  truckThisMonth: number;
}

export interface ExpensesPageData {
  truckExpenses: Expense[];
  summary: ExpenseSummary;
}

export async function fetchExpensesPageData(
  supabase: SupabaseClient,
  userId: string
): Promise<ExpensesPageData> {
  const { start, end } = getMonthRange();

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error("expenses_fetch_failed");

  const expenses = (data ?? []) as Expense[];
  const truckExpenses = expenses.filter((expense) => expense.job_id === null);
  const perLoadExpenses = expenses.filter((expense) => expense.job_id !== null);

  const truckThisMonth = sumExpensesInMonth(truckExpenses, start, end);
  const perLoadThisMonth = sumExpensesInMonth(perLoadExpenses, start, end);

  return {
    truckExpenses,
    summary: {
      totalThisMonth: truckThisMonth + perLoadThisMonth,
      perLoadThisMonth,
      truckThisMonth,
    },
  };
}

function sumExpensesInMonth(
  expenses: Expense[],
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
