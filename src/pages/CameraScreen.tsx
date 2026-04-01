import { useState } from "react";
import { WidgetCard, CardLabel, StatusBadge, SensorBar } from "@/components/shared/SharedComponents";
import { MOCK_CLASSIFICATION } from "@/utils/mockData";
import { Camera, Upload, ArrowLeft } from "lucide-react";

function nutStatus(curr: number, tgt: number) {
  const d = ((curr - tgt) / tgt) * 100;
  if (d > 10) return { type: 'danger' as const, label: '↓ Decrease' };
  if (d < -10) return { type: 'warning' as const, label: '↑ Increase' };
  return { type: 'success' as const, label: '✓ Optimal' };
}

function FullDetailsPage({ result, onBack }: { result: typeof MOCK_CLASSIFICATION; onBack: () => void }) {
  const nutColorMap = { amber: 'hsl(var(--chart-amber))', green: 'hsl(var(--green))', blue: 'hsl(var(--chart-blue))' };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <button className="flex items-center gap-1.5" onClick={onBack}>
          <ArrowLeft size={16} className="text-green-dark" />
          <span className="text-green-dark text-sm font-semibold">Back</span>
        </button>
        <span className="text-text-primary text-[14px] font-bold">Analysis</span>
        <div className="w-[60px]" />
      </div>

      <div className="p-4 pb-10 no-scrollbar overflow-auto animate-slide-up">
        <h1 className="text-[22px] font-bold text-text-primary tracking-tight mb-4">
          Plant Classification & Growth Analysis
        </h1>

        {/* Classification Card */}
        <WidgetCard className="mb-3">
          <CardLabel>Classification</CardLabel>
          <div className="rounded-2xl overflow-hidden h-[160px] bg-gradient-to-br from-green-light to-accent/30 border border-border/40 mb-3 relative flex items-center justify-center">
            <span className="text-5xl">🌱</span>
            <div className="absolute bottom-2.5 left-2.5 bg-green-dark/90 backdrop-blur-sm rounded-full px-3 py-1">
              <span className="text-primary-foreground text-xs font-semibold">{result.plantName}</span>
            </div>
          </div>

          <div className="bg-card-alt/50 rounded-xl border border-border/40 overflow-hidden">
            {[
              ['Classification', result.plantName],
              ['Growth stage', result.stage],
            ].map(([key, val], idx) => (
              <div key={key} className={`flex justify-between items-center px-3.5 py-2.5 ${idx === 0 ? 'border-b border-border/30' : ''}`}>
                <span className="text-[12px] text-text-muted">{key}</span>
                <span className="text-[13px] font-bold text-text-primary">{val}</span>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold text-text-muted mb-2.5">AI Confidence</p>
            {Object.entries(result.confidence).map(([stage, pct]) => (
              <div key={stage} className="flex items-center gap-2 mb-2">
                <span className="text-[11px] text-text-muted w-20">{stage}</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: stage === result.stage ? 'hsl(var(--green-dark))' : 'hsl(var(--border))',
                    }}
                  />
                </div>
                <span className="text-[11px] font-bold text-text-primary w-8 text-right">{pct}%</span>
              </div>
            ))}
          </div>
        </WidgetCard>

        {/* Growth Prediction */}
        <WidgetCard className="mb-3">
          <CardLabel>Growth Prediction</CardLabel>
          <div className="flex items-start justify-between my-3">
            {['Seedling', 'Vegetative', 'Fruiting', 'Harvest'].map((stage, i) => {
              const stages = ['Seedling', 'Vegetative', 'Fruiting', 'Harvest'];
              const done = i <= stages.indexOf(result.stage);
              const current = stage === result.stage;
              return (
                <div key={stage} className="flex-1 flex flex-col items-center relative">
                  {i > 0 && (
                    <div className={`absolute top-[9px] right-1/2 w-full h-0.5 ${done ? 'bg-green' : 'bg-border'}`} />
                  )}
                  <div className={`w-5 h-5 rounded-full border-2 mb-1.5 relative z-10 transition-all ${
                    current ? 'bg-green border-green-dark scale-125 shadow-sm' :
                    done ? 'bg-green-light border-green' : 'bg-muted border-border'
                  }`} />
                  <span className={`text-[9px] text-center ${current ? 'text-green-dark font-bold' : 'text-text-faint'}`}>
                    {stage}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="bg-card-alt/50 rounded-xl border border-border/40 overflow-hidden mt-3">
            {[
              ['Current stage', result.stage],
              ['Days to next', `${result.daysToNext} days`],
              ['Harvest date', result.harvestDate],
            ].map(([key, val], idx) => (
              <div key={key} className={`flex justify-between items-center px-3.5 py-2.5 ${idx < 2 ? 'border-b border-border/30' : ''}`}>
                <span className="text-[12px] text-text-muted">{key}</span>
                <span className={`text-[13px] font-bold ${key === 'Harvest date' ? 'text-green-dark' : 'text-text-primary'}`}>{val}</span>
              </div>
            ))}
          </div>
        </WidgetCard>

        {/* Nutrient Adjustments */}
        <WidgetCard>
          <CardLabel>Nutrient Adjustments</CardLabel>
          {result.nutrients.map(({ label, curr, tgt, color }) => {
            const st = nutStatus(curr, tgt);
            return (
              <div key={label} className="mb-4 last:mb-0">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[13px] font-medium text-text-primary">{label}</span>
                  <StatusBadge label={st.label} type={st.type} size="sm" />
                </div>
                <div className="flex justify-end gap-4 mb-2">
                  <span className="text-[11px] text-text-faint">Current: <strong className="text-text-primary">{curr} ppm</strong></span>
                  <span className="text-[11px] text-text-faint">Target: <strong className="text-text-primary">{tgt} ppm</strong></span>
                </div>
                <SensorBar value={curr} max={400} color={nutColorMap[color]} />
              </div>
            );
          })}

          <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
            <button className="flex-1 rounded-xl py-2.5 text-center border border-border/60 bg-card/80 text-text-muted text-xs font-semibold">
              📄 Export PDF
            </button>
            <button className="flex-1 rounded-xl py-2.5 text-center border border-border/60 bg-card/80 text-text-muted text-xs font-semibold">
              📊 Export CSV
            </button>
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}

export default function CameraScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [classified, setClassified] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [result, setResult] = useState<typeof MOCK_CLASSIFICATION | null>(null);

  const handleUpload = () => {
    setImageUri('mock');
    setClassified(false);
    setResult(null);
  };

  const handleCapture = () => {
    setImageUri('mock');
    setClassified(false);
    setResult(null);
  };

  const handleClassify = async () => {
    setClassifying(true);
    await new Promise(r => setTimeout(r, 1200));
    setResult(MOCK_CLASSIFICATION);
    setClassified(true);
    setClassifying(false);
  };

  if (showDetails && result) {
    return <FullDetailsPage result={result} onBack={() => setShowDetails(false)} />;
  }

  return (
    <div className="p-4 pb-10 no-scrollbar overflow-auto">
      <div className="mt-3 mb-5">
        <p className="text-text-faint text-xs font-medium mb-0.5">AI Analysis</p>
        <h1 className="text-[26px] font-bold text-text-primary tracking-tight">Capture</h1>
      </div>

      {/* Upload Widget */}
      <WidgetCard className="mb-3 !p-0 overflow-hidden" onClick={handleUpload}>
        <div className="h-[140px] bg-gradient-to-br from-green-light via-accent/30 to-card-alt flex items-center justify-center border-b border-border/30">
          {imageUri ? (
            <div className="text-center">
              <span className="text-4xl block mb-2">🖼️</span>
              <span className="text-[12px] font-medium text-text-muted">Photo ready</span>
              <p className="text-[10px] text-text-faint mt-0.5">Tap to change</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/60 flex items-center justify-center mx-auto mb-2">
                <Upload size={20} className="text-text-muted" />
              </div>
              <span className="text-[12px] font-medium text-text-muted">Upload a photo</span>
              <p className="text-[10px] text-text-faint mt-0.5">Tap to select from gallery</p>
            </div>
          )}
        </div>
      </WidgetCard>

      {/* Capture button */}
      <button
        className="w-full bg-gradient-to-r from-green-dark to-green rounded-2xl py-3.5 text-center text-primary-foreground font-bold text-sm mb-4 shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        onClick={handleCapture}
      >
        <Camera size={18} />
        Capture Image
      </button>

      {/* Photo + Classify */}
      {imageUri && (
        <WidgetCard className="mb-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-20 bg-gradient-to-br from-green-light to-accent/30 rounded-xl border border-border/40 flex items-center justify-center flex-col">
              <span className="text-2xl">🌿</span>
              <span className="text-[10px] text-text-faint mt-1">Preview</span>
            </div>
            <button
              className={`bg-green-dark rounded-xl px-5 py-3.5 transition-all ${classifying ? 'opacity-60' : 'active:scale-95'}`}
              onClick={handleClassify}
              disabled={classifying}
            >
              <span className="text-primary-foreground font-bold text-[13px]">
                {classifying ? 'Analysing…' : 'Classify'}
              </span>
            </button>
          </div>
        </WidgetCard>
      )}

      {/* Summary card */}
      {classified && result && (
        <WidgetCard className="animate-slide-up">
          <CardLabel className="mb-0">Classification Results</CardLabel>

          <div className="mt-3 mb-3 bg-card-alt/50 rounded-xl border border-border/40 overflow-hidden">
            {[
              ['Plant', result.plantName],
              ['Stage', result.stage],
              ['Confidence', `${result.confidence[result.stage as keyof typeof result.confidence]}%`],
              ['Harvest', result.harvestDate],
            ].map(([key, val], idx) => (
              <div key={key} className={`flex justify-between items-center px-3.5 py-2.5 ${idx < 3 ? 'border-b border-border/30' : ''}`}>
                <span className="text-[12px] text-text-muted font-medium">{key}</span>
                {key === 'Stage' ? (
                  <StatusBadge label={val as string} type="success" size="sm" />
                ) : (
                  <span className={`text-[13px] font-bold ${key === 'Harvest' ? 'text-green-dark' : 'text-text-primary'}`}>{val}</span>
                )}
              </div>
            ))}
          </div>

          <button
            className="w-full py-2.5 rounded-xl bg-green-light/70 border border-success-border/50 text-green-dark text-[13px] font-semibold active:scale-[0.98] transition-transform"
            onClick={() => setShowDetails(true)}
          >
            View Full Details →
          </button>
        </WidgetCard>
      )}
    </div>
  );
}
