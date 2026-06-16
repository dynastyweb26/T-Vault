"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface NewJobContextValue {
  open: boolean;
  openSheet: () => void;
  closeSheet: () => void;
}

const NewJobContext = createContext<NewJobContextValue | undefined>(undefined);

export function NewJobProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const openSheet = useCallback(() => setOpen(true), []);
  const closeSheet = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, openSheet, closeSheet }),
    [open, openSheet, closeSheet]
  );

  return (
    <NewJobContext.Provider value={value}>{children}</NewJobContext.Provider>
  );
}

export function useNewJobSheet() {
  const ctx = useContext(NewJobContext);
  if (!ctx) {
    throw new Error("useNewJobSheet must be used within NewJobProvider");
  }
  return ctx;
}
