"use client";

interface ScoreMeterProps {
    score: number; // 0–100
}

function getColorClass(score: number) {
    if (score < 40) return { text: "score-low", ring: "ring-low" };
    if (score < 70) return { text: "score-medium", ring: "ring-medium" };
    return { text: "score-high", ring: "ring-high" };
}

function getLabel(score: number) {
    if (score < 30) return "Low Risk";
    if (score < 50) return "Moderate";
    if (score < 70) return "Elevated";
    if (score < 85) return "High Risk";
    return "Critical";
}

export default function ScoreMeter({ score }: ScoreMeterProps) {
    const size = 200;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const { text, ring } = getColorClass(score);

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative" style={{ width: size, height: size }}>
                {/* Track */}
                <svg width={size} height={size} className="-rotate-90" aria-hidden>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="#2e2e3d"
                        strokeWidth={strokeWidth}
                    />
                    {/* Progress ring */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className={ring}
                    />
                </svg>

                {/* Centre text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-5xl font-bold tabular-nums ${text}`}>
                        {score}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-widest">
                        / 100
                    </span>
                </div>
            </div>

            {/* Label */}
            <p className={`text-sm font-semibold uppercase tracking-widest ${text}`}>
                {getLabel(score)}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Replaceability Score</p>
        </div>
    );
}
