export interface AnalysisCluster {
  name: string;
  trend: "rising" | "stable" | "falling" | string;
  summary?: string;
  heat_score?: number;
  keywords?: string[];
}

export interface AnalysisResult {
  overview?: string;
  clusters?: AnalysisCluster[];
  recommendation?: string;
  error?: string;
}

export interface TopicAnalysisResult {
  title?: string;
  impact_score?: number;
  category?: string;
  background?: string;
  public_opinion?: {
    positive?: string;
    negative?: string;
    neutral?: string;
  };
  trend_prediction?: string;
  related_topics?: string[];
  error?: string;
}

export interface AnalysisState {
  summary: AnalysisResult | null;
  selectedTopic: TopicAnalysisResult | null;
  loading: boolean;
  error: string | null;
}
