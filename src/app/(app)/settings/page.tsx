import { SettingsDashboard } from "@/components/settings/SettingsDashboard";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="crm-compact mx-auto w-full max-w-6xl px-3 py-3">
      <header className="mb-3">
        <h1 className="text-lg font-bold text-foreground">Налаштування CRM</h1>
        <p className="text-xs text-muted">
          Довідники та конфігурація полів кандидата
        </p>
      </header>
      <SettingsDashboard />
    </div>
  );
}
