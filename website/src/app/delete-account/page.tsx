import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { legalMeta } from "@/lib/legal";
import { site } from "@/lib/content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: `Delete Your Trivense Account — ${site.name}`,
  description: `Request deletion of your ${site.name} account and associated data.`,
  path: "/delete-account",
});

const deletedItems = [
  "Your Trivense profile (display name, email address, and user ID)",
  "Expense boards you solely own, including expenses and categories on those boards",
  "Notification preferences and push tokens linked to your account",
  "Authentication records for your Trivense account",
];

const retainedItems = [
  "Anonymized crash logs and aggregated analytics without personal identifiers",
  "Billing and subscription records required by Google Play or App Store policies (typically up to 7 years)",
  "Information we must retain for legal, tax, or fraud-prevention purposes",
];

export default function DeleteAccountPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-5 py-16 md:py-24">
          <p className="text-sm text-muted">Last updated: {legalMeta.lastUpdated}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Delete your Trivense account
          </h1>
          <p className="mt-4 text-muted">
            {site.name} ·{" "}
            <a
              href={`mailto:${site.supportEmail}`}
              className="text-primary hover:underline"
            >
              {site.supportEmail}
            </a>
          </p>

          <div className="prose prose-slate mt-10 max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-foreground">
                How to request account deletion
              </h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted">
                <li>
                  Email{" "}
                  <a
                    href={`mailto:${site.supportEmail}?subject=Delete%20my%20Trivense%20account`}
                    className="text-primary hover:underline"
                  >
                    {site.supportEmail}
                  </a>{" "}
                  from the email address linked to your Trivense account.
                </li>
                <li>
                  Use the subject line <strong>Delete my Trivense account</strong>.
                </li>
                <li>
                  Include the email address you use to sign in to the Trivense app.
                </li>
                <li>
                  Optional: export your data first from Settings in the Trivense app.
                </li>
              </ol>
              <p className="mt-3 leading-relaxed text-muted">
                We verify ownership and complete deletion within 30 days. You will
                receive a confirmation email when your Trivense account has been
                deleted.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                Data deleted when your account is removed
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
                {deletedItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                Data we may keep after deletion
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
                {retainedItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-3 leading-relaxed text-muted">
                If you shared Trivense boards with others, those boards remain for
                other members. Your name may appear as a former participant until
                they remove you from the board.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                Delete data without deleting your account
              </h2>
              <p className="mt-3 leading-relaxed text-muted">
                To delete specific expense boards or export your data without
                closing your Trivense account, use Settings in the app or email{" "}
                {site.supportEmail} with details of what you want removed.
              </p>
            </section>
          </div>

          <p className="mt-12 text-sm text-muted">
            <Link href="/privacy" className="text-primary hover:underline">
              View full privacy policy
            </Link>
            {" · "}
            <Link href="/" className="text-primary hover:underline">
              Back to home
            </Link>
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}
