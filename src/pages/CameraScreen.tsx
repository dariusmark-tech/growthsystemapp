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
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [result, setResult] = useState<PlantAnalysis | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestIdRef = useRef(0);

  const stopCameraStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraStream(null);
  };

  useEffect(() => {
    // Auto-launch the camera as soon as the Camera tab opens.
    // The browser will show its native permission dialog on first visit.
    void handleOpenLiveCamera();
    return () => {
      cameraRequestIdRef.current += 1;
      stopCameraStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setShowPermissionPrompt(false);
  };

  const handleUploadPicture = () => {
    uploadInputRef.current?.click();
  };

  // Directly request camera access. The browser's own permission dialog
  // is the only prompt the user sees — no extra in-app step.
  const handleOpenLiveCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("This browser does not support live camera access.");
      setShowLiveCamera(true);
      return;
    }
    setShowPermissionPrompt(false);
    setPermissionDenied(false);
    await handleGrantPermission();
  };


  // Step 2: User clicked "Allow Camera" — this user gesture is what
  // makes the browser show its native permission dialog.
  const handleGrantPermission = async () => {
    const requestId = ++cameraRequestIdRef.current;
    setRequestingPermission(true);
    stopCameraStream();
    setCameraError(null);

    const attempts: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
      {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
      { video: true, audio: false },
    ];

    let lastError: unknown = null;

    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (requestId !== cameraRequestIdRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          setRequestingPermission(false);
          return;
        }

        streamRef.current = stream;
        setCameraStream(stream);
        setCameraError(null);
        setShowPermissionPrompt(false);
        setShowLiveCamera(true);
        setRequestingPermission(false);
        return;
      } catch (error) {
        lastError = error;
        const name = (error as { name?: string })?.name;
        if (name === "NotAllowedError" || name === "SecurityError") break;
      }
    }

    if (requestId !== cameraRequestIdRef.current) {
      setRequestingPermission(false);
      return;
    }

    const errName = (lastError as { name?: string })?.name;
    if (errName === "NotAllowedError" || errName === "SecurityError") {
      setPermissionDenied(true);
      setShowPermissionPrompt(true);
    } else {
      setCameraError(mapCameraError(lastError));
      setShowPermissionPrompt(false);
      setShowLiveCamera(true);
    }
    setRequestingPermission(false);
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

  if (showPermissionPrompt) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-green-light flex items-center justify-center mb-5">
          <div className="w-10 h-10 rounded-full border-[3px] border-green-dark flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-green-dark" />
          </div>
        </div>
        <h2 className="text-text-primary text-[18px] font-extrabold mb-2">
          {permissionDenied ? "Camera Access Blocked" : "Allow Camera Access"}
        </h2>
        <p className="text-text-muted text-sm mb-6 max-w-[300px] leading-snug">
          {permissionDenied
            ? "Camera permission was previously denied. To use the live camera, please enable it in your browser settings (tap the lock icon in the address bar) and reload the page."
            : "This app needs your permission to use the camera so you can capture plant photos in real time."}
        </p>
        <div className="flex flex-col gap-3 w-full max-w-[260px]">
          {!permissionDenied && (
            <button
              onClick={() => void handleGrantPermission()}
              disabled={requestingPermission}
              className={`px-5 py-3 rounded-full bg-green-dark text-primary-foreground text-sm font-bold ${
                requestingPermission ? "opacity-60" : ""
              }`}
            >
              {requestingPermission ? "Requesting…" : "Allow Camera"}
            </button>
          )}
          {permissionDenied && (
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-3 rounded-full bg-green-dark text-primary-foreground text-sm font-bold"
            >
              Reload page
            </button>
          )}
          <button
            onClick={handleCloseLiveCamera}
            className="px-5 py-3 rounded-full text-text-muted text-sm font-bold"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (showLiveCamera) {
    return (
      <LiveCameraScreen
        stream={cameraStream}
        error={cameraError}
        onCapture={handleCaptured}
        onClose={handleCloseLiveCamera}
        onRetry={() => void handleGrantPermission()}
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
          className="flex-1 bg-green-dark rounded-lg py-2.5 flex flex-row items-center justify-center gap-2"
          onClick={() => void handleOpenLiveCamera()}
        >
          <div className="w-5 h-5 rounded-full border-[1.5px] border-white flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
          </div>
          <span className="text-primary-foreground font-bold text-[12px]">Capture</span>
        </button>

        <button
          className="flex-1 bg-card-alt border border-border rounded-lg py-2.5 flex flex-row items-center justify-center gap-2"
          onClick={handleUploadPicture}
        >
          <Upload size={16} className="text-green-dark" strokeWidth={2.5} />
          <span className="text-text-primary font-bold text-[12px]">Upload</span>
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
