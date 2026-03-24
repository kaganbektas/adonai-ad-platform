import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Zap, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();

  const navLinks = [
    { label: t("nav.features"), href: "#features" },
    { label: t("nav.howItWorks"), href: "#how-it-works" },
    { label: t("nav.pricing"), href: "#pricing" },
  ];

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/80 backdrop-blur-xl border-b border-border" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-6 relative">
        <Link to="/" className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-foreground" strokeWidth={1.5} />
          <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
            ADONAI
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-text-secondary hover:text-foreground transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <LanguageToggle />
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-text-secondary hover:text-foreground">
              {t("nav.signIn")}
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm" className="glow-white text-sm font-medium">
              {t("nav.getStarted")}
            </Button>
          </Link>
        </div>

        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border px-6 pb-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block py-2 text-sm text-text-secondary hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="flex items-center gap-3 mt-3 mb-3">
            <LanguageToggle />
          </div>
          <div className="flex flex-col gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="w-full text-text-secondary">{t("nav.signIn")}</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="w-full glow-white">{t("nav.getStarted")}</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
