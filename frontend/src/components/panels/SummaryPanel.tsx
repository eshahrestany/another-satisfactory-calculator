import { useFactoryStore } from '../../stores/useFactoryStore';
import { formatRate, formatPower } from '../../utils/formatting';
import { Tooltip } from '../Tooltip';
import {
  WATER_ITEM_ID,
  OIL_ITEM_ID,
  getMinerCount,
  getMinerPower,
  getExtractorCount,
  getExtractorPower,
  getOilExtractorCount,
  getOilExtractorPower,
} from '../../utils/mining';

const SOMERSLOOP_SLOTS: Record<string, number> = {
  Desc_SmelterMk1_C: 1,
  Desc_ConstructorMk1_C: 1,
  Desc_AssemblerMk1_C: 2,
  Desc_FoundryMk1_C: 2,
  Desc_OilRefinery_C: 2,
  Desc_ManufacturerMk1_C: 4,
  Desc_Blender_C: 4,
  Desc_HadronCollider_C: 4,
  Desc_QuantumEncoder_C: 4,
};

function getSomersloopSlots(buildingId: string | undefined | null): number {
  if (!buildingId) return 1;
  return SOMERSLOOP_SLOTS[buildingId] ?? 1;
}

export function SummaryPanel() {
  const solveResult = useFactoryStore((s) => s.solveResult);
  const nodeOverrides = useFactoryStore((s) => s.nodeOverrides);
  const globalClockSpeed = useFactoryStore((s) => s.settings.clock_speed);
  const defaultMinerLevel = useFactoryStore((s) => s.defaultMinerLevel);
  const inputNodePurities = useFactoryStore((s) => s.inputNodePurities);

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
      const slotsPerBuilding = getSomersloopSlots(node.building_id);
      totalSomersloops += Math.ceil(buildingCount) * slotsPerBuilding;
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

  // Add miners and extractors from resource/input nodes
  let totalWaterExtractors = 0;
  let waterExtractorPower = 0;
  let totalOilExtractors = 0;
  let oilExtractorPower = 0;
  let totalMiners = 0;
  let minerPower = 0;

  for (const node of solveResult.nodes) {
    if (node.node_type !== 'resource' && node.node_type !== 'input') continue;

    const rate = node.outputs[0]?.rate_per_minute ?? 0;
    if (rate <= 0) continue;

    if (node.item_id === WATER_ITEM_ID) {
      const count = getExtractorCount(rate);
      totalWaterExtractors += count;
      waterExtractorPower += getExtractorPower(count);
    } else if (node.item_id === OIL_ITEM_ID) {
      const purity = inputNodePurities[node.id] ?? 'normal';
      const count = getOilExtractorCount(rate, purity);
      totalOilExtractors += count;
      oilExtractorPower += getOilExtractorPower(count);
    } else {
      const purity = inputNodePurities[node.id] ?? 'normal';
      const count = getMinerCount(rate, defaultMinerLevel, purity);
      totalMiners += count;
      minerPower += getMinerPower(count, defaultMinerLevel);
    }
  }

  if (totalWaterExtractors > 0) {
    buildingsByType.set('__water_extractor', {
      building_id: '__water_extractor',
      building_name: 'Water Extractor',
      count: totalWaterExtractors,
      physicalCount: totalWaterExtractors,
      power_mw: waterExtractorPower,
    });
    totalPower += waterExtractorPower;
    totalBuildings += totalWaterExtractors;
    totalBuildingsPhysical += totalWaterExtractors;
  }

  if (totalOilExtractors > 0) {
    buildingsByType.set('__oil_extractor', {
      building_id: '__oil_extractor',
      building_name: 'Oil Extractor',
      count: totalOilExtractors,
      physicalCount: totalOilExtractors,
      power_mw: oilExtractorPower,
    });
    totalPower += oilExtractorPower;
    totalBuildings += totalOilExtractors;
    totalBuildingsPhysical += totalOilExtractors;
  }

  if (totalMiners > 0) {
    buildingsByType.set('__miner', {
      building_id: '__miner',
      building_name: `Miner Mk.${defaultMinerLevel}`,
      count: totalMiners,
      physicalCount: totalMiners,
      power_mw: minerPower,
    });
    totalPower += minerPower;
    totalBuildings += totalMiners;
    totalBuildingsPhysical += totalMiners;
  }

  return (
    <div className="bg-satisfactory-panel border-t-2 border-satisfactory-border p-3 metal-texture animate-stamp">
      <div className="flex gap-6 text-xs">
        {/* Power readout */}
        <div className="flex-shrink-0">
          <Tooltip text="Total power consumption including miners, extractors, and production buildings. Plan your grid accordingly.">
            <div className="text-[9px] text-satisfactory-muted font-industrial uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5">
              <span className="text-indicator-amber">&#x26A1;</span> Power Draw
            </div>
          </Tooltip>
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
          <Tooltip text="Raw materials required from extraction sites. FICSIT classifies this as 'resource liberation,' not 'environmental damage.'">
            <div className="text-[9px] text-satisfactory-muted font-industrial uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5">
              <span className="text-green-400">&#x25C6;</span> Raw Resources
            </div>
          </Tooltip>
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
          <Tooltip text="Total structure count. Fractional values indicate partial machine utilization. Parenthetical is the physical placement count.">
            <div className="text-[9px] text-satisfactory-muted font-industrial uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5">
              <span className="text-satisfactory-orange">&#x2630;</span> Buildings
            </div>
          </Tooltip>
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

        {/* Net Power — shown in power mode */}
        {summary.net_power_mw != null && (
          <>
            <div className="w-px bg-satisfactory-border/50 self-stretch" />
            <div className="flex-shrink-0">
              <div className="text-[9px] text-amber-400/80 font-industrial uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5">
                <span className="text-amber-400">&#x26A1;</span> Net Power
              </div>
              <div className="industrial-inset px-3 py-1.5 mb-1.5">
                <span className="text-amber-300 text-sm font-industrial font-bold animate-flicker">
                  {formatPower(summary.net_power_mw)}
                </span>
              </div>
              <div className="text-satisfactory-muted text-[10px] flex justify-between gap-3">
                <span>Generated</span>
                <span className="text-amber-300">{formatPower(summary.net_power_mw + totalPower)}</span>
              </div>
              <div className="text-satisfactory-muted text-[10px] flex justify-between gap-3">
                <span>Consumed</span>
                <span className="text-red-300">-{formatPower(totalPower)}</span>
              </div>
            </div>
          </>
        )}

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
