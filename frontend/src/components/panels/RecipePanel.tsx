import { useState } from 'react';
import { useFactoryStore } from '../../stores/useFactoryStore';
import { Tooltip } from '../Tooltip';

export function RecipePanel() {
  const recipes = useFactoryStore((s) => s.recipes);
  const allowedRecipes = useFactoryStore((s) => s.allowedRecipes);
  const toggleRecipe = useFactoryStore((s) => s.toggleRecipe);
  const setAllowedRecipes = useFactoryStore((s) => s.setAllowedRecipes);
  const disabledRecipes = useFactoryStore((s) => s.disabledRecipes);
  const toggleDisabledRecipe = useFactoryStore((s) => s.toggleDisabledRecipe);
  const setDisabledRecipes = useFactoryStore((s) => s.setDisabledRecipes);
  const items = useFactoryStore((s) => s.items);
  const isGuestMode = useFactoryStore((s) => s.isGuestMode);

  return (
    <div className="space-y-3">
      <AlternateRecipeDropdown
        recipes={recipes}
        items={items}
        allowedRecipes={allowedRecipes}
        toggleRecipe={toggleRecipe}
        setAllowedRecipes={setAllowedRecipes}
        isGuestMode={isGuestMode}
      />
      <DefaultRecipeDropdown
        recipes={recipes}
        items={items}
        disabledRecipes={disabledRecipes}
        toggleDisabledRecipe={toggleDisabledRecipe}
        setDisabledRecipes={setDisabledRecipes}
        isGuestMode={isGuestMode}
      />
    </div>
  );
}

function AlternateRecipeDropdown({
  recipes,
  items,
  allowedRecipes,
  toggleRecipe,
  setAllowedRecipes,
  isGuestMode,
}: {
  recipes: { id: string; name: string; is_alternate: boolean; products: { item_id: string }[] }[];
  items: { id: string; name: string }[];
  allowedRecipes: string[];
  toggleRecipe: (id: string) => void;
  setAllowedRecipes: (ids: string[]) => void;
  isGuestMode: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const alternateRecipes = recipes.filter((r) => r.is_alternate);
  const enabledCount = alternateRecipes.filter((r) => allowedRecipes.includes(r.id)).length;
  const isActive = enabledCount > 0;
  const allSelected = alternateRecipes.length > 0 && enabledCount === alternateRecipes.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setAllowedRecipes(allowedRecipes.filter((id) => !alternateRecipes.some((r) => r.id === id)));
    } else {
      const alternateIds = alternateRecipes.map((r) => r.id);
      setAllowedRecipes([...new Set([...allowedRecipes, ...alternateIds])]);
    }
  };

  const filtered = alternateRecipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = new Map<string, typeof filtered>();
  for (const recipe of filtered) {
    const productId = recipe.products[0]?.item_id ?? 'other';
    const item = items.find((i) => i.id === productId);
    const key = item?.name ?? productId;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(recipe);
  }

  return (
    <div>
      <Tooltip text="Recipes recovered from crashed hard drives. Quality varies. FICSIT assumes no liability for production inefficiencies." side="right">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between group"
        >
          <h3 className={`font-industrial font-bold text-xs uppercase tracking-[0.2em] flex items-center gap-2 transition-colors ${
            isActive ? 'text-satisfactory-orange' : 'text-satisfactory-muted'
          }`}>
            <span className={isActive ? 'text-satisfactory-orange' : 'text-satisfactory-border'}>{'>'}</span>
            Alternate Recipes
            {isActive && (
              <span className="text-[9px] bg-satisfactory-orange/20 text-satisfactory-orange border border-satisfactory-orange/30 px-1.5 py-0.5 rounded-sm font-bold">
                {enabledCount}
              </span>
            )}
          </h3>
          <span className={`text-[10px] ml-2 transition-transform ${open ? 'rotate-180' : ''} ${
            isActive ? 'text-satisfactory-orange' : 'text-satisfactory-muted'
          }`}>
            &#x25BC;
          </span>
        </button>
      </Tooltip>
      {!open && (
        <div className="text-[9px] text-satisfactory-muted/40 mt-0.5 italic">Unlock via hard drives</div>
      )}

      {open && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <input
              type="text"
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 industrial-inset rounded-none px-2 py-1.5 text-xs text-white placeholder-satisfactory-muted/50 focus:border-satisfactory-orange outline-none"
            />
            {!isGuestMode && (
              <button
                onClick={handleSelectAll}
                className="text-[9px] uppercase tracking-[0.1em] font-industrial text-satisfactory-muted hover:text-satisfactory-orange transition-colors ml-2 whitespace-nowrap"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {[...grouped.entries()].map(([group, groupRecipes]) => (
              <div key={group}>
                <div className="text-[9px] text-satisfactory-muted uppercase tracking-[0.15em] font-industrial mb-1 border-l-2 border-satisfactory-border pl-1.5">
                  {group}
                </div>
                {groupRecipes.map((recipe) => (
                  <label
                    key={recipe.id}
                    className={`flex items-center gap-2 text-xs text-satisfactory-text py-0.5 transition-colors ${isGuestMode ? 'cursor-default' : 'cursor-pointer hover:text-satisfactory-orange'}`}
                  >
                    <input
                      type="checkbox"
                      checked={allowedRecipes.includes(recipe.id)}
                      onChange={() => toggleRecipe(recipe.id)}
                      disabled={isGuestMode}
                      className="accent-satisfactory-orange disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {recipe.name}
                  </label>
                ))}
              </div>
            ))}
            {alternateRecipes.length === 0 && (
              <div className="text-xs text-satisfactory-muted">No alternate recipes available</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DefaultRecipeDropdown({
  recipes,
  items,
  disabledRecipes,
  toggleDisabledRecipe,
  setDisabledRecipes,
  isGuestMode,
}: {
  recipes: { id: string; name: string; is_alternate: boolean; products: { item_id: string }[] }[];
  items: { id: string; name: string }[];
  disabledRecipes: string[];
  toggleDisabledRecipe: (id: string) => void;
  setDisabledRecipes: (ids: string[]) => void;
  isGuestMode: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const defaultRecipes = recipes.filter((r) => !r.is_alternate);
  const disabledCount = defaultRecipes.filter((r) => disabledRecipes.includes(r.id)).length;
  const isActive = disabledCount > 0;
  const allEnabled = disabledCount === 0;

  const handleSelectAll = () => {
    if (allEnabled) {
      // Disable all defaults
      setDisabledRecipes(defaultRecipes.map((r) => r.id));
    } else {
      // Enable all defaults
      setDisabledRecipes([]);
    }
  };

  const filtered = defaultRecipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = new Map<string, typeof filtered>();
  for (const recipe of filtered) {
    const productId = recipe.products[0]?.item_id ?? 'other';
    const item = items.find((i) => i.id === productId);
    const key = item?.name ?? productId;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(recipe);
  }

  return (
    <div>
      <Tooltip text="Standard FICSIT-approved production methods. Disabling recipes may cause solver failures. You have been warned." side="right">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between group"
        >
          <h3 className={`font-industrial font-bold text-xs uppercase tracking-[0.2em] flex items-center gap-2 transition-colors ${
            isActive ? 'text-satisfactory-orange' : 'text-satisfactory-muted'
          }`}>
            <span className={isActive ? 'text-satisfactory-orange' : 'text-satisfactory-border'}>{'>'}</span>
            Default Recipes
            {isActive && (
              <span className="text-[9px] bg-satisfactory-orange/20 text-satisfactory-orange border border-satisfactory-orange/30 px-1.5 py-0.5 rounded-sm font-bold">
                {disabledCount} off
              </span>
            )}
          </h3>
          <span className={`text-[10px] ml-2 transition-transform ${open ? 'rotate-180' : ''} ${
            isActive ? 'text-satisfactory-orange' : 'text-satisfactory-muted'
          }`}>
            &#x25BC;
          </span>
        </button>
      </Tooltip>
      {!open && (
        <div className="text-[9px] text-satisfactory-muted/40 mt-0.5 italic">All enabled by default</div>
      )}

      {open && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <input
              type="text"
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 industrial-inset rounded-none px-2 py-1.5 text-xs text-white placeholder-satisfactory-muted/50 focus:border-satisfactory-orange outline-none"
            />
            {!isGuestMode && (
              <button
                onClick={handleSelectAll}
                className="text-[9px] uppercase tracking-[0.1em] font-industrial text-satisfactory-muted hover:text-satisfactory-orange transition-colors ml-2 whitespace-nowrap"
              >
                {allEnabled ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {[...grouped.entries()].map(([group, groupRecipes]) => (
              <div key={group}>
                <div className="text-[9px] text-satisfactory-muted uppercase tracking-[0.15em] font-industrial mb-1 border-l-2 border-satisfactory-border pl-1.5">
                  {group}
                </div>
                {groupRecipes.map((recipe) => (
                  <label
                    key={recipe.id}
                    className={`flex items-center gap-2 text-xs text-satisfactory-text py-0.5 transition-colors ${isGuestMode ? 'cursor-default' : 'cursor-pointer hover:text-satisfactory-orange'}`}
                  >
                    <input
                      type="checkbox"
                      checked={!disabledRecipes.includes(recipe.id)}
                      onChange={() => toggleDisabledRecipe(recipe.id)}
                      disabled={isGuestMode}
                      className="accent-satisfactory-orange disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {recipe.name}
                  </label>
                ))}
              </div>
            ))}
            {defaultRecipes.length === 0 && (
              <div className="text-xs text-satisfactory-muted">No default recipes available</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
