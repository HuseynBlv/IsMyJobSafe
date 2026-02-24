"use client";

interface Props {
    title: string;
    description: string;
    className?: string;
}

export default function LockedBlurCard({ title, description, className }: Props) {
    return (
        <div className={`relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 ${className}`}>
            {/* Header (Visible) */}
            <div className="relative z-20 flex items-start justify-between gap-4 mb-3 pointer-events-none">
                <div>
                    <h3 className="text-sm font-semibold text-white">{title}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{description}</p>
                </div>
            </div>

            {/* Blurred Content Mockup */}
            <div className="space-y-2 select-none pointer-events-none filter blur-sm opacity-30" aria-hidden="true">
                <div className="h-2 w-3/4 bg-indigo-200/20 rounded-full" />
                <div className="h-2 w-full bg-indigo-200/20 rounded-full" />
                <div className="h-2 w-5/6 bg-indigo-200/20 rounded-full" />
                <div className="h-2 w-2/3 bg-indigo-200/20 rounded-full" />
            </div>

            {/* Overlay */}
            <div className="absolute inset-x-0 inset-y-0 backdrop-blur-[2px] bg-black/10 flex flex-col items-center justify-center text-center p-4 z-10 transition-all hover:bg-black/20 group cursor-not-allowed">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center mb-2 shadow-inner shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                    </svg>
                </div>
                <span className="text-xs font-bold text-indigo-300 tracking-wider uppercase drop-shadow-md">
                    Premium Content
                </span>
            </div>
        </div>
    );
}
