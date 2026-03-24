import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

export function HeroSection() {
  const [url, setUrl] = useState("");
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleAnalyze = () => {
    if (url.trim()) {
      navigate("/dashboard");
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden noise-overlay">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-surface-2 rounded-full blur-[120px] opacity-40" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-surface-3 rounded-full blur-[100px] opacity-30" />
      </div>

      <div className="relative z-10 container mx-auto px-6 text-center pt-24 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-text-secondary mb-6">
            {t("hero.tagline")}
          </p>

          <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-gradient leading-[1.05] mb-6">
            {t("hero.title1")}
            <br />
            {t("hero.title2")}
          </h1>

          <p className="max-w-2xl mx-auto text-base md:text-lg text-text-secondary leading-relaxed mb-12">
            {t("hero.desc")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="max-w-xl mx-auto"
        >
          <div className="flex flex-col sm:flex-row gap-3 p-2 rounded-lg bg-surface-1 border border-border glow-border">
            <input
              type="url"
              placeholder="https://yourwebsite.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-text-muted outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            />
            <Button
              onClick={handleAnalyze}
              className="glow-white px-6 py-3 font-medium text-sm shrink-0"
            >
              {t("hero.cta")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-text-muted mt-4">
            {t("hero.noCreditCard")}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
