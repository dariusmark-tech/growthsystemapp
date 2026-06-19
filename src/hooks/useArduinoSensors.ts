import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSensorStatus, type SensorReadings } from "@/utils/mockData";

interface FirebaseShape {
  dht1?: { temperature?: number; humidity?: number; tempStatus?: string; humStatus?: string };
  dht2?: { temperature?: number; humidity?: number; tempStatus?: string; humStatus?: string };
  dht3?: { temperature?: number; humidity?: number; tempStatus?: string; humStatus?: string };
  ph?: { value?: number; status?: string };
  tds?: { value?: number; status?: string };
  lastUpdated?: string;
}

export interface ArduinoLogEntry {
  timestamp: string;
  temp: number;
  humidity: number;
  ph: number;
  tds: number;
  status: "Optimal" | "Warning" | "Critical";
}

export interface ArduinoSensorState {
  readings: SensorReadings | null;
  connected: boolean;
  lastUpdated: string | null;
  error: string | null;
  loading: boolean;
  history: {
    temp: number[];
    humidity: number[];
    ph: number[];
    tds: number[];
    timestamps: string[];
    // Raw (pre-normalization) averaged values + out-of-range flags so the UI
    // can plot anomalies and show where an error first started.
    rawTemp: number[];
    rawHumidity: number[];
    rawPh: number[];
    rawTds: number[];
    errTemp: boolean[];
    errHumidity: boolean[];
    errPh: boolean[];
    errTds: boolean[];
  };
  logs: ArduinoLogEntry[];
}

const POLL_MS = 1000; // Poll every 1s for fast offline detection
const DATA_UPDATE_MS = 5000; // Only refresh readings/graphs every 5s
const STALE_MS = 7_000; // Arduino writes about every 5s
const HISTORY_LIMIT = 30;
const LOG_LIMIT = 50;

function round(n: number, d = 1) {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

export type SensorKey = "temp" | "humidity" | "ph" | "tds";

// The physically-sensible "normalization" range for each sensor. Values outside
// this band are treated as an error/anomaly (still recorded, but flagged).
export const NORM_RANGES: Record<SensorKey, [number, number]> = {
  temp: [-10, 60],
  humidity: [0, 100],
  ph: [0, 14],
  tds: [0, 3000],
};

// Inspect a raw sensor read. Returns:
//  - value:      the true raw number (NaN if non-numeric / sentinel error code)
//  - clamped:    the normalized value, bounded into NORM_RANGES (NaN if invalid)
//  - outOfRange: true when the raw value is real data but outside the band
function classifyRaw(key: SensorKey, raw: unknown): {
  value: number;
  clamped: number;
  outOfRange: boolean;
} {
  const n = Number(raw);
  if (!Number.isFinite(n)) return { value: NaN, clamped: NaN, outOfRange: false };
  // Common sensor failure sentinels — treat as missing, not as data.
  if (n === -127 || n === 255 || n === 65535 || n === -999 || n === 999) {
    return { value: NaN, clamped: NaN, outOfRange: false };
  }
  const [min, max] = NORM_RANGES[key];
  const outOfRange = n < min || n > max;
  return { value: n, clamped: Math.min(Math.max(n, min), max), outOfRange };
}

// Normalize raw sensor reads into physically sensible ranges so noisy/garbage
// values from a flaky probe don't blow out the UI. Truly unusable reads
// (non-numeric, or the well-known Arduino error/sentinel codes such as -127,
// 65535/0xFFFF, NaN) become NaN and are excluded from averages. Everything
// else is CLAMPED into the valid range so a slightly out-of-range value is
// still shown instead of silently collapsing to 0.
function normalize(key: SensorKey, raw: unknown): number {
  return classifyRaw(key, raw).clamped;
}

function avgValid(vals: number[]): number {
  const ok = vals.filter((v) => Number.isFinite(v));
  if (!ok.length) return NaN;
  return ok.reduce((a, b) => a + b, 0) / ok.length;
}

// Singleton store shared across all consumers — one poll loop, one history buffer.
const listeners = new Set<(s: ArduinoSensorState) => void>();
let state: ArduinoSensorState = {
  readings: null,
  connected: false,
  lastUpdated: null,
  error: null,
  loading: true,
  history: {
    temp: [], humidity: [], ph: [], tds: [], timestamps: [],
    rawTemp: [], rawHumidity: [], rawPh: [], rawTds: [],
    errTemp: [], errHumidity: [], errPh: [], errTds: [],
  },
  logs: [],
};
let pollHandle: ReturnType<typeof setInterval> | null = null;
let lastSeenRaw: string | null = null;
let lastSeenAt = 0;
let lastDataUpdateAt = 0;
let lifecycleListenersAttached = false;

function setState(patch: Partial<ArduinoSensorState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
}

function pushHistory(r: SensorReadings, ts: string) {
  const h = state.history;
  const cap = (a: number[], v: number) => [...a, v].slice(-HISTORY_LIMIT);
  const status: ArduinoLogEntry["status"] =
    [getSensorStatus("temp", r.temp.avg), getSensorStatus("humidity", r.humidity), getSensorStatus("ph", r.ph), getSensorStatus("tds", r.tds)].some((s) => s === "danger")
      ? "Critical"
      : [getSensorStatus("temp", r.temp.avg), getSensorStatus("humidity", r.humidity), getSensorStatus("ph", r.ph), getSensorStatus("tds", r.tds)].some((s) => s === "warning")
      ? "Warning"
      : "Optimal";
  const newLog: ArduinoLogEntry = {
    timestamp: new Date(ts).toLocaleString(),
    temp: r.temp.avg,
    humidity: r.humidity,
    ph: r.ph,
    tds: r.tds,
    status,
  };
  setState({
    history: {
      temp: cap(h.temp, r.temp.avg),
      humidity: cap(h.humidity, r.humidity),
      ph: cap(h.ph, r.ph),
      tds: cap(h.tds, r.tds),
      timestamps: [...h.timestamps, ts].slice(-HISTORY_LIMIT),
    },
    logs: [newLog, ...state.logs].slice(0, LOG_LIMIT),
  });
}

async function tick() {
  try {
    const { data, error } = await supabase.functions.invoke("firebase-sensors");
    if (error) throw error;
    const fb = (data ?? {}) as FirebaseShape;

    if (!fb.dht1 && !fb.ph) {
      setState({ readings: null, loading: false, connected: false, lastUpdated: null, error: "No data from Arduino yet" });
      return;
    }

    // Arduino sends `lastUpdated` as String(millis()) — uptime in ms, not a
    // wall-clock date. On a page refresh, Firebase may still contain an old
    // value, so the first value we see is NOT proof that the Arduino is online.
    // We mark it online only after Firebase's heartbeat changes while the app
    // is watching, or if a real wall-clock timestamp is present and recent.
    const rawTs = fb.lastUpdated != null ? String(fb.lastUpdated) : null;
    const nowMs = Date.now();
    let seenAt = lastSeenAt;
    const parsedTs = rawTs ? Number(rawTs) : NaN;
    const wallClockMs = rawTs
      ? Number.isFinite(parsedTs) && parsedTs > 1_000_000_000_000
        ? parsedTs
        : Date.parse(rawTs)
      : NaN;

    if (rawTs) {
      if (Number.isFinite(wallClockMs) && Math.abs(nowMs - wallClockMs) < STALE_MS) {
        lastSeenRaw = rawTs;
        lastSeenAt = wallClockMs;
        seenAt = wallClockMs;
      } else if (lastSeenRaw === null) {
        lastSeenRaw = rawTs;
      } else if (rawTs !== lastSeenRaw) {
        lastSeenRaw = rawTs;
        lastSeenAt = nowMs;
        seenAt = nowMs;
      }
    }

    const isFresh = seenAt > 0 && nowMs - seenAt < STALE_MS;
    if (!isFresh) {
      // Offline transitions are immediate (every 1s poll)
      setState({
        readings: null,
        connected: false,
        lastUpdated: null,
        error: "Arduino offline — waiting for new Firebase heartbeat",
        loading: false,
      });
      return;
    }

    // Throttle sensor data + graph updates to every 5s, even though we poll
    // every 1s for fast offline detection. Always run the first update.
    if (state.readings !== null && nowMs - lastDataUpdateAt < DATA_UPDATE_MS) {
      // Already connected and recent — skip refreshing readings/history this tick
      if (!state.connected) setState({ connected: true, error: null });
      return;
    }

    const t1 = normalize("temp", fb.dht1?.temperature);
    const t2 = normalize("temp", fb.dht2?.temperature);
    const t3 = normalize("temp", fb.dht3?.temperature);
    const h1 = normalize("humidity", fb.dht1?.humidity);
    const h2 = normalize("humidity", fb.dht2?.humidity);
    const h3 = normalize("humidity", fb.dht3?.humidity);
    const phN = normalize("ph", fb.ph?.value);
    const tdsN = normalize("tds", fb.tds?.value);

    const tempAvg = avgValid([t1, t2, t3]);
    const humAvg = avgValid([h1, h2, h3]);

    const readings: SensorReadings = {
      temp: {
        s1: Number.isFinite(t1) ? round(t1) : 0,
        s2: Number.isFinite(t2) ? round(t2) : 0,
        s3: Number.isFinite(t3) ? round(t3) : 0,
        avg: Number.isFinite(tempAvg) ? round(tempAvg, 1) : 0,
      },
      humidity: Number.isFinite(humAvg) ? round(humAvg, 1) : 0,
      ph: Number.isFinite(phN) ? round(phN, 2) : 0,
      tds: Number.isFinite(tdsN) ? Math.round(tdsN) : 0,
    };

    const wallClockIso = new Date(seenAt).toISOString();
    lastDataUpdateAt = nowMs;

    setState({
      readings,
      connected: true,
      lastUpdated: wallClockIso,
      error: null,
      loading: false,
    });
    if (wallClockIso) pushHistory(readings, wallClockIso);
  } catch (e) {
    setState({
      loading: false,
      connected: false,
      error: e instanceof Error ? e.message : "Failed to read sensors",
    });
  }
}

/** Force an immediate Firebase poll. Useful for a manual reconnect button. */
export function refreshSensors() {
  void tick();
}

function ensurePolling() {
  if (pollHandle) return;
  void tick();
  pollHandle = setInterval(tick, POLL_MS);
  if (!lifecycleListenersAttached && typeof window !== "undefined" && typeof document !== "undefined") {
    lifecycleListenersAttached = true;
    const checkNow = () => void tick();
    window.addEventListener("focus", checkNow);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkNow();
    });
  }
}

export function useArduinoSensors(): ArduinoSensorState {
  const [snap, setSnap] = useState(state);
  useEffect(() => {
    listeners.add(setSnap);
    ensurePolling();
    setSnap(state);
    return () => {
      listeners.delete(setSnap);
    };
  }, []);
  return snap;
}
