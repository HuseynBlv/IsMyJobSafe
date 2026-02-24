/**
 * Core types for the Replaceability Scoring Engine.
 */

export type RiskLevel = "low" | "medium" | "high";

export interface AnalysisResult {
  replaceability_score: number; // 0–100
  automation_risk: RiskLevel;
  skill_defensibility_score: number; // 0–100
  market_saturation: RiskLevel;
  reasons: string[];
  recommended_upgrades: string[];
  comparison_percentile: number; // 0–100
  confidence: number; // 0–100
  why_this_matters?: string;
  if_you_do_nothing?: string;
}

export interface AnalyzeRequest {
  profile: string; // raw profile text from the user
}

export interface AnalyzeResponse {
  success: boolean;
  data?: AnalysisResult;
  error?: string;
}
