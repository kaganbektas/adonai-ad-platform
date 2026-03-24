import { useState } from "react";
import { Palette, Download, Loader2, Image, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAnalysesList } from "@/hooks/useAnalyses";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface Creative {
  url: string;
  template: string;
  size: string;
  filename: string;
}

const CreativesPage = () => {
  const { t } = useI18n();
  const { data: analyses, isLoading: loadingAnalyses } = useAnalysesList();
  const [sizeFilter, setSizeFilter] = useState("all");

  // Fetch creatives from all completed analyses
  const completedIds = (analyses || [])
    .filter(a => a.status === "completed")
    .map(a => a.id);

  const { data: allCreatives, isLoading: loadingCreatives } = useQuery({
    queryKey: ["all-creatives", completedIds],
    queryFn: async () => {
      const results: (Creative & { analysisId: string; clientName: string })[] = [];
      for (const analysis of (analyses || []).filter(a => a.status === "completed")) {
        try {
          const res = await apiFetch<{ creatives: Creative[] }>(`/analyses/${analysis.id}/creatives`);
          for (const c of res.creatives || []) {
            results.push({ ...c, analysisId: analysis.id, clientName: analysis.client_name || analysis.url });
          }
        } catch { /* skip */ }
      }
      return results;
    },
    enabled: completedIds.length > 0,
  });

  const creatives = allCreatives || [];
  const sizes = [...new Set(creatives.map(c => c.size))];
  const filtered = sizeFilter === "all" ? creatives : creatives.filter(c => c.size === sizeFilter);

  const isLoading = loadingAnalyses || loadingCreatives;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">{t("creatives.title")}</h2>
          <p className="text-xs text-text-muted mt-1">
            {creatives.length} {t("creatives.total")}
          </p>
        </div>
        {sizes.length > 1 && (
          <div className="flex gap-1">
            <button
              onClick={() => setSizeFilter("all")}
              className={`px-3 py-1 rounded text-xs transition-colors ${sizeFilter === "all" ? "bg-surface-2 text-foreground border border-foreground/20" : "text-text-muted hover:text-text-secondary"}`}
            >
              {t("results.allSizes")}
            </button>
            {sizes.map(s => (
              <button
                key={s}
                onClick={() => setSizeFilter(s)}
                className={`px-3 py-1 rounded text-xs transition-colors ${sizeFilter === s ? "bg-surface-2 text-foreground border border-foreground/20" : "text-text-muted hover:text-text-secondary"}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-surface-1 border border-border rounded-lg p-12 text-center">
          <AlertCircle className="h-8 w-8 text-text-muted mx-auto mb-3" strokeWidth={1} />
          <p className="text-sm text-text-secondary mb-1">{t("creatives.empty")}</p>
          <p className="text-xs text-text-muted">{t("creatives.emptyDesc")}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c, i) => (
            <div key={`${c.analysisId}-${c.filename}-${i}`} className="bg-surface-1 border border-border rounded-lg overflow-hidden card-hover group">
              <div className="aspect-square bg-surface-2 flex items-center justify-center relative overflow-hidden">
                <img
                  src={c.url}
                  alt={c.filename}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                  }}
                />
                <div className="hidden flex-col items-center justify-center absolute inset-0">
                  <Image className="h-6 w-6 text-text-muted mb-2" strokeWidth={1} />
                  <p className="text-xs text-text-muted">{c.filename}</p>
                </div>
                <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <a href={c.url} download={c.filename} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="text-xs"><Download className="h-3 w-3 mr-1" /> {t("results.download")}</Button>
                  </a>
                </div>
              </div>
              <div className="p-3 border-t border-border">
                <p className="text-xs font-medium text-foreground truncate">{c.clientName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-text-muted bg-surface-2 px-1.5 py-0.5 rounded">{c.template}</span>
                  <span className="text-[10px] text-text-muted bg-surface-2 px-1.5 py-0.5 rounded">{c.size}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CreativesPage;
