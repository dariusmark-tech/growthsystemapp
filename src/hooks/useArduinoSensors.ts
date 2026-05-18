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
let lastSeenRaw: string | null = null;
let lastSeenAt = 0;
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
      setState({
        readings: null,
        connected: false,
        lastUpdated: null,
        error: "Arduino offline — waiting for new Firebase heartbeat",
        loading: false,
      });
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

    const wallClockIso = new Date(seenAt).toISOString();

    setState({
      readings,
      connected: isFresh,
      lastUpdated: wallClockIso,
      error: isFresh ? null : "Arduino offline — showing last known values",
      loading: false,
    });
    if (isFresh && wallClockIso) pushHistory(readings, wallClockIso);
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
