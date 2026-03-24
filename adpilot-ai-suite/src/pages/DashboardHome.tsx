import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, TrendingUp, Palette, FileText, Users, ExternalLink, Loader2, Globe, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useDashboardStats, useAnalysesList, useStartAnalysis } from "@/hooks/useAnalyses";
import { toast } from "sonner";

function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const duration = 1200;
          const startTime = performance.now();
          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            setCount(Math.floor(progress * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <div ref={ref} className="font-heading text-2xl font-bold text-foreground">{count}</div>;
}

const DashboardHome = () => {
  const [url, setUrl] = useState("");
  const [source, setSource] = useState<"url" | "csv">("url");
  const [csvFile, setCsvFile] = useState<string | null>(null);
  const [csvName, setCsvName] = useState("");
  const [sector, setSector] = useState("");
  const navigate = useNavigate();
  const { t } = useI18n();
  const { data: stats } = useDashboardStats();
  const { data: analyses } = useAnalysesList();
  const startAnalysis = useStartAnalysis();

  const statCards = [
    { label: t("dash.totalAnalyses"), value: stats?.totalAnalyses ?? 0, icon: TrendingUp },
    { label: t("dash.adCreativesCount"), value: stats?.totalCreatives ?? 0, icon: Palette },
    { label: t("dash.reportsCreated"), value: stats?.totalReports ?? 0, icon: FileText },
    { label: t("dash.competitorsTracked"), value: stats?.competitorsTracked ?? 0, icon: Users },
  ];

  const recentAnalyses = (analyses || []).slice(0, 3);

  const handleCsvSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setCsvFile(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (source === "url" && !url.trim()) return;
    if (source === "csv" && !csvFile) return;
    try {
      const payload: any = {
        url: url.trim() || "https://example.com",
        source: source === "csv" ? "csv" : "url-only",
      };
      if (source === "csv" && csvFile) payload.csvFile = csvFile;
      if (sector) payload.sector = sector;
      const result = await startAnalysis.mutateAsync(payload);
      navigate(`/dashboard/analysis/${result.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to start analysis");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface-1 border border-border rounded-lg p-6">
        <h3 className="font-heading text-sm font-semibold text-foreground mb-1">{t("dash.startNew")}</h3>
        <p className="text-xs text-text-secondary mb-4">{t("dash.chooseSource")}</p>

        {/* Source toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSource("url")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors border ${
              source === "url"
                ? "bg-surface-2 border-foreground/30 text-foreground"
                : "border-border text-text-muted hover:text-text-secondary hover:border-border"
            }`}
          >
            <Globe className="h-3.5 w-3.5" strokeWidth={1.5} />
            {t("dash.sourceUrl")}
          </button>
          <button
            onClick={() => setSource("csv")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors border ${
              source === "csv"
                ? "bg-surface-2 border-foreground/30 text-foreground"
                : "border-border text-text-muted hover:text-text-secondary hover:border-border"
            }`}
          >
            <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
            {t("dash.sourceCsv")}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {/* URL input — always shown */}
          <input
            type="url"
            placeholder="https://yourwebsite.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            className="flex-1 bg-surface-2 border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted outline-none focus:border-foreground/30 transition-colors"
          />

          {/* CSV upload — shown when csv selected */}
          {source === "csv" && (
            <label className="flex items-center gap-3 bg-surface-2 border border-dashed border-border rounded-md px-4 py-3 cursor-pointer hover:border-foreground/20 transition-colors">
              <Upload className="h-4 w-4 text-text-muted shrink-0" strokeWidth={1.5} />
              <span className="text-sm text-text-secondary flex-1">
                {csvName || t("dash.uploadCsv")}
              </span>
              <input type="file" accept=".csv" onChange={handleCsvSelect} className="hidden" />
            </label>
          )}

          {/* Sector select */}
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="bg-surface-2 border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:border-foreground/30 transition-colors sm:w-48"
            >
              <option value="">{t("dash.sectorOptional")}</option>
              <option value="ecommerce">E-Commerce</option>
              <option value="yemek">Yemek / Food</option>
              <option value="teknoloji">Teknoloji / Tech</option>
              <option value="moda">Moda / Fashion</option>
              <option value="saglik">Sağlık / Health</option>
              <option value="egitim">Eğitim / Education</option>
              <option value="finans">Finans / Finance</option>
            </select>

            <Button onClick={handleAnalyze} className="glow-white shrink-0" disabled={startAnalysis.isPending || (source === "csv" && !csvFile)}>
              {startAnalysis.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("dash.analyze")} <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-1 border border-border rounded-lg p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-text-muted">{s.label}</span>
              <s.icon className="h-3.5 w-3.5 text-text-muted" strokeWidth={1.5} />
            </div>
            <AnimatedCounter target={s.value} />
          </motion.div>
        ))}
      </div>

      <div>
        <h3 className="font-heading text-sm font-semibold text-foreground mb-4">{t("dash.recentAnalyses")}</h3>
        <div className="space-y-3">
          {recentAnalyses.length === 0 && (
            <p className="text-sm text-text-muted">{t("dash.noAnalyses")}</p>
          )}
          {recentAnalyses.map((a) => (
            <div
              key={a.id}
              onClick={() => a.status === "completed"
                ? navigate(`/dashboard/analysis/${a.id}/results`)
                : navigate(`/dashboard/analysis/${a.id}`)
              }
              className="bg-surface-1 border border-border rounded-lg p-4 flex items-center justify-between card-hover cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-md bg-surface-2 border border-border flex items-center justify-center text-xs font-semibold text-foreground">
                  {(a.client_name || a.url)[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{a.client_name || a.url}</p>
                  <p className="text-xs text-text-muted">{new Date(a.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {a.sector && (
                  <span className="text-[10px] tracking-[0.1em] uppercase font-medium text-text-muted bg-surface-2 px-2 py-0.5 rounded">{a.sector}</span>
                )}
                <span className={`text-[10px] tracking-[0.1em] uppercase font-medium px-2 py-0.5 rounded ${
                  a.status === "completed" ? "text-text-secondary bg-surface-2"
                  : a.status === "running" ? "text-foreground bg-surface-3 animate-pulse"
                  : "text-red-400 bg-red-400/10"
                }`}>{a.status === "completed" ? t("dash.completed") : a.status === "running" ? t("dash.inProgress") : t("dash.failed")}</span>
                <ExternalLink className="h-3.5 w-3.5 text-text-muted" strokeWidth={1.5} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
