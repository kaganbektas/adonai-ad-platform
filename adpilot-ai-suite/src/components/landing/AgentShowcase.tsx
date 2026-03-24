import { motion } from "framer-motion";
import { User, Search, Palette, TrendingUp, BarChart3, FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function AgentShowcase() {
  const { t } = useI18n();

  const agents = [
    { icon: User, name: t("agents.brand.name"), desc: t("agents.brand.desc") },
    { icon: Search, name: t("agents.competitor.name"), desc: t("agents.competitor.desc") },
    { icon: Palette, name: t("agents.creative.name"), desc: t("agents.creative.desc") },
    { icon: TrendingUp, name: t("agents.trend.name"), desc: t("agents.trend.desc") },
    { icon: BarChart3, name: t("agents.perf.name"), desc: t("agents.perf.desc") },
    { icon: FileText, name: t("agents.report.name"), desc: t("agents.report.desc") },
  ];

  return (
    <section className="py-24 border-t border-border">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-text-muted mb-3">{t("agents.label")}</p>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            {t("agents.title")}
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {agents.map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="flex items-start gap-4 p-5 rounded-lg bg-surface-1 border border-border card-hover"
            >
              <div className="shrink-0 w-9 h-9 rounded-md bg-surface-2 border border-border flex items-center justify-center">
                <a.icon className="h-4 w-4 text-foreground" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-heading text-sm font-semibold text-foreground mb-1">{a.name}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{a.desc}</p>
                <span className="inline-block mt-2 text-[10px] tracking-[0.15em] uppercase font-medium text-text-muted bg-surface-2 px-2 py-0.5 rounded">
                  {t("agents.active")}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
