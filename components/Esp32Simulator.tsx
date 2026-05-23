"use client";

import React from 'react';
import VirtualJoystick from './VirtualJoystick';

interface Esp32SimulatorProps {
  motorL: number;
  motorR: number;
  buzzer: boolean;
  onMotorChange: (motorL: number, motorR: number) => void;
  onBuzzerChange: (buzzer: boolean) => void;
}

export default function Esp32Simulator({ motorL, motorR, buzzer, onMotorChange, onBuzzerChange }: Esp32SimulatorProps) {
  const handleJoystickMove = (speed: number, steer: number) => {
    // Differential Drive Logic: Steer Negative (-): Turn Left (Right motor faster)
    const left = speed + steer;
    const right = speed - steer;
    onMotorChange(
      Math.max(-100, Math.min(100, left)),
      Math.max(-100, Math.min(100, right))
    );
  };

  // Conversion factors (Simulated)
  const velocity = Math.round(((motorL + motorR) / 2) * 0.5); // m/h approx
  const heading = Math.round((motorR - motorL) * 0.9); // degrees approx

  const Wheel3D = ({ speed, label }: { speed: number, label: string }) => (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[8px] font-black text-blue-500 tracking-widest uppercase">{label}</span>
      <div className="relative w-20 h-20 group">
        <div className={`absolute inset-0 rounded-full border-4 border-slate-700 shadow-[0_0_10px_rgba(0,0,0,0.5)] ${speed !== 0 ? 'animate-spin' : ''}`}
             style={{ animationDuration: `${Math.max(0.2, 2 - Math.abs(speed) / 50)}s`, animationDirection: speed > 0 ? 'normal' : 'reverse' }}>
          <div className="absolute inset-2 rounded-full border-4 border-blue-500/30" />
          <div className="absolute top-0 left-1/2 -ml-0.5 w-1 h-1/2 bg-blue-500" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center font-mono text-[9px] text-white">RPM</div>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 mt-4 flex flex-col items-center gap-6 animate-in slide-in-from-bottom duration-500">
      <div className="grid grid-cols-3 gap-2 w-full mb-4">
        <div className="bg-white/5 p-2 rounded-lg text-center">
            <span className="text-[7px] text-gray-500 block">VELOCITY</span>
            <span className="text-xs font-mono text-blue-400">{velocity} m/h</span>
        </div>
        <div className="bg-white/5 p-2 rounded-lg text-center">
            <span className="text-[7px] text-gray-500 block">HEADING</span>
            <span className="text-xs font-mono text-purple-400">{heading}°</span>
        </div>
        <div className="bg-white/5 p-2 rounded-lg text-center">
            <span className="text-[7px] text-gray-500 block">STATUS</span>
            <span className="text-xs font-mono text-green-400">{buzzer ? 'ALERT' : 'READY'}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-8 w-full">
        <Wheel3D speed={motorL} label="Motor_L" />
        <button onClick={() => onBuzzerChange(!buzzer)} className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-all shadow-lg ${buzzer ? 'bg-red-500 border-red-400' : 'bg-slate-900 border-slate-700'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
        </button>
        <Wheel3D speed={motorR} label="Motor_R" />
      </div>

      <VirtualJoystick onMove={handleJoystickMove} />
    </div>
  );
}
