import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface LiveCameraScreenProps {
  stream: MediaStream | null;
  error: string | null;
  onCapture: (uri: string) => void;
  onClose: () => void;
  onRetry: () => void;
  onUseDeviceCamera: () => void;
}

export function LiveCameraScreen({
  stream,
  error,
  onCapture,
  onClose,
  onRetry,
  onUseDeviceCamera,
}: LiveCameraScreenProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    setCapturing(false);

    const video = videoRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;

    const handleLoadedMetadata = () => {
      setReady(true);
    };

    video.onloadedmetadata = handleLoadedMetadata;

    video.play().then(() => {
      setReady(true);
    }).catch(() => {
      // Some mobile browsers delay autoplay until metadata is ready.
    });

    return () => {
      if (videoRef.current) {
        videoRef.current.onloadedmetadata = null;
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  const handleShutter = () => {
    if (!videoRef.current || capturing || !ready) return;

    setCapturing(true);
    try {
      const video = videoRef.current;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No 2d context");

      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
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
        <p className="text-primary-foreground/70 text-sm mb-6 max-w-[280px]">{error}</p>
        <div className="flex flex-col gap-3 w-full max-w-[240px]">
          <button
            onClick={onRetry}
            className="px-5 py-2.5 rounded-full bg-green-dark text-primary-foreground text-sm font-bold"
          >
            Try again
          </button>
          <button
            onClick={onUseDeviceCamera}
            className="px-5 py-2.5 rounded-full border border-white/20 text-primary-foreground text-sm font-bold"
          >
            Use device camera instead
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-primary-foreground/80 text-sm font-bold"
          >
            ← Go back
          </button>
        </div>
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
