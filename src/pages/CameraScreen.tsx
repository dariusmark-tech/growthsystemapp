import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { AppCard, CardLabel, StatusBadge } from "@/components/shared/SharedComponents";
import { LiveCameraScreen } from "@/components/camera/LiveCameraScreen";
import { FullDetailsPage } from "@/components/camera/FullDetailsPage";
import { PlantAnalysis } from "@/components/camera/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function mapCameraError(error: unknown) {
  const err = error as { name?: string; message?: string } | null;

  if (!navigator.mediaDevices?.getUserMedia) {
    return "This browser does not support live camera access.";
  }

  if (err?.name === "NotAllowedError") {
    return "Camera permission was denied. Please allow access and try again.";
  }

  if (err?.name === "NotFoundError") {
    return "No camera was found on this device.";
  }

  if (err?.name === "NotReadableError") {
    return "The camera is busy or blocked by another app/browser tab. Close it and try again.";
  }

  if (err?.name === "OverconstrainedError") {
    return "This camera mode is not available on your device.";
  }

  if (location.protocol !== "https:") {
    return "Live camera needs a secure HTTPS connection.";
  }

  return err?.message || "Could not start the camera.";
}

export default function CameraScreen() {
  const { user } = useAuth();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [classified, setClassified] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [result, setResult] = useState<PlantAnalysis | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const captureInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestIdRef = useRef(0);

  const stopCameraStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraStream(null);
  };

  useEffect(() => {
    return () => {
      cameraRequestIdRef.current += 1;
      stopCameraStream();
    };
  }, []);

  const resetClassification = () => {
    setClassified(false);
    setResult(null);
    setShowDetails(false);
  };

  const handleCaptured = (uri: string) => {
    setImageUri(uri);
    resetClassification();
    cameraRequestIdRef.current += 1;
    stopCameraStream();
    setCameraError(null);
    setShowLiveCamera(false);
  };

  const handleCloseLiveCamera = () => {
    cameraRequestIdRef.current += 1;
    stopCameraStream();
    setCameraError(null);
    setShowLiveCamera(false);
  };

  const handleUploadPicture = () => {
    uploadInputRef.current?.click();
  };

  const handleUseDeviceCamera = () => {
    handleCloseLiveCamera();
    captureInputRef.current?.click();
  };

  const handleOpenLiveCamera = async () => {
    const requestId = ++cameraRequestIdRef.current;

    stopCameraStream();
    setCameraError(null);
    setShowLiveCamera(true);

    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: "environment" } }, audio: false },
      { video: { facingMode: "user" }, audio: false },
      { video: true, audio: false },
    ];

    let lastError: unknown = null;

    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (requestId !== cameraRequestIdRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        setCameraStream(stream);
        setCameraError(null);
        return;
      } catch (error) {
        lastError = error;
      }
    }

    if (requestId !== cameraRequestIdRef.current) return;
    setCameraError(mapCameraError(lastError));
  };

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
    if (!imageUri || !user) {
      toast.error("Please sign in and add a photo first");
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

      (async () => {
        const imageUrl = await uploadPhoto(imageUri);
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
        if (dbErr) console.error("Save failed:", dbErr);
      })();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Something went wrong");
    } finally {
      setClassifying(false);
    }
  };

  if (showLiveCamera) {
    return (
      <LiveCameraScreen
        stream={cameraStream}
        error={cameraError}
        onCapture={handleCaptured}
        onClose={handleCloseLiveCamera}
        onRetry={() => void handleOpenLiveCamera()}
        onUseDeviceCamera={handleUseDeviceCamera}
      />
    );
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
      <input
        ref={captureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
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

      <div className="flex gap-3 mb-4">
        <button
          className="flex-1 bg-green-dark rounded-xl py-4 flex flex-col items-center justify-center gap-1.5"
          onClick={() => void handleOpenLiveCamera()}
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

          <div className="mt-3 mb-3">
            {[
              ["Plant", result.plantName],
              ["Growth stage", result.stage],
              ["Confidence", `${Math.round(result.confidence?.[result.stage] ?? 0)}%`],
              ["Harvest est.", result.harvestDate],
            ].map(([key, val]) => (
              <div key={key} className="flex justify-between items-center py-[7px] border-b border-border">
                <span className="text-xs text-text-muted font-semibold">{key}</span>
                {key === "Growth stage" ? (
                  <StatusBadge label={val as string} type="success" size="sm" />
                ) : (
                  <span className={`text-[13px] font-bold ${key === "Harvest est." ? "text-green-dark" : "text-text-primary"}`}>
                    {val}
                  </span>
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
