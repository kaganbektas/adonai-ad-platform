import { useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Download, Share2, Mail, ExternalLink, Target,
  Palette, FileText, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAnalysis } from "@/hooks/useAnalyses";
import type { BrandAnalysis, CompetitorAnalysis, TrendAnalysis } from "@/types";
import { CompetitorBarChart } from "@/components/charts/CompetitorBarChart";
import { TrendImpactChart } from "@/components/charts/TrendImpactChart";
import { PerformancePieChart } from "@/components/charts/PerformancePieChart";

function BrandTab({ data }: { data: BrandAnalysis | null }) {
  const { t } = useI18n();
  if (!data) return <p className="text-sm text-text-muted">{t("dash.noData")}</p>;

  // Tone slider position
  const toneMap: Record<string, number> = { resmi: 10, profesyonel: 30, formal: 10, professional: 30, samimi: 60, genc: 75, casual: 70, eglenceli: 90, fun: 90 };
  const tonePos = toneMap[(data.brand_tone?.primary || "").toLowerCase()] || 50;

  // Product categories pie
  const cats = data.product_categories || [];

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-surface-1 border border-border rounded-lg p-5">
          <p className="text-[10px] text-text-muted mb-2 tracking-wider uppercase">{t("results.businessType")}</p>
          <p className="text-sm text-foreground font-medium">{data.business_type}</p>
          {data.sector && (
            <span className="inline-block mt-2 text-[10px] bg-surface-2 text-text-muted px-2 py-0.5 rounded tracking-wider uppercase">{data.sector}</span>
          )}
        </div>
        {/* Tone slider */}
        <div className="bg-surface-1 border border-border rounded-lg p-5">
          <p className="text-[10px] text-text-muted mb-3 tracking-wider uppercase">{t("results.brandTone")}</p>
          <div className="mb-3">
            <div className="flex justify-between text-[10px] text-text-muted mb-1.5">
              <span>{t("results.formal")}</span>
              <span>{t("results.casual")}</span>
            </div>
            <div className="relative h-2 bg-surface-2 rounded-full">
              <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-foreground border-2 border-background transition-all duration-500"
                style={{ left: `calc(${tonePos}% - 8px)` }} />
            </div>
          </div>
          <p className="text-sm text-foreground font-medium">{data.brand_tone?.primary} {data.brand_tone?.secondary ? `/ ${data.brand_tone.secondary}` : ""}</p>
          <p className="text-xs text-text-secondary mt-1">{data.brand_tone?.description}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-surface-1 border border-border rounded-lg p-5">
          <p className="text-[10px] text-text-muted mb-2 tracking-wider uppercase">{t("results.targetAudience")}</p>
          {data.target_audience?.demographics && (
            <p className="text-xs text-foreground font-medium mb-2">{data.target_audience.demographics}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {(data.target_audience?.interests || []).map((ta) => (
              <span key={ta} className="text-[11px] bg-surface-2 text-text-secondary px-2 py-0.5 rounded">{ta}</span>
            ))}
          </div>
          {data.target_audience?.description && (
            <p className="text-xs text-text-secondary mt-2">{data.target_audience.description}</p>
          )}
        </div>

        {/* Product categories */}
        {cats.length > 0 && (
          <div className="bg-surface-1 border border-border rounded-lg p-5">
            <p className="text-[10px] text-text-muted mb-3 tracking-wider uppercase">Product Categories</p>
            <div className="space-y-2">
              {cats.map((cat, i) => {
                const pct = Math.round(((cats.length - i) / cats.length) * 100);
                return (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="text-[11px] text-text-secondary w-36 shrink-0 truncate">{cat}</span>
                    <div className="flex-1 h-3 bg-surface-2 rounded overflow-hidden">
                      <div className="h-full bg-foreground/20 rounded" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* USPs */}
      <div className="bg-surface-1 border border-border rounded-lg p-5">
        <p className="text-[10px] text-text-muted mb-3 tracking-wider uppercase">{t("results.usp")}</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {(data.unique_selling_points || []).map((u, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-2 rounded bg-foreground/[0.04] border border-foreground/[0.06]">
              <span className="text-[10px] text-text-muted font-mono mt-0.5">{String(i + 1).padStart(2, "0")}</span>
              <p className="text-xs text-text-secondary">{u}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Competitors from brand analysis */}
      {data.competitors && data.competitors.length > 0 && (
        <div className="bg-surface-1 border border-border rounded-lg p-5">
          <p className="text-[10px] text-text-muted mb-3 tracking-wider uppercase">Competitor Proximity</p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[10px] text-text-muted font-medium px-3 py-2">Competitor</th>
                  <th className="text-left text-[10px] text-text-muted font-medium px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {data.competitors.map((c) => (
                  <tr key={c.name} className="border-b border-border/50 last:border-b-0">
                    <td className="text-xs text-foreground font-medium px-3 py-2.5">{c.name}</td>
                    <td className="text-xs text-text-muted px-3 py-2.5">{c.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CompetitorsTab({ data }: { data: CompetitorAnalysis | null }) {
  const { t } = useI18n();
  if (!data) return <p className="text-sm text-text-muted">{t("dash.noData")}</p>;
  const competitors = data.competitors || [];
  return (
    <div className="space-y-4">
      {competitors.length > 0 && <CompetitorBarChart competitors={competitors} />}
      {competitors.map((c) => (
        <div key={c.name} className="bg-surface-1 border border-border rounded-lg p-5 card-hover">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-foreground">{c.name}</h4>
            <ExternalLink className="h-3.5 w-3.5 text-text-muted" strokeWidth={1.5} />
          </div>
          <p className="text-xs text-text-secondary mb-3">{c.reason}</p>
          {(c.ads_found != null) && (
            <div className="flex gap-4">
              <span className="text-xs text-text-muted">{c.ads_found} {t("results.activeAds")}</span>
              {c.avg_duration && <span className="text-xs text-text-muted">{t("results.avg")} {c.avg_duration}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TrendsTab({ data }: { data: TrendAnalysis | null }) {
  const { t } = useI18n();
  if (!data) return <p className="text-sm text-text-muted">{t("dash.noData")}</p>;
  const freqMap: Record<string, string> = { High: t("results.high"), Medium: t("results.medium"), Low: t("results.low"), high: t("results.high"), medium: t("results.medium"), low: t("results.low") };
  const trends = data.claude_analysis?.top_trends || [];
  const angles = data.claude_analysis?.recommended_angles || [];
  return (
    <div className="space-y-4">
      {trends.length > 0 && <TrendImpactChart trends={trends} />}
      <div className="bg-surface-1 border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs text-text-muted font-medium px-4 py-3">{t("results.trend")}</th>
              <th className="text-left text-xs text-text-muted font-medium px-4 py-3">{t("results.frequency")}</th>
              <th className="text-left text-xs text-text-muted font-medium px-4 py-3">{t("results.impact")}</th>
            </tr>
          </thead>
          <tbody>
            {trends.map((tr) => (
              <tr key={tr.name} className="border-b border-border last:border-b-0">
                <td className="text-sm text-foreground px-4 py-3">{tr.name}</td>
                <td className="px-4 py-3">
                  <span className="text-[10px] tracking-wider uppercase font-medium text-text-muted bg-surface-2 px-2 py-0.5 rounded">{freqMap[tr.frequency] || tr.frequency}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-foreground/60 rounded-full" style={{ width: `${tr.impact}%` }} />
                    </div>
                    <span className="text-xs text-text-muted">{tr.impact}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {angles.length > 0 && (
        <div>
          <p className="text-xs text-text-muted mb-3 tracking-wider uppercase">{t("results.recAngles")}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {angles.map((a) => (
              <div key={a.angle} className="bg-surface-1 border border-border rounded-lg p-4">
                <p className="text-[10px] text-text-muted tracking-wider uppercase mb-1">{a.angle}</p>
                <p className="text-sm text-foreground italic">"{a.headline}"</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CreativesTab() {
  const { t } = useI18n();
  const creatives = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    headline: ["Automate Your Marketing", "AI-Powered Growth", "Your Brand, Amplified", "Compete Smarter", "Scale with AI", "Marketing on Autopilot"][i],
    desc: "Professional ad creative generated by AI based on your brand analysis and competitor insights.",
  }));
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <select className="bg-surface-2 border border-border rounded-md px-3 py-1.5 text-xs text-text-secondary outline-none">
          <option>{t("results.allTemplates")}</option>
          <option>{t("results.socialMedia")}</option>
          <option>{t("results.display")}</option>
          <option>{t("results.search")}</option>
        </select>
        <select className="bg-surface-2 border border-border rounded-md px-3 py-1.5 text-xs text-text-secondary outline-none">
          <option>{t("results.allSizes")}</option>
          <option>1080x1080</option>
          <option>1200x628</option>
          <option>1080x1920</option>
        </select>
        <Button variant="outline" size="sm" className="ml-auto text-xs border-border text-text-secondary">
          {t("results.generateMore")}
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {creatives.map((c) => (
          <div key={c.id} className="bg-surface-1 border border-border rounded-lg overflow-hidden card-hover group">
            <div className="aspect-square bg-surface-2 flex items-center justify-center p-6 relative">
              <div className="text-center">
                <Palette className="h-6 w-6 text-text-muted mx-auto mb-3" strokeWidth={1} />
                <p className="font-heading text-sm font-semibold text-foreground">{c.headline}</p>
              </div>
              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button size="sm" className="text-xs">
                  <Download className="h-3 w-3 mr-1" /> {t("results.download")}
                </Button>
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs text-foreground font-medium mb-1">{c.headline}</p>
              <p className="text-xs text-text-muted line-clamp-2">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BenchmarkTab({ analysisData }: { analysisData: any }) {
  const { t } = useI18n();
  if (!analysisData) return <p className="text-sm text-text-muted">{t("dash.noData")}</p>;
  return <PerformancePieChart data={analysisData} />;
}

function ReportTab({ analysisData }: { analysisData: any }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div className="bg-surface-1 border border-border rounded-lg p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
        <FileText className="h-10 w-10 text-text-muted mb-4" strokeWidth={1} />
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{t("results.reportTitle")}</h3>
        <p className="text-sm text-text-secondary mb-6 max-w-sm">
          {t("results.reportDesc")}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button className="glow-white text-sm">
            <Download className="mr-2 h-4 w-4" /> {t("results.downloadPdf")}
          </Button>
          <Button variant="outline" className="text-sm border-border text-text-secondary">
            <Share2 className="mr-2 h-4 w-4" /> {t("results.shareLink")}
          </Button>
          <Button variant="outline" className="text-sm border-border text-text-secondary">
            <Mail className="mr-2 h-4 w-4" /> {t("results.emailReport")}
          </Button>
        </div>
      </div>
    </div>
  );
}

const AnalysisResults = () => {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const { data: analysis, isLoading } = useAnalysis(id);

  const tabs = [
    { key: "Brand", label: t("results.brand") },
    { key: "Benchmark", label: "Benchmark" },
    { key: "Competitors", label: t("results.competitors") },
    { key: "Trends", label: t("results.trends") },
    { key: "Ad Creatives", label: t("results.adCreatives") },
    { key: "Report", label: t("results.report") },
  ];
  const [activeTab, setActiveTab] = useState("Brand");

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 text-foreground animate-spin" />
      </div>
    );
  }

  const domain = analysis?.client_name || analysis?.url || "—";
  const sector = analysis?.sector || "—";

  const tabContent: Record<string, JSX.Element> = {
    Brand: <BrandTab data={analysis?.brand_data || null} />,
    Benchmark: <BenchmarkTab analysisData={analysis?.analysis_data} />,
    Competitors: <CompetitorsTab data={analysis?.competitor_data || null} />,
    Trends: <TrendsTab data={analysis?.trend_data || null} />,
    "Ad Creatives": <CreativesTab />,
    Report: <ReportTab analysisData={analysis?.analysis_data} />,
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-sm font-bold text-foreground">{domain[0].toUpperCase()}</div>
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">{domain}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] tracking-wider uppercase font-medium text-text-muted bg-surface-2 px-2 py-0.5 rounded">{sector}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-xs font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
              activeTab === tab.key
                ? "text-foreground border-foreground"
                : "text-text-muted border-transparent hover:text-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {tabContent[activeTab]}
      </motion.div>
    </div>
  );
};

export default AnalysisResults;
