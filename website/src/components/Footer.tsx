import Link from "next/link";
import { site } from "@/lib/content";
import { BrandLogo } from "@/components/BrandLogo";
import { GetAppButton } from "@/components/GetAppButton";

const footerLinks = {
  product: [
    { href: "/#features", label: "Features" },
    { href: "/#how-it-works", label: "How it works" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/#faq", label: "FAQ" },
    { href: "/#waitlist", label: "Waitlist" },
  ],
  legal: [
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
    { href: "/ads", label: "Advertising" },
    { href: "/delete-account", label: "Delete account" },
  ],
  connect: [
    { href: "/download", label: "Download" },
    { href: `mailto:${site.supportEmail}`, label: site.supportEmail },
  ],
};

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold/80">{title}</p>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-white/60 transition hover:text-gold-light"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="gradient-section-dark border-t border-white/[0.06] text-white">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <BrandLogo size={48} />
              <div>
                <p className="text-xl font-bold">{site.name}</p>
                <p className="text-sm text-white/45">Split expenses, made easy.</p>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/55">
              Expense boards, real-time sync, and smart analytics for travelers and groups —
              built for India and beyond.
            </p>
            <GetAppButton className="btn-primary mt-6 rounded-xl px-5 py-2.5 text-sm">
              Get the app
            </GetAppButton>
          </div>
          <FooterColumn title="Product" links={footerLinks.product} />
          <FooterColumn title="Legal" links={footerLinks.legal} />
          <FooterColumn title="Connect" links={footerLinks.connect} />
        </div>
      </div>
      <div className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-5 text-xs text-white/40 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <p>Available on Android · iOS coming soon</p>
        </div>
      </div>
    </footer>
  );
}
