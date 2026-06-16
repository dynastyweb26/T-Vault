"use client";

import { ExpensesView } from "@/components/expenses/expenses-view";

export default function ExpensesPage() {
  return (
    <>
      <div className="px-5 pt-6">
        <h1 className="tv-page-title">Expenses</h1>
      </div>
      <ExpensesView />
    </>
  );
}
