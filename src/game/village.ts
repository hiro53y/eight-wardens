// 村の施設：金貨で建てて育てる（それぞれ Lv0〜5）
import type { FacilityId, Progress } from './types';

export const MAX_FACILITY = 5;

export interface FacilityDef { id: FacilityId; name: string; base: number; desc: (lv: number) => string }

export const FACILITIES: FacilityDef[] = [
  { id: 'fence', name: '柵', base: 600, desc: (lv) => `村人 +${lv}` },
  { id: 'training', name: '訓練所', base: 500, desc: (lv) => `休憩の EXP +${lv * 10}%` },
  { id: 'smith', name: '鍛冶屋', base: 900, desc: (lv) => `全員の攻撃 +${lv * 5}%` },
  { id: 'market', name: '市場', base: 700, desc: (lv) => `金貨 +${lv * 8}%` },
  { id: 'watch', name: '見張り台', base: 800, desc: (lv) => `会心 +${lv * 2}%` },
];

export function emptyVillage(): Record<FacilityId, number> {
  return { fence: 0, training: 0, smith: 0, market: 0, watch: 0 };
}

export function facilityCost(id: FacilityId, lv: number): number {
  const d = FACILITIES.find((f) => f.id === id)!;
  return Math.round((d.base * Math.pow(2.7, lv)) / 10) * 10;
}

export function buildError(p: Progress, id: FacilityId): string | null {
  const lv = p.village[id] ?? 0;
  if (lv >= MAX_FACILITY) return '最大レベル';
  if (p.coins < facilityCost(id, lv)) return '金貨が足りない';
  return null;
}

export function build(p: Progress, id: FacilityId): boolean {
  if (buildError(p, id)) return false;
  p.coins -= facilityCost(id, p.village[id] ?? 0);
  p.village[id] = (p.village[id] ?? 0) + 1;
  return true;
}

/** 合戦の村人（柵の分を足す） */
export function villagersOf(p: Progress): number {
  return p.maxVillagers + (p.village.fence ?? 0);
}

export const villageAtk = (p: Progress) => 1 + (p.village.smith ?? 0) * 0.05;
export const villageCrit = (p: Progress) => (p.village.watch ?? 0) * 0.02;
export const villageRest = (p: Progress) => 1 + (p.village.training ?? 0) * 0.1;
export const villageCoin = (p: Progress) => 1 + (p.village.market ?? 0) * 0.08;
