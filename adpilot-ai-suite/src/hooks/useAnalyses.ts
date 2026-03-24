import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Analysis, AnalysisDetail, DashboardStats } from "@/types";

export function useAnalysesList() {
  return useQuery({
    queryKey: ["analyses"],
    queryFn: () => apiFetch<Analysis[]>("/analyses"),
  });
}

export function useAnalysis(id: string | undefined) {
  return useQuery({
    queryKey: ["analysis", id],
    queryFn: () => apiFetch<AnalysisDetail>(`/analyses/${id}`),
    enabled: !!id,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiFetch<DashboardStats>("/analyses/stats"),
  });
}

export function useAnalysisResults(id: string | undefined) {
  return useQuery({
    queryKey: ["analysis-results", id],
    queryFn: () => apiFetch<any>(`/analyses/${id}/results`),
    enabled: !!id,
  });
}

export function useAnalysisCreatives(id: string | undefined) {
  return useQuery({
    queryKey: ["analysis-creatives", id],
    queryFn: () => apiFetch<{ analysisId: string; creatives: any[] }>(`/analyses/${id}/creatives`),
    enabled: !!id,
  });
}

export function useStartAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { url: string; source?: string; csvFile?: string; sector?: string; competitors?: string }) =>
      apiFetch<{ id: string; status: string }>("/pipeline/run", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}
