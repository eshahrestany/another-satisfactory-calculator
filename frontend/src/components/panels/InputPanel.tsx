import { useState } from 'react';
import { useFactoryStore } from '../../stores/useFactoryStore';
import { Tooltip } from '../Tooltip';

export function InputPanel() {
  const items = useFactoryStore((s) => s.items);
  const providedInputs = useFactoryStore((s) => s.providedInputs);
  const addProvidedInput = useFactoryStore((s) => s.addProvidedInput);
  const removeProvidedInput = useFactoryStore((s) => s.removeProvidedInput);
  const updateProvidedInput = useFactoryStore((s) => s.updateProvidedInput);

  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name));
  const filteredItems = sortedItems.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (itemId: string) => {
    addProvidedInput(itemId, 60);
    setSearch('');
    setShowDropdown(false);
  };

  return (
    <div>
      <Tooltip text="Pre-existing item supply. The solver will consume these before extracting additional resources." side="right">
        <h3 className="text-cyan-400 font-industrial font-bold text-xs mb-2 uppercase tracking-[0.2em] flex items-center gap-2">
          <span className="text-satisfactory-muted">{'>'}</span> Provided Inputs
        </h3>
      </Tooltip>

      {providedInputs.map((input, i) => {
        const item = items.find((it) => it.id === input.item_id);
        return (
          <div key={i} className="flex items-center gap-2 mb-2 group">
            <span className="text-xs text-satisfactory-text flex-1 truncate">
              {item?.name ?? input.item_id}
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={input.rate_per_minute}
              onChange={(e) =>
                updateProvidedInput(i, {
                  ...input,
                  rate_per_minute: parseFloat(e.target.value) || 0,
                })
              }
              className="w-20 industrial-inset rounded-none px-2 py-1 text-xs text-white focus:border-satisfactory-orange outline-none"
            />
            <span className="text-[10px] text-satisfactory-muted">/min</span>
            <button
              onClick={() => removeProvidedInput(i)}
              className="text-red-500/60 hover:text-red-400 text-xs px-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              [x]
            </button>
          </div>
        );
      })}

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
    </div>
  );
}
