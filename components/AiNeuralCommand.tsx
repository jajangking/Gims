"use client";

import React, { useState, useRef, useEffect } from 'react';

interface AiNeuralCommandProps {
  onCommand: (target: string | null, mode: 'idle' | 'lock' | 'follow') => void;
}

export default function AiNeuralCommand({ onCommand }: AiNeuralCommandProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai' | 'system', content: string }[]>([
    { role: 'system', content: 'GIMS NEURAL LINK ACTIVE. Awaiting commands.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      // PROMPT: "lock person", "follow cat", "clear"
      const lowerMsg = userMsg.toLowerCase();
      
      if (lowerMsg.includes('kunci') || lowerMsg.includes('lock')) {
        const object = lowerMsg.replace('kunci', '').replace('lock', '').trim();
        onCommand(object || 'person', 'lock');
        setMessages(prev => [...prev, { role: 'ai', content: `LOCKED ON: ${object || 'PERSON'}. TARGET ACQUIRED.` }]);
      } 
      else if (lowerMsg.includes('follow') || lowerMsg.includes('ikuti')) {
        const object = lowerMsg.replace('follow', '').replace('ikuti', '').trim();
        onCommand(object || 'person', 'follow');
        setMessages(prev => [...prev, { role: 'ai', content: `FOLLOWING: ${object || 'PERSON'}. TRACKING ENGAGED.` }]);
      }
      else if (lowerMsg.includes('clear') || lowerMsg.includes('hapus') || lowerMsg.includes('reset')) {
        onCommand(null, 'idle');
        setMessages(prev => [...prev, { role: 'ai', content: `TARGET CLEARED. RETURNING TO IDLE SCAN.` }]);
      }
      else {
        setMessages(prev => [...prev, { role: 'ai', content: `UNKNOWN COMMAND. USE: "LOCK [OBJECT]", "FOLLOW [OBJECT]", or "CLEAR".` }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: `CONNECTION ERROR: NEURAL LINK TIMEOUT.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-80 h-96 bg-black/80 backdrop-blur-xl border border-blue-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-blue-600/20 p-3 border-b border-white/10 flex justify-between items-center">
            <span className="text-[10px] font-black text-blue-400 tracking-widest uppercase">Neural Command</span>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[11px] font-mono leading-relaxed ${
                  m.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : m.role === 'system' 
                  ? 'bg-gray-800/50 text-gray-500 italic' 
                  : 'bg-white/5 border border-white/10 text-blue-300'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-white/5 border-t border-white/10 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type command..."
              className="flex-1 bg-transparent border-none text-[11px] font-mono text-white placeholder:text-gray-600 focus:ring-0 focus:outline-none"
            />
            <button onClick={handleSend} className="text-blue-500 hover:text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 border-2 ${
          isOpen ? 'bg-red-600 border-red-500 rotate-90' : 'bg-blue-600 border-blue-500 hover:shadow-blue-500/40'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    </div>
  );
}
