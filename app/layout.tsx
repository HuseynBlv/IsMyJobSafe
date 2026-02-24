import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

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
    <html lang="en" data-theme="dark" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
