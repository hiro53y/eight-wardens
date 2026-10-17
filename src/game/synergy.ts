// 隣り合わせの連携：12の防衛地点の近隣が隣。並べ方で能力が上がる
import { job } from './jobs';
import type { Line, Progress, Warden } from './types';

import {NEIGHBORS} from './field';
export {NEIGHBORS} from './field';

export interface Synergy {
  /** 同じ系統の隣の数（最大3） */
  same: number;
  /** 攻撃の上乗せ */
  atk: number;
  /** 射程の上乗せ（狩の隣に剣） */
  range: number;
  /** 速さの上乗せ（剣の隣に盗） */
  speed: number;
  /** 会心の上乗せ（狩と盗が隣） */
  crit: number;
  /** 結ばれている相手 */
  links: { id: string; kind: 'same' | 'range' | 'speed' | 'crit' }[];
}

export const SYNERGY_TEXT = {
  same: '同じ系統が隣：攻撃+8%（3人まで）',
  range: '剣が隣の狩：射程+15%',
  speed: '盗が隣の剣：速さ+10%',
  crit: '狩と盗が隣：会心+5%',
} as const;

function lineOf(w: Warden): Line {
  return job(w.job).line;
}

export function synergyOf(p: Progress, w: Warden): Synergy {
  const s: Synergy = { same: 0, atk: 0, range: 0, speed: 0, crit: 0, links: [] };
  const me = lineOf(w);
  const near = NEIGHBORS[w.pedestal] ?? [];
  for (const o of p.wardens) {
    if (o === w || !near.includes(o.pedestal)) continue;
    const l = lineOf(o);
    if (l === me) { s.same += 1; s.links.push({ id: o.id, kind: 'same' }); continue; }
    if (me === 'hunt' && l === 'sword' && !s.range) { s.range = 0.15; s.links.push({ id: o.id, kind: 'range' }); }
    else if (me === 'sword' && l === 'thief' && !s.speed) { s.speed = 0.1; s.links.push({ id: o.id, kind: 'speed' }); }
    else if (((me === 'hunt' && l === 'thief') || (me === 'thief' && l === 'hunt')) && !s.crit) { s.crit = 0.05; s.links.push({ id: o.id, kind: 'crit' }); }
  }
  s.same = Math.min(3, s.same);
  s.atk = s.same * 0.08;
  return s;
}

/** 戦場に描く線（重複なし） */
export function synergyLinks(p: Progress): { a: Warden; b: Warden; kind: Synergy['links'][number]['kind'] }[] {
  const out: { a: Warden; b: Warden; kind: Synergy['links'][number]['kind'] }[] = [];
  const seen = new Set<string>();
  for (const w of p.wardens) {
    for (const l of synergyOf(p, w).links) {
      const key = [w.id, l.id].sort().join(':');
      if (seen.has(key)) continue;
      seen.add(key);
      const o = p.wardens.find((x) => x.id === l.id);
      if (o) out.push({ a: w, b: o, kind: l.kind });
    }
  }
  return out;
}
