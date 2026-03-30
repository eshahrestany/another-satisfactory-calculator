import { useState, useEffect } from 'react';

const BOOT_LINES = [
  { text: 'FICSIT INC. FACTORY PLANNING SYSTEM v2.1.7', delay: 0, style: 'text-satisfactory-orange font-bold font-industrial' },
  { text: '════════════════════════════════════════════', delay: 100, style: 'text-satisfactory-border' },
  { text: 'Initializing production solver core...', delay: 300, style: '' },
  { text: '  [OK] Linear programming engine loaded', delay: 500, style: 'text-green-400' },
  { text: '  [OK] Recipe database connected', delay: 700, style: 'text-green-400' },
  { text: '  [OK] Building manifest loaded', delay: 850, style: 'text-green-400' },
  { text: 'Loading resource extraction tables...', delay: 1000, style: '' },
  { text: '  [OK] 47 raw materials indexed', delay: 1200, style: 'text-green-400' },
  { text: 'Calibrating power grid simulator...', delay: 1350, style: '' },
  { text: '  [OK] Power grid online', delay: 1550, style: 'text-green-400' },
  { text: '', delay: 1700, style: '' },
  { text: 'All systems nominal. Welcome, Pioneer.', delay: 1800, style: 'text-satisfactory-orange' },
];

interface BootSequenceProps {
  onComplete: () => void;
}

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [fading, setFading] = useState(false);

  // Cursor blink
  useEffect(() => {
    const interval = setInterval(() => setCursorVisible((v) => !v), 500);
    return () => clearInterval(interval);
  }, []);

  // Line reveals
  useEffect(() => {
    if (visibleLines >= BOOT_LINES.length) {
      const fadeTimer = setTimeout(() => setFading(true), 600);
      const doneTimer = setTimeout(onComplete, 1200);
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(doneTimer);
      };
    }

    const nextLine = BOOT_LINES[visibleLines];
    const timer = setTimeout(
      () => setVisibleLines((v) => v + 1),
      visibleLines === 0 ? nextLine.delay : BOOT_LINES[visibleLines].delay - BOOT_LINES[visibleLines - 1].delay
    );
    return () => clearTimeout(timer);
  }, [visibleLines, onComplete]);

  return (
    <div
      className={`h-screen bg-satisfactory-darker flex items-center justify-center transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* CRT border effect */}
      <div className="relative max-w-lg w-full mx-4">
        {/* Outer frame */}
        <div className="border border-satisfactory-border/50 p-1">
          <div className="border border-satisfactory-border/30 p-6 bg-satisfactory-darker relative overflow-hidden">
            {/* Scanline overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.04]"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.08) 2px, rgba(255,255,255,0.08) 4px)',
              }}
            />

            {/* Terminal content */}
            <div className="relative z-10 text-xs leading-relaxed">
              {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
                <div key={i} className={`${line.style || 'text-satisfactory-text'}`}>
                  {line.text || '\u00A0'}
                </div>
              ))}

              {/* Cursor */}
              {visibleLines < BOOT_LINES.length && (
                <span className={`text-satisfactory-orange ${cursorVisible ? 'opacity-100' : 'opacity-0'}`}>
                  ▌
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Skip hint */}
        <div className="text-center mt-3">
          <button
            onClick={onComplete}
            className="text-satisfactory-muted/50 text-[10px] uppercase tracking-wider hover:text-satisfactory-muted transition-colors"
          >
            Press to skip
          </button>
        </div>
      </div>
    </div>
  );
}
