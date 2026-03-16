import {
  fetchAnalysisSummary,
  fetchTopicAnalysis,
} from "@/features/analysis/analysis.api";
import { analysisStore } from "@/features/analysis/analysis.store";
import type {
  AnalysisResult,
  TopicAnalysisResult,
} from "@/features/analysis/analysis.types";

export async function runAnalysisSummary(): Promise<AnalysisResult> {
  analysisStore.setState((state) => ({
    ...state,
    loading: true,
    error: null,
  }));

  try {
    const summary = await fetchAnalysisSummary();
    analysisStore.setState((state) => ({
      ...state,
      summary,
      loading: false,
      error: null,
    }));
    return summary;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI 分析失败";
    analysisStore.setState((state) => ({
      ...state,
      loading: false,
      error: message,
    }));
    throw error;
  }
}

export async function runTopicAnalysis(
  topic: string,
): Promise<TopicAnalysisResult> {
  analysisStore.setState((state) => ({
    ...state,
    loading: true,
    error: null,
  }));

  try {
    const result = await fetchTopicAnalysis(topic);
    analysisStore.setState((state) => ({
      ...state,
      selectedTopic: result,
      loading: false,
      error: null,
    }));
    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "单话题分析失败";
    analysisStore.setState((state) => ({
      ...state,
      loading: false,
      error: message,
    }));
    throw error;
  }
}
