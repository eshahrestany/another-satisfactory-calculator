import { useState } from 'react';
import { useFactoryStore } from '../../stores/useFactoryStore';
import { Tooltip } from '../Tooltip';

export function TargetPanel() {
  const items = useFactoryStore((s) => s.items);
  const targets = useFactoryStore((s) => s.targets);
  const addTarget = useFactoryStore((s) => s.addTarget);
  const removeTarget = useFactoryStore((s) => s.removeTarget);
  const updateTarget = useFactoryStore((s) => s.updateTarget);
  const isGuestMode = useFactoryStore((s) => s.isGuestMode);

  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const nonResourceItems = items
    .filter((i) => !i.is_resource)
    .sort((a, b) => a.name.localeCompare(b.name));
  const filteredItems = nonResourceItems.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (itemId: string) => {
    addTarget(itemId, 10);
    setSearch('');
    setShowDropdown(false);
  };

  return (
    <div>
      <Tooltip text="Desired output items and rates. FICSIT does not accept 'zero' as a production target." side="right">
        <h3 className="text-satisfactory-orange font-industrial font-bold text-xs mb-2 uppercase tracking-[0.2em] flex items-center gap-2">
          <span className="text-satisfactory-muted">{'>'}</span> Production Targets
        </h3>
      </Tooltip>

      {targets.map((target, i) => {
        const item = items.find((it) => it.id === target.item_id);
        return (
          <Tooltip key={i} text="Items per minute to produce. Adjust to scale the factory up or down." side="right" className="block">
            <div className="flex items-center gap-2 mb-2 group">
              <span className="text-xs text-satisfactory-text flex-1 truncate">
                {item?.name ?? target.item_id}
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={target.rate_per_minute}
                onChange={(e) =>
                  updateTarget(i, {
                    ...target,
                    rate_per_minute: parseFloat(e.target.value) || 0,
                  })
                }
                disabled={isGuestMode}
                className="w-20 industrial-inset rounded-none px-2 py-1 text-xs text-white focus:border-satisfactory-orange outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-[10px] text-satisfactory-muted">/min</span>
              {!isGuestMode && (
                <button
                  onClick={() => removeTarget(i)}
                  className="text-red-500/60 hover:text-red-400 text-xs px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  [x]
                </button>
              )}
            </div>
          </Tooltip>
        );
      })}

      {!isGuestMode && (
        <div className="relative mt-2">
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            className="w-full industrial-inset rounded-none px-2 py-1.5 text-xs text-white placeholder-satisfactory-muted/50 focus:border-satisfactory-orange outline-none"
          />
          {showDropdown && search && (
            <div className="absolute z-20 w-full mt-1 industrial-panel max-h-48 overflow-y-auto">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className="w-full text-left px-2 py-1.5 text-xs text-satisfactory-text hover:bg-satisfactory-orange/10 hover:text-satisfactory-orange transition-colors border-b border-satisfactory-border/20 last:border-0"
                >
                  {item.name}
                </button>
              ))}
              {filteredItems.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-satisfactory-muted">No items found</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
