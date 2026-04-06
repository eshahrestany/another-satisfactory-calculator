import { useState } from 'react';
import { useFactoryStore } from '../../stores/useFactoryStore';
import { Tooltip } from '../Tooltip';

export function ResourceConstraintPanel() {
  const items = useFactoryStore((s) => s.items);
  const resourceConstraints = useFactoryStore((s) => s.resourceConstraints);
  const addResourceConstraint = useFactoryStore((s) => s.addResourceConstraint);
  const removeResourceConstraint = useFactoryStore((s) => s.removeResourceConstraint);
  const updateResourceConstraint = useFactoryStore((s) => s.updateResourceConstraint);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const isActive = resourceConstraints.length > 0;

  const resourceItems = items
    .filter((i) => i.is_resource)
    .sort((a, b) => a.name.localeCompare(b.name));

  const alreadyConstrained = new Set(resourceConstraints.map((c) => c.item_id));
  const availableItems = resourceItems.filter(
    (i) => !alreadyConstrained.has(i.id) && i.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (itemId: string) => {
    addResourceConstraint(itemId, 120);
    setSearch('');
    setShowDropdown(false);
  };

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between group"
      >
        <h3 className={`font-industrial font-bold text-xs uppercase tracking-[0.2em] flex items-center gap-2 transition-colors ${
          isActive ? 'text-red-400' : 'text-satisfactory-muted'
        }`}>
          <span className={isActive ? 'text-red-500' : 'text-satisfactory-border'}>&#x25B2;</span>
          Resource Limits
          {isActive && (
            <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-sm font-bold">
              {resourceConstraints.length}
            </span>
          )}
        </h3>
        <span className={`text-[10px] transition-transform ${open ? 'rotate-180' : ''} ${
          isActive ? 'text-red-400' : 'text-satisfactory-muted'
        }`}>
          &#x25BC;
        </span>
      </button>

      {open && (
        <div className="mt-2">
          {resourceConstraints.map((constraint, i) => {
            const item = items.find((it) => it.id === constraint.item_id);
            return (
              <div key={constraint.item_id} className="flex items-center gap-2 mb-2 group">
                <span className="text-xs text-satisfactory-text flex-1 truncate">
                  {item?.name ?? constraint.item_id}
                </span>
                <span className="text-[9px] text-satisfactory-muted">&le;</span>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={constraint.max_rate_per_minute}
                  onChange={(e) =>
                    updateResourceConstraint(i, {
                      ...constraint,
                      max_rate_per_minute: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-20 industrial-inset rounded-none px-2 py-1 text-xs text-white focus:border-red-400 outline-none"
                />
                <span className="text-[10px] text-satisfactory-muted">/min</span>
                <button
                  onClick={() => removeResourceConstraint(i)}
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
              placeholder="Add resource limit..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              className="w-full industrial-inset rounded-none px-2 py-1.5 text-xs text-white placeholder-satisfactory-muted/50 focus:border-red-400 outline-none"
            />
            {showDropdown && search && (
              <div className="absolute z-20 w-full mt-1 industrial-panel max-h-48 overflow-y-auto">
                {availableItems.map((item) => (
                  <button
                    key={item.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(item.id)}
                    className="w-full text-left px-2 py-1.5 text-xs text-satisfactory-text hover:bg-red-500/10 hover:text-red-400 transition-colors border-b border-satisfactory-border/20 last:border-0"
                  >
                    {item.name}
                  </button>
                ))}
                {availableItems.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-satisfactory-muted">No resources found</div>
                )}
              </div>
            )}
          </div>

          {resourceConstraints.length === 0 && (
            <Tooltip text="Cap extraction rates per resource. Useful for planning around finite node availability." side="right">
              <div className="text-[10px] text-satisfactory-muted/60 mt-2 italic">
                No limits set — solver uses resources freely
              </div>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
}
