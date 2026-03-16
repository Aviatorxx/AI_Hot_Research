import type {
  AnalysisResult,
  TopicAnalysisResult,
} from "@/features/analysis/analysis.types";
import { API_BASE } from "@/shared/config/env";
import { fetchJson } from "@/shared/lib/fetcher";

export function fetchAnalysisSummary(): Promise<AnalysisResult> {
  return fetchJson<AnalysisResult>(`${API_BASE}/api/analyze`, {
    method: "POST",
    timeoutMs: 20_000,
  });
}

export function fetchTopicAnalysis(topic: string): Promise<TopicAnalysisResult> {
  return fetchJson<TopicAnalysisResult>(`${API_BASE}/api/analyze/topic`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
    timeoutMs: 20_000,
  });
}
