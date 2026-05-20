import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { AppCard, CardLabel, StatusBadge } from "@/components/shared/SharedComponents";
import { LiveCameraScreen } from "@/components/camera/LiveCameraScreen";
import { FullDetailsPage } from "@/components/camera/FullDetailsPage";
import { PlantAnalysis } from "@/components/camera/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function CameraScreen() {
  const { user } = useAuth();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [classified, setClassified] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [result, setResult] = useState<PlantAnalysis | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const captureInputRef = useRef<HTMLInputElement | null>(null);

  const resetClassification = () => {
    setClassified(false);
    setResult(null);
    setShowDetails(false);
  };

  const handleCaptured = (uri: string) => {
    setImageUri(uri);
    resetClassification();
    setShowLiveCamera(false);
  };

  const handleCloseLiveCamera = () => {
    setShowLiveCamera(false);
  };

  const handleUploadPicture = () => {
    uploadInputRef.current?.click();
  };

  const handleOpenLiveCamera = () => setShowLiveCamera(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageUri(reader.result as string);
      resetClassification();
    };
    reader.onerror = () => {
      toast.error("Could not read the selected image");
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const uploadPhoto = async (dataUrl: string): Promise<string | null> => {
    if (!user) return null;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const path = `${user.id}/${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("plant-photos")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) {
        console.error("Upload failed:", error);
        return null;
      }
      const { data } = supabase.storage.from("plant-photos").getPublicUrl(path);
      return data.publicUrl;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const handleClassify = async () => {
    if (!imageUri) {
      toast.error("Please add a photo first");
      return;
    }
    setClassifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-plant", {
        body: { imageBase64: imageUri },
      });

      if (error) {
        const ctx: any = (error as any).context;
        if (ctx?.status === 429) toast.error("Too many requests — please wait a moment.");
        else if (ctx?.status === 402) toast.error("AI credits exhausted. Add funds in Settings.");
        else toast.error(error.message || "Analysis failed");
        return;
      }

      const analysis = data?.result as PlantAnalysis | undefined;
      if (!analysis) {
        toast.error("AI returned no result");
        return;
      }

      setResult(analysis);
      setClassified(true);

      // Save to Classification History — works with or without sign-in.
      // If signed in, persist to cloud + storage. Otherwise, save locally so
      // the dashboard history still works.
      try {
        let imageUrl: string | null = null;
        if (user) {
          imageUrl = await uploadPhoto(imageUri);
          const { error: dbErr } = await supabase.from("plant_analyses").insert({
            user_id: user.id,
            image_url: imageUrl,
            plant_name: analysis.plantName,
            stage: analysis.stage,
            confidence: analysis.confidence as any,
            days_to_next: analysis.daysToNext,
            harvest_date: analysis.harvestDate,
            nutrients: analysis.nutrients as any,
            raw_response: analysis as any,
          });
          if (dbErr) {
            console.error("Save to cloud history failed:", dbErr);
          }
        }

        // Always also save to local history so it shows even without sign-in.
        try {
          const KEY = "growth_local_history";
          const existing = JSON.parse(localStorage.getItem(KEY) || "[]");
          const entry = {
            id: `local-${Date.now()}`,
            plant_name: analysis.plantName,
            stage: analysis.stage,
            confidence: analysis.confidence,
            days_to_next: analysis.daysToNext,
            harvest_date: analysis.harvestDate,
            image_url: imageUrl ?? imageUri,
            created_at: new Date().toISOString(),
            nutrients: analysis.nutrients,
            raw_response: analysis,
          };
          const next = [entry, ...existing].slice(0, 20);
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch (lsErr) {
          console.warn("Local history save failed:", lsErr);
        }

        window.dispatchEvent(new Event("plant-history-updated"));
        toast.success("Saved to Classification History");
      } catch (saveErr: any) {
        console.error("Save to history error:", saveErr);
        toast.error(saveErr?.message || "Could not save to history");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Something went wrong");
    } finally {
      setClassifying(false);
    }
  };

  if (showLiveCamera) {
    return <LiveCameraScreen onCapture={handleCaptured} onClose={handleCloseLiveCamera} />;
  }

  if (showDetails && result) {
    return <FullDetailsPage result={result} imageUri={imageUri} onBack={() => setShowDetails(false)} />;
  }

  return (
    <div className="p-4 pb-10 no-scrollbar overflow-auto">
      <h1 className="text-[22px] font-extrabold text-text-primary tracking-tight mt-2 mb-4">
        Capture & Upload
      </h1>

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

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

      <div className="flex gap-2.5 mb-4">
        <button
          className="flex-1 bg-green-dark border border-green-dark rounded-full py-3 flex flex-row items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          onClick={() => void handleOpenLiveCamera()}
        >
          <span className="text-primary-foreground font-bold text-[13px]">Capture</span>
        </button>

        <button
          className="flex-1 bg-card-alt border border-border rounded-full py-3 flex flex-row items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          onClick={handleUploadPicture}
        >
          <Upload size={16} className="text-green-dark" strokeWidth={2.5} />
          <span className="text-text-primary font-bold text-[13px]">Upload</span>
        </button>
      </div>

      {imageUri && !classified && (
        <div className="flex items-center gap-3 mb-4 bg-card-alt rounded-lg border border-border p-3">
          <div className="flex-1 h-20 bg-background rounded-md border border-border overflow-hidden">
            <img src={imageUri} alt="Selected" className="w-full h-full object-cover" />
          </div>
          <button
            className={`bg-green-dark rounded-md px-5 py-3 ${classifying ? "opacity-60" : ""}`}
            onClick={handleClassify}
            disabled={classifying}
          >
            <span className="text-primary-foreground font-extrabold text-[13px]">
              {classifying ? "Analysing…" : "Classify"}
            </span>
          </button>
        </div>
      )}

      {classified && result && (
        <AppCard>
          <CardLabel className="mb-0">Plant Classification & Growth Stage Analysis</CardLabel>

          {(() => {
            const _n = (result.plantName || "").trim().toLowerCase();
            const _notes = (result.notes || "");
            const NP = /no\s*plant|not\s*a\s*plant|not\s*detected|cannot\s*identify|unidentified|does\s*not\s*(appear\s*to\s*)?contain\s*a?\s*plant|no\s*plant\s*visible|promotional|cartoon|illustration|game\b|character|monster|dragon/i;
            const noPlant =
              (result as any)?.noPlant === true ||
              !_n ||
              /^(n\s*\/?\s*a|na|none|unknown|null|undefined|-+)$/.test(_n) ||
              NP.test(_n) ||
              NP.test(_notes);
            const rows: [string, string][] = noPlant
              ? [["Plant", noPlant ? "No plant detected" : result.plantName], ["Growth stage", "N/A"], ["Harvest est.", "N/A"]]
              : [["Plant", result.plantName], ["Growth stage", result.stage], ["Harvest est.", result.harvestDate]];
            return (
              <div className="mt-3 mb-3">
                {rows.map(([key, val]) => (
                  <div key={key} className="flex justify-between items-center py-[7px] border-b border-border">
                    <span className="text-xs text-text-muted font-semibold">{key}</span>
                    {key === "Growth stage" && !noPlant ? (
                      <StatusBadge label={val} type="success" size="sm" />
                    ) : (
                      <span className={`text-[13px] font-bold ${key === "Harvest est." && !noPlant ? "text-green-dark" : "text-text-primary"}`}>
                        {val}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}

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
