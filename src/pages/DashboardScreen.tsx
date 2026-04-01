import { useState, useEffect, useCallback } from "react";
import { WidgetCard, CardLabel, StatusBadge, SensorBar, AlertBanner, MetricWidget } from "@/components/shared/SharedComponents";
import { getLatestReadings, MOCK_GROWTH, OPTIMAL_RANGES, getSensorStatus, type SensorReadings } from "@/utils/mockData";
import { Settings, TrendingUp } from "lucide-react";

function MiniChart({ color }: { color: string }) {
  const bars = [40, 55, 48, 62, 58, 70, 65, 72, 68, 75];
  return (
    <div className="h-[90px] flex flex-col justify-end">
      <div className="flex items-end gap-[3px] h-[72px]">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-md min-h-1"
            style={{
              height: h,
              backgroundColor: color,
              opacity: 0.25 + (i / bars.length) * 0.75,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] text-text-faint">6h ago</span>
        <span className="text-[9px] text-text-faint">Now</span>
      </div>
    </div>
  );
}

export default function DashboardScreen() {
  const [readings, setReadings] = useState<SensorReadings | null>(null);
  const [alerts, setAlerts] = useState<{ id: string; msg: string; type: 'warning' | 'danger' }[]>([]);
  const [graphOpen, setGraphOpen] = useState(false);
  const [graphTab, setGraphTab] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const data = await getLatestReadings();
      setReadings(data);
      const a: { id: string; msg: string; type: 'warning' | 'danger' }[] = [];
      if (data.temp.avg < OPTIMAL_RANGES.temp.min || data.temp.avg > OPTIMAL_RANGES.temp.max)
        a.push({ id: 'temp', msg: '⚠️ Temperature out of range: ' + data.temp.avg + '°C', type: 'warning' });
      if (data.ph < OPTIMAL_RANGES.ph.min || data.ph > OPTIMAL_RANGES.ph.max)
        a.push({ id: 'ph', msg: '⚠️ pH out of range: ' + data.ph, type: 'warning' });
      setAlerts(a);
    } catch {
      setAlerts([{ id: 'err', msg: '🔴 Could not reach backend.', type: 'danger' }]);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (!readings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-green border-t-transparent animate-spin" />
          <p className="text-text-muted text-sm">Loading sensors…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-10 no-scrollbar overflow-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-5 mt-3">
        <div>
          <p className="text-text-faint text-xs font-medium mb-0.5">HydroSense</p>
          <h1 className="text-[26px] font-bold text-text-primary tracking-tight">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2.5">
          {alerts.length === 0 && (
            <div className="flex items-center gap-1.5 bg-green-light/70 backdrop-blur-sm border border-success-border/50 px-3 py-1.5 rounded-full">
              <div className="w-[6px] h-[6px] rounded-full bg-green animate-pulse" />
              <span className="text-green-dark text-[10px] font-semibold">All Optimal</span>
            </div>
          )}
          <button className="w-9 h-9 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/60 flex items-center justify-center shadow-sm">
            <Settings size={16} className="text-text-muted" />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.map(a => <AlertBanner key={a.id} message={a.msg} type={a.type} />)}

      {/* Metric Widgets Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3 animate-slide-up">
        <MetricWidget
          icon="🌡️"
          label="Temperature"
          value={readings.temp.avg}
          unit="°C"
          subtitle="3 sensors avg"
          status={getSensorStatus('temp', readings.temp.avg)}
          onClick={() => { setGraphTab(0); setGraphOpen(true); }}
        />
        <MetricWidget
          icon="💧"
          label="Humidity"
          value={readings.humidity}
          unit="%"
          subtitle="Optimal range"
          status={getSensorStatus('humidity', readings.humidity)}
          onClick={() => { setGraphTab(1); setGraphOpen(true); }}
        />
        <MetricWidget
          icon="🧪"
          label="pH Level"
          value={readings.ph}
          subtitle="5.5–7.0 target"
          status={getSensorStatus('ph', readings.ph)}
        />
        <MetricWidget
          icon="⚡"
          label="TDS"
          value={readings.tds}
          unit="ppm"
          subtitle="Nutrient level"
          status={getSensorStatus('tds', readings.tds)}
        />
      </div>

      {/* Temperature Detail Widget */}
      <WidgetCard className="mb-3" onClick={() => { setGraphTab(0); setGraphOpen(true); }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">🌡️</span>
            <span className="text-[12px] font-semibold text-text-muted">Sensor Readings</span>
          </div>
          <div className="flex items-center gap-1 text-green-dark">
            <TrendingUp size={12} />
            <span className="text-[10px] font-semibold">Stable</span>
          </div>
        </div>
        <div className="flex gap-2">
          {[readings.temp.s1, readings.temp.s2, readings.temp.s3].map((val, i) => (
            <div key={i} className="flex-1 bg-card-alt/60 rounded-xl p-2.5 text-center border border-border/40">
              <div className="w-1.5 h-1.5 rounded-full mx-auto mb-1.5" style={{
                backgroundColor: getSensorStatus('temp', val) === 'success' ? 'hsl(var(--green))' : 'hsl(var(--chart-amber))'
              }} />
              <p className="text-[10px] text-text-faint mb-0.5">S{i + 1}</p>
              <p className="text-sm font-bold text-text-primary">{val}°</p>
            </div>
          ))}
        </div>
      </WidgetCard>

      {/* Growth Stage Widget */}
      <WidgetCard>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-light to-accent flex items-center justify-center">
              <span className="text-sm">🌿</span>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-text-primary">Growth Stage</p>
              <p className="text-[10px] text-text-faint">AI Classification</p>
            </div>
          </div>
          <StatusBadge label={`${MOCK_GROWTH.confidence.Vegetative}%`} type="success" size="sm" />
        </div>

        <div className="flex gap-2 mb-4">
          {Object.entries(MOCK_GROWTH.confidence).map(([stage, pct]) => (
            <div
              key={stage}
              className={`flex-1 rounded-2xl p-3 text-center transition-all ${
                stage === MOCK_GROWTH.stage
                  ? 'bg-gradient-to-b from-green-light to-accent/50 border border-success-border/60 shadow-sm'
                  : 'bg-card-alt/50 border border-border/40'
              }`}
            >
              <p className={`text-xl font-bold ${stage === MOCK_GROWTH.stage ? 'gradient-text' : 'text-text-primary'}`}>
                {pct}%
              </p>
              <p className={`text-[9px] mt-1 uppercase tracking-wider font-semibold ${stage === MOCK_GROWTH.stage ? 'text-green-dark' : 'text-text-faint'}`}>
                {stage}
              </p>
              <div className="w-full h-1 bg-border/50 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-green rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-3 border-t border-border/50">
          <div className="flex-1 bg-card-alt/50 rounded-xl p-3 text-center">
            <p className="text-text-faint text-[9px] uppercase tracking-wider mb-1">Days to Next</p>
            <p className="text-text-primary text-xl font-bold">{MOCK_GROWTH.daysToNext}</p>
          </div>
          <div className="flex-1 bg-card-alt/50 rounded-xl p-3 text-center">
            <p className="text-text-faint text-[9px] uppercase tracking-wider mb-1">Harvest</p>
            <p className="text-green-dark text-sm font-bold">{MOCK_GROWTH.harvestDate}</p>
          </div>
        </div>
      </WidgetCard>

      {/* Graph Modal */}
      {graphOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setGraphOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-background rounded-t-3xl px-4 pb-8 animate-in slide-in-from-bottom duration-300"
            style={{ height: '82%' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-2" />

            {/* Header */}
            <div className="flex items-center justify-between py-3 border-b border-border/50 mb-4">
              <button className="flex items-center gap-1" onClick={() => setGraphOpen(false)}>
                <span className="text-green-dark text-sm font-semibold">← Back</span>
              </button>
              <span className="text-text-primary text-[13px] font-bold tracking-wide">Graphs</span>
              <div className="w-12" />
            </div>

            {/* Tabs */}
            <div className="flex bg-card-alt/60 rounded-2xl p-1 mb-4 border border-border/40">
              {['Temperature', 'Humidity'].map((label, i) => (
                <button
                  key={label}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-center transition-all duration-200 ${
                    graphTab === i ? 'bg-green-dark text-primary-foreground shadow-sm' : 'text-text-muted'
                  }`}
                  onClick={() => setGraphTab(i)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
              {graphTab === 0 ? (
                <WidgetCard>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Temperature</span>
                    <StatusBadge label={`${readings.temp.avg}°C avg`} type="success" size="sm" />
                  </div>
                  <MiniChart color="hsl(152,55%,28%)" />
                  <div className="flex gap-2 mt-4">
                    {[
                      { label: 'Sensor 1', val: readings.temp.s1 },
                      { label: 'Sensor 2', val: readings.temp.s2 },
                      { label: 'Sensor 3', val: readings.temp.s3 },
                    ].map((sr, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center bg-card-alt/60 rounded-xl py-3 border border-border/40">
                        <div className="w-2 h-2 rounded-full mb-2" style={{
                          backgroundColor: getSensorStatus('temp', sr.val) === 'success' ? 'hsl(var(--green))' : 'hsl(var(--chart-amber))'
                        }} />
                        <span className="text-[10px] text-text-faint mb-1">{sr.label}</span>
                        <span className="text-[15px] font-bold text-text-primary">{sr.val}°C</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-text-faint mt-3 text-right">Optimal: 20–28 °C</p>
                </WidgetCard>
              ) : (
                <WidgetCard>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Humidity</span>
                    <StatusBadge label={`${readings.humidity}%`} type="success" size="sm" />
                  </div>
                  <MiniChart color="hsl(152,60%,42%)" />
                  <div className="flex gap-2 mt-4 mb-3">
                    {[
                      { label: 'Current', val: `${readings.humidity}%` },
                      { label: 'Status', val: 'Optimal', isGreen: true },
                      { label: 'Target', val: '55–75%' },
                    ].map(({ label, val, isGreen }) => (
                      <div key={label} className="flex-1 flex flex-col items-center bg-card-alt/60 rounded-xl py-3 border border-border/40">
                        <span className="text-[10px] text-text-faint mb-1">{label}</span>
                        <span className={`text-[15px] font-bold ${isGreen ? 'text-green-dark' : 'text-text-primary'}`}>{val}</span>
                      </div>
                    ))}
                  </div>
                  <SensorBar value={readings.humidity} max={100} />
                  <p className="text-[10px] text-text-faint mt-3 text-right">Optimal: 55–75 %</p>
                </WidgetCard>
              )}
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-1.5 pt-4">
              {[0, 1].map(i => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${graphTab === i ? 'w-5 bg-green-dark' : 'w-1.5 bg-border'}`} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
