"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface JoystickProps {
  onMove: (speed: number, steer: number) => void;
}

export default function VirtualJoystick({ onMove }: JoystickProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const radius = rect.width / 2;
    
    let x = clientX - (rect.left + radius);
    let y = clientY - (rect.top + radius);
    
    const distance = Math.sqrt(x * x + y * y);
    const maxDist = radius - 15;
    
    if (distance > maxDist) {
      const angle = Math.atan2(y, x);
      x = Math.cos(angle) * maxDist;
      y = Math.sin(angle) * maxDist;
    }
    
    setPosition({ x, y });
    
    // speed (y inverted: -100 to 100), steer (x: -50 to 50)
    const speed = -(y / maxDist) * 100;
    const steer = (x / maxDist) * 50;
    onMove(Math.round(speed), Math.round(steer));
  }, [onMove]);

  const endMove = () => {
    setActive(false);
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div 
      ref={containerRef}
      className="w-32 h-32 rounded-full border-2 border-white/10 bg-slate-900/50 flex items-center justify-center touch-none cursor-pointer"
      onMouseDown={() => setActive(true)}
      onMouseMove={(e) => active && handleMove(e.clientX, e.clientY)}
      onMouseUp={endMove}
      onMouseLeave={endMove}
      onTouchStart={() => setActive(true)}
      onTouchMove={(e) => active && handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={endMove}
    >
      <div 
        className="w-12 h-12 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-transform duration-75"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      />
    </div>
  );
}
