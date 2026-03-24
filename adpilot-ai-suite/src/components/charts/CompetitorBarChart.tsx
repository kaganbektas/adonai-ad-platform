import type { CompetitorDetail } from "@/types";

export function CompetitorBarChart({ competitors }: { competitors: CompetitorDetail[] }) {
  const withAds = competitors.filter(c => c.ads_found != null && c.ads_found > 0);
  if (withAds.length === 0) return null;
  const maxAds = Math.max(...withAds.map(c => c.ads_found || 0), 1);

  return (
    <div className="bg-surface-1 border border-border rounded-lg p-5 mb-4">
      <p className="text-[10px] text-text-muted tracking-wider uppercase font-medium mb-4">Active Ads per Competitor</p>
      <div className="space-y-3">
        {withAds.map((c) => {
          const count = c.ads_found || 0;
          const pct = Math.round((count / maxAds) * 100);
          return (
            <div key={c.name} className="flex items-center gap-3">
              <span className="text-[11px] text-text-secondary w-28 shrink-0 truncate">{c.name}</span>
              <div className="flex-1 h-5 bg-surface-2 rounded overflow-hidden relative">
                <div
                  className="h-full bg-foreground/30 rounded transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted font-mono">{count}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
