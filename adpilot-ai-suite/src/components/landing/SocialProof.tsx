import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const brands = ["Acme Corp", "Vertex", "Skyline", "Monolith", "Arcwave", "Helix"];

export function SocialProof() {
  const { t } = useI18n();

  return (
    <section className="border-t border-border py-16">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-foreground text-foreground" />
            ))}
          </div>
          <p className="text-sm text-text-secondary mb-8">
            {t("social.rating")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {brands.map((brand) => (
              <span
                key={brand}
                className="font-heading text-sm font-medium tracking-wider uppercase text-text-muted"
              >
                {brand}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
