"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { site } from "@/lib/content";

type DownloadModalProps = {
  open: boolean;
  onClose: () => void;
};

export function DownloadModal({ open, onClose }: DownloadModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  const downloadUrl = useMemo(() => {
    if (typeof window === "undefined") return `${site.url}/download`;
    return `${window.location.origin}/download`;
  }, [open]);

  useEffect(() => {
    if (!open) return;

    QRCode.toDataURL(downloadUrl, {
      width: 240,
      margin: 1,
      color: { dark: "#000810", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, downloadUrl, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#001525]/80 backdrop-blur-sm"
        aria-label="Close download dialog"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#000810] text-xl text-white shadow-lg transition hover:bg-primary"
          aria-label="Close"
        >
          ×
        </button>
        <h2 id="download-modal-title" className="text-center text-2xl font-extrabold text-foreground">
          Download the {site.name} app
        </h2>
        <p className="mt-3 text-center text-sm leading-relaxed text-muted">
          Scan the QR code below to continue to the app store.
        </p>
        <div className="mx-auto mt-8 flex h-[260px] w-[260px] items-center justify-center rounded-2xl border border-slate-100 bg-white p-3 shadow-inner">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="QR code to download Trivense" className="h-[240px] w-[240px]" />
          ) : (
            <div className="h-[240px] w-[240px] animate-pulse rounded-xl bg-slate-100" />
          )}
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Android available now on Google Play. iOS coming soon.
        </p>
        <div className="mt-4 flex flex-col items-center gap-3">
          <a
            href={site.playStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary rounded-xl px-6 py-3 text-sm"
          >
            Open Google Play
          </a>
          <Link href="/download" className="text-sm font-medium text-primary hover:text-gold">
            Visit {site.name.toLowerCase()}.app/download
          </Link>
        </div>
      </div>
    </div>
  );
}
