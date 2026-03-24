export function PerformancePieChart({ data }: { data: any }) {
  const result = data?.analysisResult || data;
  if (!result || !result.summary) return null;

  const { top_count = 0, neutral_count = 0, low_count = 0 } = result.summary;
  const total = top_count + neutral_count + low_count || 1;
  const topPct = Math.round((top_count / total) * 100);
  const neutralPct = Math.round((neutral_count / total) * 100);
  const lowPct = 100 - topPct - neutralPct;

  const topDeg = (top_count / total) * 360;
  const neutralDeg = (neutral_count / total) * 360;

  const donutGradient = `conic-gradient(
    #F5F5F5 0deg ${topDeg}deg,
    #666 ${topDeg}deg ${topDeg + neutralDeg}deg,
    #333 ${topDeg + neutralDeg}deg 360deg
  )`;

  const topPerformers = result.top_performers || [];
  const lowPerformers = result.low_performers || [];

  return (
    <div className="space-y-4 mb-4">
      {/* Score ring + bars */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-surface-1 border border-border rounded-lg p-5 flex flex-col items-center justify-center">
          <p className="text-[10px] text-text-muted tracking-wider uppercase font-medium mb-4">Overall Performance</p>
          <div className="relative w-28 h-28 mb-4">
            <div className="w-28 h-28 rounded-full" style={{ background: donutGradient }} />
            <div className="absolute inset-4 rounded-full bg-surface-1 flex items-center justify-center flex-col">
              <span className="text-2xl font-bold text-foreground">{result.total_ads_analyzed || total}</span>
              <span className="text-[9px] text-text-muted">ads</span>
            </div>
          </div>
          <div className="flex gap-4">
            {[
              { label: "Top", count: top_count, color: "bg-foreground" },
              { label: "Neutral", count: neutral_count, color: "bg-[#666]" },
              { label: "Low", count: low_count, color: "bg-[#333]" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-sm ${item.color}`} />
                <span className="text-[10px] text-text-secondary">{item.label} ({item.count})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-1 border border-border rounded-lg p-5">
          <p className="text-[10px] text-text-muted tracking-wider uppercase font-medium mb-4">Distribution</p>
          <div className="space-y-3">
            {[
              { label: "Top Performers", value: topPct, color: "#F5F5F5" },
              { label: "Neutral", value: neutralPct, color: "#666" },
              { label: "Low Performers", value: lowPct, color: "#444" },
            ].map(m => (
              <div key={m.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] text-text-secondary">{m.label}</span>
                  <span className="text-[10px] text-text-muted font-mono">{m.value}%</span>
                </div>
                <div className="h-3 bg-surface-2 rounded overflow-hidden">
                  <div className="h-full rounded transition-all duration-700" style={{ width: `${m.value}%`, backgroundColor: m.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top & Low performers */}
      {(topPerformers.length > 0 || lowPerformers.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {topPerformers.length > 0 && (
            <div className="bg-surface-1 border border-border rounded-lg p-5">
              <p className="text-[10px] text-text-muted tracking-wider uppercase font-medium mb-3">Top Performers</p>
              <div className="space-y-2">
                {topPerformers.slice(0, 5).map((tp: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded bg-foreground/[0.06] border border-foreground/10">
                    <span className="text-[10px] text-text-muted font-mono">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground truncate">{tp.headline || tp.ad_name}</p>
                      {tp.metrics && (
                        <p className="text-[10px] text-text-muted">CTR {tp.metrics.ctr}% · ROAS {tp.metrics.roas}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {lowPerformers.length > 0 && (
            <div className="bg-surface-1 border border-border rounded-lg p-5">
              <p className="text-[10px] text-text-muted tracking-wider uppercase font-medium mb-3">Low Performers</p>
              <div className="space-y-2">
                {lowPerformers.slice(0, 5).map((lp: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded bg-[#331111]/30 border border-[#552222]/30">
                    <span className="text-[10px] text-text-muted font-mono">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground truncate">{lp.headline || lp.ad_name}</p>
                      <p className="text-[10px] text-text-muted truncate">{lp.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
