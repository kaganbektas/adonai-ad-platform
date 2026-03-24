import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Zap, LayoutDashboard, Search, Palette, BarChart3, Settings,
  Bell, ChevronLeft, ChevronRight, LogOut, Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user, logout } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: t("dash.dashboard"), path: "/dashboard" },
    { icon: Search, label: t("dash.analyses"), path: "/dashboard/analyses" },
    { icon: Palette, label: t("dash.adCreatives"), path: "/dashboard/creatives" },
    { icon: BarChart3, label: t("dash.reports"), path: "/dashboard/reports" },
    { icon: Lightbulb, label: t("dash.insights"), path: "/dashboard/insights" },
    { icon: Settings, label: t("dash.settings"), path: "/dashboard/settings" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const userInitial = user?.name ? user.name[0].toUpperCase() : "?";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-background border-r border-border flex flex-col z-40 transition-all duration-300 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        <div className="h-14 flex items-center px-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2 overflow-hidden">
            <Zap className="h-4 w-4 text-foreground shrink-0" strokeWidth={1.5} />
            {!collapsed && <span className="font-heading text-sm font-semibold text-foreground whitespace-nowrap">ADONAI</span>}
          </Link>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-surface-2 text-foreground"
                    : "text-text-secondary hover:text-foreground hover:bg-surface-1"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          {!collapsed && (
            <div className="flex items-center gap-3 px-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-surface-2 flex items-center justify-center text-xs font-medium text-foreground">{userInitial}</div>
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-foreground truncate">{user?.name || "—"}</p>
                <p className="text-[10px] text-text-muted truncate">{user?.email || "—"}</p>
              </div>
            </div>
          )}
          <div className="flex gap-1">
            {!collapsed && (
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-center text-text-muted hover:text-foreground"
                onClick={handleLogout}
                title={t("auth.logout")}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-center text-text-muted hover:text-foreground"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className={`flex-1 transition-all duration-300 ${collapsed ? "ml-16" : "ml-56"}`}>
        <header className="sticky top-0 z-30 h-14 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-6">
          <h2 className="font-heading text-sm font-medium text-foreground">
            {user?.name ? `${t("dash.welcome")}, ${user.name.split(" ")[0]}` : t("dash.welcome")}
          </h2>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <button className="relative text-text-secondary hover:text-foreground transition-colors">
              <Bell className="h-4 w-4" strokeWidth={1.5} />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-foreground rounded-full" />
            </button>
            <div className="w-7 h-7 rounded-md bg-surface-2 flex items-center justify-center text-xs font-medium text-foreground">{userInitial}</div>
          </div>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
