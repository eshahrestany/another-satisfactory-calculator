import { useState } from 'react';
import { useFactoryStore } from '../../stores/useFactoryStore';

export function RecipePanel() {
  const recipes = useFactoryStore((s) => s.recipes);
  const allowedRecipes = useFactoryStore((s) => s.allowedRecipes);
  const toggleRecipe = useFactoryStore((s) => s.toggleRecipe);
  const items = useFactoryStore((s) => s.items);

  const [search, setSearch] = useState('');

  const alternateRecipes = recipes.filter((r) => r.is_alternate);
  const filtered = alternateRecipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  // Group by primary product
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
      <h3 className="text-satisfactory-orange font-industrial font-bold text-xs mb-2 uppercase tracking-[0.2em] flex items-center gap-2">
        <span className="text-satisfactory-muted">{'>'}</span> Alternate Recipes
      </h3>

      <input
        type="text"
        placeholder="Search recipes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full industrial-inset rounded-none px-2 py-1.5 text-xs text-white placeholder-satisfactory-muted/50 focus:border-satisfactory-orange outline-none mb-2"
      />

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {[...grouped.entries()].map(([group, groupRecipes]) => (
          <div key={group}>
            <div className="text-[9px] text-satisfactory-muted uppercase tracking-[0.15em] font-industrial mb-1 border-l-2 border-satisfactory-border pl-1.5">
              {group}
            </div>
            {groupRecipes.map((recipe) => (
              <label
                key={recipe.id}
                className="flex items-center gap-2 text-xs text-satisfactory-text cursor-pointer hover:text-satisfactory-orange py-0.5 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={allowedRecipes.includes(recipe.id)}
                  onChange={() => toggleRecipe(recipe.id)}
                  className="accent-satisfactory-orange"
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
  );
}
