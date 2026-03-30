import { useFactoryStore } from '../../stores/useFactoryStore';
import { formatRate, formatPower } from '../../utils/formatting';

export function SummaryPanel() {
  const solveResult = useFactoryStore((s) => s.solveResult);
  const nodeOverrides = useFactoryStore((s) => s.nodeOverrides);
  const globalClockSpeed = useFactoryStore((s) => s.settings.clock_speed);

  if (!solveResult) return null;

  const { summary } = solveResult;

  // Derive power and building totals from individual nodes so that per-node
  // clock speed overrides and somersloop re-solves both show up here.
  let totalPower = 0;
  let totalBuildings = 0;
  let totalBuildingsPhysical = 0;
  let totalSomersloops = 0;
  const buildingsByType = new Map<string, { building_id: string; building_name: string; count: number; physicalCount: number; power_mw: number }>();

  for (const node of solveResult.nodes) {
    if (node.node_type !== 'recipe') continue;

    const override = nodeOverrides[node.id];
    const nodeClockSpeed = override?.clockSpeed ?? globalClockSpeed;
    const clockRatio = nodeClockSpeed / globalClockSpeed;

    const buildingCount = clockRatio === 1 ? node.building_count : node.building_count / clockRatio;
    const power = clockRatio === 1 ? node.power_mw : node.power_mw * Math.pow(clockRatio, 0.321928);

    if (override?.somersloop) {
      totalSomersloops += Math.ceil(buildingCount);
    }

    totalPower += power;
    totalBuildings += buildingCount;
    totalBuildingsPhysical += Math.ceil(buildingCount);

    if (node.building_id && node.building_name) {
      const existing = buildingsByType.get(node.building_id);
      if (existing) {
        existing.count += buildingCount;
        existing.physicalCount += Math.ceil(buildingCount);
        existing.power_mw += power;
      } else {
        buildingsByType.set(node.building_id, {
          building_id: node.building_id,
          building_name: node.building_name,
          count: buildingCount,
          physicalCount: Math.ceil(buildingCount),
          power_mw: power,
        });
      }
    }
  }

  return (
    <div className="bg-satisfactory-panel border-t-2 border-satisfactory-border p-3 metal-texture animate-stamp">
      <div className="flex gap-6 text-xs">
        {/* Power readout */}
        <div className="flex-shrink-0">
          <div className="text-[9px] text-satisfactory-muted font-industrial uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5">
            <span className="text-indicator-amber">&#x26A1;</span> Power Draw
          </div>
          <div className="industrial-inset px-3 py-1.5 mb-1.5">
            <span className="text-satisfactory-orange text-sm font-industrial font-bold animate-flicker">
              {formatPower(totalPower)}
            </span>
          </div>
          {[...buildingsByType.values()].map((b) => (
            <div key={b.building_id} className="text-satisfactory-muted text-[10px] flex justify-between gap-3">
              <span>
                {b.building_name}{' '}
                {b.physicalCount === Math.round(b.count)
                  ? `x${b.physicalCount}`
                  : `x${b.count.toFixed(2)} (${b.physicalCount})`}
              </span>
              <span className="text-satisfactory-text">{formatPower(b.power_mw)}</span>
            </div>
          ))}
        </div>

        {/* Vertical separator */}
        <div className="w-px bg-satisfactory-border/50 self-stretch" />

        {/* Raw resources */}
        <div className="flex-shrink-0">
          <div className="text-[9px] text-satisfactory-muted font-industrial uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5">
            <span className="text-green-400">&#x25C6;</span> Raw Resources
          </div>
          {summary.raw_resources.map((r) => (
            <div key={r.item_id} className="text-satisfactory-text text-[10px] flex justify-between gap-3 py-px">
              <span>{r.item_name}</span>
              <span className="text-green-300">{formatRate(r.rate_per_minute)}/min</span>
            </div>
          ))}
        </div>

        {/* Vertical separator */}
        <div className="w-px bg-satisfactory-border/50 self-stretch" />

        {/* Building count */}
        <div className="flex-shrink-0">
          <div className="text-[9px] text-satisfactory-muted font-industrial uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5">
            <span className="text-satisfactory-orange">&#x2630;</span> Buildings
          </div>
          <div className="industrial-inset px-3 py-1.5">
            {totalBuildingsPhysical === Math.round(totalBuildings) ? (
              <span className="text-white text-sm font-industrial font-bold">{totalBuildingsPhysical}</span>
            ) : (
              <>
                <span className="text-white/60 text-xs font-industrial">{totalBuildings.toFixed(2)}</span>
                <span className="text-satisfactory-muted text-[10px] mx-1">(</span>
                <span className="text-white text-sm font-industrial font-bold">{totalBuildingsPhysical}</span>
                <span className="text-satisfactory-muted text-[10px]">)</span>
              </>
            )}
            <span className="text-satisfactory-muted text-[10px] ml-1">total</span>
          </div>
        </div>

        {/* Somersloops — only shown when any are in use */}
        {totalSomersloops > 0 && (
          <>
            <div className="w-px bg-satisfactory-border/50 self-stretch" />
            <div className="flex-shrink-0">
              <div className="text-[9px] text-purple-400/80 font-industrial uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5">
                <span className="animate-pulse-glow">&#x25C9;</span> Somersloops
              </div>
              <div className="industrial-inset px-3 py-1.5 border-purple-500/30">
                <span className="text-purple-300 text-sm font-industrial font-bold">
                  {totalSomersloops}
                </span>
                <span className="text-purple-400/50 text-[10px] ml-1">required</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
