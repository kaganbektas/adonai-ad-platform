import { motion } from "framer-motion";
import { Crosshair, Search, Palette, TrendingUp, Gauge, FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function FeaturesGrid() {
  const { t } = useI18n();

  const features = [
    { icon: Crosshair, title: t("features.brandIntel.title"), desc: t("features.brandIntel.desc") },
    { icon: Search, title: t("features.competitor.title"), desc: t("features.competitor.desc") },
    { icon: Palette, title: t("features.adEngine.title"), desc: t("features.adEngine.desc") },
    { icon: TrendingUp, title: t("features.trend.title"), desc: t("features.trend.desc") },
    { icon: Gauge, title: t("features.benchmark.title"), desc: t("features.benchmark.desc") },
    { icon: FileText, title: t("features.reports.title"), desc: t("features.reports.desc") },
  ];

  return (
    <section id="features" className="py-24 border-t border-border noise-overlay">
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-text-muted mb-3">{t("features.label")}</p>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            {t("features.title")}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="p-6 rounded-lg bg-surface-1 border border-border card-hover"
            >
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-surface-2 border border-border mb-4">
                <f.icon className="h-4 w-4 text-foreground" strokeWidth={1.5} />
              </div>
              <h3 className="font-heading text-sm font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
