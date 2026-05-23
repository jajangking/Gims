import CameraModule from "@/components/CameraModule";

export default function Home() {
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

        <CameraModule />
        
        <footer className="mt-20 border-t border-white/5 pt-8 flex justify-between items-center text-[10px] font-mono text-gray-600 uppercase tracking-widest">
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
