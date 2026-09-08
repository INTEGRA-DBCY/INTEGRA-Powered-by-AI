"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import { Camera, CameraOff, RefreshCw, Upload, Sparkles, CheckCircle2, AlertCircle, Volume2, VolumeX, FlipHorizontal } from "lucide-react";

interface CameraQRScannerProps {
  onScan: (decodedText: string) => void;
  title?: string;
  themeColor?: string;
  accentBg?: string;
  placeholder?: string;
  autoStart?: boolean;
}

export function CameraQRScanner({
  onScan,
  title = "Live Camera QR Scanner",
  themeColor = "#D97706",
  accentBg = "bg-amber-50",
  placeholder = "Hold participant QR code or hall ticket in front of camera...",
  autoStart = true
}: CameraQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isBeepEnabled, setIsBeepEnabled] = useState(true);
  const [lastScannedText, setLastScannedText] = useState<string | null>(null);
  const [scanTimestamp, setScanTimestamp] = useState<string>("");
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  const isStartingRef = useRef<boolean>(false);

  // Synthesize Web Audio Chime on scan
  const playScanBeep = useCallback(() => {
    if (!isBeepEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch {}
  }, [isBeepEnabled]);

  // Enumerate video input devices once safely
  const listCameras = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devices.filter((d) => d.kind === "videoinput");
      if (isMountedRef.current) {
        setAvailableDevices(videoDevs);
      }
    } catch (err) {
      console.warn("Could not list video devices", err);
    }
  }, []);

  // Stop Camera Stream safely
  const stopCamera = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch {}
    }
    if (isMountedRef.current) {
      setIsCameraActive(false);
    }
  }, []);

  // Start Camera Stream with AbortError prevention
  const startCamera = useCallback(async (targetFacing = facingMode, targetDeviceId = selectedDeviceId) => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    if (isMountedRef.current) {
      setCameraError(null);
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      if (isMountedRef.current) {
        setCameraError("Camera access is not supported by your browser environment.");
      }
      isStartingRef.current = false;
      return;
    }

    // Stop existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: targetDeviceId
          ? { deviceId: { exact: targetDeviceId } }
          : {
              facingMode: { ideal: targetFacing },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // If unmounted while waiting for user permission, clean up immediately
      if (!isMountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        isStartingRef.current = false;
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");

        // Safely invoke play and catch any browser AbortErrors
        try {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
        } catch (playErr: any) {
          // If aborted by a new stream load or component unmount, ignore silently
          if (playErr.name !== "AbortError") {
            console.warn("Camera video.play() warning:", playErr);
          }
        }
      }

      if (isMountedRef.current) {
        setIsCameraActive(true);
      }
      listCameras();
    } catch (err: any) {
      if (!isMountedRef.current) {
        isStartingRef.current = false;
        return;
      }
      console.error("Camera getUserMedia error:", err);
      let msg = "Could not activate camera. Please grant camera permissions.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Camera permission denied. Please allow camera access in browser settings.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "No camera hardware detected on this device.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        msg = "Camera is already in use by another application.";
      }
      setCameraError(msg);
      setIsCameraActive(false);
    } finally {
      isStartingRef.current = false;
    }
  }, [facingMode, selectedDeviceId, listCameras]);

  // Frame processing loop with jsQR
  const tick = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isMountedRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const width = video.videoWidth;
      const height = video.videoHeight;

      if (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);

          // Decode QR
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert"
          });

          if (code && code.data && code.data.trim().length > 0) {
            const now = Date.now();
            // Debounce same QR code for 1.2 seconds
            if (now - lastScanTimeRef.current > 1200 || lastScannedText !== code.data) {
              lastScanTimeRef.current = now;
              if (isMountedRef.current) {
                setLastScannedText(code.data);
                setScanTimestamp(new Date().toLocaleTimeString());
              }
              playScanBeep();
              onScan(code.data.trim());
            }
          }
        }
      }
    }

    if (isCameraActive && isMountedRef.current) {
      animationFrameId.current = requestAnimationFrame(tick);
    }
  }, [isCameraActive, lastScannedText, onScan, playScanBeep]);

  // Handle mount, unmount, and auto-start
  useEffect(() => {
    isMountedRef.current = true;
    if (autoStart) {
      startCamera();
    }
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, []); // Run only once on mount

  // Trigger tick loop when camera becomes active
  useEffect(() => {
    if (isCameraActive) {
      animationFrameId.current = requestAnimationFrame(tick);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isCameraActive, tick]);

  // Flip Camera between Back and Front smoothly
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    setSelectedDeviceId(""); // clear specific device ID to allow facingMode switch
    startCamera(nextMode, "");
  };

  // Upload image file and decode QR
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setCameraError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const offscreenCanvas = document.createElement("canvas");
        offscreenCanvas.width = img.width;
        offscreenCanvas.height = img.height;
        const ctx = offscreenCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, img.width, img.height);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          setIsProcessingFile(false);

          if (code && code.data) {
            if (isMountedRef.current) {
              setLastScannedText(code.data);
              setScanTimestamp(new Date().toLocaleTimeString());
            }
            playScanBeep();
            onScan(code.data.trim());
          } else {
            if (isMountedRef.current) {
              setCameraError("No valid QR code found in uploaded image. Please try a clearer picture.");
            }
          }
        }
      };
      img.onerror = () => {
        if (isMountedRef.current) {
          setIsProcessingFile(false);
          setCameraError("Failed to process image file.");
        }
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full space-y-3">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: isCameraActive ? "#10B981" : "#94A3B8" }} />
          <h3 className="font-heading font-bold text-xs text-slate-900 uppercase tracking-wider">{title}</h3>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono">
          {/* Beep Toggle */}
          <button
            type="button"
            onClick={() => setIsBeepEnabled(!isBeepEnabled)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isBeepEnabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 font-semibold border-slate-200"
            }`}
            title={isBeepEnabled ? "Scan Chime Sound: ON" : "Scan Chime Sound: OFF"}
          >
            {isBeepEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>

          {/* Camera Flip */}
          <button
            type="button"
            onClick={handleToggleFacingMode}
            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer transition-colors flex items-center gap-1 text-[10px] font-bold"
            title="Flip Camera (Front / Back)"
          >
            <FlipHorizontal size={13} />
            <span className="hidden sm:inline">{facingMode === "environment" ? "Back Cam" : "Front Cam"}</span>
          </button>

          {/* Upload Image Fallback */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer transition-colors flex items-center gap-1 text-[10px] font-bold"
            title="Upload QR Image"
          >
            <Upload size={13} />
            <span className="hidden sm:inline">Upload Image</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Start / Stop Toggle */}
          {isCameraActive ? (
            <button
              type="button"
              onClick={stopCamera}
              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg font-bold text-[10px] cursor-pointer flex items-center gap-1 transition-all"
            >
              <CameraOff size={13} /> Stop Cam
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startCamera()}
              className="bg-[#059669] hover:bg-[#047857] text-white px-3 py-1.5 rounded-lg font-bold text-[10px] cursor-pointer flex items-center gap-1 transition-all shadow-2xs"
            >
              <Camera size={13} /> Open Camera
            </button>
          )}
        </div>
      </div>

      {/* Camera Viewfinder Box */}
      <div className="relative aspect-video w-full rounded-2xl bg-white border border-slate-200 shadow-sm border border-slate-800 overflow-hidden flex flex-col items-center justify-center shadow-inner">
        {/* Hidden Canvas for Decoding */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Video Element */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isCameraActive ? "opacity-100" : "opacity-0"
          }`}
          muted
          autoPlay
          playsInline
        />

        {/* Camera Active Viewfinder Overlay */}
        {isCameraActive ? (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4 bg-radial from-transparent to-black/50">
            {/* Top Status */}
            <div className="flex justify-between items-center w-full text-[10px] font-mono text-emerald-800 font-extrabold bg-black/50 px-3 py-1 rounded-full border border-emerald-500/30">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                OPTICAL SCANNER ACTIVE
              </span>
              <span>TIME: {new Date().toLocaleTimeString()}</span>
            </div>

            {/* Target Reticle & Laser Sweep Animation */}
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 border-2 border-dashed border-emerald-400/40 rounded-2xl flex items-center justify-center">
              {/* Corner Brackets */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-emerald-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-emerald-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-emerald-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-emerald-400 rounded-br-lg" />

              {/* Laser Sweep Ray */}
              <div className="scanner-ray" style={{ background: "linear-gradient(to right, transparent, #10B981, transparent)", boxShadow: "0 0 12px #10B981" }} />

              <span className="text-[10px] font-mono text-emerald-900 font-bold bg-black/60 px-2 py-0.5 rounded border border-emerald-400/30">
                ALIGN QR CODE HERE
              </span>
            </div>

            {/* Bottom Caption */}
            <div className="text-[10px] font-mono text-slate-800 font-bold bg-black/60 px-3 py-1 rounded-full border border-slate-700">
              Auto-detect active • Point camera at QR pass
            </div>
          </div>
        ) : (
          /* Camera Inactive Placeholder */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-700 font-semibold space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm border border-slate-800 flex items-center justify-center text-slate-700 font-semibold shadow-inner">
              <Camera size={26} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 font-sans font-bold">Camera Feed Currently Inactive</p>
              <p className="text-[11px] text-slate-700 font-semibold font-sans mt-0.5">{placeholder}</p>
            </div>
            <button
              type="button"
              onClick={() => startCamera()}
              className="bg-[#059669] hover:bg-[#047857] text-white font-bold px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-transform hover:scale-105 cursor-pointer shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
            >
              <Camera size={14} /> Open Camera Lens
            </button>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {cameraError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span className="font-medium">{cameraError}</span>
        </div>
      )}

      {/* Success Readout Banner */}
      {lastScannedText && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex items-center justify-between text-emerald-900">
          <div className="flex items-center gap-2 truncate">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span className="font-mono text-[11px] truncate">
              Detected: <strong className="font-bold">{lastScannedText}</strong>
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 shrink-0 ml-2">{scanTimestamp}</span>
        </div>
      )}
    </div>
  );
}
