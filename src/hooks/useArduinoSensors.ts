import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSensorStatus, type SensorReadings } from "@/utils/mockData";

interface FirebaseShape {
  dht1?: { temperature?: number; humidity?: number; tempStatus?: string; humStatus?: string };
  dht2?: { temperature?: number; humidity?: number; tempStatus?: string; humStatus?: string };
  dht3?: { temperature?: number; humidity?: number; tempStatus?: string; humStatus?: string };
  ph?: { value?: number; status?: string };
  tds?: { value?: number; status?: string };
  device?: { online?: boolean; lastSeen?: string | number };
  lastUpdated?: string | number;
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
  };
  logs: ArduinoLogEntry[];
}

const POLL_MS = 5000;
const STALE_MS = 60_000;
const HISTORY_LIMIT = 30;
const LOG_LIMIT = 50;

function round(n: number, d = 1) {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

function normalizeFirebaseTime(value: string | number | undefined | null): string | null {
  if (value === undefined || value === null || value === "") return null;

  let ms: number;
  if (typeof value === "number" || /^\d+$/.test(String(value))) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    ms = n < 10_000_000_000 ? n * 1000 : n;
  } else {
    ms = new Date(value).getTime();
  }

  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function isRecent(iso: string | null) {
  if (!iso) return false;
  const age = Date.now() - new Date(iso).getTime();
  return Number.isFinite(age) && age >= 0 && age < STALE_MS;
}

// Singleton store shared across all consumers — one poll loop, one history buffer.
const listeners = new Set<(s: ArduinoSensorState) => void>();
let state: ArduinoSensorState = {
  readings: null,
  connected: false,
  lastUpdated: null,
  error: null,
  loading: true,
  history: { temp: [], humidity: [], ph: [], tds: [], timestamps: [] },
  logs: [],
};
let pollHandle: ReturnType<typeof setInterval> | null = null;

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
      setState({ loading: false, connected: false, error: "No data from Arduino yet" });
      return;
    }

    const t1 = Number(fb.dht1?.temperature ?? 0);
    const t2 = Number(fb.dht2?.temperature ?? 0);
    const t3 = Number(fb.dht3?.temperature ?? 0);
    const h1 = Number(fb.dht1?.humidity ?? 0);
    const h2 = Number(fb.dht2?.humidity ?? 0);
    const h3 = Number(fb.dht3?.humidity ?? 0);

    const readings: SensorReadings = {
      temp: { s1: round(t1), s2: round(t2), s3: round(t3), avg: round((t1 + t2 + t3) / 3, 1) },
      humidity: round((h1 + h2 + h3) / 3, 1),
      ph: round(Number(fb.ph?.value ?? 0), 2),
      tds: Math.round(Number(fb.tds?.value ?? 0)),
    };

    const ts = normalizeFirebaseTime(fb.lastUpdated ?? fb.device?.lastSeen);
    // Device is live when Firebase says it is online AND it pushed recently.
    // If older Arduino code has no device.online flag, fall back to freshness only.
    const isFresh = isRecent(ts);
    const onlineFlag = fb.device?.online;
    const isOnline = onlineFlag === false ? false : onlineFlag === true ? isFresh : isFresh;

    setState({
      readings,
      connected: isOnline,
      lastUpdated: ts,
      error: isOnline ? null : onlineFlag === false ? "Arduino marked offline in Firebase" : "Arduino offline — waiting for a fresh Firebase push",
      loading: false,
    });
    if (isOnline && ts) pushHistory(readings, ts);
  } catch (e) {
    setState({
      loading: false,
      connected: false,
      error: e instanceof Error ? e.message : "Failed to read sensors",
    });
  }
}

function ensurePolling() {
  if (pollHandle) return;
  void tick();
  pollHandle = setInterval(tick, POLL_MS);
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
