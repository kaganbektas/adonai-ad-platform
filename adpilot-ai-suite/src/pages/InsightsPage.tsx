import { Loader2, Lightbulb, TrendingUp, Target, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAnalysesList } from "@/hooks/useAnalyses";

const InsightsPage = () => {
  const { t } = useI18n();
  const { data: analyses, isLoading } = useAnalysesList();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 text-foreground animate-spin" />
      </div>
    );
  }

  const completed = (analyses || []).filter((a: any) => a.status === "completed");
  const totalAnalyses = completed.length;

  // Aggregate insights from all completed analyses
  const sectorCounts: Record<string, number> = {};
  completed.forEach((a: any) => {
    if (a.sector) sectorCounts[a.sector] = (sectorCounts[a.sector] || 0) + 1;
  });
  const topSector = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0];

  const insights = [
    {
      icon: TrendingUp,
      title: t("insights.totalAnalyzed"),
      value: String(totalAnalyses),
      desc: t("insights.totalDesc"),
    },
    {
      icon: Target,
      title: t("insights.topSector"),
      value: topSector ? topSector[0] : "—",
      desc: topSector ? `${topSector[1]} ${t("insights.analyses")}` : t("insights.noData"),
    },
    {
      icon: Zap,
      title: t("insights.avgTime"),
      value: totalAnalyses > 0 ? "~3 min" : "—",
      desc: t("insights.avgTimeDesc"),
    },
  ];

  const tips = [
    { title: t("insights.tip1Title"), desc: t("insights.tip1Desc") },
    { title: t("insights.tip2Title"), desc: t("insights.tip2Desc") },
    { title: t("insights.tip3Title"), desc: t("insights.tip3Desc") },
    { title: t("insights.tip4Title"), desc: t("insights.tip4Desc") },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground mb-1">{t("insights.title")}</h2>
        <p className="text-sm text-text-secondary">{t("insights.desc")}</p>
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {insights.map((item, i) => (
          <div key={i} className="bg-surface-1 border border-border rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center">
                <item.icon className="h-4 w-4 text-text-secondary" strokeWidth={1.5} />
              </div>
              <p className="text-[10px] text-text-muted tracking-wider uppercase font-medium">{item.title}</p>
            </div>
            <p className="text-2xl font-bold text-foreground mb-1">{item.value}</p>
            <p className="text-xs text-text-muted">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Sector distribution */}
      {Object.keys(sectorCounts).length > 0 && (
        <div className="bg-surface-1 border border-border rounded-lg p-5">
          <p className="text-[10px] text-text-muted tracking-wider uppercase font-medium mb-4">{t("insights.sectorDist")}</p>
          <div className="space-y-3">
            {Object.entries(sectorCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([sector, count]) => {
                const pct = Math.round((count / totalAnalyses) * 100);
                return (
                  <div key={sector} className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary w-24 shrink-0 capitalize">{sector}</span>
                    <div className="flex-1 h-5 bg-surface-2 rounded overflow-hidden relative">
                      <div className="h-full bg-foreground/25 rounded transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-text-muted font-mono w-12 text-right">{count} ({pct}%)</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* AI Tips */}
      <div>
        <p className="text-[10px] text-text-muted tracking-wider uppercase font-medium mb-3">{t("insights.aiTips")}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {tips.map((tip, i) => (
            <div key={i} className="bg-surface-1 border border-border rounded-lg p-4 flex gap-3">
              <Lightbulb className="h-4 w-4 text-text-muted shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-xs font-medium text-foreground mb-1">{tip.title}</p>
                <p className="text-[11px] text-text-muted leading-relaxed">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InsightsPage;
