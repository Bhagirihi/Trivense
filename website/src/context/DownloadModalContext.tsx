"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { DownloadModal } from "@/components/DownloadModal";

type DownloadModalContextValue = {
  openDownloadModal: () => void;
  closeDownloadModal: () => void;
};

const DownloadModalContext = createContext<DownloadModalContextValue | null>(null);

export function DownloadModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const openDownloadModal = useCallback(() => setOpen(true), []);
  const closeDownloadModal = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ openDownloadModal, closeDownloadModal }),
    [openDownloadModal, closeDownloadModal]
  );

  return (
    <DownloadModalContext.Provider value={value}>
      {children}
      <DownloadModal open={open} onClose={closeDownloadModal} />
    </DownloadModalContext.Provider>
  );
}

export function useDownloadModal() {
  const context = useContext(DownloadModalContext);
  if (!context) {
    throw new Error("useDownloadModal must be used within DownloadModalProvider");
  }
  return context;
}
