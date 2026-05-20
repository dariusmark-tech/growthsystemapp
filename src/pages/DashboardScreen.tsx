import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { AppCard, CardLabel, StatusBadge, SensorBar, AlertBanner } from "@/components/shared/SharedComponents";
import { SensorLineChart } from "@/components/shared/SensorLineChart";
import LogoLoader from "@/components/shared/LogoLoader";
import { getSensorStatus, type SensorReadings } from "@/utils/mockData";
import { computeAlerts } from "@/hooks/useSensorAlerts";
import { useArduinoSensors, refreshSensors } from "@/hooks/useArduinoSensors";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import { FullDetailsPage } from "@/components/camera/FullDetailsPage";
import type { PlantAnalysis } from "@/components/camera/types";

const BANNER_TIMEOUT_MS = 5000;
const BANNER_FLASH_KEY = "growth_banner_flashed";

interface HistoryItem {
  id: string;
  plant_name: string;
  stage: string;
  confidence: Record<string, number>;
  days_to_next: number | null;
  harvest_date: string | null;
  image_url: string | null;
  created_at: string;
  nutrients?: any;
  raw_response?: any;
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function historyToAnalysis(item: HistoryItem): PlantAnalysis {
  const raw = item.raw_response as PlantAnalysis | undefined;
  if (raw && raw.plantName) return raw;
  return {
    plantName: item.plant_name,
    stage: item.stage as PlantAnalysis["stage"],
    confidence: (item.confidence ?? {}) as PlantAnalysis["confidence"],
    daysToNext: item.days_to_next ?? 0,
    harvestDate: item.harvest_date ?? "",
    nutrients: (item.nutrients ?? []) as PlantAnalysis["nutrients"],
  };
}

export default function DashboardScreen() {
  const { readings, connected, error: sensorError, loading, history } = useArduinoSensors();
  const [alerts, setAlerts] = useState<import("@/hooks/useSensorAlerts").SensorAlert[]>([]);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [graphTab, setGraphTab] = useState(0);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    if (readings) setAlerts(computeAlerts(readings));
  }, [readings]);

  const loadHistory = useCallback(async () => {
    const readLocal = (): HistoryItem[] => {
      try {
        const raw = localStorage.getItem("growth_local_history");
        return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
      } catch { return []; }
    };
    const { data: { user } } = await supabase.auth.getUser();
    let cloud: HistoryItem[] = [];
    if (user) {
      const { data, error } = await supabase
        .from('plant_analyses')
        .select('id, plant_name, stage, confidence, days_to_next, harvest_date, image_url, created_at, nutrients, raw_response')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) console.error("Load history failed:", error);
      if (data) cloud = data as unknown as HistoryItem[];
    }
    const local = readLocal();
    const map = new Map<string, HistoryItem>();
    for (const it of [...cloud, ...local]) map.set(it.id, it);
    const merged = Array.from(map.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);
    setHistoryItems(merged);
    setHistoryLoading(false);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    const refresh = () => { loadHistory(); };
    const onVis = () => { if (document.visibilityState === "visible") loadHistory(); };
    window.addEventListener("plant-history-updated", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("plant-history-updated", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadHistory]);

  useEffect(() => {
    if (!readings) return;
    if (sessionStorage.getItem(BANNER_FLASH_KEY) === '1') return;
    setBannerVisible(true);
    const t = setTimeout(() => {
      setBannerVisible(false);
      sessionStorage.setItem(BANNER_FLASH_KEY, '1');
    }, BANNER_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [readings]);

  const isLive = !!readings;
  const data: SensorReadings = readings ?? {
    temp: { s1: 0, s2: 0, s3: 0, avg: 0 },
    humidity: 0,
    ph: 0,
    tds: 0,
  };

  if (selectedItem) {
    return (
      <FullDetailsPage
        result={historyToAnalysis(selectedItem)}
        imageUri={selectedItem.image_url}
        onBack={() => setSelectedItem(null)}
      />
    );
  }

  return (
    <div className="p-4 pb-10 no-scrollbar overflow-auto animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-end mb-6 mt-2">
        <div className="flex items-center gap-2">
          <img src={logo} alt="G.R.O.W.T.H." className="w-9 h-9 object-contain" />
          <h1 className="text-[28px] font-extrabold text-text-primary tracking-tight">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshSensors()}
            className="w-7 h-7 rounded-full border border-border bg-card flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Reconnect sensors"
            title="Refresh sensor data"
          >
            <RefreshCw size={13} className="text-text-muted" strokeWidth={2.5} />
          </button>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${connected ? 'bg-green-light border-border-high' : 'bg-danger-bg border-danger-border'}`}>
            <div className={`w-[7px] h-[7px] rounded-full ${connected ? 'bg-green animate-pulse' : 'bg-danger'}`} />
            <span className={`text-[10px] font-bold ${connected ? 'text-green-dark' : 'text-danger'}`}>
              {connected ? 'Arduino Live' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {bannerVisible && alerts.map(a => (
        <div key={a.id} className="animate-fade-in">
          <AlertBanner message={a.msg} type={a.type} />
        </div>
      ))}

      {!isLive && (
        <AlertBanner
          message={loading ? "Connecting to Arduino…" : (sensorError ?? "Arduino not connected — sensor values unavailable")}
          type="warning"
        />
      )}

      {/* Temperature + Humidity Card */}
      <AppCard className="mb-3">
        <button className="flex items-center justify-between w-full py-3" onClick={() => { setGraphTab(0); setGraphOpen(true); }}>
          <div className="flex-1 pr-2">
            <p className="text-[15px] font-bold text-text-primary mb-2">Temperature</p>
            <div className="flex gap-1.5">
              {[data.temp.s1, data.temp.s2, data.temp.s3].map((val, i) => (
                <div key={i} className="flex items-center gap-1 bg-card-alt rounded-md px-[7px] py-[3px] border border-border">
                  <div className="w-[5px] h-[5px] rounded-full" style={{
                    backgroundColor: isLive && getSensorStatus('temp', val) === 'success' ? 'hsl(var(--green))' : 'hsl(var(--chart-amber))'
                  }} />
                  <span className="text-[11px] text-text-muted font-semibold">S{i + 1} {isLive ? `${val}°` : "—"}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[30px] font-extrabold text-text-primary tracking-tight">
              {isLive ? data.temp.avg : "—"}<span className="text-sm font-normal text-text-faint">°C</span>
            </span>
            <p className="text-[11px] text-text-muted mt-0.5">avg.</p>
          </div>
        </button>

        <div className="h-px bg-border -mx-4" />

        <button className="flex items-center justify-between w-full py-3" onClick={() => { setGraphTab(1); setGraphOpen(true); }}>
          <div className="flex-1 pr-2">
            <p className="text-[15px] font-bold text-text-primary mb-2">Humidity</p>
            <SensorBar
              value={data.humidity}
              max={100}
              color={getSensorStatus('humidity', data.humidity) === 'success' ? 'hsl(var(--green))' : 'hsl(var(--chart-amber))'}
              className="w-[90%]"
            />
          </div>
          <div className="text-right">
            <span className="text-[30px] font-extrabold text-text-primary tracking-tight">
              {isLive ? data.humidity : "—"}<span className="text-sm font-normal text-text-faint">%</span>
            </span>
            <p className="text-[11px] text-text-muted mt-0.5">avg.</p>
          </div>
        </button>

        <div className="flex justify-end mt-3">
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-green-dark bg-green-light text-green-dark text-[13px] font-bold"
            onClick={() => { setGraphTab(0); setGraphOpen(true); }}
          >
            Graph <span>→</span>
          </button>
        </div>
      </AppCard>

      {/* pH + TDS Card */}
      <AppCard className="mb-3">
        <button className="flex items-center justify-between w-full py-3" onClick={() => { setGraphTab(2); setGraphOpen(true); }}>
          <div className="flex-1 pr-2">
            <p className="text-[15px] font-bold text-text-primary mb-2">pH Level</p>
            <SensorBar
              value={data.ph}
              max={14}
              color={getSensorStatus('ph', data.ph) === 'success' ? 'hsl(var(--green))' : 'hsl(var(--chart-amber))'}
              className="w-[90%]"
            />
            <p className="text-[10px] text-text-faint mt-1">Target: 5.5–6.5</p>
          </div>
          <div className="text-right">
            <span className="text-[30px] font-extrabold text-text-primary tracking-tight">
              {isLive ? data.ph : "—"}
            </span>
            <p className="text-[11px] text-text-muted mt-0.5">pH</p>
          </div>
        </button>

        <div className="h-px bg-border -mx-4" />

        <button className="flex items-center justify-between w-full py-3" onClick={() => { setGraphTab(3); setGraphOpen(true); }}>
          <div className="flex-1 pr-2">
            <p className="text-[15px] font-bold text-text-primary mb-2">TDS (Nutrients)</p>
            <SensorBar
              value={data.tds}
              max={2000}
              color={getSensorStatus('tds', data.tds) === 'success' ? 'hsl(var(--green))' : 'hsl(var(--chart-amber))'}
              className="w-[90%]"
            />
            <p className="text-[10px] text-text-faint mt-1">Target: 800–1500 ppm</p>
          </div>
          <div className="text-right">
            <span className="text-[30px] font-extrabold text-text-primary tracking-tight">
              {isLive ? data.tds : "—"}<span className="text-sm font-normal text-text-faint"> ppm</span>
            </span>
            <p className="text-[11px] text-text-muted mt-0.5">current</p>
          </div>
        </button>

        <div className="flex justify-end mt-3">
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-green-dark bg-green-light text-green-dark text-[13px] font-bold"
            onClick={() => { setGraphTab(3); setGraphOpen(true); }}
          >
            Graph <span>→</span>
          </button>
        </div>
      </AppCard>

      {/* Classification History */}
      <AppCard>
        <div className="flex justify-between items-center mb-3">
          <CardLabel className="mb-0">🌿 Classification History</CardLabel>
          <Link to="/camera" className="text-green-dark text-[11px] font-bold">+ New</Link>
        </div>

        {historyLoading ? (
          <div className="py-4"><LogoLoader size={36} label="Loading…" /></div>
        ) : historyItems.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-text-muted text-sm mb-2">No classifications yet.</p>
            <Link to="/camera" className="inline-block text-green-dark text-[13px] font-bold underline">
              Classify your first plant →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {historyItems.map((item) => {
              const conf = item.confidence?.[item.stage] ?? 0;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card-alt text-left hover:bg-green-light/40 transition-colors"
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.plant_name}
                      className="w-12 h-12 rounded-md object-cover border border-border flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-green-light border border-border flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">🌱</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-text-primary truncate">
                      {item.plant_name}
                    </p>
                    <p className="text-[11px] text-text-muted">
                      {item.stage} · {formatRelative(item.created_at)}
                    </p>
                  </div>
                  
                </button>
              );
            })}
          </div>
        )}
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

            <div className="flex items-center justify-between py-3 border-b border-border mb-3.5">
              <button className="flex items-center gap-1 w-16" onClick={() => setGraphOpen(false)}>
                <span className="text-green-dark text-[17px] font-bold">←</span>
                <span className="text-green-dark text-sm font-semibold">back</span>
              </button>
              <span className="text-text-primary text-[13px] font-extrabold tracking-[1.5px]">GRAPHS</span>
              <div className="w-16" />
            </div>

            <div className="flex bg-card-alt rounded-[10px] p-[3px] mb-4">
              {['Temp', 'Humidity', 'pH', 'TDS'].map((label, i) => (
                <button
                  key={label}
                  className={`flex-1 py-2.5 rounded-lg text-[12px] font-semibold text-center transition-colors ${
                    graphTab === i ? 'bg-green-dark text-green-light font-bold' : 'text-text-muted'
                  }`}
                  onClick={() => setGraphTab(i)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto">
              {graphTab === 0 ? (
                <div className="bg-background rounded-[14px] border border-border p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-extrabold text-text-muted tracking-[1.5px]">TEMPERATURE</span>
                    <StatusBadge label={isLive ? `${data.temp.avg}°C avg` : "NO DATA"} type="success" size="sm" />
                  </div>
                  {history.temp.length > 1 ? (
                    <SensorLineChart data={history.temp} color="hsl(152,55%,28%)" yLabel="Temperature" unit="°C" />
                  ) : (
                    <div className="h-[180px] flex items-center justify-center text-text-muted text-xs">
                      Waiting for Arduino samples…
                    </div>
                  )}
                  <div className="flex gap-2 mt-3.5">
                    {[
                      { label: 'Sensor 1', val: data.temp.s1 },
                      { label: 'Sensor 2', val: data.temp.s2 },
                      { label: 'Sensor 3', val: data.temp.s3 },
                    ].map((sr, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center bg-card-alt rounded-lg py-2.5 border border-border">
                        <div className="w-2 h-2 rounded-full mb-1.5" style={{
                          backgroundColor: getSensorStatus('temp', sr.val) === 'success' ? 'hsl(var(--green))' : 'hsl(var(--chart-amber))'
                        }} />
                        <span className="text-[10px] text-text-muted mb-1">{sr.label}</span>
                        <span className="text-[15px] font-extrabold text-text-primary">{isLive ? `${sr.val}°C` : "—"}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-text-faint mt-2.5 text-right">Optimal range: 20–28 °C</p>
                </div>
              ) : graphTab === 1 ? (
                <div className="bg-background rounded-[14px] border border-border p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-extrabold text-text-muted tracking-[1.5px]">HUMIDITY</span>
                    <StatusBadge label={isLive ? `${data.humidity}%` : "NO DATA"} type="success" size="sm" />
                  </div>
                  {history.humidity.length > 1 ? (
                    <SensorLineChart data={history.humidity} color="hsl(152,60%,42%)" yLabel="Humidity" unit="%" />
                  ) : (
                    <div className="h-[180px] flex items-center justify-center text-text-muted text-xs">
                      Waiting for Arduino samples…
                    </div>
                  )}
                  <div className="flex gap-2 mt-3 mb-3">
                    {[
                      { label: 'Current', val: isLive ? `${data.humidity}%` : "—" },
                      { label: 'Status', val: isLive ? 'Optimal' : '—', isGreen: isLive },
                      { label: 'Target', val: '55–75%' },
                    ].map(({ label, val, isGreen }) => (
                      <div key={label} className="flex-1 flex flex-col items-center bg-card-alt rounded-lg py-2.5 border border-border">
                        <span className="text-[10px] text-text-muted mb-1">{label}</span>
                        <span className={`text-[15px] font-extrabold ${isGreen ? 'text-green-dark' : 'text-text-primary'}`}>{val}</span>
                      </div>
                    ))}
                  </div>
                  <SensorBar value={isLive ? data.humidity : 0} max={100} />
                  <p className="text-[10px] text-text-faint mt-2.5 text-right">Optimal range: 55–75 %</p>
                </div>
              ) : graphTab === 2 ? (
                <div className="bg-background rounded-[14px] border border-border p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-extrabold text-text-muted tracking-[1.5px]">pH LEVEL</span>
                    <StatusBadge label={isLive ? `${data.ph} pH` : "NO DATA"} type={isLive ? getSensorStatus('ph', data.ph) : 'success'} size="sm" />
                  </div>
                  {history.ph.length > 1 ? (
                    <SensorLineChart data={history.ph} color="hsl(200,70%,45%)" yLabel="pH" unit="" />
                  ) : (
                    <div className="h-[180px] flex items-center justify-center text-text-muted text-xs">
                      Waiting for Arduino samples…
                    </div>
                  )}
                  <SensorBar value={isLive ? data.ph : 0} max={14} className="mt-3" />
                  <p className="text-[10px] text-text-faint mt-2.5 text-right">Optimal range: 5.5–6.5</p>
                </div>
              ) : (
                <div className="bg-background rounded-[14px] border border-border p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-extrabold text-text-muted tracking-[1.5px]">TDS (NUTRIENTS)</span>
                    <StatusBadge label={isLive ? `${data.tds} ppm` : "NO DATA"} type={isLive ? getSensorStatus('tds', data.tds) : 'success'} size="sm" />
                  </div>
                  {history.tds.length > 1 ? (
                    <SensorLineChart data={history.tds} color="hsl(35,85%,50%)" yLabel="TDS" unit="ppm" />
                  ) : (
                    <div className="h-[180px] flex items-center justify-center text-text-muted text-xs">
                      Waiting for Arduino samples…
                    </div>
                  )}
                  <SensorBar value={isLive ? data.tds : 0} max={2000} className="mt-3" />
                  <p className="text-[10px] text-text-faint mt-2.5 text-right">Optimal range: 800–1500 ppm</p>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-1.5 pt-3.5">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${graphTab === i ? 'w-5 bg-green-dark' : 'w-1.5 bg-border'}`} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
