import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "IsMyJobSafe — AI Career Risk Analysis",
  description:
    "Analyze your career resilience against AI automation in under 60 seconds. Paste your LinkedIn profile or CV and get an instant replaceability score.",
  openGraph: {
    title: "IsMyJobSafe — AI Career Risk Analysis",
    description: "Find out how replaceable your role is in the age of AI.",
    siteName: "IsMyJobSafe",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark">
      <body className="flex min-h-dvh flex-col antialiased">
        <div className="flex-1">{children}</div>
        <footer className="border-t border-[var(--border)] px-4 py-5 sm:px-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
            <p>AI-generated career analysis for informational use only.</p>
            <nav className="flex items-center gap-4">
              <Link href="/contact" className="transition hover:text-white">
                Contact
              </Link>
              <Link href="/privacy" className="transition hover:text-white">
                Privacy
              </Link>
              <Link href="/terms" className="transition hover:text-white">
                Terms
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
