import { ExternalLink, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useAnalysesList } from "@/hooks/useAnalyses";

const AnalysesList = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { data: analyses, isLoading } = useAnalysesList();

  return (
    <div>
      <h2 className="font-heading text-lg font-semibold text-foreground mb-4">{t("dash.allAnalyses")}</h2>
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 text-foreground animate-spin" />
        </div>
      )}
      <div className="space-y-3">
        {!isLoading && (!analyses || analyses.length === 0) && (
          <p className="text-sm text-text-muted">{t("dash.noAnalyses")}</p>
        )}
        {(analyses || []).map((a) => (
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
                <span className="text-[10px] tracking-wider uppercase font-medium text-text-muted bg-surface-2 px-2 py-0.5 rounded">{a.sector}</span>
              )}
              <span className={`text-[10px] tracking-wider uppercase font-medium px-2 py-0.5 rounded ${
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
  );
};

export default AnalysesList;
