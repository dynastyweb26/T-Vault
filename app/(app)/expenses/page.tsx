"use client";

import { Suspense } from "react";
import { ExpensesView } from "@/components/expenses/expenses-view";

export default function ExpensesPage() {
  return (
    <>
      <div className="px-5 pt-6">
        <h1 className="tv-page-title">Expenses</h1>
      </div>
      <Suspense fallback={<div className="tv-skeleton mx-5 mt-4 h-32 rounded-2xl" />}>
        <ExpensesView />
      </Suspense>
    </>
  );
}
