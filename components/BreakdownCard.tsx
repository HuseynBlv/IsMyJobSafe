interface BreakdownCardProps {
    title: string;
    value: string | number;
    description?: string;
    children?: React.ReactNode;
}

export default function BreakdownCard({
    title,
    value,
    description,
    children,
}: BreakdownCardProps) {
    return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    {title}
                </p>
                <span className="text-sm font-semibold text-white">{value}</span>
            </div>
            {children}
            {description && (
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    {description}
                </p>
            )}
        </div>
    );
}
