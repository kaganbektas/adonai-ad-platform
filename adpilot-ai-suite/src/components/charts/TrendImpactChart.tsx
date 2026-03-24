import type { TrendItem } from "@/types";

export function TrendImpactChart({ trends }: { trends: TrendItem[] }) {
  if (trends.length === 0) return null;

  // Frequency distribution donut
  const freqCounts = { high: 0, medium: 0, low: 0 };
  trends.forEach(tr => {
    const f = tr.frequency.toLowerCase();
    if (f === "high" || f === "yüksek") freqCounts.high++;
    else if (f === "medium" || f === "orta") freqCounts.medium++;
    else freqCounts.low++;
  });
  const total = freqCounts.high + freqCounts.medium + freqCounts.low || 1;
  const highDeg = (freqCounts.high / total) * 360;
  const medDeg = (freqCounts.medium / total) * 360;

  const donutGradient = `conic-gradient(
    #F5F5F5 0deg ${highDeg}deg,
    #666 ${highDeg}deg ${highDeg + medDeg}deg,
    #333 ${highDeg + medDeg}deg 360deg
  )`;

  return (
    <div className="grid sm:grid-cols-2 gap-4 mb-4">
      {/* Donut — frequency */}
      <div className="bg-surface-1 border border-border rounded-lg p-5">
        <p className="text-[10px] text-text-muted tracking-wider uppercase font-medium mb-4">Trend Frequency</p>
        <div className="flex items-center gap-6">
          <div className="relative w-20 h-20 shrink-0">
            <div className="w-20 h-20 rounded-full" style={{ background: donutGradient }} />
            <div className="absolute inset-3 rounded-full bg-surface-1" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-foreground">{trends.length}</span>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { label: "High", count: freqCounts.high, color: "bg-foreground" },
              { label: "Medium", count: freqCounts.medium, color: "bg-[#666]" },
              { label: "Low", count: freqCounts.low, color: "bg-[#333]" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
                <span className="text-[11px] text-text-secondary">{item.label}</span>
                <span className="text-[11px] text-text-muted font-mono ml-auto">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bar — impact levels */}
      <div className="bg-surface-1 border border-border rounded-lg p-5">
        <p className="text-[10px] text-text-muted tracking-wider uppercase font-medium mb-4">Impact Levels</p>
        <div className="space-y-2.5">
          {trends.slice(0, 6).map((tr) => (
            <div key={tr.name} className="flex items-center gap-2">
              <span className="text-[11px] text-text-secondary w-32 shrink-0 truncate">{tr.name}</span>
              <div className="flex-1 h-4 bg-surface-2 rounded overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-700"
                  style={{
                    width: `${tr.impact}%`,
                    backgroundColor: tr.impact >= 70 ? '#F5F5F5' : tr.impact >= 40 ? '#666' : '#444',
                  }}
                />
              </div>
              <span className="text-[10px] text-text-muted font-mono w-8 text-right">{tr.impact}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
