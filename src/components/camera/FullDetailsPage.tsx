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
          <div className="rounded-lg overflow-hidden h-[180px] bg-card-alt border border-border mb-3 relative flex items-center justify-center">
            {imageUri ? (
              <img src={imageUri} alt="Captured plant" className="w-full h-full object-cover" />
            ) : (
              <>
                <span className="text-4xl">🌱</span>
                <span className="text-text-faint text-xs ml-2">Captured image</span>
              </>
            )}
            <div className="absolute bottom-2.5 left-2.5 bg-green-dark rounded-full px-3 py-1">
              <span className="text-primary-foreground text-xs font-bold">{result.plantName}</span>
            </div>
          </div>

          <div className="mt-1">
            <p className="text-xs font-bold text-text-muted mb-2">Details:</p>
            {[
              ["Plant classification", result.plantName],
              ["Growth stage", result.stage],
            ].map(([key, val]) => (
              <div key={key} className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-xs text-text-muted">{key}</span>
                <span className="text-[13px] font-bold text-text-primary">{val}</span>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-bold text-text-muted mb-2">AI Confidence</p>
            {STAGES.map((stage) => {
              const pct = result.confidence?.[stage] ?? 0;
              return (
                <div key={stage} className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] text-text-muted w-20">{stage}</span>
                  <div className="flex-1 h-[5px] bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
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

          {result.notes && (
            <p className="mt-3 text-[11px] text-text-muted italic leading-snug">{result.notes}</p>
          )}
        </AppCard>

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
