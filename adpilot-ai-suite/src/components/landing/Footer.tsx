import { Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();

  const columns = [
    { title: t("footer.product"), links: [t("footer.features"), t("footer.pricing"), t("footer.integrations"), t("footer.changelog")] },
    { title: t("footer.company"), links: [t("footer.about"), t("footer.blog"), t("footer.careers"), t("footer.press")] },
    { title: t("footer.resources"), links: [t("footer.docs"), t("footer.help"), t("footer.apiRef"), t("footer.status")] },
    { title: t("footer.legal"), links: [t("footer.privacy"), t("footer.terms"), t("footer.security"), t("footer.gdpr")] },
  ];

  return (
    <footer className="border-t border-border py-16">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-foreground" strokeWidth={1.5} />
              <span className="font-heading text-sm font-semibold text-foreground">ADONAI</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {t("footer.tagline")}
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-medium tracking-[0.15em] uppercase text-text-muted mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-xs text-text-secondary hover:text-foreground transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-6 text-center">
          <p className="text-xs text-text-muted">
            {t("footer.copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
