"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

interface Detection {
  label: string;
  confidence: number;
  box: [number, number, number, number];
}

export default function CameraModule() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isCameraOn, setIsCameraOn] = useState(true);
  
  const [isAiActive, setIsAiActive] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [trails, setTrails] = useState<Record<string, [number, number][]>>({}); // Track history per label
  const [threshold, setThreshold] = useState(0.45); // Sensitivity slider
  const thresholdRef = useRef(0.45);
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const requestRef = useRef<number | null>(null);

  // Sync threshold state with ref for lag-free AI loop
  useEffect(() => {
    thresholdRef.current = threshold;
  }, [threshold]);

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    if (!isCameraOn) return;
    
    // STOP OLD STREAM BEFORE STARTING NEW ONE - CRITICAL FOR SWITCHING
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Akses kamera ditolak atau tidak ditemukan.");
    }
  }, [facingMode, isCameraOn]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode, isCameraOn]);

  const detect = useCallback(async () => {
    if (!modelRef.current || !videoRef.current || !isAiActive || !isCameraOn) {
      setDetections([]);
      return;
    }

    if (videoRef.current.readyState === 4) {
      try {
        const video = videoRef.current;
        const predictions = await modelRef.current.detect(video, 20, thresholdRef.current);
        
        const vW = video.videoWidth;
        const vH = video.videoHeight;
        
        // Get actual container dimensions
        const rect = video.getBoundingClientRect();
        const cW = rect.width;
        const cH = rect.height;

        const vRatio = vW / vH;
        const cRatio = cW / cH;

        let renderW, renderH, offsetX = 0, offsetY = 0;

        if (vRatio > cRatio) {
          // Video is wider than container (sides cropped)
          renderH = cH;
          renderW = cH * vRatio;
          offsetX = (renderW - cW) / 2;
        } else {
          // Video is taller than container (top/bottom cropped)
          renderW = cW;
          renderH = cW / vRatio;
          offsetY = (renderH - cH) / 2;
        }

        const formatted = predictions
          .filter(pred => pred.score >= thresholdRef.current)
          .map(pred => {
            const [x, y, w, h] = pred.bbox;
            
            // Map video pixels to container percentage
            const finalX = ((x / vW) * renderW - offsetX) / cW * 100;
            const finalY = ((y / vH) * renderH - offsetY) / cH * 100;
            const finalW = (w / vW) * renderW / cW * 100;
            const finalH = (h / vH) * renderH / cH * 100;

            return {
              label: pred.class,
              confidence: pred.score,
              box: [finalX, finalY, finalW, finalH] as [number, number, number, number]
            };
          });
        
        setDetections(formatted);

        // Update Trails
        setTrails(prev => {
          const newTrails = { ...prev };
          
          // Clear trails for labels not in current detections
          const currentLabels = new Set(formatted.map(d => d.label));
          Object.keys(newTrails).forEach(label => {
            if (!currentLabels.has(label)) {
              delete newTrails[label];
            }
          });

          formatted.forEach(det => {
            const centerX = det.box[0] + det.box[2] / 2;
            const centerY = det.box[1] + det.box[3] / 2;
            const history = newTrails[det.label] || [];
            
            // Limit trail history to 15 points
            newTrails[det.label] = [...history.slice(-14), [centerX, centerY]];
          });
          
          return newTrails;
        });
      } catch (err) {
        console.error("Detection error:", err);
      }
    }
    // Throttle: Wait 100ms before next detection to save CPU/Battery
    requestRef.current = window.setTimeout(detect, 100) as unknown as number;
  }, [isAiActive, isCameraOn]);

  useEffect(() => {
    let isMounted = true;
    const loadModelAndStart = async () => {
      if (isAiActive) {
        if (!modelRef.current) {
          setIsModelLoading(true);
          try {
            await tf.ready();
            const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
            if (isMounted) {
              modelRef.current = model;
              setIsModelLoading(false);
              detect();
            }
          } catch (err) {
            console.error("Model load error:", err);
            if (isMounted) setIsModelLoading(false);
          }
        } else {
          detect();
        }
      } else {
        setDetections([]);
        if (requestRef.current) {
          clearTimeout(requestRef.current);
          requestRef.current = null;
        }
      }
    };
    loadModelAndStart();
    return () => { 
      isMounted = false; 
      if (requestRef.current) {
        clearTimeout(requestRef.current);
      }
    };
  }, [isAiActive, detect]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const togglePower = () => {
    setIsCameraOn(prev => !prev);
  };

  const toggleAi = () => {
    setIsAiActive(prev => !prev);
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-3 animate-in fade-in duration-500">
      
      {/* --- TOP CONTROLS --- */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${stream ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-[9px] md:text-[10px] font-mono text-gray-500 uppercase tracking-widest truncate max-w-[60px] md:max-w-none">
            {stream ? (
              <span className="hidden md:inline">{`Live: ${facingMode}`}</span>
            ) : (
              <span>OFF</span>
            )}
            {stream && <span className="md:hidden">{facingMode === 'user' ? 'FR' : 'BK'}</span>}
          </span>
          {isAiActive && (
            <span className={`text-[8px] md:text-[9px] font-mono px-1.5 md:px-2 py-0.5 rounded-full border ${isModelLoading ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 animate-pulse' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
              {isModelLoading ? 'LOAD' : 'AI'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Sensitivity Slider */}
          {isAiActive && !isModelLoading && (
            <div className="flex items-center gap-1.5 md:gap-2 bg-white/5 border border-white/10 px-2 md:px-3 py-1 md:py-1.5 rounded-xl animate-in fade-in slide-in-from-right duration-300">
              <span className="hidden md:inline text-[9px] font-mono text-gray-500 uppercase tracking-tighter">Sens</span>
              <input 
                type="range" 
                min="0.1" 
                max="0.9" 
                step="0.05" 
                value={threshold} 
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-12 md:w-16 h-1 bg-blue-500/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-[8px] md:text-[9px] font-mono text-blue-500 min-w-[20px] md:min-w-[24px]">{(threshold * 100).toFixed(0)}%</span>
            </div>
          )}

          <div className="flex items-center gap-1 md:gap-2">
            <button 
              onClick={toggleAi}
              disabled={!isCameraOn}
              className={`p-1.5 md:p-2 rounded-xl border transition-all active:scale-95 ${
                isAiActive ? 'bg-blue-500/20 border-blue-500/50 text-blue-500' : 'bg-white/5 border-white/10 text-gray-500'
              } ${!isCameraOn ? 'opacity-30 cursor-not-allowed' : 'hover:bg-blue-500/10'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </button>

            <button 
              onClick={togglePower}
              className={`p-1.5 md:p-2 rounded-xl border transition-all active:scale-95 ${
                isCameraOn ? 'bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500/20' : 'bg-green-500/10 border-green-500/50 text-green-500 hover:bg-green-500/20'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>

            <button 
              onClick={toggleCamera}
              disabled={!isCameraOn}
              className={`p-1.5 md:p-2 rounded-xl border border-white/10 bg-white/5 text-white transition-all active:scale-95 ${!isCameraOn ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* --- CAMERA VIEWPORT --- */}
      <div className="relative w-full h-[50vh] md:aspect-video md:h-auto rounded-3xl overflow-hidden bg-black shadow-2xl border-4 border-white/5">
        
        {isCameraOn ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
            />
            {/* AI Bounding Boxes Overlay */}
            <div className={`absolute inset-0 z-20 pointer-events-none ${facingMode === 'user' ? '-scale-x-100' : ''}`}>
              {/* Trails & Center Points Layer */}
              <svg className="absolute inset-0 w-full h-full">
                {Object.entries(trails).map(([label, points]) => (
                  <React.Fragment key={`trail-${label}`}>
                    {/* Path Trail */}
                    {points.length > 1 && (
                      <polyline
                        points={points.map(p => `${p[0]}%,${p[1]}%`).join(' ')}
                        fill="none"
                        stroke="rgba(59, 130, 246, 0.5)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-in fade-in duration-500"
                        style={{ vectorEffect: 'non-scaling-stroke' }}
                      />
                    )}
                    {/* Center Point */}
                    {points.length > 0 && (
                      <circle
                        cx={`${points[points.length - 1][0]}%`}
                        cy={`${points[points.length - 1][1]}%`}
                        r="4"
                        fill="#3b82f6"
                        className="shadow-lg"
                      />
                    )}
                  </React.Fragment>
                ))}
              </svg>

              {detections.map((det, idx) => (
                <div 
                  key={idx}
                  className="absolute border-2 border-blue-500 bg-blue-500/10 rounded-lg"

                  style={{
                    left: `${det.box[0]}%`,
                    top: `${det.box[1]}%`,
                    width: `${det.box[2]}%`,
                    height: `${det.box[3]}%`,
                  }}
                >
                  <div className={`absolute -top-6 left-0 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-lg ${facingMode === 'user' ? '-scale-x-100' : ''}`}>
                    <span>{det.label}</span>
                    <span className="opacity-70">{(det.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900/50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-700 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <span className="text-gray-600 font-mono text-xs uppercase tracking-[0.2em]">Signal Lost</span>
          </div>
        )}

        {error && isCameraOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50 p-6 text-center">
            <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-2xl">
              <div className="text-red-500 text-2xl font-bold mb-2">Error Kamera</div>
              <p className="text-red-400 text-sm font-mono">{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="px-4">
        <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">GIMS CAMERA INTERFACE</span>
      </div>
    </div>
  );
}
