import { useEffect, useState } from "react";
import { getLatestReadings, OPTIMAL_RANGES, type SensorReadings } from "@/utils/mockData";

export interface SensorAlert {
  id: string;
  msg: string;
  type: "warning" | "danger";
}

export function computeAlerts(data: SensorReadings): SensorAlert[] {
  const a: SensorAlert[] = [];
  if (data.temp.avg < OPTIMAL_RANGES.temp.min || data.temp.avg > OPTIMAL_RANGES.temp.max)
    a.push({ id: "temp", msg: `⚠️ Temperature out of range: ${data.temp.avg}°C`, type: "warning" });
  if (data.humidity < OPTIMAL_RANGES.humidity.min || data.humidity > OPTIMAL_RANGES.humidity.max)
    a.push({ id: "humidity", msg: `⚠️ Humidity out of range: ${data.humidity}%`, type: "warning" });
  if (data.ph < OPTIMAL_RANGES.ph.min || data.ph > OPTIMAL_RANGES.ph.max)
    a.push({ id: "ph", msg: `⚠️ pH out of range: ${data.ph}`, type: "warning" });
  return a;
}

/** Lightweight global hook so the bottom nav can reflect sensor health. */
export function useSensorAlerts() {
  const [alerts, setAlerts] = useState<SensorAlert[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await getLatestReadings();
        if (active) setAlerts(computeAlerts(data));
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  return alerts;
}
