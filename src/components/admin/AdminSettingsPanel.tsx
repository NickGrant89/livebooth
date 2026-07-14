"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch-client";
import { Loader2, Shield } from "lucide-react";

type Settings = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  welcomeBonus: number;
  signupEnabled: boolean;
  betaBannerEnabled: boolean;
  supportEmailAlerts: boolean;
  inStreamAdEnabled: boolean;
  inStreamAdLabel: string;
  inStreamAdUrl: string;
};

export function AdminSettingsPanel({ onMsg }: { onMsg: (m: string) => void }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [totp, setTotp] = useState<{ enabled: boolean; configured: boolean } | null>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupUri, setSetupUri] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [csv, setCsv] = useState("");
  const [importResult, setImportResult] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/admin/settings").then((r) => r.json()),
      apiFetch("/api/admin/totp").then((r) => r.json()),
    ]).then(([s, t]) => {
      setSettings(s.settings);
      setTotp(t);
    }).finally(() => setLoading(false));
  }, []);

  async function saveSettings(partial: Partial<Settings>) {
    setSaving(true);
    const res = await apiFetch("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify(partial),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setSettings(data.settings);
      onMsg("Settings saved");
    } else {
      onMsg(String(data.error ?? "Save failed"));
    }
  }

  async function totpAction(action: string) {
    const res = await apiFetch("/api/admin/totp", {
      method: "POST",
      body: JSON.stringify({ action, code: totpCode }),
    });
    const data = await res.json();
    if (res.ok) {
      if (action === "setup") {
        setSetupSecret(data.secret);
        setSetupUri(data.uri);
        onMsg("Scan QR in authenticator app, then enter code to enable");
      } else {
        setSetupSecret(null);
        setSetupUri(null);
        setTotpCode("");
        setTotp({ enabled: data.enabled ?? false, configured: data.enabled ?? false });
        onMsg(action === "enable" ? "2FA enabled" : "2FA disabled");
      }
    } else {
      onMsg(String(data.error ?? "2FA action failed"));
    }
  }

  async function importCsv() {
    const res = await apiFetch("/api/admin/users/import", {
      method: "POST",
      headers: { "Content-Type": "text/csv" },
      body: csv,
    });
    const data = await res.json();
    if (res.ok) {
      setImportResult(`Created: ${data.created?.length ?? 0}, skipped: ${data.skipped?.length ?? 0}, errors: ${data.errors?.length ?? 0}`);
      onMsg("Import complete");
    } else {
      onMsg(String(data.error ?? "Import failed"));
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#53fc18]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-white/10 bg-[#141416] p-5 space-y-4">
        <h2 className="font-semibold text-white">Platform settings</h2>
        <label className="flex items-center gap-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={settings.maintenanceMode}
            onChange={(e) => saveSettings({ maintenanceMode: e.target.checked })}
            disabled={saving}
          />
          Maintenance mode (blocks non-admin pages)
        </label>
        <textarea
          value={settings.maintenanceMessage}
          onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
          onBlur={() => saveSettings({ maintenanceMessage: settings.maintenanceMessage })}
          rows={2}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
          placeholder="Maintenance message"
        />
        <label className="flex items-center gap-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={settings.signupEnabled}
            onChange={(e) => saveSettings({ signupEnabled: e.target.checked })}
          />
          Signup enabled
        </label>
        <label className="flex items-center gap-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={settings.betaBannerEnabled}
            onChange={(e) => saveSettings({ betaBannerEnabled: e.target.checked })}
          />
          Beta banner visible
        </label>
        <label className="flex items-center gap-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={settings.supportEmailAlerts}
            onChange={(e) => saveSettings({ supportEmailAlerts: e.target.checked })}
          />
          Email alerts for new support messages
        </label>
        <div className="flex items-center gap-3">
          <label className="text-sm text-zinc-400">Welcome bonus (DROP)</label>
          <input
            type="number"
            min={0}
            value={settings.welcomeBonus}
            onChange={(e) => setSettings({ ...settings, welcomeBonus: Number(e.target.value) })}
            onBlur={() => saveSettings({ welcomeBonus: settings.welcomeBonus })}
            className="w-28 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-sm"
          />
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#141416] p-5 space-y-4">
        <h2 className="font-semibold text-white">In-stream sponsor banner</h2>
        <p className="text-xs text-zinc-500">
          Shows under the live player on all streams. Use for platform partnerships or brand deals.
        </p>
        <label className="flex items-center gap-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={settings.inStreamAdEnabled}
            onChange={(e) => saveSettings({ inStreamAdEnabled: e.target.checked })}
            disabled={saving}
          />
          Enable in-stream sponsor banner
        </label>
        <input
          value={settings.inStreamAdLabel}
          onChange={(e) => setSettings({ ...settings, inStreamAdLabel: e.target.value })}
          onBlur={() => saveSettings({ inStreamAdLabel: settings.inStreamAdLabel })}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
          placeholder="Banner label"
        />
        <input
          value={settings.inStreamAdUrl}
          onChange={(e) => setSettings({ ...settings, inStreamAdUrl: e.target.value })}
          onBlur={() => {
            if (settings.inStreamAdUrl) saveSettings({ inStreamAdUrl: settings.inStreamAdUrl });
          }}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
          placeholder="https://..."
        />
      </section>

      <section className="rounded-xl border border-white/10 bg-[#141416] p-5 space-y-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#53fc18]" /> Admin 2FA (TOTP)
        </h2>
        <p className="text-xs text-zinc-500">
          Required at login when enabled. Use Google Authenticator, Authy, or 1Password.
        </p>
        {totp?.enabled ? (
          <div className="space-y-2">
            <p className="text-sm text-[#53fc18]">2FA is enabled</p>
            <input
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="6-digit code to disable"
              className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm w-40"
            />
            <button type="button" onClick={() => totpAction("disable")} className="ml-2 text-xs text-red-400 underline">
              Disable 2FA
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {!setupSecret ? (
              <button type="button" onClick={() => totpAction("setup")} className="rounded-lg bg-[#53fc18] px-4 py-2 text-sm font-bold text-black">
                Set up 2FA
              </button>
            ) : (
              <>
                <p className="text-xs text-zinc-400 break-all">Secret: <code>{setupSecret}</code></p>
                {setupUri && (
                  <p className="text-xs text-zinc-500 break-all">URI: {setupUri}</p>
                )}
                <input
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="Enter code from app"
                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm w-40"
                />
                <button type="button" onClick={() => totpAction("enable")} className="ml-2 rounded-lg bg-[#53fc18] px-4 py-2 text-sm font-bold text-black">
                  Enable
                </button>
              </>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-[#141416] p-5 space-y-3">
        <h2 className="font-semibold text-white">Bulk user import (CSV)</h2>
        <p className="text-xs text-zinc-500">
          Header: username,email,displayName,password,role — password optional (auto-generated). Roles: fan, dj, radio, admin.
        </p>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={5}
          placeholder="username,email,displayName,password,role"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm font-mono"
        />
        <button type="button" onClick={importCsv} className="rounded-lg bg-white/10 px-4 py-2 text-sm">
          Import users
        </button>
        {importResult && <p className="text-xs text-zinc-400">{importResult}</p>}
      </section>
    </div>
  );
}
