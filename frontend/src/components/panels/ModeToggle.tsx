import { useFactoryStore } from '../../stores/useFactoryStore';
import { Tooltip } from '../Tooltip';

export function ModeToggle() {
  const mode = useFactoryStore((s) => s.mode);
  const setMode = useFactoryStore((s) => s.setMode);
  const isGuestMode = useFactoryStore((s) => s.isGuestMode);

  return (
    <div className="flex gap-0">
      <Tooltip text="Standard item production planning. The reason you were hired." side="right" className="flex-1">
        <button
          onClick={() => setMode('production')}
          disabled={isGuestMode}
          className={`w-full text-[10px] font-industrial uppercase tracking-wider py-1.5 transition-all border disabled:cursor-not-allowed ${
            mode === 'production'
              ? 'bg-satisfactory-orange/20 border-satisfactory-orange text-satisfactory-orange'
              : 'bg-satisfactory-darker/50 border-satisfactory-border text-satisfactory-muted hover:text-satisfactory-text disabled:hover:text-satisfactory-muted'
          }`}
        >
          Production
        </button>
      </Tooltip>
      <Tooltip text="Dedicated power generation planning. FICSIT Tip No. 18: Keep an eye on that power capacity." side="right" className="flex-1">
        <button
          onClick={() => setMode('power')}
          disabled={isGuestMode}
          className={`w-full text-[10px] font-industrial uppercase tracking-wider py-1.5 transition-all border border-l-0 disabled:cursor-not-allowed ${
            mode === 'power'
              ? 'bg-amber-500/20 border-amber-500 text-amber-400'
              : 'bg-satisfactory-darker/50 border-satisfactory-border text-satisfactory-muted hover:text-satisfactory-text disabled:hover:text-satisfactory-muted'
          }`}
        >
          Power Plant
        </button>
      </Tooltip>
    </div>
  );
}
