import { useFactoryStore } from '../stores/useFactoryStore';

export function Toolbar() {
  const factoryName = useFactoryStore((s) => s.factoryName);
  const setFactoryName = useFactoryStore((s) => s.setFactoryName);
  const solve = useFactoryStore((s) => s.solve);
  const solving = useFactoryStore((s) => s.solving);
  const targets = useFactoryStore((s) => s.targets);

  return (
    <div className="relative bg-satisfactory-panel border-b-2 border-satisfactory-border px-4 py-2 flex items-center gap-4 metal-texture">
      {/* Caution stripe accent along top */}
      <div className="absolute top-0 left-0 right-0 h-[3px] caution-stripe animate-caution" />

      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="text-satisfactory-orange font-industrial font-bold text-base tracking-[0.25em] uppercase">
          SATISFACTORY
        </div>
        <div className="text-satisfactory-muted text-[10px] font-industrial tracking-wider border border-satisfactory-border px-1.5 py-0.5 bg-satisfactory-darker/50">
          CALC
        </div>
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-satisfactory-border" />

      {/* Factory name input */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-satisfactory-muted uppercase tracking-wider">ID:</span>
        <input
          type="text"
          value={factoryName}
          onChange={(e) => setFactoryName(e.target.value)}
          className="bg-satisfactory-darker/50 border border-satisfactory-border text-white text-xs px-2 py-1 focus:border-satisfactory-orange outline-none shadow-industrial-inset"
        />
      </div>

      <div className="flex-1" />

      {/* Status indicator */}
      <div className="flex items-center gap-2 mr-2">
        <div className={`w-2 h-2 rounded-full ${solving ? 'bg-indicator-amber animate-pulse' : targets.length > 0 ? 'bg-indicator-green animate-pulse-glow' : 'bg-satisfactory-muted'}`} />
        <span className="text-[10px] text-satisfactory-muted uppercase tracking-wider">
          {solving ? 'Processing' : targets.length > 0 ? 'Ready' : 'Idle'}
        </span>
      </div>

      {/* Solve button */}
      <button
        onClick={solve}
        disabled={solving || targets.length === 0}
        className="relative bg-satisfactory-orange text-satisfactory-darker font-industrial font-bold text-xs px-5 py-1.5 uppercase tracking-wider disabled:opacity-40 transition-all hover:shadow-glow-orange active:translate-y-px"
        style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
      >
        {solving ? 'Solving...' : 'Solve'}
      </button>
    </div>
  );
}
