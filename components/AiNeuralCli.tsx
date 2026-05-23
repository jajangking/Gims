"use client";

import React, { useState, useRef, useEffect } from 'react';

interface AiNeuralCliProps {
  onCommand: (target: string | null, mode: 'idle' | 'lock' | 'follow') => void;
  activeDetections?: string[];
}

export default function AiNeuralCli({ onCommand, activeDetections = [] }: AiNeuralCliProps) {
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ type: 'user' | 'sys' | 'err', content: string }[]>([
    { type: 'sys', content: 'KONEKSI_NEURAL_AKTIF. SIAP MENERIMA PERINTAH...' }
  ]);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastProactiveDetectionRef = useRef<string[]>([]);
  const proactiveCooldownRef = useRef<number>(0);

  // Proactive Detection Watcher
  useEffect(() => {
    if (!apiKey || isAiLoading || Date.now() < proactiveCooldownRef.current) return;

    const currentLabels = activeDetections.map(d => d.split(' ')[0]);
    const newObjects = currentLabels.filter(label => !lastProactiveDetectionRef.current.includes(label));

    if (newObjects.length > 0) {
      const triggerLabel = newObjects[0];
      proactiveCooldownRef.current = Date.now() + 15000;
      lastProactiveDetectionRef.current = currentLabels;
      handleGroqAi(`Saya baru saja mendeteksi ${triggerLabel}. Berikan laporan status singkat dalam Bahasa Indonesia.`);
    } else {
      lastProactiveDetectionRef.current = currentLabels;
    }
  }, [activeDetections, apiKey, isAiLoading]);

  const COCO_CLASSES = "person, bicycle, car, motorcycle, airplane, bus, train, truck, boat, traffic light, fire hydrant, stop sign, parking meter, bench, bird, cat, dog, horse, sheep, cow, elephant, bear, zebra, giraffe, backpack, umbrella, handbag, tie, suitcase, frisbee, skis, snowboard, sports ball, kite, baseball bat, baseball glove, skateboard, surfboard, tennis racket, bottle, wine glass, cup, fork, knife, spoon, bowl, banana, apple, sandwich, orange, broccoli, carrot, hot dog, pizza, donut, cake, chair, couch, potted plant, bed, dining table, toilet, tv, laptop, mouse, remote, keyboard, cell phone, microwave, oven, toaster, sink, refrigerator, book, clock, vase, scissors, teddy bear, hair drier, toothbrush";

  useEffect(() => {
    const savedKey = localStorage.getItem('GROQ_API_KEY');
    if (savedKey) setApiKey(savedKey);
    else setShowKeyInput(true);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  const saveKey = (key: string) => {
    if (!key.trim()) return;
    localStorage.setItem('GROQ_API_KEY', key.trim());
    setApiKey(key.trim());
    setShowKeyInput(false);
    setLogs(prev => [...prev, { type: 'sys', content: 'GROQ_API_KEY_SECURED. NEURAL_PROCESSOR_ONLINE.' }]);
  };

  const handleGroqAi = async (userMsg: string) => {
    if (!apiKey) return;
    setIsAiLoading(true);

    const systemPrompt = `Anda adalah GIMS Neural Interface, sistem kendali kamera berbasis AI.
BAHASA: Gunakan Bahasa Indonesia secara eksklusif. Tetap teknis namun responsif.
SITUASI_SAAT_INI: ${activeDetections.length > 0 ? activeDetections.join(', ') : 'Tidak ada objek jelas'}.
OBJEK_YANG_MUNGKIN: ${COCO_CLASSES}.
INSTRUKSI: Anda memiliki ingatan sesi (konteks). Gunakan tools HANYA untuk aksi sistem (lock/follow/reset). Jika user bertanya tentang apa yang Anda lihat, gunakan data SITUASI_SAAT_INI. Jika user menyapa, balas dengan Bahasa Indonesia yang santai tapi profesional.`;

    const currentMessages = [
      { role: "system", content: systemPrompt },
      ...chatHistory,
      { role: "user", content: userMsg }
    ];

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: currentMessages,
          tools: [
            {
              type: "function",
              function: {
                name: "lock_object",
                description: "Lock focus and highlight a specific object label.",
                parameters: {
                  type: "object",
                  properties: {
                    label: { type: "string", description: "The object to lock (e.g., 'person')" }
                  },
                  required: ["label"]
                }
              }
            },
            {
              type: "function",
              function: {
                name: "follow_object",
                description: "Engage tracking protocol to follow a specific object.",
                parameters: {
                  type: "object",
                  properties: {
                    label: { type: "string", description: "The object to follow" }
                  },
                  required: ["label"]
                }
              }
            },
            {
              type: "function",
              function: {
                name: "reset_scan",
                description: "Clear all targets and return to scan mode.",
                parameters: { type: "object", properties: {} }
              }
            }
          ],
          tool_choice: "auto"
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message || "Unknown Groq error");

      const message = data.choices[0].message;
      let finalAiResponse = message.content || "";

      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          const fnName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          setActiveTool(fnName.toUpperCase());
          setTimeout(() => setActiveTool(null), 2500);

          if (fnName === 'lock_object') {
            onCommand(args.label, 'lock');
            setLogs(prev => [...prev, { type: 'sys', content: `TARGET_TERKUNCI: ${args.label.toUpperCase()}.` }]);
            finalAiResponse += ` [Aksi: Mengunci ${args.label}]`;
          } else if (fnName === 'follow_object') {
            onCommand(args.label, 'follow');
            setLogs(prev => [...prev, { type: 'sys', content: `PELACAKAN_AKTIF: ${args.label.toUpperCase()}.` }]);
            finalAiResponse += ` [Aksi: Melacak ${args.label}]`;
          } else if (fnName === 'reset_scan') {
            onCommand(null, 'idle');
            setLogs(prev => [...prev, { type: 'sys', content: `PROTOKOL_DIHAPUS. RESET.` }]);
            finalAiResponse += ` [Aksi: Reset]`;
          }
        }
      } 
      
      if (message.content) {
        setLogs(prev => [...prev, { type: 'sys', content: message.content }]);
      }

      setChatHistory(prev => [
        ...prev, 
        { role: 'user', content: userMsg },
        { role: 'assistant', content: finalAiResponse }
      ].slice(-10));

    } catch (error: any) {
      setLogs(prev => [...prev, { type: 'err', content: `UPLINK_ERROR: ${error.message}` }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const executeCommand = (cmd: string) => {
    const userMsg = cmd.trim();
    if (!userMsg) return;
    setLogs(prev => [...prev, { type: 'user', content: userMsg }]);
    setInput('');
    if (apiKey) handleGroqAi(userMsg);
    else {
      setLogs(prev => [...prev, { type: 'err', content: 'ERR: NO_API_KEY.' }]);
      setShowKeyInput(true);
    }
  };

  return (
    <div className="w-full bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden mt-4 animate-in slide-in-from-bottom duration-500">
      <div className="bg-white/5 px-4 py-1.5 border-b border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-black text-blue-500 tracking-[0.3em] uppercase">Neural CLI v2.0</span>
          {isAiLoading && <div className="w-1 h-1 bg-blue-500 rounded-full animate-ping" />}
          {activeTool && (
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full animate-in zoom-in duration-300">
              <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[7px] font-bold text-red-500 tracking-tighter uppercase">{activeTool}</span>
            </div>
          )}
        </div>
        <button onClick={() => setShowKeyInput(!showKeyInput)} className="text-[8px] text-gray-500 hover:text-blue-400 uppercase tracking-tighter transition-colors">
          [CONFIG_KEY]
        </button>
      </div>

      <div ref={scrollRef} className="h-28 md:h-36 overflow-y-auto p-3 space-y-1 font-mono text-[10px] md:text-[11px] custom-scrollbar">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2 animate-in fade-in slide-in-from-left duration-200">
            <span className={log.type === 'user' ? 'text-gray-600' : log.type === 'err' ? 'text-red-500/70' : 'text-blue-500/70'}>
              {log.type === 'user' ? '>' : log.type === 'err' ? '!' : '#'}
            </span>
            <span className={log.type === 'user' ? 'text-white/80' : log.type === 'err' ? 'text-red-400' : 'text-blue-400'}>
              {log.content}
            </span>
          </div>
        ))}
        {isAiLoading && <div className="flex gap-2 text-blue-500/50 italic animate-pulse"><span>#</span><span>PROSES_NEURAL_UPLINK...</span></div>}
      </div>

      {showKeyInput && (
        <div className="bg-blue-600/10 p-3 border-t border-blue-500/20 flex flex-col gap-2 animate-in fade-in duration-300">
          <div className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">Input Groq API Key:</div>
          <div className="flex gap-2">
            <input type="password" placeholder="gsk_..." className="flex-1 bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-mono text-blue-300 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              onKeyDown={(e) => { if (e.key === 'Enter') saveKey((e.target as HTMLInputElement).value); }} />
            <button onClick={(e) => { const val = (e.currentTarget.previousElementSibling as HTMLInputElement).value; saveKey(val); }}
              className="bg-blue-600 hover:bg-blue-500 text-white text-[9px] px-4 rounded-lg font-black uppercase transition-all">Secure</button>
          </div>
        </div>
      )}

      <div className="bg-black/60 p-2 flex items-center gap-2 border-t border-white/5">
        <span className="text-blue-500 font-mono text-xs ml-2 animate-pulse">_</span>
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && executeCommand(input)}
          placeholder={apiKey ? "MASUKKAN_PERINTAH_DI_SINI..." : "MENUNGGU_API_KEY..."} disabled={showKeyInput}
          className="flex-1 bg-transparent border-none text-blue-300 font-mono text-[11px] focus:ring-0 focus:outline-none placeholder:text-gray-700" />
        <div className="text-[8px] font-mono text-gray-700 mr-2 uppercase hidden md:block">{apiKey ? 'Uplink_Siap' : 'Offline'}</div>
      </div>
    </div>
  );
}
