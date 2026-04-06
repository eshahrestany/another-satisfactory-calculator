import { useFactoryStore } from '../../stores/useFactoryStore';
import { Tooltip } from '../Tooltip';

export function ModeToggle() {
  const mode = useFactoryStore((s) => s.mode);
  const setMode = useFactoryStore((s) => s.setMode);

  return (
    <div className="flex gap-0">
      <Tooltip text="Standard item production planning. The reason you were hired." side="right" className="flex-1">
        <button
          onClick={() => setMode('production')}
          className={`w-full text-[10px] font-industrial uppercase tracking-wider py-1.5 transition-all border ${
            mode === 'production'
              ? 'bg-satisfactory-orange/20 border-satisfactory-orange text-satisfactory-orange'
              : 'bg-satisfactory-darker/50 border-satisfactory-border text-satisfactory-muted hover:text-satisfactory-text'
          }`}
        >
          Production
        </button>
      </Tooltip>
      <Tooltip text="Dedicated power generation planning. FICSIT Tip No. 18: Keep an eye on that power capacity." side="right" className="flex-1">
        <button
          onClick={() => setMode('power')}
          className={`w-full text-[10px] font-industrial uppercase tracking-wider py-1.5 transition-all border border-l-0 ${
            mode === 'power'
              ? 'bg-amber-500/20 border-amber-500 text-amber-400'
              : 'bg-satisfactory-darker/50 border-satisfactory-border text-satisfactory-muted hover:text-satisfactory-text'
          }`}
        >
          Power Plant
        </button>
      </Tooltip>
    </div>
  );
}
