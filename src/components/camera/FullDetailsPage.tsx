import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AppCard, CardLabel } from "@/components/shared/SharedComponents";
import { PlantAnalysis, StageName } from "@/components/camera/types";

const STAGES: StageName[] = ["Seedling", "Vegetative", "Fruiting", "Harvest"];

export function FullDetailsPage({
  result,
  imageUri,
  onBack,
}: {
  result: PlantAnalysis;
  imageUri: string | null;
  onBack: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);

  // Merge: prefer Roboflow plant name when available; combine confidence signals.
  const rf = result.roboflow;
  const geminiStageConf = Math.round(result.confidence?.[result.stage] ?? 0);
  const rfConf = rf?.topConfidence ?? null;
  // Combined "best result" plant name (Roboflow wins for species, Gemini provides stage)
  const bestPlantName = rf?.topClass ?? result.plantName;
  // Combined confidence: average of both signals when both exist
  const combinedConfidence =
    rfConf !== null ? Math.round((rfConf + geminiStageConf) / 2) : geminiStageConf;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-background">
        <button className="flex items-center gap-1" onClick={onBack}>
          <span className="text-green-dark text-lg font-bold">←</span>
          <span className="text-green-dark text-sm font-semibold">Back</span>
        </button>
        <span className="text-text-primary text-[15px] font-extrabold tracking-wide">Analysis</span>
        <div className="w-[60px]" />
      </div>

      <div className="p-4 pb-10 no-scrollbar overflow-auto">
        <h1 className="text-[22px] font-extrabold text-text-primary tracking-tight mb-4 leading-[30px]">
          Plant Classification<br />& Growth Stage Analysis
        </h1>

        <AppCard className="mb-3">
          <CardLabel>Plant Classification & Growth Stage</CardLabel>
          <div
            className="rounded-lg overflow-auto bg-card-alt border border-border mb-3 relative flex items-center justify-center cursor-zoom-in"
            style={{ maxHeight: zoomed ? 480 : 280 }}
            onClick={() => imageUri && setZoomed((z) => !z)}
          >
            {imageUri ? (
              <img
                src={imageUri}
                alt="Captured plant"
                className={`w-full ${zoomed ? "h-auto object-contain" : "h-[260px] object-contain"} bg-black/5`}
                style={zoomed ? { maxWidth: "none" } : undefined}
              />
            ) : (
              <div className="h-[180px] flex items-center justify-center">
                <span className="text-4xl">🌱</span>
                <span className="text-text-faint text-xs ml-2">Captured image</span>
              </div>
            )}
            <div className="absolute bottom-2.5 left-2.5 bg-green-dark rounded-full px-3 py-1 pointer-events-none">
              <span className="text-primary-foreground text-xs font-bold">{bestPlantName}</span>
            </div>
          </div>
          {imageUri && (
            <p className="text-[10px] text-text-faint italic mb-2 -mt-1">
              Tap image to {zoomed ? "fit" : "zoom & pan"}.
            </p>
          )}

          <div className="mt-1">
            <p className="text-xs font-bold text-text-muted mb-2">Details:</p>
            {[
              ["Plant classification", bestPlantName],
              ["Growth stage", result.stage],
            ].map(([key, val]) => (
              <div key={key} className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-xs text-text-muted">{key}</span>
                <span className="text-[13px] font-bold text-text-primary">{val}</span>
              </div>
            ))}
          </div>

          {result.notes && (
            <p className="mt-3 text-[11px] text-text-muted italic leading-snug">{result.notes}</p>
          )}
        </AppCard>

        {/* Combined Evaluation Metrics (Roboflow + Gemini best-of) */}
        <AppCard className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <CardLabel className="mb-0">Evaluation Metrics</CardLabel>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="What do these metrics mean?"
                    className="text-text-muted hover:text-green-dark transition-colors"
                  >
                    <HelpCircle size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[260px] text-xs leading-snug">
                  In machine learning, <b>confidence</b> is the model's estimated probability
                  that a prediction is correct (0–100%). Higher values mean the model is more
                  certain — but it does not guarantee accuracy. We combine results from a
                  custom-trained classifier (Roboflow) and a vision LLM (Gemini) to give a more
                  reliable best-of estimate.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-border">
            <span className="text-xs text-text-muted">Best plant prediction</span>
            <span className="text-[13px] font-bold text-green-dark">{bestPlantName}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-border">
            <span className="text-xs text-text-muted">Combined confidence</span>
            <span className="text-[13px] font-bold text-text-primary">{combinedConfidence}%</span>
          </div>
          {rf && (
            <div className="flex justify-between items-center py-1.5 border-b border-border">
              <span className="text-xs text-text-muted">Roboflow (species)</span>
              <span className="text-[13px] font-bold text-text-primary">{rf.topConfidence}%</span>
            </div>
          )}
          <div className="flex justify-between items-center py-1.5 border-b border-border">
            <span className="text-xs text-text-muted">Gemini (stage: {result.stage})</span>
            <span className="text-[13px] font-bold text-text-primary">{geminiStageConf}%</span>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-bold text-text-muted mb-2">Growth stage probabilities</p>
            {STAGES.map((stage) => {
              const pct = result.confidence?.[stage] ?? 0;
              return (
                <div key={stage} className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] text-text-muted w-20">{stage}</span>
                  <div className="flex-1 h-[5px] bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: stage === result.stage ? "hsl(var(--green-dark))" : "hsl(var(--border))",
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-text-primary w-[30px] text-right">{Math.round(pct)}%</span>
                </div>
              );
            })}
          </div>

          {rf && rf.predictions.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-bold text-text-muted mb-2">Species predictions (Roboflow)</p>
              {rf.predictions.map((p) => (
                <div key={p.class} className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] text-text-muted flex-1 truncate">{p.class}</span>
                  <div className="w-24 h-[5px] bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-dark transition-all duration-500"
                      style={{ width: `${Math.round(p.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-text-primary w-[34px] text-right">
                    {Math.round(p.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </AppCard>

        {result.roboflow && (
          <AppCard className="mb-3">
            <CardLabel>Custom Model Classification (Roboflow)</CardLabel>
            <div className="flex justify-between items-center py-1.5 border-b border-border">
              <span className="text-xs text-text-muted">Top prediction</span>
              <span className="text-[13px] font-bold text-green-dark">{result.roboflow.topClass}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border">
              <span className="text-xs text-text-muted">Confidence</span>
              <span className="text-[13px] font-bold text-text-primary">{result.roboflow.topConfidence}%</span>
            </div>
            <div className="mt-3">
              <p className="text-[11px] font-bold text-text-muted mb-2">All predictions</p>
              {result.roboflow.predictions.map((p) => (
                <div key={p.class} className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] text-text-muted flex-1 truncate">{p.class}</span>
                  <div className="w-24 h-[5px] bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-dark"
                      style={{ width: `${Math.round(p.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-text-primary w-[34px] text-right">
                    {Math.round(p.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </AppCard>
        )}

        <AppCard className="mb-3">
          <CardLabel>Growth Prediction Analysis</CardLabel>
          <div className="flex items-start justify-between my-3">
            {STAGES.map((stage, i) => {
              const done = i <= STAGES.indexOf(result.stage);
              const current = stage === result.stage;
              return (
                <div key={stage} className="flex-1 flex flex-col items-center relative">
                  {i > 0 && (
                    <div className={`absolute top-[9px] right-1/2 w-full h-0.5 ${done ? "bg-green" : "bg-border"}`} />
                  )}
                  <div className={`w-5 h-5 rounded-full border-2 mb-1.5 relative z-10 ${
                    current ? "bg-green border-green-dark scale-125" :
                    done ? "bg-green-light border-green" : "bg-border border-border"
                  }`} />
                  <span className={`text-[9px] text-center ${current ? "text-green-dark font-bold" : "text-text-muted"}`}>
                    {stage}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3">
            <p className="text-xs font-bold text-text-muted mb-2">Details:</p>
            {[
              ["Current stage", result.stage],
              ["Days to next stage", `${result.daysToNext} days`],
              ["Predicted harvest", result.harvestDate],
            ].map(([key, val]) => (
              <div key={key} className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-xs text-text-muted">{key}</span>
                <span className={`text-[13px] font-bold ${key === "Predicted harvest" ? "text-green-dark" : "text-text-primary"}`}>{val}</span>
              </div>
            ))}
          </div>
        </AppCard>

      </div>
    </div>
  );
}
