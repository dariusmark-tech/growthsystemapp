import { OPTIMAL_RANGES, type SensorReadings } from "@/utils/mockData";
import { useArduinoSensors } from "@/hooks/useArduinoSensors";

export interface SensorAlert {
  id: string;
  msg: string;
  type: "warning" | "danger";
  /** Short analysis of why the reading is abnormal and what it means. */
  analysis?: string;
  /** Step-by-step adjustment guide the grower can follow. */
  guide?: string[];
}

type Direction = "low" | "high";

interface GuideEntry {
  analysis: { low: string; high: string };
  guide: { low: string[]; high: string[] };
}

const GUIDES: Record<"temp" | "humidity" | "ph" | "tds", GuideEntry> = {
  temp: {
    analysis: {
      low: "Cold roots slow nutrient uptake and stunt growth; prolonged cold stress can trigger root disease.",
      high: "Heat stress causes wilting, lower dissolved oxygen in the reservoir, and faster algae growth.",
    },
    guide: {
      low: [
        "Move the system away from cold drafts or AC vents.",
        "Add a small reservoir/water heater set to ~22 °C.",
        "Insulate the reservoir and increase ambient room temperature.",
      ],
      high: [
        "Improve airflow with a fan and shade the reservoir from direct sun.",
        "Add cool (not iced) water or run a chiller toward 22–25 °C.",
        "Top up dissolved oxygen with an air stone; check pumps for heat.",
      ],
    },
  },
  humidity: {
    analysis: {
      low: "Dry air increases transpiration faster than roots can absorb water, causing leaf curl and tip burn.",
      high: "Saturated air slows transpiration and invites powdery mildew, botrytis, and root rot.",
    },
    guide: {
      low: [
        "Run a humidifier or mist the area lightly (not the leaves at night).",
        "Group plants together and add a tray of water near airflow.",
        "Reduce fan speed slightly during peak transpiration hours.",
      ],
      high: [
        "Increase ventilation/exhaust and run a dehumidifier.",
        "Space plants apart and prune dense foliage for airflow.",
        "Avoid watering late in the day; check for reservoir leaks.",
      ],
    },
  },
  ph: {
    analysis: {
      low: "Acidic solution locks out Ca, Mg, and P and can burn roots, showing as yellow new growth.",
      high: "Alkaline solution locks out Fe, Mn, Zn, and B; expect interveinal yellowing on new leaves.",
    },
    guide: {
      low: [
        "Add pH Up (potassium hydroxide) in small 1 mL doses, stir, wait 10 min, retest.",
        "Target 5.8–6.2; partial reservoir change if pH stays below 5.0.",
        "Calibrate the pH probe with 4.0 and 7.0 buffer if drift continues.",
      ],
      high: [
        "Add pH Down (phosphoric acid) in small 1 mL doses, stir, wait 10 min, retest.",
        "Target 5.8–6.2; do a partial water change if pH stays above 7.5.",
        "Check for limestone/concrete contamination and calibrate the probe.",
      ],
    },
  },
  tds: {
    analysis: {
      low: "Weak nutrient solution starves the plant — slow growth, pale leaves, weak stems.",
      high: "Over-concentrated solution causes osmotic stress, salt build-up, and tip burn.",
    },
    guide: {
      low: [
        "Add concentrated A+B nutrient mix in small steps, stir, retest after 5 min.",
        "Target 1000–1300 ppm for vegetative, 1300–1500 ppm for fruiting.",
        "Calibrate the TDS probe with 1413 µS standard if values look off.",
      ],
      high: [
        "Dilute with fresh RO/filtered water, 10–15 % at a time, until in range.",
        "Flush roots with plain water if EC has been high for several days.",
        "Reduce nutrient dosing schedule and clean any salt build-up on pipes.",
      ],
    },
  },
};

export function computeAlerts(data: SensorReadings): SensorAlert[] {
  const a: SensorAlert[] = [];
  const check = (
    id: "temp" | "humidity" | "ph" | "tds",
    label: string,
    value: number,
    unit: string,
    range: { min: number; max: number },
  ) => {
    if (value >= range.min && value <= range.max) return;
    const dir: Direction = value < range.min ? "low" : "high";
    const span = range.max - range.min;
    const critLow = range.min - span * 0.25;
    const critHigh = range.max + span * 0.25;
    const isCritical = value < critLow || value > critHigh;
    const severity: SensorAlert["type"] = isCritical ? "danger" : "warning";
    const icon = isCritical ? "🚨" : "⚠️";
    const word = isCritical ? "critical" : "out of range";
    const msg = `${icon} ${label} ${word}: ${value}${unit} (target ${range.min}–${range.max}${unit})`;
    const g = GUIDES[id];
    a.push({
      id,
      msg,
      type: severity,
      analysis: g.analysis[dir],
      guide: g.guide[dir],
    });
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
