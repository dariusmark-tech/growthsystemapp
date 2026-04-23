import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

export function LiveCameraScreen({
  onCapture,
  onClose,
}: {
  onCapture: (uri: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const startStream = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera API not supported in this browser. Try Chrome or Safari over HTTPS.");
        return;
      }

      // Try a sequence of constraints from most-specific to most-permissive
      const attempts: MediaStreamConstraints[] = [
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        { video: { facingMode: "user" }, audio: false },
        { video: true, audio: false },
      ];

      let lastErr: any = null;
      for (const constraints of attempts) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (!active) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            const onLoaded = () => setReady(true);
            videoRef.current.onloadedmetadata = onLoaded;
            try {
              await videoRef.current.play();
            } catch {
              // autoplay can fail; metadata listener will still fire
            }
            // Fallback in case onloadedmetadata doesn't fire promptly
            setTimeout(() => active && setReady(true), 800);
          }
          return;
        } catch (e: any) {
          lastErr = e;
        }
      }

      const name = lastErr?.name || "";
      let msg = lastErr?.message || "Could not start camera";
      if (name === "NotAllowedError") msg = "Camera permission denied. Please allow camera access in your browser settings.";
      else if (name === "NotFoundError") msg = "No camera was found on this device.";
      else if (name === "NotReadableError") msg = "The camera is in use by another app. Close it and try again.";
      else if (name === "SecurityError" || location.protocol !== "https:") {
        msg = "Camera requires a secure (HTTPS) connection.";
      }
      setError(msg);
    };

    startStream();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const handleShutter = () => {
    if (!videoRef.current || capturing || !ready) return;
    setCapturing(true);
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No 2d context");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
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
      <div className="flex items-center justify-between px-4 pt-12 pb-3">
        <button onClick={onClose} className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center">
          <X size={22} className="text-white" />
        </button>
        <span className="text-white text-[15px] font-extrabold tracking-wide">Capture & Upload</span>
        <div className="w-11" />
      </div>

      <div className="flex-1 mx-4 mb-4 rounded-3xl overflow-hidden relative bg-black">
        <video ref={videoRef} playsInline muted autoPlay className="w-full h-full object-cover" />
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

      <div className="pb-10 flex flex-col items-center">
        <button
          onClick={handleShutter}
          disabled={capturing || !ready}
          className={`w-[78px] h-[78px] rounded-full bg-green-dark flex items-center justify-center ${capturing ? "opacity-60" : ""}`}
        >
          <div className="w-[64px] h-[64px] rounded-full border-[3px] border-white flex items-center justify-center">
            <div className="w-[52px] h-[52px] rounded-full bg-white" />
          </div>
        </button>
        <span className="text-white/80 text-xs font-semibold mt-3">{capturing ? "Capturing…" : "Click"}</span>
      </div>
    </div>
  );
}
