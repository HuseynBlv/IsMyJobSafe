import Link from "next/link";

export default function Navbar() {
    return (
        <header className="w-full px-6 py-4 flex items-center justify-between border-b border-[var(--border)]">
            <Link href="/" className="flex items-center gap-2 group">
                <span className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xs font-bold">
                    AI
                </span>
                <span className="font-semibold text-base tracking-tight text-white">
                    IsMyJob<span className="text-indigo-400">Safe</span>
                </span>
            </Link>

            <Link
                href="/upgrade"
                className="btn btn-sm btn-outline border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-400"
            >
                Unlock Full Report
            </Link>
        </header>
    );
}
