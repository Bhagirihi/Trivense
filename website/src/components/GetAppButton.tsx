"use client";

import { useDownloadModal } from "@/context/DownloadModalContext";

type GetAppButtonProps = {
  className?: string;
  children?: React.ReactNode;
};

export function GetAppButton({
  className = "",
  children = "Get the app",
}: GetAppButtonProps) {
  const { openDownloadModal } = useDownloadModal();

  return (
    <button type="button" onClick={openDownloadModal} className={className}>
      {children}
    </button>
  );
}
