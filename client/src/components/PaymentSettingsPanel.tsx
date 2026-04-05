import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  CreditCard,
  Wallet,
  Globe,
  Smartphone,
  Bitcoin,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Settings,
  Save,
} from "lucide-react";

interface PlatformSetting {
  id: number;
  setting_key: string;
  setting_value: any;
  category: string;
  description: string | null;
  updated_at: string;
}

const SETTING_ICONS: Record<string, React.ReactNode> = {
  payment_paypal_enabled: <Wallet className="h-4 w-4 text-blue-400" />,
  payment_stripe_enabled: <CreditCard className="h-4 w-4 text-purple-400" />,
  payment_interac_enabled: <Globe className="h-4 w-4 text-emerald-400" />,
  payment_crypto_enabled: <Bitcoin className="h-4 w-4 text-amber-400" />,
  payment_mobile_money_enabled: <Smartphone className="h-4 w-4 text-orange-400" />,
  session_max_concurrent: <Settings className="h-4 w-4 text-slate-400" />,
  session_revoke_on_new_login: <Settings className="h-4 w-4 text-slate-400" />,
};

const SETTING_LABELS: Record<string, string> = {
  payment_paypal_enabled: "PayPal",
  payment_stripe_enabled: "Stripe",
  payment_interac_enabled: "Interac e-Transfer (Canada)",
  payment_crypto_enabled: "Crypto (BTC, ETH, USDT)",
  payment_mobile_money_enabled: "Mobile Money (Africa)",
  session_max_concurrent: "Max Concurrent Sessions",
  session_revoke_on_new_login: "Revoke Old Sessions on Login",
};

export function PaymentSettingsPanel() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-payment-settings"],
    queryFn: async () => {
      const res = await fetch("/api/payments/admin/settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  const settings: PlatformSetting[] = data?.settings || [];

  const handleToggle = async (key: string, currentValue: any) => {
    setSaving(key);
    const isBool = currentValue === "true" || currentValue === "false" || typeof currentValue === "boolean";
    const newValue = isBool
      ? !(currentValue === "true" || currentValue === true)
      : currentValue;

    try {
      const res = await fetch(`/api/payments/admin/settings/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ value: newValue }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["admin-payment-settings"] });
      }
    } catch (e) {
      console.error("Failed to update setting:", e);
    } finally {
      setSaving(null);
    }
  };

  const isTruthy = (val: any) => val === true || val === "true";

  // Group settings by category
  const paymentSettings = settings.filter((s) => ["payment", "crypto", "mobile_money", "interac"].includes(s.category));
  const sessionSettings = settings.filter((s) => s.category === "session");

  return (
    <div className="space-y-6">
      {/* Payment Methods Card */}
      <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <CardDescription className="text-slate-400">
              Enable or disable payment methods for the platform. Changes take effect immediately.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-white/10 text-slate-300 hover:bg-white/5"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading settings...
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-400">
              <AlertCircle className="h-6 w-6 mx-auto mb-2" />
              <p className="text-sm">Failed to load settings.</p>
            </div>
          )}

          {!isLoading && !error && (
            <div className="space-y-4">
              {paymentSettings.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  No payment settings found. Run the migration script first.
                </p>
              )}
              {paymentSettings.map((setting) => (
                <div
                  key={setting.setting_key}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {SETTING_ICONS[setting.setting_key] || <Settings className="h-4 w-4 text-slate-400" />}
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {SETTING_LABELS[setting.setting_key] || setting.setting_key}
                      </p>
                      {setting.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{setting.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={
                        isTruthy(setting.setting_value)
                          ? "border-emerald-500/50 text-emerald-300 text-[10px]"
                          : "border-slate-500/50 text-slate-500 text-[10px]"
                      }
                    >
                      {isTruthy(setting.setting_value) ? "Active" : "Disabled"}
                    </Badge>
                    {saving === setting.setting_key ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : (
                      <Switch
                        checked={isTruthy(setting.setting_value)}
                        onCheckedChange={() => handleToggle(setting.setting_key, setting.setting_value)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Settings Card */}
      <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Settings className="h-5 w-5" />
            Session Security
          </CardTitle>
          <CardDescription className="text-slate-400">
            Control concurrent session behavior and security policies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isLoading && (
            <div className="space-y-4">
              {sessionSettings.map((setting) => (
                <div
                  key={setting.setting_key}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    {SETTING_ICONS[setting.setting_key] || <Settings className="h-4 w-4 text-slate-400" />}
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {SETTING_LABELS[setting.setting_key] || setting.setting_key}
                      </p>
                      {setting.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{setting.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-300 font-mono">
                      {String(setting.setting_value)}
                    </span>
                    {typeof setting.setting_value === "boolean" ||
                    setting.setting_value === "true" ||
                    setting.setting_value === "false" ? (
                      saving === setting.setting_key ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      ) : (
                        <Switch
                          checked={isTruthy(setting.setting_value)}
                          onCheckedChange={() => handleToggle(setting.setting_key, setting.setting_value)}
                        />
                      )
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tier Pricing Info */}
      <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Wallet className="h-5 w-5" />
            Business Tier Pricing
          </CardTitle>
          <CardDescription className="text-slate-400">
            Current tier pricing for business upgrades (paid from platform wallet).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { tier: "Free", price: "$0", color: "text-slate-300", border: "border-slate-500/20", features: ["Basic listing", "Category placement"] },
              { tier: "Premium", price: "$29.99/mo", color: "text-amber-300", border: "border-amber-500/30", features: ["Vérifié badge", "Priority search", "Analytics", "20 photos"] },
              { tier: "Enterprise", price: "$99.99/mo", color: "text-purple-300", border: "border-purple-500/30", features: ["Top placement", "API access", "Unlimited media", "Multi-location"] },
            ].map((t) => (
              <div key={t.tier} className={`p-4 rounded-lg bg-white/[0.03] border ${t.border}`}>
                <p className={`text-lg font-bold ${t.color}`}>{t.tier}</p>
                <p className="text-xl font-semibold text-slate-100 mt-1">{t.price}</p>
                <ul className="mt-3 space-y-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-slate-400">
                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
