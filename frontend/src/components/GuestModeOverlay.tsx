import { useFactoryStore } from '../stores/useFactoryStore';

// Inline banner rendered at the top of the sidebar scroll area in guest mode.
// Not a blocker — interaction is disabled per-element in each panel.
export function GuestModeOverlay() {
  const isGuestMode = useFactoryStore((s) => s.isGuestMode);
  if (!isGuestMode) return null;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 border border-satisfactory-border/40 bg-satisfactory-darker/60 -mx-0 mb-1">
      <div className="w-1.5 h-1.5 rounded-full bg-satisfactory-muted/40" />
      <span className="text-[8px] font-industrial uppercase tracking-[0.28em] text-satisfactory-muted/55">
        Read Only
      </span>
      <div className="flex-1 h-px bg-satisfactory-border/25" />
      <div className="flex gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="w-px h-2 bg-satisfactory-border/35" />
        ))}
      </div>
    </div>
  );
}
