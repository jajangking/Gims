"use client";

import React from 'react';

interface RadarProps {
  detections: { label: string; box: [number, number, number, number] }[];
  heading: number;
}

export default function RadarMap({ detections, heading }: RadarProps) {
  return (
    <div className="w-full bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 mt-4 flex flex-col items-center animate-in slide-in-from-bottom duration-500">
      <span className="text-[8px] font-black text-green-500 tracking-widest uppercase mb-4 self-start">Spatial_Radar_Map</span>
      <div className="relative w-48 h-48 rounded-full border border-green-500/20 flex items-center justify-center">
        {/* Grid lines */}
        <div className="absolute w-full h-[1px] bg-green-500/10" />
        <div className="absolute w-[1px] h-full bg-green-500/10" />
        
        {/* Robot Indicator */}
        <div 
          className="absolute w-4 h-4 bg-blue-500 rounded-full z-10 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
          style={{ transform: `rotate(${heading}deg)` }}
        >
          <div className="absolute -top-2 left-1 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-blue-500" />
        </div>

        {/* Objects */}
        {detections.map((det, i) => {
          // Simplified projection: x position to radar map
          const relX = (det.box[0] + det.box[2] / 2 - 50) * 1.5;
          return (
            <div 
              key={i}
              className="absolute w-2 h-2 bg-red-500 rounded-full animate-pulse"
              style={{ transform: `translate(${relX}px, -40px)` }}
            />
          );
        })}
      </div>
      <div className="mt-4 text-[9px] font-mono text-green-500/60 uppercase italic">
        Radar_Active: {detections.length} Targets
      </div>
    </div>
  );
}
