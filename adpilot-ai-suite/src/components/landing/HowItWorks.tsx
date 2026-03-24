import { motion } from "framer-motion";
import { Link2, Bot, BarChart3 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function HowItWorks() {
  const { t } = useI18n();

  const steps = [
    { icon: Link2, title: t("how.step1.title"), desc: t("how.step1.desc") },
    { icon: Bot, title: t("how.step2.title"), desc: t("how.step2.desc") },
    { icon: BarChart3, title: t("how.step3.title"), desc: t("how.step3.desc") },
  ];

  return (
    <section id="how-it-works" className="py-24 noise-overlay">
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-text-muted mb-3">{t("how.label")}</p>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            {t("how.title")}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative p-6 rounded-lg bg-surface-1 border border-border card-hover text-center"
            >
              <div className="mb-4 inline-flex items-center justify-center w-10 h-10 rounded-md bg-surface-2 border border-border">
                <step.icon className="h-4 w-4 text-foreground" strokeWidth={1.5} />
              </div>
              <h3 className="font-heading text-base font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
