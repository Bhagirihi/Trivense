import { site, trustBadges } from "@/lib/content";

const expenses = [
  { label: "Hotel stay", amount: "₹6,000", cat: "Travel", dot: "bg-accent" },
  { label: "Restaurant dinner", amount: "₹1,826", cat: "Food", dot: "bg-gold" },
  { label: "Local tour", amount: "₹2,449", cat: "Travel", dot: "bg-accent" },
];

export function Hero() {
  return (
    <section className="gradient-hero relative overflow-hidden pb-24 pt-14 md:pb-32 md:pt-20">
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-60" />
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-gold-light">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-light shadow-[0_0_8px_rgba(232,197,71,0.8)]" />
            Expense tracking for travelers
          </p>
          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-white md:text-5xl lg:text-[3.5rem]">
            Split expenses,{" "}
            <span className="text-gradient-gold">made easy.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">{site.description}</p>
          <div className="mt-9 flex flex-wrap gap-4">
            <a
              href={site.playStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm"
            >
              <PlayIcon />
              Download on Android
            </a>
            <a
              href="#features"
              className="btn-secondary inline-flex items-center rounded-xl px-7 py-3.5 text-sm font-semibold text-white"
            >
              Explore features
            </a>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2">
            {trustBadges.map((badge) => (
              <span
                key={badge}
                className="flex items-center gap-2 text-sm text-white/60"
              >
                <span className="text-gold">✓</span>
                {badge}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[320px] lg:max-w-none lg:justify-self-end">
          <div className="animate-float phone-glow relative rounded-[2.75rem] border border-white/10 bg-[#000810] p-3">
            <div className="absolute left-1/2 top-4 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
            <div className="glass-card overflow-hidden rounded-[2.25rem]">
              <div className="relative overflow-hidden px-6 pb-7 pt-12">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-dark via-primary to-primary-light" />
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold/20 blur-2xl" />
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                    Total budget left
                  </p>
                  <p className="mt-1 text-4xl font-extrabold tracking-tight text-gradient-gold">
                    ₹42,350
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-white/80">Europe Trip 2025</p>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-gold to-gold-light" />
                  </div>
                </div>
              </div>
              <div className="space-y-2.5 bg-surface-elevated p-4">
                {expenses.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-xl border border-slate-100/80 bg-white p-3.5 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`h-2 w-2 rounded-full ${row.dot}`} />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{row.label}</p>
                        <p className="text-xs text-muted">{row.cat}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-primary">{row.amount}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3.6 1.8A1.2 1.2 0 002 3v18a1.2 1.2 0 001.6 1.2l13.2-7.8a1.2 1.2 0 000-2.04L3.6 1.8z" />
    </svg>
  );
}
