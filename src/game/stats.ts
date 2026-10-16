// 守り手の能力の集計：職 → 装備 → 村の施設 → 連携 → 塔の恩恵・毎日の挑戦の条件
import { attackOf, interval, job } from './jobs';
import { equipped } from './items';
import { synergyOf } from './synergy';
import { villageAtk, villageCrit, villageRest } from './village';
import type { BattleMods, Progress, Warden } from './types';

/** 基本の会心率と会心の倍率 */
export const BASE_CRIT = 0.05;
export const CRIT_MUL = 2;

export interface WStats {
  atk: number;
  interval: number;
  range: number;
  rangeAll: boolean;
  crit: number;
  fly: number;
  metal: number;
  restMul: number;
  spMul: number;
}

export function wardenStats(p: Progress, w: Warden, mods: BattleMods = {}): WStats {
  const j = job(w.job);
  const syn = synergyOf(p, w);
  let atkAdd = 0, crit = 0, speed = 0, range = 0, rest = 0, fly = 0, metal = 0, sp = 0;
  for (const it of equipped(p, w)) {
    atkAdd += it.atk; crit += it.crit; speed += it.speed; range += it.range; rest += it.rest; fly += it.fly; metal += it.metal; sp += it.sp;
  }
  const base = attackOf(j, w.lv, w.limit, w.kills);
  const atk = base <= 0 ? 0 : Math.round(base * (1 + atkAdd) * villageAtk(p) * (1 + syn.atk) * (mods.atkMul ?? 1));
  const spd = Math.min(0.5, speed + syn.speed);
  return {
    atk,
    interval: interval(j) * (1 - spd),
    range: j.range * (1 + range + syn.range + (mods.rangeAdd ?? 0)),
    rangeAll: !!j.rangeAll,
    crit: Math.min(0.8, BASE_CRIT + crit + villageCrit(p) + syn.crit + (mods.critAdd ?? 0)),
    fly: j.fly > 0 ? j.fly + fly : 0,
    metal: Math.min(1, j.metal + metal),
    restMul: (1 + rest) * villageRest(p),
    spMul: 1 + sp + (mods.spAdd ?? 0),
  };
}
