import type { AnalysisState } from "@/features/analysis/analysis.types";
import { createStore } from "@/shared/lib/store";

const initialState: AnalysisState = {
  summary: null,
  selectedTopic: null,
  loading: false,
  error: null,
};

export const analysisStore = createStore(initialState);
