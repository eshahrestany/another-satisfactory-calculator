import type { MinerLevel, ResourcePurity } from '../stores/useFactoryStore';

export const MINER_BASE_RATES: Record<MinerLevel, number> = { 1: 60, 2: 120, 3: 240 };
export const MINER_POWER_MW: Record<MinerLevel, number> = { 1: 5, 2: 12, 3: 30 };
export const PURITY_MULTIPLIERS: Record<ResourcePurity, number> = { impure: 0.5, normal: 1, pure: 2 };

export const WATER_EXTRACTOR_RATE = 120;
export const WATER_EXTRACTOR_POWER_MW = 20;

export const OIL_EXTRACTOR_RATES: Record<ResourcePurity, number> = { impure: 60, normal: 120, pure: 240 };
export const OIL_EXTRACTOR_POWER_MW = 40;

export const WATER_ITEM_ID = 'Desc_Water_C';
export const OIL_ITEM_ID = 'Desc_LiquidOil_C';

export function getMinerCount(rate: number, minerLevel: MinerLevel, purity: ResourcePurity): number {
  return Math.ceil(rate / (MINER_BASE_RATES[minerLevel] * PURITY_MULTIPLIERS[purity]));
}

export function getMinerPower(count: number, minerLevel: MinerLevel): number {
  return count * MINER_POWER_MW[minerLevel];
}

export function getExtractorCount(rate: number): number {
  return Math.ceil(rate / WATER_EXTRACTOR_RATE);
}

export function getExtractorPower(count: number): number {
  return count * WATER_EXTRACTOR_POWER_MW;
}

export function getOilExtractorCount(rate: number, purity: ResourcePurity): number {
  return Math.ceil(rate / OIL_EXTRACTOR_RATES[purity]);
}

export function getOilExtractorPower(count: number): number {
  return count * OIL_EXTRACTOR_POWER_MW;
}
