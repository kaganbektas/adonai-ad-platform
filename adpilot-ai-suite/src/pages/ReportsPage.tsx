import { FileText, Download, Share2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAnalysesList } from "@/hooks/useAnalyses";

const ReportsPage = () => {
  const { t } = useI18n();
  const { data: analyses, isLoading } = useAnalysesList();

  const completedAnalyses = (analyses || []).filter(a => a.status === "completed");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-lg font-semibold text-foreground">{t("reports.title")}</h2>
        <span className="text-xs text-text-muted">{completedAnalyses.length} {t("reports.total")}</span>
      </div>

      {completedAnalyses.length === 0 ? (
        <div className="bg-surface-1 border border-border rounded-lg p-12 text-center">
          <AlertCircle className="h-8 w-8 text-text-muted mx-auto mb-3" strokeWidth={1} />
          <p className="text-sm text-text-secondary mb-1">{t("reports.empty")}</p>
          <p className="text-xs text-text-muted">{t("reports.emptyDesc")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {completedAnalyses.map((a) => {
            const clientSlug = (a.client_name || "unknown").toLowerCase();
            const date = a.created_at ? new Date(a.created_at).toISOString().split("T")[0] : "";
            const htmlUrl = `/api/analyses/${a.id}/report?format=html`;
            const pdfUrl = `/api/analyses/${a.id}/report?format=pdf`;

            return (
              <div key={a.id} className="bg-surface-1 border border-border rounded-lg p-5 flex items-center justify-between card-hover">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-md bg-surface-2 border border-border flex items-center justify-center">
                    <FileText className="h-4 w-4 text-text-muted" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {a.client_name || a.url} — {t("reports.fullReport")}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-text-muted">
                        {new Date(a.created_at).toLocaleDateString()}
                      </p>
                      {a.sector && (
                        <span className="text-[10px] tracking-[0.1em] uppercase font-medium text-text-muted bg-surface-2 px-1.5 py-0.5 rounded">
                          {a.sector}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={htmlUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="text-xs border-border text-text-secondary">
                      <Share2 className="h-3 w-3 mr-1" /> HTML
                    </Button>
                  </a>
                  <a href={pdfUrl} download={`report-${clientSlug}-${date}.pdf`}>
                    <Button size="sm" className="text-xs">
                      <Download className="h-3 w-3 mr-1" /> PDF
                    </Button>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
