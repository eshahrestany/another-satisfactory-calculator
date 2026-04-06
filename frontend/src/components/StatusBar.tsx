import { useState, useEffect } from 'react';
import { useFactoryStore } from '../stores/useFactoryStore';
import { formatPower } from '../utils/formatting';
import { Tooltip } from './Tooltip';

export function StatusBar() {
  const solveResult = useFactoryStore((s) => s.solveResult);
  const solving = useFactoryStore((s) => s.solving);
  const targets = useFactoryStore((s) => s.targets);

  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setUptime((u) => u + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = String(Math.floor(uptime / 3600)).padStart(2, '0');
  const mins = String(Math.floor((uptime % 3600) / 60)).padStart(2, '0');
  const secs = String(uptime % 60).padStart(2, '0');

  const nodeCount = solveResult?.nodes.length ?? 0;
  const edgeCount = solveResult?.edges.length ?? 0;
  const totalPower = solveResult?.summary.total_power_mw ?? 0;

  return (
    <div className="bg-satisfactory-dark border-t border-satisfactory-border/50 px-3 py-1 flex items-center gap-4 text-[10px] text-satisfactory-muted select-none flex-shrink-0">
      {/* FICSIT branding */}
      <Tooltip text="FICSIT Inc. — Pioneering resource acquisition on behalf of valued shareholders." side="top">
        <span className="text-satisfactory-orange/50 tracking-[0.3em] uppercase font-industrial">FICSIT</span>
      </Tooltip>

      <div className="w-px h-3 bg-satisfactory-border/30" />

      {/* Status */}
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${solving ? 'bg-indicator-amber animate-pulse' : solveResult ? 'bg-indicator-green' : 'bg-satisfactory-muted/50'}`} />
        <span>{solving ? 'SOLVING' : solveResult ? 'SOLVED' : 'STANDBY'}</span>
      </div>

      <div className="w-px h-3 bg-satisfactory-border/30" />

      {/* Stats */}
      <span>NODES: <span className="text-satisfactory-text">{nodeCount}</span></span>
      <span>EDGES: <span className="text-satisfactory-text">{edgeCount}</span></span>

      {totalPower > 0 && (
        <span>PWR: <span className="text-satisfactory-orange">{formatPower(totalPower)}</span></span>
      )}

      <span>TARGETS: <span className="text-satisfactory-text">{targets.length}</span></span>

      <div className="flex-1" />

      {/* Keyboard hint */}
      <span className="text-satisfactory-muted/40">
        <kbd className="border border-satisfactory-border/30 px-1 py-0.5 text-[9px]">Ctrl+Enter</kbd> solve
        <span className="mx-1.5">·</span>
        <kbd className="border border-satisfactory-border/30 px-1 py-0.5 text-[9px]">?</kbd> help
      </span>

      <div className="w-px h-3 bg-satisfactory-border/30" />

      {/* Uptime */}
      <Tooltip text="Session uptime. ADA is always watching. Your productivity metrics have been forwarded to management." side="top">
        <span className="tabular-nums text-satisfactory-text/60">{hours}:{mins}:{secs}</span>
      </Tooltip>
    </div>
  );
}
