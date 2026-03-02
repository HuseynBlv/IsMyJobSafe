export type QuarterImpact = "high" | "medium" | "foundational";

export interface QuarterPlan {
    quarter: 1 | 2 | 3 | 4;
    objective: string;
    why_this_matters: string;
    top_actions: [string, string, string];
    measurable_outcome: string;
    estimated_impact: QuarterImpact;
    career_positioning_move: string;
}
