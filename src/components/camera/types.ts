export type StageName = "Seedling" | "Vegetative" | "Fruiting" | "Harvest";

export interface NutrientRec {
  label: string;
  curr: number;
  tgt: number;
  color: "amber" | "green" | "blue";
}

export interface RoboflowPrediction {
  class: string;
  confidence: number; // 0..1
}

export interface PlantAnalysis {
  plantName: string;
  stage: StageName;
  confidence: Record<StageName, number>;
  daysToNext: number;
  harvestDate: string;
  nutrients: NutrientRec[];
  notes?: string;
  roboflow?: {
    topClass: string;
    topConfidence: number; // 0..100
    predictions: RoboflowPrediction[];
  };
}

export function nutStatus(curr: number, tgt: number) {
  const d = ((curr - tgt) / tgt) * 100;
  if (d > 10) return { type: "danger" as const, label: "↓ Decrease" };
  if (d < -10) return { type: "warning" as const, label: "↑ Increase" };
  return { type: "success" as const, label: "✓ Optimal" };
}
