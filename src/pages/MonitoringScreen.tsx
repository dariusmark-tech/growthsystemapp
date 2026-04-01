import { useState } from "react";
import { WidgetCard, StatusBadge, SensorBar } from "@/components/shared/SharedComponents";
import { MOCK_READINGS, OPTIMAL_RANGES, getSensorStatus } from "@/utils/mockData";
import { Settings } from "lucide-react";

const TIME_RANGES = ['1h', '6h', '24h', '7d'];

export default function MonitoringScreen() {
  const [timeRange, setTimeRange] = useState('6h');
  const readings = MOCK_READINGS;

  return (
    <div className="p-4 pb-10 no-scrollbar overflow-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-5 mt-3">
        <div>
          <p className="text-text-faint text-xs font-medium mb-0.5">Real-time</p>
          <h1 className="text-[26px] font-bold text-text-primary tracking-tight">Monitoring</h1>
        </div>
        <button className="w-9 h-9 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/60 flex items-center justify-center shadow-sm">
          <Settings size={16} className="text-text-muted" />
        </button>
      </div>

      {/* Time Range Pills */}
      <div className="flex gap-2 mb-4">
        {TIME_RANGES.map(r => (
          <button
            key={r}
            className={`px-4 py-2 rounded-xl text-[11px] font-semibold transition-all duration-200 ${
              timeRange === r
                ? 'bg-green-dark text-primary-foreground shadow-sm'
                : 'bg-card/80 backdrop-blur-sm border border-border/60 text-text-muted'
            }`}
            onClick={() => setTimeRange(r)}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Temperature Widget */}
      <WidgetCard className="mb-3">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-light to-accent flex items-center justify-center">
              <span className="text-base">🌡️</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-text-primary">Temperature</p>
              <p className="text-[10px] text-text-faint">3 sensors active</p>
            </div>
          </div>
          <StatusBadge
            label={getSensorStatus('temp', readings.temp.avg) === 'success' ? 'Optimal' : 'Warning'}
            type={getSensorStatus('temp', readings.temp.avg)}
            size="sm"
          />
        </div>

        {/* Sensor rows */}
        <div className="bg-card-alt/50 rounded-xl border border-border/40 overflow-hidden mb-3">
          {[
            { label: 'Sensor 1', val: readings.temp.s1 },
            { label: 'Sensor 2', val: readings.temp.s2 },
            { label: 'Sensor 3', val: readings.temp.s3 },
          ].map(({ label, val }, idx) => (
            <div key={label} className={`flex justify-between items-center px-3.5 py-3 ${idx < 2 ? 'border-b border-border/30' : ''}`}>
              <span className="text-[12px] text-text-muted font-medium">{label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-text-primary">{val} °C</span>
                <div className={`w-2 h-2 rounded-full ${getSensorStatus('temp', val) === 'success' ? 'bg-green' : 'bg-warning'}`} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mb-3">
          <span className="text-[13px] font-semibold text-green-dark">Average</span>
          <span className="text-[13px] font-bold text-text-primary">{readings.temp.avg} °C</span>
        </div>

        {/* Range bar */}
        <div className="bg-card-alt/50 rounded-xl p-3 border border-border/40">
          <div className="relative h-2.5 rounded-full overflow-hidden bg-gradient-to-r from-chart-blue via-green to-danger">
            <div
              className="absolute top-0 w-3.5 h-full bg-card rounded-full border-2 border-text-primary shadow-sm"
              style={{ left: `${((readings.temp.avg - 0) / 40) * 100}%`, transform: 'translateX(-50%)' }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[9px] text-text-faint">0°C Cold</span>
            <span className="text-[9px] text-text-faint font-medium">20–28°C Optimal</span>
            <span className="text-[9px] text-text-faint">40°C Hot</span>
          </div>
        </div>
      </WidgetCard>

      {/* Humidity Widget */}
      <WidgetCard className="mb-3">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-light to-accent flex items-center justify-center">
              <span className="text-base">💧</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-text-primary">Humidity</p>
              <p className="text-[10px] text-text-faint">Target: 55–75%</p>
            </div>
          </div>
          <StatusBadge label="Optimal" type="success" size="sm" />
        </div>

        <p className="text-3xl font-bold text-text-primary tracking-tight mb-2">
          {readings.humidity}<span className="text-sm font-normal text-text-faint">%</span>
        </p>

        <SensorBar value={readings.humidity} max={100} className="mb-1.5" />
        <p className="text-[10px] text-text-faint">{readings.humidity}% of capacity — within optimal range</p>
      </WidgetCard>

      {/* pH Widget */}
      <WidgetCard className="mb-3">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-light to-accent flex items-center justify-center">
              <span className="text-base">🧪</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-text-primary">pH Level</p>
              <p className="text-[10px] text-text-faint">Target: 5.5–7.0</p>
            </div>
          </div>
          <StatusBadge label="Optimal" type="success" size="sm" />
        </div>

        <p className="text-3xl font-bold text-text-primary tracking-tight mb-3">{readings.ph}</p>

        {/* pH Scale */}
        <div className="flex gap-0.5 rounded-xl overflow-hidden">
          {Array.from({ length: 14 }, (_, i) => {
            const val = i + 1;
            const isActive = Math.round(readings.ph) === val;
            const colors = [
              'bg-danger', 'bg-danger', 'bg-chart-amber', 'bg-chart-amber',
              'bg-warning', 'bg-green', 'bg-green', 'bg-green',
              'bg-chart-blue', 'bg-chart-blue', 'bg-chart-blue',
              'bg-chart-blue', 'bg-chart-blue', 'bg-chart-blue',
            ];
            return (
              <div
                key={val}
                className={`flex-1 h-6 flex items-center justify-center text-[8px] font-bold transition-all ${colors[i]} ${
                  isActive ? 'ring-2 ring-text-primary ring-offset-1 rounded-md scale-110 text-primary-foreground shadow-sm' : 'text-primary-foreground/50'
                }`}
              >
                {val}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[9px] text-text-faint">Acidic</span>
          <span className="text-[9px] text-text-faint">Neutral</span>
          <span className="text-[9px] text-text-faint">Alkaline</span>
        </div>
      </WidgetCard>
    </div>
  );
}
