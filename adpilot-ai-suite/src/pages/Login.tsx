import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Sparkles, Zap, ShieldCheck, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { LanguageToggle } from "@/components/LanguageToggle";
import { toast } from "sonner";

const Login = () => {
  const location = useLocation();
  const isRegister = location.pathname === "/register";
  const [activeTab, setActiveTab] = useState<"login" | "register">(isRegister ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "register" && !name) return;
    if (!email || !password) return;
    if (activeTab === "register" && password.length < 6) {
      toast.error(t("auth.passwordMin"));
      return;
    }
    setLoading(true);
    try {
      if (activeTab === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || (activeTab === "login" ? t("auth.invalidCredentials") : t("auth.emailExists")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="flex-1 flex min-h-0">
        {/* LEFT — Auth form */}
        <div className="w-full lg:w-[420px] xl:w-[440px] shrink-0 flex flex-col border-r border-border/50 h-full">
          <div className="flex-1 flex flex-col justify-center px-8 lg:px-10 py-6 min-h-0">
            <div className="max-w-[340px] mx-auto w-full">
              {/* Tabs */}
              <div className="flex mb-5">
                <button
                  onClick={() => setActiveTab("login")}
                  className={`flex-1 pb-2.5 text-[11px] font-semibold tracking-[0.15em] border-b-2 transition-colors ${
                    activeTab === "login"
                      ? "border-foreground text-foreground"
                      : "border-transparent text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {t("auth.loginTab")}
                </button>
                <button
                  onClick={() => setActiveTab("register")}
                  className={`flex-1 pb-2.5 text-[11px] font-semibold tracking-[0.15em] border-b-2 transition-colors ${
                    activeTab === "register"
                      ? "border-foreground text-foreground"
                      : "border-transparent text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {t("auth.registerTab")}
                </button>
              </div>

              {/* Title — fixed height so no shift */}
              <div className="mb-5">
                <h1 className="font-heading text-xl font-bold text-foreground mb-0.5">
                  {activeTab === "login" ? t("auth.welcomeBack") : t("auth.createAccount")}
                </h1>
                <p className="text-xs text-text-secondary">
                  {activeTab === "login" ? t("auth.welcomeDesc") : t("auth.createDesc")}
                </p>
              </div>

              {/* Form — fixed min-height to prevent layout shift */}
              <form onSubmit={handleSubmit} className="min-h-[240px]">
                <div className="space-y-3">
                  {/* Name field — always in DOM, hidden for login to prevent shift */}
                  <div className={`transition-all duration-200 overflow-hidden ${activeTab === "register" ? "max-h-[60px] opacity-100" : "max-h-0 opacity-0"}`}>
                    <label className="block text-[10px] font-semibold tracking-[0.12em] text-text-muted mb-1">{t("auth.nameLabel")}</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      tabIndex={activeTab === "register" ? 0 : -1}
                      className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-foreground/40 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold tracking-[0.12em] text-text-muted mb-1">{t("auth.emailLabel")}</label>
                    <input
                      type="email"
                      placeholder="name@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-foreground/40 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-semibold tracking-[0.12em] text-text-muted">{t("auth.passwordLabel")}</label>
                      {activeTab === "login" && (
                        <button type="button" className="text-[10px] font-semibold tracking-[0.08em] text-text-muted hover:text-foreground transition-colors">{t("auth.forgot")}</button>
                      )}
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-foreground/40 transition-colors"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-foreground text-background font-semibold text-xs tracking-[0.15em] py-2.5 rounded-md hover:bg-foreground/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.continue")}
                  </button>
                </div>
              </form>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-3 text-[10px] font-semibold tracking-[0.12em] text-text-muted">{t("auth.or")}</span>
                </div>
              </div>

              {/* Google */}
              <button className="w-full flex items-center justify-center gap-2.5 border border-border rounded-md py-2.5 text-xs text-text-secondary hover:bg-surface-1 transition-colors">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t("auth.google")}
              </button>

              {/* Terms */}
              <p className="text-center text-[8px] font-semibold tracking-[0.08em] text-text-muted mt-4 leading-relaxed uppercase">
                {t("auth.terms")} <span className="underline cursor-pointer hover:text-foreground">{t("auth.termsOf")}</span> {t("auth.and")} <span className="underline cursor-pointer hover:text-foreground">{t("auth.privacy")}</span>{t("auth.termsEnd")}
              </p>

              {/* Back + Lang */}
              <div className="flex items-center justify-center gap-4 mt-4">
                <Link to="/" className="text-[10px] font-semibold tracking-[0.12em] text-text-muted border border-dashed border-text-muted/40 px-3 py-1.5 rounded hover:text-foreground hover:border-foreground/40 transition-colors">
                  &larr; {t("auth.backToWebsite")}
                </Link>
                <LanguageToggle />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Branding (fixed height, centered) */}
        <div className="hidden lg:flex flex-1 h-full flex-col justify-center items-center px-10 xl:px-16 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-foreground/[0.03] via-transparent to-foreground/[0.02] rounded-full blur-3xl" />
          <div className="relative z-10 max-w-lg">
            <div className="mb-8">
              <h2 className="font-heading text-xl font-bold tracking-[0.3em] text-foreground">ADONAI</h2>
              <p className="text-[9px] tracking-[0.5em] text-text-muted mt-0.5 font-semibold">A D &nbsp;O N &nbsp;A I</p>
            </div>
            <h3 className="font-heading text-4xl xl:text-5xl font-bold text-foreground leading-[1.1] mb-5">
              {t("auth.rightTitle").split("\n").map((line, i) => (
                <span key={i}>{line}{i === 0 && <br />}</span>
              ))}
            </h3>
            <p className="text-text-secondary text-sm leading-relaxed mb-8 max-w-md">{t("auth.rightDesc")}</p>
            <div className="space-y-5 mb-10">
              {[
                { icon: Sparkles, titleKey: "auth.feature1.title" as const, descKey: "auth.feature1.desc" as const },
                { icon: Zap, titleKey: "auth.feature2.title" as const, descKey: "auth.feature2.desc" as const },
                { icon: ShieldCheck, titleKey: "auth.feature3.title" as const, descKey: "auth.feature3.desc" as const },
              ].map((feat, i) => (
                <div key={i} className="flex gap-3">
                  <div className="shrink-0 h-8 w-8 rounded-lg bg-surface-1 border border-border flex items-center justify-center">
                    <feat.icon className="h-3.5 w-3.5 text-text-secondary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-0.5">{t(feat.titleKey)}</h4>
                    <p className="text-[11px] text-text-muted leading-relaxed">{t(feat.descKey)}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] font-semibold tracking-[0.2em] text-text-muted">{t("auth.trustedBy")}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-between px-8 lg:px-10 py-3 border-t border-border/50">
        <p className="text-[9px] font-semibold tracking-[0.1em] text-text-muted">{t("auth.copyright")}</p>
        <div className="flex gap-5">
          {["PRIVACY", "TERMS", "STATUS"].map((item) => (
            <button key={item} className="text-[9px] font-semibold tracking-[0.1em] text-text-muted hover:text-foreground transition-colors">{item}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Login;
