import { WidgetCard, StatusBadge, SensorBar } from "@/components/shared/SharedComponents";
import { SENSORS_HEALTH, SD_CARD } from "@/utils/mockData";
import { Settings } from "lucide-react";

const sdPct = Math.round((SD_CARD.used / SD_CARD.total) * 100);

export default function HealthScreen() {
  return (
    <div className="p-4 pb-10 no-scrollbar overflow-auto">
      <div className="flex justify-between items-center mb-5 mt-3">
        <div>
          <p className="text-text-faint text-xs font-medium mb-0.5">Diagnostics</p>
          <h1 className="text-[26px] font-bold text-text-primary tracking-tight">System Health</h1>
        </div>
        <button className="w-9 h-9 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/60 flex items-center justify-center shadow-sm">
          <Settings size={16} className="text-text-muted" />
        </button>
      </div>

      {/* Status Widgets Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3 animate-slide-up">
        <WidgetCard>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-light to-accent flex items-center justify-center mb-3">
            <span className="text-lg">🔧</span>
          </div>
          <p className="text-[10px] text-text-faint font-medium mb-0.5">ESP32-S3</p>
          <p className="text-base font-bold text-text-primary mb-2">Controller</p>
          <div className="flex items-center gap-1.5 bg-success-bg/60 rounded-full px-2.5 py-1 w-fit border border-success-border/40">
            <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
            <span className="text-green-dark text-[10px] font-semibold">Online</span>
          </div>
        </WidgetCard>

        <WidgetCard>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-light to-accent flex items-center justify-center mb-3">
            <span className="text-lg">📡</span>
          </div>
          <p className="text-[10px] text-text-faint font-medium mb-0.5">Sensors</p>
          <p className="text-base font-bold text-text-primary mb-2">All Active</p>
          <div className="flex items-center gap-1.5 bg-success-bg/60 rounded-full px-2.5 py-1 w-fit border border-success-border/40">
            <div className="w-1.5 h-1.5 rounded-full bg-green" />
            <span className="text-green-dark text-[10px] font-semibold">{SENSORS_HEALTH.filter(s => s.ok).length}/{SENSORS_HEALTH.length}</span>
          </div>
        </WidgetCard>
      </div>

      {/* SD Card Widget */}
      <WidgetCard className="mb-3">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-light to-accent flex items-center justify-center">
              <span className="text-base">💾</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-text-primary">SD Card</p>
              <p className="text-[10px] text-text-faint">{sdPct}% used</p>
            </div>
          </div>
          <StatusBadge label="✓ OK" type="success" size="sm" />
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { label: 'Capacity', value: '32 GB' },
            { label: 'Used', value: '13.4 GB' },
            { label: 'Available', value: `${(SD_CARD.total - SD_CARD.used).toFixed(1)} GB` },
            { label: 'Usage', value: `${sdPct}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-card-alt/50 rounded-xl px-3 py-2.5 border border-border/40">
              <p className="text-[10px] text-text-faint mb-0.5">{label}</p>
              <p className="text-[13px] font-bold text-text-primary">{value}</p>
            </div>
          ))}
        </div>

        <SensorBar
          value={SD_CARD.used}
          max={SD_CARD.total}
          color={sdPct > 85 ? 'hsl(var(--danger))' : sdPct > 65 ? 'hsl(var(--chart-amber))' : 'hsl(var(--green))'}
        />
        <p className="text-[10px] text-text-faint mt-1.5">{(SD_CARD.total - SD_CARD.used).toFixed(1)} GB remaining</p>
      </WidgetCard>

      {/* Sensor Array Widget */}
      <WidgetCard className="mb-3 !p-0 overflow-hidden">
        <div className="flex items-center gap-2.5 p-4 border-b border-border/40">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-light to-accent flex items-center justify-center">
            <span className="text-sm">📡</span>
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-text-primary">Sensor Array</p>
            <p className="text-[10px] text-text-faint">Individual sensor health</p>
          </div>
          <StatusBadge label={`${SENSORS_HEALTH.filter(x => x.ok).length}/${SENSORS_HEALTH.length}`} type="success" size="sm" />
        </div>

        {SENSORS_HEALTH.map((sensor, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < SENSORS_HEALTH.length - 1 ? 'border-b border-border/30' : ''}`}>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sensor.ok ? 'bg-green' : 'bg-danger'}`} />
            <div className="flex-1">
              <p className="text-[12px] font-medium text-text-primary">{sensor.name}</p>
              <p className="text-[10px] text-text-faint">{sensor.last}</p>
            </div>
            <StatusBadge label={sensor.ok ? 'Active' : 'Offline'} type={sensor.ok ? 'success' : 'danger'} size="sm" />
          </div>
        ))}
      </WidgetCard>

      {/* Network Widget */}
      <WidgetCard>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-light to-accent flex items-center justify-center">
            <span className="text-sm">🌐</span>
          </div>
          <p className="text-[13px] font-semibold text-text-primary">Network</p>
        </div>
        <div className="bg-card-alt/50 rounded-xl border border-border/40 overflow-hidden">
          {([
            { l: 'Backend API', v: 'Connected', t: 'success' as const },
            { l: 'Firebase DB', v: 'Connected', t: 'success' as const },
            { l: 'Last Sync', v: 'just now', t: 'success' as const },
          ]).map(({ l, v, t }, idx) => (
            <div key={l} className={`flex justify-between items-center px-3.5 py-2.5 ${idx < 2 ? 'border-b border-border/30' : ''}`}>
              <span className="text-[12px] text-text-muted">{l}</span>
              {l === 'Last Sync'
                ? <span className="text-green text-[11px] font-semibold">{v}</span>
                : <StatusBadge label={v} type={t} size="sm" />
              }
            </div>
          ))}
        </div>
      </WidgetCard>
    </div>
  );
}
