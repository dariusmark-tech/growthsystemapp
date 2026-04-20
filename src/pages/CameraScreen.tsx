import { useState, useRef, useEffect } from "react";
import { X, Upload } from "lucide-react";
import { AppCard, CardLabel, StatusBadge } from "@/components/shared/SharedComponents";
import { MOCK_CLASSIFICATION } from "@/utils/mockData";

function nutStatus(curr: number, tgt: number) {
  const d = ((curr - tgt) / tgt) * 100;
  if (d > 10) return { type: 'danger' as const, label: '↓ Decrease' };
  if (d < -10) return { type: 'warning' as const, label: '↑ Increase' };
  return { type: 'success' as const, label: '✓ Optimal' };
}

// ═══════════════════════════════════════════════════════════════════
// LIVE CAMERA — full-screen viewfinder with shutter button
// ═══════════════════════════════════════════════════════════════════
function LiveCameraScreen({ onCapture, onClose }: { onCapture: (uri: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (e: any) {
        setError(e?.message || 'Camera access denied');
      }
    })();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, []);

  const handleShutter = () => {
    if (!videoRef.current || capturing || !ready) return;
    setCapturing(true);
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2d context');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      onCapture(dataUrl);
    } catch {
      setCapturing(false);
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-center">
        <span className="text-5xl mb-4">📷</span>
        <h2 className="text-primary-foreground text-lg font-bold mb-2">Camera Access Needed</h2>
        <p className="text-primary-foreground/70 text-sm mb-6">{error}</p>
        <button onClick={onClose} className="px-5 py-2.5 rounded-full bg-green-dark text-primary-foreground text-sm font-bold">
          ← Go back
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3">
        <button
          onClick={onClose}
          className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center"
        >
          <X size={22} className="text-white" />
        </button>
        <span className="text-white text-[15px] font-extrabold tracking-wide">Capture & Upload</span>
        <div className="w-11" />
      </div>

      {/* Viewfinder */}
      <div className="flex-1 mx-4 mb-4 rounded-3xl overflow-hidden relative bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full h-full object-cover"
        />
        {/* Corner guides */}
        <div className="absolute top-3 left-3 w-7 h-7 border-t-2 border-l-2 border-white/80 rounded-tl-lg" />
        <div className="absolute top-3 right-3 w-7 h-7 border-t-2 border-r-2 border-white/80 rounded-tr-lg" />
        <div className="absolute bottom-3 left-3 w-7 h-7 border-b-2 border-l-2 border-white/80 rounded-bl-lg" />
        <div className="absolute bottom-3 right-3 w-7 h-7 border-b-2 border-r-2 border-white/80 rounded-br-lg" />

        {!capturing && ready && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-white/70 text-xs font-semibold bg-black/30 px-3 py-1 rounded-full">Live View</span>
          </div>
        )}
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white/70 text-sm">Starting camera…</span>
          </div>
        )}
      </div>

      {/* Shutter */}
      <div className="pb-10 flex flex-col items-center">
        <button
          onClick={handleShutter}
          disabled={capturing || !ready}
          className={`w-[78px] h-[78px] rounded-full bg-green-dark flex items-center justify-center ${capturing ? 'opacity-60' : ''}`}
        >
          <div className="w-[64px] h-[64px] rounded-full border-[3px] border-white flex items-center justify-center">
            <div className="w-[52px] h-[52px] rounded-full bg-white" />
          </div>
        </button>
        <span className="text-white/80 text-xs font-semibold mt-3">{capturing ? 'Capturing…' : 'Click'}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FULL DETAILS PAGE
// ═══════════════════════════════════════════════════════════════════
function FullDetailsPage({ result, imageUri, onBack }: { result: typeof MOCK_CLASSIFICATION; imageUri: string | null; onBack: () => void }) {
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

// ═══════════════════════════════════════════════════════════════════
// MAIN — Capture & Upload
// ═══════════════════════════════════════════════════════════════════
export default function CameraScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [classified, setClassified] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [result, setResult] = useState<typeof MOCK_CLASSIFICATION | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCaptured = (uri: string) => {
    setImageUri(uri);
    setClassified(false);
    setResult(null);
    setShowLiveCamera(false);
  };

  const handleUploadPicture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageUri(reader.result as string);
      setClassified(false);
      setResult(null);
    };
    reader.readAsDataURL(file);
    // reset so selecting same file again still triggers change
    e.target.value = '';
  };

  const handleClassify = async () => {
    setClassifying(true);
    await new Promise(r => setTimeout(r, 1200));
    setResult(MOCK_CLASSIFICATION);
    setClassified(true);
    setClassifying(false);
  };

  if (showLiveCamera) {
    return <LiveCameraScreen onCapture={handleCaptured} onClose={() => setShowLiveCamera(false)} />;
  }

  if (showDetails && result) {
    return <FullDetailsPage result={result} imageUri={imageUri} onBack={() => setShowDetails(false)} />;
  }

  return (
    <div className="p-4 pb-10 no-scrollbar overflow-auto">
      <h1 className="text-[22px] font-extrabold text-text-primary tracking-tight mt-2 mb-4">
        Capture & Upload
      </h1>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Preview box */}
      <div className="w-full h-[200px] bg-card-alt rounded-2xl border-[1.5px] border-dashed border-border mb-4 overflow-hidden relative flex items-center justify-center">
        {imageUri ? (
          <img src={imageUri} alt="Plant preview" className="w-full h-full object-cover" />
        ) : (
          <>
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-text-muted rounded-tl-lg" />
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-text-muted rounded-tr-lg" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-text-muted rounded-bl-lg" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-text-muted rounded-br-lg" />
            <div className="text-center">
              <p className="text-[13px] font-bold text-text-muted">Live View</p>
              <p className="text-[10px] text-text-faint mt-1">Capture or upload a photo</p>
            </div>
          </>
        )}
      </div>

      {/* Two buttons */}
      <div className="flex gap-3 mb-4">
        <button
          className="flex-1 bg-green-dark rounded-xl py-4 flex flex-col items-center justify-center gap-1.5"
          onClick={() => setShowLiveCamera(true)}
        >
          <div className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-white" />
          </div>
          <span className="text-primary-foreground font-extrabold text-[13px]">Capture Image</span>
        </button>

        <button
          className="flex-1 bg-card-alt border border-border rounded-xl py-4 flex flex-col items-center justify-center gap-1.5"
          onClick={handleUploadPicture}
        >
          <Upload size={22} className="text-green-dark" strokeWidth={2.5} />
          <span className="text-text-primary font-extrabold text-[13px]">Upload Picture</span>
        </button>
      </div>

      {/* Photo ready + Classify */}
      {imageUri && !classified && (
        <div className="flex items-center gap-3 mb-4 bg-card-alt rounded-lg border border-border p-3">
          <div className="flex-1 h-20 bg-background rounded-md border border-border overflow-hidden">
            <img src={imageUri} alt="Selected" className="w-full h-full object-cover" />
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

      {/* Summary */}
      {classified && result && (
        <AppCard>
          <CardLabel className="mb-0">Plant Classification & Growth Stage Analysis</CardLabel>

          <div className="mt-3 mb-3">
            {[
              ['Plant', result.plantName],
              ['Growth stage', result.stage],
              ['Confidence', `${result.confidence[result.stage as keyof typeof result.confidence]}%`],
              ['Harvest est.', result.harvestDate],
            ].map(([key, val]) => (
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
