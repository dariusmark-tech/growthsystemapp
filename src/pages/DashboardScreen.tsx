import { useState, useEffect, useCallback } from "react";
import { AppCard, CardLabel, StatusBadge, SensorBar, AlertBanner } from "@/components/shared/SharedComponents";
import { getLatestReadings, MOCK_GROWTH, OPTIMAL_RANGES, getSensorStatus, type SensorReadings } from "@/utils/mockData";
import LogoutButton from "@/components/shared/LogoutButton";

function MiniChart({ color }: { color: string }) {
  const bars = [40, 55, 48, 62, 58, 70, 65, 72, 68, 75];
  return (
    <div className="h-[90px] flex flex-col justify-end">
      <div className="flex items-end gap-[3px] h-[72px]">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-[3px] min-h-1"
            style={{
              height: h,
              backgroundColor: color,
              opacity: 0.3 + (i / bars.length) * 0.7,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-text-faint">6h ago</span>
        <span className="text-[9px] text-text-faint">3h ago</span>
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
      setAlerts([{ id: 'err', msg: '🔴 Could not reach backend. Showing cached data.', type: 'danger' }]);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (!readings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-text-muted text-base">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-10 no-scrollbar overflow-auto">
      {/* Header */}
      <div className="flex justify-between items-end mb-6 mt-2">
        <div className="flex items-center gap-1">
          <span className="text-3xl">🌱</span>
          <h1 className="text-[28px] font-extrabold text-text-primary tracking-tight">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          {alerts.length === 0 && (
            <div className="flex items-center gap-1.5 bg-green-light border border-border-high px-3 py-1.5 rounded-full">
              <div className="w-[7px] h-[7px] rounded-full bg-green animate-pulse" />
              <span className="text-green-dark text-[11px] font-bold">All Optimal</span>
            </div>
          )}
          <LogoutButton />
        </div>
      </div>

      {/* Alerts */}
      {alerts.map(a => <AlertBanner key={a.id} message={a.msg} type={a.type} />)}

      {/* Temperature + Humidity Card */}
      <AppCard className="mb-3">
        {/* Temperature */}
        <button className="flex items-center justify-between w-full py-3" onClick={() => { setGraphTab(0); setGraphOpen(true); }}>
          <div className="flex-1 pr-2">
            <p className="text-[15px] font-bold text-text-primary mb-2">Temperature</p>
            <div className="flex gap-1.5">
              {[readings.temp.s1, readings.temp.s2, readings.temp.s3].map((val, i) => (
                <div key={i} className="flex items-center gap-1 bg-card-alt rounded-md px-[7px] py-[3px] border border-border">
                  <div className="w-[5px] h-[5px] rounded-full" style={{
                    backgroundColor: getSensorStatus('temp', val) === 'success' ? 'hsl(var(--green))' : 'hsl(var(--chart-amber))'
                  }} />
                  <span className="text-[11px] text-text-muted font-semibold">S{i + 1} {val}°</span>
                </div>
              ))}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[30px] font-extrabold text-text-primary tracking-tight">
              {readings.temp.avg}<span className="text-sm font-normal text-text-faint">°C</span>
            </span>
            <p className="text-[11px] text-text-muted mt-0.5">avg.</p>
          </div>
        </button>

        <div className="h-px bg-border -mx-4" />

        {/* Humidity */}
        <button className="flex items-center justify-between w-full py-3" onClick={() => { setGraphTab(1); setGraphOpen(true); }}>
          <div className="flex-1 pr-2">
            <p className="text-[15px] font-bold text-text-primary mb-2">Humidity</p>
            <SensorBar
              value={readings.humidity}
              max={100}
              color={getSensorStatus('humidity', readings.humidity) === 'success' ? 'hsl(var(--green))' : 'hsl(var(--chart-amber))'}
              className="w-[90%]"
            />
          </div>
          <div className="text-right">
            <span className="text-[30px] font-extrabold text-text-primary tracking-tight">
              {readings.humidity}<span className="text-sm font-normal text-text-faint">%</span>
            </span>
            <p className="text-[11px] text-text-muted mt-0.5">avg.</p>
          </div>
        </button>

        {/* Graph button */}
        <div className="flex justify-end mt-3">
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-green-dark bg-green-light text-green-dark text-[13px] font-bold"
            onClick={() => { setGraphTab(0); setGraphOpen(true); }}
          >
            Graph <span>→</span>
          </button>
        </div>
      </AppCard>

      {/* Growth Stage */}
      <AppCard>
        <div className="flex justify-between items-center mb-3">
          <CardLabel className="mb-0">🌿 Growth Stage Classification</CardLabel>
          <StatusBadge label={`${MOCK_GROWTH.confidence.Vegetative}% confidence`} size="sm" />
        </div>

        <div className="flex gap-2 mt-2.5 mb-3">
          {Object.entries(MOCK_GROWTH.confidence).map(([stage, pct]) => (
            <div
              key={stage}
              className={`flex-1 rounded-md p-3 text-center border ${
                stage === MOCK_GROWTH.stage
                  ? 'bg-green-light border-green-dark'
                  : 'bg-card-alt border-border'
              }`}
            >
              <p className={`text-lg font-extrabold ${stage === MOCK_GROWTH.stage ? 'text-green-dark' : 'text-text-primary'}`}>
                {pct}%
              </p>
              <p className={`text-[10px] mt-0.5 uppercase tracking-wide font-semibold ${stage === MOCK_GROWTH.stage ? 'text-green-dark' : 'text-text-muted'}`}>
                {stage}
              </p>
              <div className="w-full h-[3px] bg-border rounded mt-1.5 overflow-hidden">
                <div className="h-full bg-green rounded" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-around pt-2.5 border-t border-border">
          <div className="text-center">
            <p className="text-text-faint text-[9px] uppercase tracking-wide">Est. Days to Next Stage</p>
            <p className="text-text-primary text-xl font-extrabold mt-0.5">{MOCK_GROWTH.daysToNext}</p>
          </div>
          <div className="text-center">
            <p className="text-text-faint text-[9px] uppercase tracking-wide">Predicted Harvest</p>
            <p className="text-green-dark text-sm font-extrabold mt-0.5">{MOCK_GROWTH.harvestDate}</p>
          </div>
        </div>
      </AppCard>

      {/* Graph Modal */}
      {graphOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setGraphOpen(false)}>
          <div className="absolute inset-0 bg-black/45" />
          <div
            className="relative bg-background rounded-t-[22px] px-4 pb-7 animate-in slide-in-from-bottom duration-300"
            style={{ height: '82%' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mt-2.5 mb-1" />

            {/* Header */}
            <div className="flex items-center justify-between py-3 border-b border-border mb-3.5">
              <button className="flex items-center gap-1 w-16" onClick={() => setGraphOpen(false)}>
                <span className="text-green-dark text-[17px] font-bold">←</span>
                <span className="text-green-dark text-sm font-semibold">back</span>
              </button>
              <span className="text-text-primary text-[13px] font-extrabold tracking-[1.5px]">GRAPHS</span>
              <div className="w-16" />
            </div>

            {/* Tabs */}
            <div className="flex bg-card-alt rounded-[10px] p-[3px] mb-4">
              {['Temperature', 'Humidity'].map((label, i) => (
                <button
                  key={label}
                  className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold text-center transition-colors ${
                    graphTab === i ? 'bg-green-dark text-green-light font-bold' : 'text-text-muted'
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
                <div className="bg-background rounded-[14px] border border-border p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-extrabold text-text-muted tracking-[1.5px]">TEMPERATURE</span>
                    <StatusBadge label={`${readings.temp.avg}°C avg`} type="success" size="sm" />
                  </div>
                  <MiniChart color="hsl(152,55%,28%)" />
                  <div className="flex gap-2 mt-3.5">
                    {[
                      { label: 'Sensor 1', val: readings.temp.s1 },
                      { label: 'Sensor 2', val: readings.temp.s2 },
                      { label: 'Sensor 3', val: readings.temp.s3 },
                    ].map((sr, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center bg-card-alt rounded-lg py-2.5 border border-border">
                        <div className="w-2 h-2 rounded-full mb-1.5" style={{
                          backgroundColor: getSensorStatus('temp', sr.val) === 'success' ? 'hsl(var(--green))' : 'hsl(var(--chart-amber))'
                        }} />
                        <span className="text-[10px] text-text-muted mb-1">{sr.label}</span>
                        <span className="text-[15px] font-extrabold text-text-primary">{sr.val}°C</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-text-faint mt-2.5 text-right">Optimal range: 20–28 °C</p>
                </div>
              ) : (
                <div className="bg-background rounded-[14px] border border-border p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-extrabold text-text-muted tracking-[1.5px]">HUMIDITY</span>
                    <StatusBadge label={`${readings.humidity}%`} type="success" size="sm" />
                  </div>
                  <MiniChart color="hsl(152,60%,42%)" />
                  <div className="flex gap-2 mt-3 mb-3">
                    {[
                      { label: 'Current', val: `${readings.humidity}%` },
                      { label: 'Status', val: 'Optimal', isGreen: true },
                      { label: 'Target', val: '55–75%' },
                    ].map(({ label, val, isGreen }) => (
                      <div key={label} className="flex-1 flex flex-col items-center bg-card-alt rounded-lg py-2.5 border border-border">
                        <span className="text-[10px] text-text-muted mb-1">{label}</span>
                        <span className={`text-[15px] font-extrabold ${isGreen ? 'text-green-dark' : 'text-text-primary'}`}>{val}</span>
                      </div>
                    ))}
                  </div>
                  <SensorBar value={readings.humidity} max={100} />
                  <p className="text-[10px] text-text-faint mt-2.5 text-right">Optimal range: 55–75 %</p>
                </div>
              )}
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-1.5 pt-3.5">
              {[0, 1].map(i => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${graphTab === i ? 'w-5 bg-green-dark' : 'w-1.5 bg-border'}`} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
