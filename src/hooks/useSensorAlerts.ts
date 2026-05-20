import { OPTIMAL_RANGES, type SensorReadings } from "@/utils/mockData";
import { useArduinoSensors } from "@/hooks/useArduinoSensors";

export interface SensorAlert {
  id: string;
  msg: string;
  type: "warning" | "danger";
}

export function computeAlerts(data: SensorReadings): SensorAlert[] {
  const a: SensorAlert[] = [];
  const check = (
    id: string,
    label: string,
    value: number,
    unit: string,
    range: { min: number; max: number },
  ) => {
    const span = range.max - range.min;
    const critLow = range.min - span * 0.25;
    const critHigh = range.max + span * 0.25;
    if (value < critLow || value > critHigh) {
      a.push({ id, msg: `🚨 ${label} critical: ${value}${unit} (safe ${range.min}–${range.max}${unit})`, type: "danger" });
    } else if (value < range.min || value > range.max) {
      a.push({ id, msg: `⚠️ ${label} out of range: ${value}${unit} (target ${range.min}–${range.max}${unit})`, type: "warning" });
    }
  };
  check("temp", "Temperature", data.temp.avg, "°C", OPTIMAL_RANGES.temp);
  check("humidity", "Humidity", data.humidity, "%", OPTIMAL_RANGES.humidity);
  check("ph", "pH", data.ph, "", OPTIMAL_RANGES.ph);
  check("tds", "TDS", data.tds, " ppm", OPTIMAL_RANGES.tds);
  return a;
}

/** Lightweight global hook so the bottom nav can reflect sensor health. */
export function useSensorAlerts() {
  const { readings } = useArduinoSensors();
  return readings ? computeAlerts(readings) : [];
}
