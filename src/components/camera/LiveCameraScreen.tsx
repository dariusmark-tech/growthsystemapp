import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface LiveCameraScreenProps {
  stream: MediaStream | null;
  error: string | null;
  onCapture: (uri: string) => void;
  onClose: () => void;
  onRetry: () => void;
}

/**
 * Web port of the Android CameraViewModel pattern:
 *  - getPreview()       -> bind MediaStream to <video>
 *  - getImageCapture()  -> offscreen <canvas> as the capture surface
 *  - captureImage()     -> draw current video frame to canvas, emit data URL
 *  - onImageSaved/onError callbacks -> resolve/reject in handleShutter
 */
export function LiveCameraScreen({ stream, error, onCapture, onClose, onRetry }: LiveCameraScreenProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // ImageCapture surface (mirrors imageCapture field in CameraViewModel)
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [ready, setReady] = useState(false);

  // Bind preview (mirrors setCamera + getPreview in the Kotlin VM).
  // We retry binding if the <video> ref isn't mounted yet on first run.
  useEffect(() => {
    setReady(false);
    setCapturing(false);

    if (!stream) {
      const v = videoRef.current;
      if (v) {
        v.pause();
        v.srcObject = null;
      }
      return;
    }

    let cancelled = false;
    let pollId: number | null = null;
    let bindRaf: number | null = null;

    const checkReady = () => {
      if (cancelled) return;
      const v = videoRef.current;
      if (!v) return;
      if (v.videoWidth > 0 && v.videoHeight > 0 && v.readyState >= 2) {
        setReady(true);
      }
    };

    const bind = () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (!video) {
        bindRaf = window.requestAnimationFrame(bind);
        return;
      }

      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.muted = true;
      video.autoplay = true;
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }

      video.onloadedmetadata = checkReady;
      video.onloadeddata = checkReady;
      video.oncanplay = checkReady;
      video.onplaying = checkReady;

      const tryPlay = () => {
        video.play().catch((err) => {
          console.warn("LiveCameraScreen: video.play() failed", err);
        });
      };
      tryPlay();
      // Retry play once shortly after — some browsers need a tick after srcObject
      window.setTimeout(tryPlay, 50);

      checkReady();
      pollId = window.setInterval(checkReady, 150);
    };

    bind();

    return () => {
      cancelled = true;
      if (pollId !== null) window.clearInterval(pollId);
      if (bindRaf !== null) window.cancelAnimationFrame(bindRaf);
      const v = videoRef.current;
      if (v) {
        v.onloadedmetadata = null;
        v.onloadeddata = null;
        v.oncanplay = null;
        v.onplaying = null;
        v.pause();
        v.srcObject = null;
      }
    };
  }, [stream]);

  /**
   * captureImage(context, onImageCaptured) — ported from Kotlin.
   * Tries the native ImageCapture API first (closest to CameraX's takePicture),
   * then falls back to drawing the current <video> frame onto a canvas.
   */
  const handleShutter = async () => {
    if (capturing) return;
    setCapturing(true);

    const waitForFrame = async () => {
      const v = videoRef.current;
      if (!v) return false;
      for (let i = 0; i < 30; i++) {
        if (v.videoWidth > 0 && v.videoHeight > 0) return true;
        await new Promise((r) => setTimeout(r, 100));
      }
      return false;
    };

    try {
      const haveFrame = await waitForFrame();
      const video = videoRef.current;
      if (!haveFrame || !video) {
        console.error("LiveCameraScreen: no video frame available to capture");
        setCapturing(false);
        return;
      }

      // Preferred path: native ImageCapture (mirrors CameraX ImageCapture)
      const track = stream?.getVideoTracks?.()[0];
      const ImageCaptureCtor = (window as unknown as { ImageCapture?: new (t: MediaStreamTrack) => { takePhoto: () => Promise<Blob> } }).ImageCapture;
      if (track && ImageCaptureCtor) {
        try {
          const ic = new ImageCaptureCtor(track);
          const blob = await ic.takePhoto();
          const dataUrl: string = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          console.log("LiveCameraScreen: image captured via ImageCapture");
          onCapture(dataUrl);
          return;
        } catch (icErr) {
          console.warn("LiveCameraScreen: ImageCapture failed, falling back to canvas", icErr);
        }
      }

      // Fallback: draw current frame onto reusable canvas
      const width = video.videoWidth;
      const height = video.videoHeight;
      const canvas = captureCanvasRef.current ?? document.createElement("canvas");
      captureCanvasRef.current = canvas;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No 2d context");
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      console.log("LiveCameraScreen: image captured via canvas", `${width}x${height}`);
      onCapture(dataUrl);
    } catch (err) {
      console.error("LiveCameraScreen: image capture failed", err);
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
        <video ref={videoRef} playsInline muted autoPlay className="w-full h-full object-contain bg-black" />
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
          onClick={() => void handleShutter()}
          disabled={capturing}
          className={`w-[78px] h-[78px] rounded-full bg-green-dark flex items-center justify-center ${capturing ? "opacity-60" : ""}`}
        >
          <div className="w-[64px] h-[64px] rounded-full border-[3px] border-white flex items-center justify-center">
            <div className="w-[52px] h-[52px] rounded-full bg-white" />
          </div>
        </button>
        <span className="text-white/80 text-xs font-semibold mt-3">
          {capturing ? "Capturing…" : ready ? "Click" : "Preparing…"}
        </span>
      </div>
    </div>
  );
}
