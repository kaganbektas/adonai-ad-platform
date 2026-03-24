import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, Loader2, Clock, Lightbulb, AlertCircle, RotateCcw, SkipForward, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { usePipelineProgress } from "@/hooks/usePipelineProgress";
import { useAnalysis } from "@/hooks/useAnalyses";

const stepLabels: Record<string, { en: string; tr: string }> = {
  brand_analysis: { en: "Brand Analysis", tr: "Marka Analizi" },
  fetch_data: { en: "Fetch Ad Data", tr: "Reklam Verisi Çekme" },
  analyze: { en: "Data Analysis", tr: "Veri Analizi" },
  competitor_analysis: { en: "Competitor Analysis", tr: "Rakip Analizi" },
  trend_analysis: { en: "Trend Analysis", tr: "Trend Analizi" },
  generate: { en: "Creative Generation", tr: "Reklam Metni Üretimi" },
  render_ads: { en: "Ad Rendering", tr: "Reklam Render" },
  generate_images: { en: "Image Generation", tr: "Görsel Üretimi" },
  report: { en: "Report Generation", tr: "Rapor Üretimi" },
};

const AnalysisRunning = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { progress, isDone } = usePipelineProgress(id);
  const { data: analysis } = useAnalysis(id);

  useEffect(() => {
    if (isDone && progress?.status === "completed" && id) {
      const timer = setTimeout(() => navigate(`/dashboard/analysis/${id}/results`), 800);
      return () => clearTimeout(timer);
    }
  }, [isDone, progress?.status, id, navigate]);

  const steps = progress?.steps || [
    { key: "brand_analysis", name: "Brand Analysis", status: "pending", duration_ms: 0 },
    { key: "fetch_data", name: "Fetch Ad Data", status: "pending", duration_ms: 0 },
    { key: "analyze", name: "Data Analysis", status: "pending", duration_ms: 0 },
    { key: "competitor_analysis", name: "Competitor Analysis", status: "pending", duration_ms: 0 },
    { key: "trend_analysis", name: "Trend Analysis", status: "pending", duration_ms: 0 },
    { key: "generate", name: "Copy Generation", status: "pending", duration_ms: 0 },
    { key: "render_ads", name: "Ad Rendering", status: "pending", duration_ms: 0 },
    { key: "generate_images", name: "Image Generation", status: "pending", duration_ms: 0 },
    { key: "report", name: "Report Generation", status: "pending", duration_ms: 0 },
  ];

  const currentStep = progress?.currentStep ?? 0;
  const totalSteps = steps.length;
  const progressPct = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;
  const isFailed = progress?.status === "failed";
  const isCompleted = progress?.status === "completed";

  const domain = analysis?.client_name || analysis?.url || "...";

  const skippedSteps = steps.filter((s: any) => s.status === "skipped");
  const failedSteps = steps.filter((s: any) => s.status === "failed");

  const handleRetry = () => {
    // Reload the page to reconnect SSE — the analysis will resume or user can start new
    window.location.reload();
  };

  const handleNewAnalysis = () => {
    navigate("/dashboard");
  };

  return (
    <div className="max-w-lg mx-auto py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-md bg-surface-2 border border-border flex items-center justify-center text-xs font-bold text-foreground">
            {domain[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{domain}</p>
            <p className="text-xs text-text-muted">
              {isFailed
                ? t("dash.analysisFailed")
                : isCompleted
                ? t("dash.analysisComplete")
                : t("dash.analysisInProgress")}
            </p>
          </div>
        </div>

        <div className="h-0.5 bg-surface-2 rounded-full mb-8 overflow-hidden">
          <motion.div
            className={`h-full ${isFailed ? "bg-red-400" : "bg-foreground"}`}
            initial={{ width: "0%" }}
            animate={{ width: `${isFailed ? 100 : progressPct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="space-y-4 mb-10">
          {steps.map((step: any) => {
            const label = stepLabels[step.key]?.[lang] || step.name;
            const isRetrying = step.status === "retrying";
            return (
              <div key={step.key} className="flex items-center gap-3">
                {step.status === "success" ? (
                  <div className="w-5 h-5 rounded-full bg-surface-3 flex items-center justify-center">
                    <Check className="h-3 w-3 text-foreground" strokeWidth={2} />
                  </div>
                ) : step.status === "running" ? (
                  <Loader2 className="h-5 w-5 text-foreground animate-spin" strokeWidth={1.5} />
                ) : isRetrying ? (
                  <RefreshCw className="h-5 w-5 text-yellow-400 animate-spin" strokeWidth={1.5} />
                ) : step.status === "failed" ? (
                  <AlertCircle className="h-5 w-5 text-red-400" strokeWidth={1.5} />
                ) : step.status === "skipped" ? (
                  <SkipForward className="h-5 w-5 text-text-muted" strokeWidth={1.5} />
                ) : (
                  <Clock className="h-5 w-5 text-text-muted" strokeWidth={1.5} />
                )}
                <span className={`text-sm ${
                  step.status === "success" || step.status === "running" ? "text-foreground"
                  : step.status === "failed" ? "text-red-400"
                  : isRetrying ? "text-yellow-400"
                  : step.status === "skipped" ? "text-text-muted line-through"
                  : "text-text-muted"
                }`}>
                  {label}
                  {isRetrying && <span className="ml-1 text-[10px]">({t("dash.retrying")}...)</span>}
                  {step.retries > 0 && step.status === "failed" && (
                    <span className="ml-1 text-[10px]">({step.retries} {t("dash.retries")})</span>
                  )}
                </span>
                <span className="ml-auto flex items-center gap-2">
                  {step.duration_ms > 0 && (
                    <span className="text-[10px] text-text-muted">{(step.duration_ms / 1000).toFixed(1)}s</span>
                  )}
                  {step.status === "skipped" && step.skipReason && (
                    <span className="text-[10px] text-yellow-400/70" title={step.skipReason}>!</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* Skipped steps warning */}
        {isDone && skippedSteps.length > 0 && (
          <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-4 flex items-start gap-3 mb-4">
            <SkipForward className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-xs font-medium text-yellow-400 mb-1">{t("dash.stepsSkipped")}</p>
              <p className="text-xs text-text-secondary">
                {skippedSteps.map((s: any) => stepLabels[s.key]?.[lang] || s.name).join(", ")}
                {skippedSteps.some((s: any) => s.skipReason) && (
                  <span className="block mt-1 text-text-muted">
                    {skippedSteps.filter((s: any) => s.skipReason).map((s: any) => s.skipReason).join("; ")}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Failed state */}
        {isFailed && (
          <div className="bg-red-400/5 border border-red-400/20 rounded-lg p-5 mb-4">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-red-400 mb-1">{t("dash.pipelineFailed")}</p>
                <p className="text-xs text-text-secondary">
                  {failedSteps.length > 0
                    ? failedSteps.map((s: any) => `${stepLabels[s.key]?.[lang] || s.name}: ${s.error || "unknown error"}`).join("\n")
                    : t("dash.unknownError")}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleRetry} size="sm" variant="outline" className="text-xs border-red-400/30 text-red-400 hover:bg-red-400/10">
                <RotateCcw className="h-3 w-3 mr-1" /> {t("dash.retry")}
              </Button>
              <Button onClick={handleNewAnalysis} size="sm" className="text-xs">
                {t("dash.newAnalysis")}
              </Button>
            </div>
          </div>
        )}

        {/* AI tip — show only while running */}
        {!isDone && (
          <div className="bg-surface-1 border border-border rounded-lg p-4 flex items-start gap-3">
            <Lightbulb className="h-4 w-4 text-text-muted mt-0.5 shrink-0" strokeWidth={1.5} />
            <p className="text-xs text-text-secondary leading-relaxed">
              {t("dash.aiTip")}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AnalysisRunning;
