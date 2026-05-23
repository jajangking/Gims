"use client";

import React, { useState } from "react";
import CameraModule from "@/components/CameraModule";
import AiNeuralCli from "@/components/AiNeuralCli";
import Esp32Simulator from "@/components/Esp32Simulator";
import RadarMap from "@/components/RadarMap";

export default function Home() {
  const [commandTarget, setCommandTarget] = useState<string | null>(null);
  const [commandMode, setCommandMode] = useState<'idle' | 'lock' | 'follow'>('idle');
  const [currentDetections, setCurrentDetections] = useState<any[]>([]);

  // ESP32 Simulator States
  const [motorL, setMotorL] = useState(0);
  const [motorR, setMotorR] = useState(0);
  const [buzzer, setBuzzer] = useState(false);
  const lastKnownX = React.useRef<number>(50);

  const telemetry = {
    velocity: Math.round(((motorL + motorR) / 2) * 0.5),
    heading: Math.round((motorR - motorL) * 0.9),
    buzzer
  };

  // Autonomous Follow Logic
  React.useEffect(() => {
    if ((commandMode === 'follow' || commandMode === 'lock') && commandTarget) {
      const targetObjs = currentDetections.filter(d => 
        d.label.toLowerCase().includes(commandTarget.toLowerCase())
      );
      const targetObj = targetObjs.sort((a, b) => b.confidence - a.confidence)[0];

      if (targetObj) {
        const centerX = targetObj.box[0] + targetObj.box[2] / 2;
        lastKnownX.current = centerX; // Remember position
        
        // Obstacle Avoidance: Stop if object is too close (width > 40%)
        const isTooClose = targetObj.box[2] > 40;
        if (isTooClose) {
          setMotorL(0); setMotorR(0);
        } else if (commandMode === 'follow') {
          const error = centerX - 50; 
          const turn = error * 0.8;
          const speed = 40;
          setMotorL(speed - turn);
          setMotorR(speed + turn);
        } else {
          setMotorL(0); setMotorR(0);
        }
      } else {
        // Intelligent Search: Turn towards last known position
        const searchDirection = lastKnownX.current < 50 ? -25 : 25;
        setMotorL(searchDirection);
        setMotorR(-searchDirection);
      }
    } else if (commandMode === 'idle') {
      setMotorL(0); setMotorR(0);
    }
  }, [currentDetections, commandMode, commandTarget]);


  const handleAiCommand = (target: string | null, mode: 'idle' | 'lock' | 'follow') => {
    setCommandTarget(target);
    setCommandMode(mode);
    
    // Default hardware response
    setBuzzer(true);
    setTimeout(() => setBuzzer(false), 500);

    if (mode === 'follow') {
      setMotorL(50); setMotorR(50);
    } else if (mode === 'lock') {
      setMotorL(0); setMotorR(0);
    } else {
      setMotorL(0); setMotorR(0);
    }
  };

  // Dedicated hardware control for tools (called by AI)
  const handleHardwareControl = (action: string) => {
    setBuzzer(true);
    setTimeout(() => setBuzzer(false), 500);
    
    switch(action) {
      case 'left': setMotorL(-30); setMotorR(30); break;
      case 'right': setMotorL(30); setMotorR(-30); break;
      case 'forward': setMotorL(60); setMotorR(60); break;
      case 'stop': setMotorL(0); setMotorR(0); break;
      case 'buzzer': break; // already triggered
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1)_0%,rgba(5,5,5,1)_100%)] flex flex-col items-center p-4 md:p-8 overflow-x-hidden">
      {/* Decorative Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-7xl">
        <header className="flex justify-between items-center mb-4 px-2">
          <h1 className="text-xl font-bold text-white tracking-tight">
            GIMS <span className="text-blue-500">SYSTEM</span>
          </h1>
          <span className="text-[10px] font-mono text-gray-500 uppercase">X-992-ALPHA</span>
        </header>

        <div className="flex flex-col gap-2">
          <CameraModule 
            externalTarget={commandTarget} 
            externalMode={commandMode} 
            onDetectionUpdate={(dets) => setCurrentDetections(dets)}
          />
          
          <AiNeuralCli 
            onCommand={handleAiCommand} 
            onHardwareControl={handleHardwareControl}
            activeDetections={currentDetections}
            telemetry={telemetry}
            commandTarget={commandTarget}
          />

          <RadarMap detections={currentDetections} heading={telemetry.heading} />

          <Esp32Simulator 
            motorL={motorL} 
            motorR={motorR} 
            buzzer={buzzer} 
            onMotorChange={(l, r) => { setMotorL(l); setMotorR(r); }}
            onBuzzerChange={(b) => setBuzzer(b)}
          />
        </div>
        
        <footer className="mt-12 border-t border-white/5 pt-8 flex justify-between items-center text-[10px] font-mono text-gray-600 uppercase tracking-widest">
          <div>© 2026 GIMS NEURAL INTERFACE</div>
          <div className="flex gap-6">
            <span className="hover:text-blue-500 cursor-help transition-colors">Documentation</span>
            <span className="hover:text-blue-500 cursor-help transition-colors">System Logs</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
