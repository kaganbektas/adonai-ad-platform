import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  User, Mail, Pencil, Link2, Key, Eye, EyeOff, Copy, RefreshCw,
  CreditCard, Bell, Trash2, Loader2, Check
} from "lucide-react";

const SettingsPage = () => {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    if (user) { setName(user.name); setEmail(user.email); }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ name, email });
      toast.success(t("settings.saved"));
      setEditingProfile(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const maskKey = (key: string) => key.slice(0, 8) + "••••••••••••" + key.slice(-4);
  const apiKey = "sk-adon-xxxx1234567890abcdef";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground mb-1">{t("settings.title")}</h2>
        <p className="text-sm text-text-secondary">{t("settings.desc")}</p>
      </div>

      {/* ═══ Profile ═══ */}
      <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[10px] text-text-muted tracking-[0.15em] uppercase font-semibold">{t("settings.profile")}</h3>
          {!editingProfile && (
            <button onClick={() => setEditingProfile(true)} className="flex items-center gap-1.5 text-[10px] text-text-muted hover:text-foreground transition-colors tracking-wider uppercase font-medium">
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-xl bg-surface-2 border border-[#333] flex items-center justify-center text-xl font-bold text-foreground">
            {name ? name[0].toUpperCase() : "?"}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{name || "—"}</p>
            <p className="text-xs text-text-muted flex items-center gap-1"><Mail className="h-3 w-3" /> {email || "—"}</p>
          </div>
        </div>

        {editingProfile && (
          <div className="space-y-3 pt-3 border-t border-[#333]">
            <div>
              <label className="text-[10px] text-text-muted tracking-wider uppercase font-medium mb-1.5 block">{t("settings.name")}</label>
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#111] border border-[#333] rounded-md px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-foreground/30 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-muted tracking-wider uppercase font-medium mb-1.5 block">{t("settings.email")}</label>
              <input
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#111] border border-[#333] rounded-md px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-foreground/30 transition-colors"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-foreground text-background text-xs font-semibold rounded-md hover:bg-foreground/90 disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                {t("settings.save")}
              </button>
              <button onClick={() => { setEditingProfile(false); setName(user?.name || ""); setEmail(user?.email || ""); }}
                className="px-4 py-2 text-xs text-text-muted hover:text-foreground border border-[#333] rounded-md transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Connected Accounts ═══ */}
      <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-6">
        <h3 className="text-[10px] text-text-muted tracking-[0.15em] uppercase font-semibold mb-5">{t("settings.connected")}</h3>
        {[
          { name: "Meta Ads", icon: "M", connected: false, desc: "Facebook & Instagram Ads" },
          { name: "Google Ads", icon: "G", connected: false, desc: "Search, Display & YouTube" },
        ].map((acc) => (
          <div key={acc.name} className="flex items-center justify-between py-4 border-b border-[#333]/60 last:border-b-0 last:pb-0 first:pt-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface-2 border border-[#333] flex items-center justify-center text-xs font-bold text-foreground">
                {acc.icon}
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">{acc.name}</p>
                <p className="text-[10px] text-text-muted">{acc.desc}</p>
              </div>
            </div>
            <Switch />
          </div>
        ))}
      </div>

      {/* ═══ API Keys ═══ */}
      <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-5">
          <Key className="h-3.5 w-3.5 text-text-muted" />
          <h3 className="text-[10px] text-text-muted tracking-[0.15em] uppercase font-semibold">API Keys</h3>
        </div>
        <div className="flex items-center gap-2 bg-[#111] border border-[#333] rounded-md px-3 py-2.5">
          <code className="flex-1 text-xs text-text-secondary font-mono truncate">
            {showApiKey ? apiKey : maskKey(apiKey)}
          </code>
          <button onClick={() => setShowApiKey(!showApiKey)} className="text-text-muted hover:text-foreground transition-colors p-1">
            {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => { navigator.clipboard.writeText(apiKey); toast.success("Copied!"); }} className="text-text-muted hover:text-foreground transition-colors p-1">
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button className="text-text-muted hover:text-foreground transition-colors p-1">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-text-muted mt-2">Use this key to access the ADONAI API programmatically.</p>
      </div>

      {/* ═══ Billing ═══ */}
      <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-5">
          <CreditCard className="h-3.5 w-3.5 text-text-muted" />
          <h3 className="text-[10px] text-text-muted tracking-[0.15em] uppercase font-semibold">{t("settings.billing")}</h3>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-foreground bg-foreground/10 border border-foreground/20 px-2.5 py-1 rounded-md">{t("settings.proPlan")}</span>
            <span className="text-xs text-text-muted">$99/month</span>
          </div>
          <button className="text-[10px] text-text-muted hover:text-foreground border border-[#333] px-3 py-1.5 rounded-md tracking-wider uppercase font-medium transition-colors">
            Upgrade
          </button>
        </div>
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-[11px] text-text-secondary">Creative usage</span>
            <span className="text-[10px] text-text-muted font-mono">312 / 500</span>
          </div>
          <div className="h-2 bg-[#111] border border-[#333]/50 rounded-full overflow-hidden">
            <div className="h-full bg-foreground/40 rounded-full transition-all duration-500" style={{ width: "62%" }} />
          </div>
          <p className="text-[10px] text-text-muted mt-1.5">{t("settings.creativesUsed")}</p>
        </div>
      </div>

      {/* ═══ Notifications ═══ */}
      <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-5">
          <Bell className="h-3.5 w-3.5 text-text-muted" />
          <h3 className="text-[10px] text-text-muted tracking-[0.15em] uppercase font-semibold">{t("settings.notifications")}</h3>
        </div>
        {[
          { label: t("settings.notifComplete"), desc: "Get notified when an analysis finishes" },
          { label: t("settings.notifWeekly"), desc: "Weekly digest of your marketing performance" },
          { label: t("settings.notifCompetitor"), desc: "Alert when new competitors are discovered" },
        ].map((n) => (
          <div key={n.label} className="flex items-center justify-between py-3.5 border-b border-[#333]/60 last:border-b-0 last:pb-0 first:pt-0">
            <div>
              <p className="text-sm text-foreground">{n.label}</p>
              <p className="text-[10px] text-text-muted mt-0.5">{n.desc}</p>
            </div>
            <Switch />
          </div>
        ))}
      </div>

      {/* ═══ Danger Zone ═══ */}
      <div className="bg-[#1A1A1A] border border-[#331111] rounded-lg p-6">
        <h3 className="text-[10px] text-[#994444] tracking-[0.15em] uppercase font-semibold mb-3">Danger Zone</h3>
        <p className="text-xs text-text-muted mb-4">Once you delete your account, there is no going back. All data will be permanently removed.</p>
        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#994444] border border-[#552222] rounded-md hover:bg-[#331111]/50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete Account
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 text-xs font-medium text-[#FF4444] bg-[#331111] border border-[#552222] rounded-md hover:bg-[#441111] transition-colors">
              Confirm Delete
            </button>
            <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 text-xs text-text-muted border border-[#333] rounded-md hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
