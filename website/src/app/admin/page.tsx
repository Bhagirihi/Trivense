import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { adminCookie, isAdminConfigured, readAdminSession } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Admin — Trivense",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const configured = isAdminConfigured();
  const cookieStore = await cookies();
  const isAuthenticated = readAdminSession(cookieStore.get(adminCookie.name)?.value);

  return (
    <div className="gradient-section-dark min-h-screen">
      {!configured ? (
        <div className="mx-auto flex min-h-screen max-w-lg items-center px-5 py-16">
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8 text-white">
            <h1 className="text-xl font-bold">Admin not configured</h1>
            <p className="mt-3 text-sm text-white/70">
              Add <code className="rounded bg-black/30 px-1.5 py-0.5">ADMIN_PASSWORD</code> to{" "}
              <code className="rounded bg-black/30 px-1.5 py-0.5">website/.env.local</code>, then
              restart the dev server.
            </p>
          </div>
        </div>
      ) : isAuthenticated ? (
        <AdminDashboard />
      ) : (
        <div className="flex min-h-screen items-center justify-center px-5 py-16">
          <AdminLoginForm />
        </div>
      )}
    </div>
  );
}
