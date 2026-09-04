import { site } from "@/lib/content";

export function TrustBar() {
  return (
    <section className="border-y border-slate-200/80 bg-white py-5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 text-center">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
          Trusted for group travel
        </span>
        <div className="hidden h-4 w-px bg-slate-200 sm:block" />
        {["Boards & budgets", "Real-time sync", "INR-first pricing", "Secure by design"].map(
          (item) => (
            <span key={item} className="text-sm font-medium text-foreground/80">
              {item}
            </span>
          )
        )}
        <a
          href={site.playStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-primary underline-offset-4 hover:text-gold hover:underline"
        >
          Available on Google Play →
        </a>
      </div>
    </section>
  );
}
