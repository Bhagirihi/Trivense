import Link from "next/link";
import { site } from "@/lib/content";
import { BrandLogo } from "@/components/BrandLogo";
import { GetAppButton } from "@/components/GetAppButton";

const nav = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[var(--header-bg)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link href="/" className="group flex items-center gap-3">
          <BrandLogo size={40} priority className="shadow-md transition group-hover:shadow-lg" />
          <span className="text-lg font-bold tracking-tight text-white">{site.name}</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-white/70 transition hover:text-gold-light"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <GetAppButton className="hidden rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-gold/40 hover:text-gold-light sm:inline-flex">
            Get the app
          </GetAppButton>
          <a href="#waitlist" className="btn-primary rounded-full px-4 py-2 text-sm">
            Join waitlist
          </a>
        </div>
      </div>
    </header>
  );
}
