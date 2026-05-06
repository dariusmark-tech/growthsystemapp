import { useState } from "react";
import { AppCard, StatusBadge, SensorBar } from "@/components/shared/SharedComponents";
import { SensorLineChart } from "@/components/shared/SensorLineChart";
import { MOCK_MONITORING, OPTIMAL_RANGES, getSensorStatus } from "@/utils/mockData";
import { useArduinoSensors } from "@/hooks/useArduinoSensors";
import { Settings, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const TIME_RANGES = ['1h', '6h', '24h', '7d'];

export default function MonitoringScreen() {
  const [timeRange, setTimeRange] = useState('6h');
  const { readings, connected, loading } = useArduinoSensors();
  const isLive = !!readings;
  const data = readings ?? {
    temp: { s1: 0, s2: 0, s3: 0, avg: 0 },
    humidity: 0,
    ph: 0,
    tds: 0,
  };
  const fmt = (v: number, suffix = "") => (isLive ? `${v}${suffix}` : "—");

  const getStatusLabel = (key: string, value: number) => {
    if (!isLive) return "NO DATA";
    const status = getSensorStatus(key, value);
    return status === 'success' ? `OPTIMAL · ${value}${key === 'temp' ? '°C' : key === 'humidity' ? '%' : ''} avg` : `WARNING · ${value}`;
  };

  return (
    <div className="p-4 pb-10 no-scrollbar overflow-auto animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-start mb-1 mt-2">
        <div>
          <h1 className="text-[26px] font-extrabold text-text-primary tracking-tight">Monitoring</h1>
          <p className="text-text-muted text-xs">Real-time sensor readings & trends</p>
        </div>
        <button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mt-1">
          <Settings size={16} className="text-text-muted" />
        </button>
      </div>

      {!isLive && (
        <div className="mt-3 mb-1 px-3 py-2 rounded-lg bg-danger-bg border border-danger-border">
          <p className="text-[12px] font-bold text-danger">
            {loading ? "Connecting to Arduino…" : "Arduino not connected — sensor values unavailable"}
          </p>
        </div>
      )}

      {/* Time Range Chips */}
      <div className="flex gap-1.5 my-4">
        {TIME_RANGES.map(r => (
          <button
            key={r}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
              timeRange === r
                ? 'bg-green-dark border-green-dark text-primary-foreground'
                : 'bg-card border-border text-text-muted'
            }`}
            onClick={() => setTimeRange(r)}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Temperature Card */}
      <AppCard className="mb-3">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🌡️</span>
            <span className="text-[13px] font-bold text-text-primary uppercase tracking-wide">Temperature</span>
          </div>
          <StatusBadge label={getStatusLabel('temp', data.temp.avg)} type="success" size="sm" />
        </div>

        {/* Sensor rows */}
        {[
          { label: 'Sensor 1', val: data.temp.s1 },
          { label: 'Sensor 2', val: data.temp.s2 },
          { label: 'Sensor 3', val: data.temp.s3 },
        ].map(({ label, val }) => {
          const status = getSensorStatus('temp', val);
          const Icon = status === 'success' ? CheckCircle2 : status === 'warning' ? AlertTriangle : XCircle;
          const color = status === 'success'
            ? 'hsl(var(--green))'
            : status === 'warning'
            ? 'hsl(var(--chart-amber))'
            : 'hsl(var(--danger))';
          return (
            <div key={label} className="flex justify-between items-center py-2.5 border-b border-border/50 last:border-0 transition-colors hover:bg-card-alt/40">
              <span className="text-[13px] text-text-muted">{label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-text-primary">{val} °C</span>
                <Icon size={14} style={{ color }} strokeWidth={2.5} />
              </div>
            </div>
          );
        })}

        <div className="flex justify-between items-center pt-3 mt-1 border-t border-border">
          <span className="text-[13px] font-bold text-green">Average</span>
          <span className="text-[13px] font-bold text-text-primary">{data.temp.avg} °C</span>
        </div>

        {/* Range bar */}
        <div className="mt-3">
          <div className="relative h-2 rounded-full overflow-hidden bg-gradient-to-r from-chart-blue via-green to-danger">
            <div
              className="absolute top-0 w-3 h-full bg-foreground rounded-full border-2 border-card"
              style={{ left: `${((data.temp.avg - 0) / 40) * 100}%`, transform: 'translateX(-50%)' }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-text-faint">0°C Cold</span>
            <span className="text-[9px] text-text-faint">20°C</span>
            <span className="text-[9px] text-text-faint">30°C</span>
            <span className="text-[9px] text-text-faint">40°C Hot</span>
          </div>
        </div>

        {/* Temperature trend */}
        <div className="mt-4">
          <SensorLineChart
            data={MOCK_MONITORING.tempHistory}
            color="hsl(152,55%,28%)"
            yLabel="Temperature"
            unit="°C"
          />
          <p className="text-[10px] text-text-faint text-center -mt-1">Temperature vs. Time</p>
        </div>
      </AppCard>

      {/* Humidity Card */}
      <AppCard className="mb-3">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">💧</span>
            <span className="text-[13px] font-bold text-text-primary uppercase tracking-wide">Humidity</span>
          </div>
          <StatusBadge label="OPTIMAL" type="success" size="sm" />
        </div>

        <p className="text-[32px] font-extrabold text-text-primary tracking-tight">
          {data.humidity}<span className="text-sm font-normal text-text-faint">%</span>
        </p>

        <SensorBar value={data.humidity} max={100} className="mt-2 mb-1" />
        <p className="text-[10px] text-text-faint">Filling: {data.humidity}% — Target: 55–75%</p>

        <div className="mt-4">
          <SensorLineChart
            data={MOCK_MONITORING.humidityHistory}
            color="hsl(152,60%,42%)"
            yLabel="Humidity"
            unit="%"
          />
          <p className="text-[10px] text-text-faint text-center -mt-1">Humidity vs. Time</p>
        </div>
      </AppCard>

      {/* pH Card */}
      <AppCard className="mb-3">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🧪</span>
            <span className="text-[13px] font-bold text-text-primary uppercase tracking-wide">pH Level</span>
          </div>
          <StatusBadge label="OPTIMAL" type="success" size="sm" />
        </div>

        <p className="text-[32px] font-extrabold text-text-primary tracking-tight">{data.ph}</p>

        {/* pH Scale */}
        <div className="flex gap-0.5 mt-3">
          {Array.from({ length: 14 }, (_, i) => {
            const val = i + 1;
            const isActive = Math.round(data.ph) === val;
            const colors = [
              'bg-danger', 'bg-danger', 'bg-chart-amber', 'bg-chart-amber',
              'bg-warning', 'bg-green', 'bg-green', 'bg-green',
              'bg-chart-blue', 'bg-chart-blue', 'bg-chart-blue',
              'bg-chart-blue', 'bg-chart-blue', 'bg-chart-blue',
            ];
            return (
              <div
                key={val}
                className={`flex-1 h-5 rounded-sm flex items-center justify-center text-[8px] font-bold ${colors[i]} ${
                  isActive ? 'ring-2 ring-foreground ring-offset-1 text-primary-foreground' : 'text-primary-foreground/60'
                }`}
              >
                {val}
              </div>
            );
          })}
        </div>
      </AppCard>
    </div>
  );
}
