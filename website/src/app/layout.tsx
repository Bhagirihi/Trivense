import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { DownloadModalProvider } from "@/context/DownloadModalContext";
import { rootMetadata } from "@/lib/seo";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = rootMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN" className={`${manrope.variable} h-full scroll-smooth`}>
      <body className="min-h-full flex flex-col antialiased">
        <DownloadModalProvider>{children}</DownloadModalProvider>
      </body>
    </html>
  );
}
