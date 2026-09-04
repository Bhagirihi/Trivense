import { faqs } from "@/lib/content";

export function FAQ() {
  return (
    <section id="faq" className="mesh-bg py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-5">
        <div className="text-center">
          <p className="section-label">FAQ</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Common questions
          </h2>
        </div>
        <div className="mt-12 space-y-3">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group premium-card rounded-2xl p-6 open:border-gold/20 open:shadow-lg"
            >
              <summary className="cursor-pointer list-none font-semibold text-foreground marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/5 text-lg font-light text-primary transition group-open:rotate-45 group-open:bg-gold/10 group-open:text-gold">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-relaxed text-muted">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
