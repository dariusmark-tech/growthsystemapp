import { AppCard, StatusBadge } from "@/components/shared/SharedComponents";
import { useArduinoSensors } from "@/hooks/useArduinoSensors";
import { SD_CARD } from "@/utils/mockData";

const sdPct = Math.round((SD_CARD.used / SD_CARD.total) * 100);

function ago(iso: string | null) {
  if (!iso) return "—";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return new Date(iso).toLocaleString();
}

export default function HealthScreen() {
  const { readings, connected, loading, lastUpdated, error } = useArduinoSensors();

  const sensorsArray = [
    { name: 'DHT22 Sensor 1', ok: !!readings, value: readings ? `${readings.temp.s1} °C` : '—' },
    { name: 'DHT22 Sensor 2', ok: !!readings, value: readings ? `${readings.temp.s2} °C` : '—' },
    { name: 'DHT22 Sensor 3', ok: !!readings, value: readings ? `${readings.temp.s3} °C` : '—' },
    { name: 'pH Sensor', ok: !!readings && readings.ph > 0, value: readings ? `${readings.ph} pH` : '—' },
    { name: 'TDS Sensor', ok: !!readings && readings.tds > 0, value: readings ? `${readings.tds} ppm` : '—' },
  ];
  const activeCount = sensorsArray.filter(s => s.ok).length;

  return (
    <div className="p-4 pb-10 no-scrollbar overflow-auto">
      <div className="flex justify-between items-start mb-1 mt-2">
        <div>
          <h1 className="text-[26px] font-extrabold text-text-primary tracking-tight">System Health</h1>
          <p className="text-text-muted text-xs">Hardware connectivity & diagnostics</p>
        </div>
      </div>

      {/* ESP32 + Sensors Summary */}
      <div className="flex gap-2.5 mt-4 mb-3">
        <AppCard className="flex-1">
          <div className="w-[38px] h-[38px] rounded-[10px] bg-green-light flex items-center justify-center mb-2">
            <span className="text-xl">🔧</span>
          </div>
          <p className="text-[10px] text-text-muted font-semibold mb-0.5">Arduino Nano ESP32-S3</p>
          <p className="text-lg font-extrabold text-text-primary mb-2">Controller</p>
          <div className={`flex items-center gap-1 rounded-full px-2 py-[3px] self-start border w-fit ${connected ? 'bg-green-light border-border-high' : 'bg-danger-bg border-danger-border'}`}>
            <span className={`text-[10px] ${connected ? 'text-green' : 'text-danger'}`}>●</span>
            <span className={`text-[10px] font-bold ${connected ? 'text-green-dark' : 'text-danger'}`}>
              {connected ? 'Online' : (loading ? 'Connecting…' : 'Offline')}
            </span>
          </div>
        </AppCard>

        <AppCard className="flex-1">
          <div className="w-[38px] h-[38px] rounded-[10px] bg-green-light flex items-center justify-center mb-2">
            <span className="text-xl">📡</span>
          </div>
          <p className="text-[10px] text-text-muted font-semibold mb-0.5">Sensors</p>
          <p className="text-lg font-extrabold text-text-primary mb-2">
            {activeCount === sensorsArray.length ? 'All Active' : connected ? 'Partial' : 'Offline'}
          </p>
          <div className={`flex items-center gap-1 rounded-full px-2 py-[3px] self-start border w-fit ${activeCount > 0 ? 'bg-green-light border-border-high' : 'bg-danger-bg border-danger-border'}`}>
            <span className={`text-[10px] ${activeCount > 0 ? 'text-green' : 'text-danger'}`}>●</span>
            <span className={`text-[10px] font-bold ${activeCount > 0 ? 'text-green-dark' : 'text-danger'}`}>
              {activeCount}/{sensorsArray.length}
            </span>
          </div>
        </AppCard>
      </div>

      {/* SD Card */}
      <AppCard className="mb-3">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-light flex items-center justify-center">
              <span className="text-base">💾</span>
            </div>
            <div>
              <p className="text-[13px] font-bold text-text-primary">SD Card Module</p>
              <p className="text-[10px] text-text-muted">{sdPct}% capacity used</p>
            </div>
          </div>
          <StatusBadge label="✓ OK" type="success" size="sm" />
        </div>

        <div className="grid grid-cols-2 gap-y-0.5 my-2">
          {[
            ['Capacity', '32 GB'],
            ['Used', '13.4 GB'],
            ['Available', `${(SD_CARD.total - SD_CARD.used).toFixed(1)} GB`],
            ['Usage', `${sdPct}%`],
          ].map(([l, v]) => (
            <div key={l} className="py-0.5">
              <p className="text-[11px] text-text-muted">{l}</p>
              <p className="text-[13px] font-bold text-text-primary">{v}</p>
            </div>
          ))}
        </div>

        <div className="h-2 bg-green-light rounded-full overflow-hidden mt-2">
          <div
            className="h-full rounded-full"
            style={{
              width: `${sdPct}%`,
              backgroundColor: sdPct > 85 ? 'hsl(var(--danger))' : sdPct > 65 ? 'hsl(var(--chart-amber))' : 'hsl(var(--green))',
            }}
          />
        </div>
      </AppCard>

      {/* Sensor Array */}
      <div className="bg-card rounded-lg border border-border overflow-hidden mb-3 shadow-[0_1px_4px_0_hsl(152_55%_28%/0.05)]">
        <div className="flex items-center gap-2.5 p-4 bg-card-alt border-b border-border">
          <div className="w-7 h-7 rounded-lg bg-green-light flex items-center justify-center">
            <span className="text-sm">📡</span>
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-bold text-text-primary">Sensor Array Status</p>
            <p className="text-[10px] text-text-muted">Live values from Arduino over Firebase</p>
          </div>
          <StatusBadge label={`${activeCount}/${sensorsArray.length} Active`} type={activeCount > 0 ? 'success' : 'danger'} size="sm" />
        </div>

        {sensorsArray.map((sensor, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < sensorsArray.length - 1 ? 'border-b border-green-light/50' : ''}`}>
            <div className={`w-[9px] h-[9px] rounded-full flex-shrink-0 ${sensor.ok ? 'bg-green' : 'bg-danger'}`} />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-text-primary">{sensor.name}</p>
              <p className="text-[10px] text-text-faint">Value: {sensor.value} · {ago(lastUpdated)}</p>
            </div>
            <StatusBadge label={sensor.ok ? '⊙ Operational' : '⊗ Offline'} type={sensor.ok ? 'success' : 'danger'} size="sm" />
          </div>
        ))}
      </div>

      {/* Network */}
      <AppCard>
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">🌐 Network</p>
        {[
          { l: 'Backend API', v: connected ? 'Connected' : (loading ? 'Connecting…' : 'Offline'), t: connected ? 'success' as const : 'danger' as const },
          { l: 'Firebase DB', v: connected ? 'Connected' : (error ? 'Error' : 'Offline'), t: connected ? 'success' as const : 'danger' as const },
          { l: 'Last Sync', v: ago(lastUpdated), t: 'success' as const },
        ].map(({ l, v, t }) => (
          <div key={l} className="flex justify-between items-center py-1.5 border-b border-green-light/50 last:border-0">
            <span className="text-xs text-text-muted">{l}</span>
            {l === 'Last Sync'
              ? <span className="text-green text-[11px] font-bold">{v}</span>
              : <StatusBadge label={v} type={t} size="sm" />
            }
          </div>
        ))}
      </AppCard>
    </div>
  );
}
