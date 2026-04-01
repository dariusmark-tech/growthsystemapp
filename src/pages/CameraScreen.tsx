import { useState } from "react";
import { AppCard, CardLabel, StatusBadge, SensorBar } from "@/components/shared/SharedComponents";
import { MOCK_CLASSIFICATION } from "@/utils/mockData";

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

        {/* Classification Card */}
        <AppCard className="mb-3">
          <CardLabel>Plant Classification & Growth Stage</CardLabel>
          <div className="rounded-lg overflow-hidden h-[180px] bg-card-alt border border-border mb-3 relative flex items-center justify-center">
            <span className="text-4xl">🌱</span>
            <span className="text-text-faint text-xs ml-2">Captured image</span>
            <div className="absolute bottom-2.5 left-2.5 bg-green-dark rounded-full px-3 py-1">
              <span className="text-primary-foreground text-xs font-bold">{result.plantName}</span>
            </div>
          </div>

          <div className="mt-1">
            <p className="text-xs font-bold text-text-muted mb-2">Details:</p>
            {[
              ['Plant classification', result.plantName],
              ['Growth stage', result.stage],
            ].map(([key, val]) => (
              <div key={key} className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-xs text-text-muted">{key}</span>
                <span className="text-[13px] font-bold text-text-primary">{val}</span>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-bold text-text-muted mb-2">AI Confidence</p>
            {Object.entries(result.confidence).map(([stage, pct]) => (
              <div key={stage} className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] text-text-muted w-20">{stage}</span>
                <div className="flex-1 h-[5px] bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: stage === result.stage ? 'hsl(var(--green-dark))' : 'hsl(var(--border))',
                    }}
                  />
                </div>
                <span className="text-[11px] font-bold text-text-primary w-[30px] text-right">{pct}%</span>
              </div>
            ))}
          </div>
        </AppCard>

        {/* Growth Prediction */}
        <AppCard className="mb-3">
          <CardLabel>Growth Prediction Analysis</CardLabel>
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
                  <div className={`w-5 h-5 rounded-full border-2 mb-1.5 relative z-10 ${
                    current ? 'bg-green border-green-dark scale-125' :
                    done ? 'bg-green-light border-green' : 'bg-border border-border'
                  }`} />
                  <span className={`text-[9px] text-center ${current ? 'text-green-dark font-bold' : 'text-text-muted'}`}>
                    {stage}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3">
            <p className="text-xs font-bold text-text-muted mb-2">Details:</p>
            {[
              ['Current stage', result.stage],
              ['Days to next stage', `${result.daysToNext} days`],
              ['Predicted harvest', result.harvestDate],
            ].map(([key, val]) => (
              <div key={key} className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-xs text-text-muted">{key}</span>
                <span className={`text-[13px] font-bold ${key === 'Predicted harvest' ? 'text-green-dark' : 'text-text-primary'}`}>{val}</span>
              </div>
            ))}
          </div>
        </AppCard>

        {/* Nutrient Adjustments */}
        <AppCard>
          <CardLabel className="mb-2">Recommended Nutrient Adjustments</CardLabel>
          {result.nutrients.map(({ label, curr, tgt, color }) => {
            const st = nutStatus(curr, tgt);
            return (
              <div key={label} className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[13px] font-semibold text-text-primary">{label}</span>
                  <StatusBadge label={st.label} type={st.type} size="sm" />
                </div>
                <div className="flex justify-end gap-4 mb-1.5">
                  <span className="text-[11px] text-text-muted">Current: <strong className="text-text-primary">{curr} ppm</strong></span>
                  <span className="text-[11px] text-text-muted">Target: <strong className="text-text-primary">{tgt} ppm</strong></span>
                </div>
                <div className="h-[5px] bg-green-light rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(curr / 400) * 100}%`, backgroundColor: nutColorMap[color] }} />
                </div>
              </div>
            );
          })}

          <div className="flex gap-2 mt-4 pt-4 border-t border-border">
            <button className="flex-1 rounded-sm p-2.5 text-center border border-danger-border bg-card text-danger text-xs font-bold">
              📄 Export PDF
            </button>
            <button className="flex-1 rounded-sm p-2.5 text-center border border-success-border bg-card text-success text-xs font-bold">
              📊 Export CSV
            </button>
          </div>
        </AppCard>
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
      <h1 className="text-[22px] font-extrabold text-text-primary tracking-tight mt-2 mb-4">
        Capture & Upload
      </h1>

      {/* Upload box */}
      <button
        className="w-full h-[160px] bg-card-alt rounded-lg border-[1.5px] border-dashed border-border flex items-center justify-center mb-3"
        onClick={handleUpload}
      >
        {imageUri ? (
          <div className="text-center">
            <span className="text-3xl block mb-1.5">🖼️</span>
            <span className="text-[13px] font-semibold text-text-muted">Photo ready</span>
            <p className="text-[10px] text-text-faint mt-1">Tap to choose a different photo</p>
          </div>
        ) : (
          <div className="text-center">
            <span className="text-3xl block mb-1.5">📤</span>
            <span className="text-[13px] font-semibold text-text-muted">Upload photo</span>
            <p className="text-[10px] text-text-faint mt-1">Tap to select from gallery</p>
          </div>
        )}
      </button>

      {/* Capture button */}
      <button
        className="w-full bg-green-dark rounded-md py-3.5 text-center text-primary-foreground font-extrabold text-sm mb-4"
        onClick={handleCapture}
      >
        📸 Capture Image
      </button>

      {/* Photo + Classify */}
      {imageUri && (
        <div className="flex items-center gap-3 mb-4 bg-card-alt rounded-lg border border-border p-3">
          <div className="flex-1 h-20 bg-background rounded-md border border-border flex items-center justify-center flex-col">
            <span className="text-2xl">🌿</span>
            <span className="text-[10px] text-text-muted mt-1">Photo</span>
          </div>
          <button
            className={`bg-green-dark rounded-md px-5 py-3 ${classifying ? 'opacity-60' : ''}`}
            onClick={handleClassify}
            disabled={classifying}
          >
            <span className="text-primary-foreground font-extrabold text-[13px]">
              {classifying ? 'Analysing…' : 'Classify'}
            </span>
          </button>
        </div>
      )}

      {/* Summary card */}
      {classified && result && (
        <AppCard>
          <CardLabel className="mb-0">Plant Classification & Growth Stage Analysis</CardLabel>

          <div className="mt-3 mb-3">
            {[
              ['Plant', result.plantName],
              ['Growth stage', result.stage],
              ['Confidence', `${result.confidence[result.stage as keyof typeof result.confidence]}%`],
              ['Harvest est.', result.harvestDate],
            ].map(([key, val], i) => (
              <div key={key} className="flex justify-between items-center py-[7px] border-b border-border">
                <span className="text-xs text-text-muted font-semibold">{key}</span>
                {key === 'Growth stage' ? (
                  <StatusBadge label={val as string} type="success" size="sm" />
                ) : (
                  <span className={`text-[13px] font-bold ${key === 'Harvest est.' ? 'text-green-dark' : 'text-text-primary'}`}>{val}</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              className="px-4 py-2 rounded-full bg-green-light border border-green-dark text-green-dark text-[13px] font-bold"
              onClick={() => setShowDetails(true)}
            >
              Full Details →
            </button>
          </div>
        </AppCard>
      )}
    </div>
  );
}
