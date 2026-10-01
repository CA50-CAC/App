import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { appEnv } from "@/lib/env";
import { t } from "@/lib/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: t("app.name"), template: `%s · ${t("app.name")}` },
  description: t("app.tagline"),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1215" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const demo = appEnv().demoMode;
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only rounded-xl bg-accent px-4 py-3 font-medium text-accent-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
        >
          {t("common.skipToContent")}
        </a>
        {demo ? (
          <p className="border-b border-warning bg-warning-soft px-4 py-2 text-center text-sm font-medium text-warning">
            {t("common.demoBanner")}
          </p>
        ) : null}
        {children}
      </body>
    </html>
  );
}
