"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ProPaywall,
  type ProPaywallProps,
  type ProPaywallStats,
} from "@/components/pro/pro-paywall";

type OpenPaywallOptions = Omit<ProPaywallProps, "open" | "onClose">;

type ProPaywallContextValue = {
  openPaywall: (options?: OpenPaywallOptions) => void;
  closePaywall: () => void;
};

const ProPaywallContext = createContext<ProPaywallContextValue | undefined>(
  undefined
);

export function ProPaywallProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<OpenPaywallOptions>({});

  const closePaywall = useCallback(() => {
    setOpen(false);
    setOptions({});
  }, []);

  const openPaywall = useCallback((nextOptions: OpenPaywallOptions = {}) => {
    setOptions(nextOptions);
    setOpen(true);
  }, []);

  const value = useMemo(
    () => ({ openPaywall, closePaywall }),
    [closePaywall, openPaywall]
  );

  return (
    <ProPaywallContext.Provider value={value}>
      {children}
      <ProPaywall open={open} onClose={closePaywall} {...options} />
    </ProPaywallContext.Provider>
  );
}

export function useProPaywall() {
  const context = useContext(ProPaywallContext);
  if (!context) {
    throw new Error("useProPaywall must be used within ProPaywallProvider");
  }
  return context;
}

export type { ProPaywallStats, OpenPaywallOptions };
