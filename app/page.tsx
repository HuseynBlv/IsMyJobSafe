"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

const MAX_PDF_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const PLACEHOLDER = `Senior Backend Engineer at Acme Corp
Led API development for payment processing platform (3M+ daily transactions)
Improved system performance by 40% through query optimisation
Managed team of 4 engineers, defined technical roadmap
Stack: Python, PostgreSQL, Redis, AWS`;

interface ParsePdfResponse {
  success: boolean;
  text?: string;
  error?: string;
  code?: string;
}

export default function Home() {
  const [profile, setProfile] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const text = profile.trim();
    if (text.length < 20) {
      setError("Please paste at least a short description of your role.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: text,
          targetRole: targetRole.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? "Analysis failed. Please try again.");
        return;
      }

      if (!json.analysisId) {
        setError("Your analysis finished, but we couldn't save it. Please try again.");
        return;
      }

      router.push(`/result?analysisId=${encodeURIComponent(json.analysisId)}`);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdfByName = file.name.toLowerCase().endsWith(".pdf");
    if (isPdfByName) {
      if (file.type !== "application/pdf") {
        setError("Unsupported PDF type. Please export your resume as a standard PDF file.");
        if (fileRef.current) fileRef.current.value = "";
        return;
      }

      if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
        setError("PDF is too large. Maximum allowed size is 5 MB.");
        if (fileRef.current) fileRef.current.value = "";
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/parse-pdf", {
          method: "POST",
          body: formData,
        });

        const json = (await res.json()) as ParsePdfResponse;
        if (!res.ok || !json.success) {
          setError(
            json.error ??
              "Could not read this PDF. Try a text-based PDF or paste your resume manually."
          );
          return;
        }

        setProfile(json.text ?? "");
      } catch {
        setError("Network error parsing PDF. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      // Fallback for plain text files
      const isTextFile =
        file.type.startsWith("text/") || /\.(txt|md)$/i.test(file.name);

      if (!isTextFile) {
        setError("Unsupported file type. Upload a PDF, TXT, or MD file.");
        if (fileRef.current) fileRef.current.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text === "string") setProfile(text);
      };
      reader.readAsText(file);
    }

    // Reset file input
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  return (
    <div className="min-h-dvh flex flex-col hero-glow">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24">
        {/* ── Hero text ── */}
        <div className="text-center mb-12 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            No signup required
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4 leading-tight">
            Paste your LinkedIn.{" "}
            <span className="text-indigo-400">See your AI Risk.</span>
          </h1>

          <p className="text-base sm:text-lg text-[var(--text-muted)] leading-relaxed">
            Analyze your career resilience against AI automation in under 60 seconds.
          </p>
        </div>

        {/* ── Input card ── */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl flex flex-col gap-4"
          id="analyze-form"
        >
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-xl shadow-black/30">
            <label htmlFor="profile-input" className="sr-only">
              Paste your LinkedIn profile or CV text here
            </label>
            <textarea
              id="profile-input"
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              placeholder={PLACEHOLDER}
              rows={10}
              className="w-full bg-transparent resize-none rounded-xl px-5 pt-4 pb-3 text-sm text-white/90 placeholder-[var(--text-muted)] focus:outline-none leading-relaxed"
              style={{ minHeight: "260px" }}
              disabled={loading}
            />

            {/* ── Bottom bar ── */}
            <div className="flex items-center justify-between px-4 pb-3 pt-1 gap-3 border-t border-[var(--border)]">
              {/* Upload */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-indigo-400 font-medium"
                disabled={loading}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8.5 7.5M12 4l3.5 3.5"
                  />
                </svg>
                Upload resume (.txt, .pdf)
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.pdf,application/pdf"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Char count */}
              <span className="text-xs text-[var(--text-muted)] tabular-nums">
                {profile.length.toLocaleString()} chars
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <label htmlFor="target-role-input" className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
              Role To Optimize For (Optional)
            </label>
            <input
              id="target-role-input"
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="Staff Backend Engineer, Product Manager, ML Engineer..."
              maxLength={120}
              disabled={loading}
              className="w-full h-11 rounded-xl bg-white/[0.04] border border-[var(--border)] px-4 text-sm text-white/90 placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500/40 transition-colors"
            />
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Leave this blank to optimize the plan for your current role. Fill it in if you want the roadmap aimed at a role you want to move into.
            </p>
          </div>

          {/* ── Error ── */}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            >
              {error}
            </div>
          )}

          {/* ── CTA ── */}
          <button
            type="submit"
            id="analyze-btn"
            disabled={loading || profile.trim().length < 20}
            className="btn w-full h-12 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 border-none text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-900/30"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="loading loading-spinner loading-sm" />
                Analyzing your career…
              </span>
            ) : (
              "Analyze My Career"
            )}
          </button>

          <p className="text-center text-xs text-[var(--text-muted)]">
            Analysis runs instantly. Your profile powers your personal report.
          </p>
        </form>
      </main>
    </div>
  );
}
