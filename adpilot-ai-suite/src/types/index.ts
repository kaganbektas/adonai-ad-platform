export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Analysis {
  id: string;
  url: string;
  status: "running" | "completed" | "failed";
  sector: string | null;
  client_name: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface BrandAnalysis {
  sector: string;
  business_type: string;
  product_categories?: string[];
  brand_tone: { primary: string; secondary: string; description: string };
  target_audience: { demographics: string; interests: string[]; description: string };
  unique_selling_points: string[];
  competitors: { name: string; reason: string }[];
}

export interface CompetitorDetail {
  name: string;
  reason: string;
  ads_found?: number;
  avg_duration?: string;
}

export interface CompetitorAnalysis {
  competitors: CompetitorDetail[];
  total_ads_found: number;
  sector?: string;
}

export interface TrendItem {
  name: string;
  frequency: string;
  impact: number;
}

export interface RecommendedAngle {
  angle: string;
  headline: string;
}

export interface TrendAnalysis {
  claude_analysis: {
    top_trends: TrendItem[];
    recommended_angles: RecommendedAngle[];
    emotional_triggers?: string[];
  };
}

export interface AnalysisDetail extends Analysis {
  brand_data: BrandAnalysis | null;
  competitor_data: CompetitorAnalysis | null;
  trend_data: TrendAnalysis | null;
  report_data: any | null;
  analysis_data: any | null;
}

export interface DashboardStats {
  totalAnalyses: number;
  totalCreatives: number;
  totalReports: number;
  competitorsTracked: number;
}

export interface PipelineStepProgress {
  key: string;
  name: string;
  status: "pending" | "running" | "retrying" | "success" | "failed" | "skipped";
  duration_ms: number;
  retries?: number;
  error?: string;
  skipReason?: string;
}

export interface PipelineProgress {
  analysisId: string;
  currentStep: number;
  totalSteps: number;
  status: "running" | "completed" | "failed";
  steps: PipelineStepProgress[];
  error?: string;
}
