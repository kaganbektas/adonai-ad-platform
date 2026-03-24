import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

export function CTASection() {
  const [url, setUrl] = useState("");
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <section className="py-24 border-t border-border noise-overlay">
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-xl mx-auto"
        >
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("cta.title")}
          </h2>
          <p className="text-sm text-text-secondary mb-8">
            {t("cta.subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 p-2 rounded-lg bg-surface-1 border border-border glow-border">
            <input
              type="url"
              placeholder="https://yourwebsite.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-text-muted outline-none"
            />
            <Button
              onClick={() => url.trim() && navigate("/dashboard")}
              className="glow-white px-6 py-3 font-medium text-sm shrink-0"
            >
              {t("cta.button")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
