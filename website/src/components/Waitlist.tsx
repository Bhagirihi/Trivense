"use client";

import { useState } from "react";
import { site } from "@/lib/content";

export function Waitlist() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setStatus("success");
      setMessage("You're on the list! We'll email you when Trivense launches on iOS.");
      setName("");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to join waitlist");
    }
  }

  return (
    <section id="waitlist" className="pb-24 md:pb-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="gradient-hero relative overflow-hidden rounded-[2rem] px-6 py-14 md:px-14 md:py-20">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative mx-auto grid max-w-4xl gap-10 lg:grid-cols-2 lg:items-center">
            <div className="text-left">
              <p className="section-label">Early access</p>
              <h2 className="mt-3 text-3xl font-extrabold text-white md:text-4xl">
                Get launch updates
              </h2>
              <p className="mt-4 text-white/70">
                Android is live on Google Play. Join the waitlist for iOS beta invites and product
                news.
              </p>
              <a
                href={site.playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold-light hover:underline"
              >
                Or download on Android now →
              </a>
            </div>
            <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 text-left md:p-8">
              <input
                type="text"
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="btn-primary mt-4 w-full rounded-xl py-3.5 text-sm disabled:opacity-70"
              >
                {status === "loading" ? "Joining…" : "Join waitlist"}
              </button>
              {message ? (
                <p
                  className={`mt-4 text-sm ${
                    status === "error" ? "text-red-600" : "text-emerald-700"
                  }`}
                >
                  {message}
                </p>
              ) : null}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
