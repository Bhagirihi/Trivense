import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { legalMeta } from "@/lib/legal";

type Section = {
  title: string;
  body: string | string[];
  id?: string;
};

export function LegalPage({
  title,
  sections,
}: {
  title: string;
  sections: Section[];
}) {
  return (
    <>
      <Header />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-5 py-16 md:py-24">
          <p className="text-sm text-muted">
            Last updated: {legalMeta.lastUpdated}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-muted">
            {legalMeta.company} ·{" "}
            <a
              href={`mailto:${legalMeta.email}`}
              className="text-primary hover:underline"
            >
              {legalMeta.email}
            </a>
          </p>

          <div className="prose prose-slate mt-10 max-w-none space-y-8">
            {sections.map((section) => (
              <section key={section.title} id={section.id}>
                <h2 className="text-xl font-semibold text-foreground">
                  {section.title}
                </h2>
                {Array.isArray(section.body) ? (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
                    {section.body.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 leading-relaxed text-muted">
                    {section.body}
                  </p>
                )}
              </section>
            ))}
          </div>

          <p className="mt-12 text-sm text-muted">
            <Link href="/" className="text-primary hover:underline">
              ← Back to home
            </Link>
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}
