/**
 * evidence-camera-capture.tsx
 *
 * Evidence capture component for GreenGuard AI Citizen Hub.
 *
 * Supports:
 * - Native Android/mobile camera capture via `<input type="file" accept="image/*" capture="environment" />`
 * - Gallery / existing image selection
 * - Safe permission handling
 * - Photo previews, remove, replace, and validation (Max 5 files, 10MB each)
 * - In-browser camera viewfinder fallback
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  Image as ImageIcon,
  X,
  RotateCw,
  AlertCircle,
  Check,
  Loader2,
  ZoomIn,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface EvidenceCameraCaptureProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

export function EvidenceCameraCapture({
  files,
  onChange,
  maxFiles = 5,
  maxSizeMB = 10,
}: EvidenceCameraCaptureProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Live WebRTC Camera Modal State (Fallback/Advanced)
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generate object URLs for file previews
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  // Clean up live stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  // Validate and add files
  const addFiles = useCallback(
    (newFiles: File[]) => {
      setErrorMessage(null);
      const validImages: File[] = [];

      for (const file of newFiles) {
        if (!file.type.startsWith("image/")) {
          setErrorMessage("Only image files (JPG, PNG, WebP) are supported.");
          continue;
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
          setErrorMessage(`File "${file.name}" exceeds the ${maxSizeMB}MB limit.`);
          continue;
        }
        validImages.push(file);
      }

      if (validImages.length === 0) return;

      const combined = [...files, ...validImages].slice(0, maxFiles);
      if (files.length + validImages.length > maxFiles) {
        setErrorMessage(`Maximum ${maxFiles} photos allowed.`);
      }
      onChange(combined);
    },
    [files, maxFiles, maxSizeMB, onChange],
  );

  // Handle Remove file
  const handleRemove = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
    setErrorMessage(null);
  };

  // Handle Replace file
  const triggerReplace = (index: number) => {
    setReplaceIndex(index);
    replaceInputRef.current?.click();
  };

  const handleReplaceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (replaceIndex === null || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Only image files are supported.");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setErrorMessage(`File exceeds the ${maxSizeMB}MB limit.`);
      return;
    }

    const updated = [...files];
    updated[replaceIndex] = file;
    onChange(updated);
    setReplaceIndex(null);
    e.target.value = "";
  };

  // Trigger Native Android/Mobile Camera
  const handleNativeCameraClick = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  // Live Camera Start (Fallback)
  const startLiveCamera = async (facing: "environment" | "user" = cameraFacing) => {
    setCameraError(null);
    setIsStartingCamera(true);

    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Live camera is not supported on this browser. Use native capture instead.");
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoDevices.length > 1);
      } catch {
        // Non-critical
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setCameraStream(stream);
      setShowLiveCamera(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Please allow camera access in browser settings or choose from gallery.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setCameraError("No camera device was detected on your system.");
      } else {
        setCameraError(error.message || "Could not start camera. Please choose from gallery instead.");
      }
      setShowLiveCamera(true);
    } finally {
      setIsStartingCamera(false);
    }
  };

  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextFacing);
    await startLiveCamera(nextFacing);
  };

  const captureLivePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const capturedFile = new File([blob], `evidence_${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        addFiles([capturedFile]);
        closeLiveCamera();
      },
      "image/jpeg",
      0.92,
    );
  };

  const closeLiveCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setShowLiveCamera(false);
    setCameraError(null);
  };

  return (
    <div className="space-y-3">
      {/* 1. Native Camera input with capture="environment" for Android Chrome & iOS */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            addFiles(Array.from(e.target.files));
          }
          e.target.value = "";
        }}
      />

      {/* 2. Standard Gallery File input */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            addFiles(Array.from(e.target.files));
          }
          e.target.value = "";
        }}
      />

      {/* 3. Replace single image input */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleReplaceFile}
      />

      {/* Error banner if any */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-xs">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action Buttons: Take Photo + Choose from Gallery */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl gap-2 border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all text-xs font-medium"
          onClick={handleNativeCameraClick}
          disabled={files.length >= maxFiles}
        >
          <Camera className="size-4 text-primary shrink-0" />
          <span>Take Photo</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl gap-2 border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all text-xs font-medium"
          onClick={() => galleryInputRef.current?.click()}
          disabled={files.length >= maxFiles}
        >
          <ImageIcon className="size-4 text-primary shrink-0" />
          <span>Choose from Gallery</span>
        </Button>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
        <span>Attach clear photos to help authorities assess the issue.</span>
        <span>
          {files.length}/{maxFiles} attached
        </span>
      </div>

      {/* Evidence Thumbnails Grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          {files.map((file, idx) => {
            const url = previewUrls[idx];
            return (
              <div
                key={idx}
                className="group relative aspect-square rounded-xl border border-border/80 bg-muted/40 overflow-hidden"
              >
                {url ? (
                  <img
                    src={url}
                    alt={`Evidence ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Desktop overlay actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => url && setLightboxUrl(url)}
                      className="size-6 rounded-lg bg-black/60 text-white/90 hover:text-white flex items-center justify-center transition-colors"
                      title="View full image"
                      aria-label="View full image"
                    >
                      <ZoomIn className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="size-6 rounded-lg bg-destructive/80 hover:bg-destructive text-white flex items-center justify-center transition-colors"
                      title="Remove image"
                      aria-label="Remove image"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-white/80 font-mono">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => triggerReplace(idx)}
                      className="text-[10px] text-white bg-black/60 hover:bg-black/80 px-2 py-0.5 rounded-md transition-colors"
                    >
                      Replace
                    </button>
                  </div>
                </div>

                {/* Mobile permanent touch remove button */}
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="sm:hidden absolute top-1.5 right-1.5 size-6 rounded-full bg-black/70 text-white flex items-center justify-center"
                  aria-label="Remove photo"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 size-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
            onClick={() => setLightboxUrl(null)}
            aria-label="Close image preview"
          >
            <X className="size-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Evidence preview"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Live WebRTC Camera Modal (Fallback / in-browser viewfinder) */}
      <AnimatePresence>
        {showLiveCamera && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-background rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Camera Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
                <div className="flex items-center gap-2">
                  <Camera className="size-4 text-primary" />
                  <span className="text-xs font-semibold">Capture Evidence</span>
                </div>
                <button
                  type="button"
                  onClick={closeLiveCamera}
                  className="size-7 rounded-lg text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                  aria-label="Close camera"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Viewfinder area */}
              <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                {cameraError ? (
                  <div className="p-6 text-center space-y-3 max-w-xs">
                    <AlertCircle className="size-8 text-destructive mx-auto" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {cameraError}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        closeLiveCamera();
                        galleryInputRef.current?.click();
                      }}
                      className="gap-1.5 text-xs"
                    >
                      <ImageIcon className="size-3.5" />
                      Choose from Gallery
                    </Button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {hasMultipleCameras && (
                      <button
                        type="button"
                        onClick={toggleCameraFacing}
                        className="absolute top-3 right-3 size-9 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center transition-colors"
                        title="Switch front/rear camera"
                        aria-label="Switch camera"
                      >
                        <RotateCw className="size-4" />
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Camera Controls Footer */}
              {!cameraError && (
                <div className="p-4 bg-muted/20 border-t flex items-center justify-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={closeLiveCamera}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={captureLivePhoto}
                    className="gap-2 px-6 h-10 rounded-full font-semibold shadow-md"
                  >
                    <Check className="size-4" />
                    Take Snapshot
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
