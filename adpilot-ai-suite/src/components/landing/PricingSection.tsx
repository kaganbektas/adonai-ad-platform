import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useI18n, type TranslationKey } from "@/lib/i18n";

export function PricingSection() {
  const { t } = useI18n();

  const plans = [
    {
      name: t("pricing.starter"),
      price: "$29",
      period: t("pricing.mo"),
      features: [
        t("pricing.f.brandAnalyses5"),
        t("pricing.f.basicCompetitor"),
        t("pricing.f.creatives50"),
        t("pricing.f.emailReports"),
      ],
      cta: t("pricing.startTrial"),
      highlighted: false,
    },
    {
      name: t("pricing.pro"),
      price: "$99",
      period: t("pricing.mo"),
      badge: t("pricing.popular"),
      features: [
        t("pricing.f.unlimitedBrand"),
        t("pricing.f.deepCompetitor"),
        t("pricing.f.creatives500"),
        t("pricing.f.trendAnalysis"),
        t("pricing.f.pdfReports"),
        t("pricing.f.prioritySupport"),
      ],
      cta: t("pricing.startTrial"),
      highlighted: true,
    },
    {
      name: t("pricing.enterprise"),
      price: t("pricing.custom"),
      period: "",
      features: [
        t("pricing.f.everythingPro"),
        t("pricing.f.apiAccess"),
        t("pricing.f.whiteLabel"),
        t("pricing.f.customTemplates"),
        t("pricing.f.dedicatedManager"),
      ],
      cta: t("pricing.contactSales"),
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 border-t border-border noise-overlay">
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-text-muted mb-3">{t("pricing.label")}</p>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            {t("pricing.title")}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative p-6 rounded-lg border ${
                plan.highlighted
                  ? "bg-surface-1 border-foreground/20 glow-border"
                  : "bg-surface-1 border-border"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.15em] uppercase font-semibold bg-foreground text-background px-3 py-1 rounded-sm">
                  {plan.badge}
                </span>
              )}
              <h3 className="font-heading text-base font-semibold text-foreground mb-1">{plan.name}</h3>
              <div className="mb-5">
                <span className="font-heading text-3xl font-bold text-foreground">{plan.price}</span>
                <span className="text-sm text-text-secondary">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-6">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-text-secondary">
                    <Check className="h-3.5 w-3.5 mt-0.5 text-foreground shrink-0" strokeWidth={1.5} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/register">
                <Button
                  variant={plan.highlighted ? "default" : "outline"}
                  className={`w-full text-sm ${plan.highlighted ? "glow-white" : ""}`}
                >
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-text-muted mt-8">
          {t("pricing.trial")}
        </p>
      </div>
    </section>
  );
}
