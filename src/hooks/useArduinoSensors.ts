import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SensorReadings } from "@/utils/mockData";

interface FirebaseShape {
  dht1?: { temperature?: number; humidity?: number; tempStatus?: string; humStatus?: string };
  dht2?: { temperature?: number; humidity?: number; tempStatus?: string; humStatus?: string };
  dht3?: { temperature?: number; humidity?: number; tempStatus?: string; humStatus?: string };
  ph?: { value?: number; status?: string };
  tds?: { value?: number; status?: string };
  lastUpdated?: string;
}

export interface ArduinoSensorState {
  readings: SensorReadings | null;
  connected: boolean;
  lastUpdated: string | null;
  error: string | null;
  loading: boolean;
}

const POLL_MS = 5000;

function round(n: number, d = 1) {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

export function useArduinoSensors(): ArduinoSensorState {
  const [state, setState] = useState<ArduinoSensorState>({
    readings: null,
    connected: false,
    lastUpdated: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;

    const tick = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("firebase-sensors");
        if (!active) return;
        if (error) throw error;
        const fb = (data ?? {}) as FirebaseShape;

        if (!fb.dht1 && !fb.ph) {
          setState((s) => ({ ...s, loading: false, connected: false, error: "No data from Arduino yet" }));
          return;
        }

        const t1 = Number(fb.dht1?.temperature ?? 0);
        const t2 = Number(fb.dht2?.temperature ?? 0);
        const t3 = Number(fb.dht3?.temperature ?? 0);
        const h1 = Number(fb.dht1?.humidity ?? 0);
        const h2 = Number(fb.dht2?.humidity ?? 0);
        const h3 = Number(fb.dht3?.humidity ?? 0);
        const humAvg = round((h1 + h2 + h3) / 3, 1);

        const readings: SensorReadings = {
          temp: {
            s1: round(t1),
            s2: round(t2),
            s3: round(t3),
            avg: round((t1 + t2 + t3) / 3, 1),
          },
          humidity: humAvg,
          ph: round(Number(fb.ph?.value ?? 0), 2),
          tds: Math.round(Number(fb.tds?.value ?? 0)),
        };

        setState({
          readings,
          connected: true,
          lastUpdated: fb.lastUpdated ?? new Date().toISOString(),
          error: null,
          loading: false,
        });
      } catch (e) {
        if (!active) return;
        setState((s) => ({
          ...s,
          loading: false,
          connected: false,
          error: e instanceof Error ? e.message : "Failed to read sensors",
        }));
      }
    };

    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return state;
}
