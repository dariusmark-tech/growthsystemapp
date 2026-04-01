// Mock data for HydroSense app

export const OPTIMAL_RANGES = {
  temp: { min: 20, max: 28 },
  humidity: { min: 55, max: 75 },
  ph: { min: 5.5, max: 7.0 },
  tds: { min: 500, max: 1000 },
};

export interface TempReadings {
  s1: number;
  s2: number;
  s3: number;
  avg: number;
}

export interface SensorReadings {
  temp: TempReadings;
  humidity: number;
  ph: number;
  tds: number;
}

export const MOCK_READINGS: SensorReadings = {
  temp: { s1: 22.4, s2: 25.1, s3: 25.7, avg: 24.4 },
  humidity: 62.1,
  ph: 6.29,
  tds: 754,
};

export const MOCK_GROWTH = {
  stage: 'Vegetative' as const,
  confidence: { Seedling: 8, Vegetative: 90, Fruiting: 24 },
  daysToNext: 21,
  harvestDate: 'May 5, 2026',
};

export const MOCK_CLASSIFICATION = {
  plantName: 'Tomato Plant',
  stage: 'Seedling',
  confidence: { Seedling: 82, Vegetative: 14, Fruiting: 4 },
  daysToNext: 21,
  harvestDate: 'May 5, 2026',
  nutrients: [
    { label: 'Nitrogen (N)', curr: 180, tgt: 200, color: 'amber' as const },
    { label: 'Phosphorus (P)', curr: 60, tgt: 60, color: 'green' as const },
    { label: 'Potassium (K)', curr: 240, tgt: 220, color: 'blue' as const },
  ],
};

export interface LogEntry {
  timestamp: string;
  temp: number;
  humidity: number;
  ph: number;
  tds: number;
  status: 'Optimal' | 'Warning' | 'Critical';
}

export const MOCK_LOGS: LogEntry[] = [
  { timestamp: '2/16/2026, 7:11 PM', temp: 26, humidity: 69.7, ph: 6.61, tds: 954, status: 'Optimal' },
  { timestamp: '2/16/2026, 6:11 PM', temp: 22.3, humidity: 58.9, ph: 6.31, tds: 628, status: 'Optimal' },
  { timestamp: '2/16/2026, 5:11 PM', temp: 25.1, humidity: 55.3, ph: 6.35, tds: 713, status: 'Optimal' },
  { timestamp: '2/16/2026, 4:11 PM', temp: 23.4, humidity: 61.9, ph: 6.16, tds: 861, status: 'Optimal' },
  { timestamp: '2/16/2026, 3:11 PM', temp: 25.3, humidity: 55.8, ph: 6.04, tds: 730, status: 'Optimal' },
  { timestamp: '2/16/2026, 1:11 PM', temp: 24.8, humidity: 63.1, ph: 6.45, tds: 880, status: 'Optimal' },
  { timestamp: '2/16/2026, 12:11 PM', temp: 22.9, humidity: 60.4, ph: 6.22, tds: 760, status: 'Optimal' },
  { timestamp: '2/16/2026, 11:11 AM', temp: 29.1, humidity: 78.2, ph: 5.42, tds: 1120, status: 'Warning' },
];

export const MOCK_MONITORING = {
  tempHistory: [22.1, 23.4, 24.0, 24.4, 25.1, 24.8, 24.4],
  humidityHistory: [58, 60, 62, 62.1, 63, 61, 62.1],
  phHistory: [6.1, 6.2, 6.3, 6.29, 6.3, 6.25, 6.29],
};

export const SENSORS_HEALTH = [
  { name: 'DHT11 Sensor 1', last: '2s ago', ok: true },
  { name: 'DHT11 Sensor 2', last: '2s ago', ok: true },
  { name: 'DHT11 Sensor 3', last: '2s ago', ok: true },
  { name: 'pH Sensor', last: '5s ago', ok: true },
  { name: 'TDS Sensor', last: '5s ago', ok: true },
];

export const SD_CARD = { used: 13.4, total: 32 };

export function getSensorStatus(key: string, value: number): 'success' | 'warning' | 'danger' {
  const r = OPTIMAL_RANGES[key as keyof typeof OPTIMAL_RANGES];
  if (!r) return 'success';
  if (value < r.min || value > r.max) return 'danger';
  const slack = (r.max - r.min) * 0.1;
  if (value < r.min + slack || value > r.max - slack) return 'warning';
  return 'success';
}

export function getLatestReadings(): Promise<SensorReadings> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_READINGS), 300);
  });
}
