import { steps } from "@/lib/content";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="gradient-section-dark py-24 text-white md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-label">How it works</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
            Up and running in minutes
          </h2>
          <p className="mt-4 text-white/60">
            Four simple steps from board creation to spending insights.
          </p>
        </div>
        <div className="relative mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-8 hidden h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent lg:block" />
          {steps.map((item) => (
            <div key={item.step} className="relative text-center lg:text-left">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 lg:mx-0">
                <span className="text-xl font-extrabold text-gradient-gold">{item.step}</span>
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
