// 塔の深さの集計（TOWER=1 の時だけ）：本編をある所まで進めたボットが、塔の何階まで登れるか
import { it } from 'vitest';
import { clone } from '../src/game/progress';
import { advance, createBattle, startFight } from '../src/game/sim';
import { chooseBuff, startTower, towerFloor, towerMods, towerResult } from '../src/game/tower';
import type { Progress } from '../src/game/types';
import { botTrain, playRun } from './bot';

function climb(src: Progress, seed: number): number {
  const p = clone(src);
  startTower(p);
  for (let guard = 0; guard < 200 && p.tower.run; guard++) {
    const run = p.tower.run;
    botTrain(p);
    const def = towerFloor(run.floor, p.mode, p.unlocked);
    const b = createBattle(p, def.id, seed + run.floor, { def, kind: 'tower', mods: towerMods(run.buffs), villagers: run.villagers, maxVillagers: run.maxVillagers });
    b.autoSkill = true;
    for (const w of p.wardens) w.sp = 0;
    startFight(b);
    advance(b, p, 900);
    const r = towerResult(p, b.phase === 'won', b.villagers, b.lost);
    if (r.ended) break;
    const ch = p.tower.run!.choosing!;
    chooseBuff(p, ch.includes('heal') && p.tower.run!.villagers < 5 ? 'heal' : ch.includes('atk') ? 'atk' : ch[0]);
  }
  return p.tower.best;
}

it.runIf(Number(process.env.TOWER ?? 0) > 0)('塔の深さ', () => {
  for (const until of [10, 20, 35]) {
    const r = playRun('normal', 100, until);
    console.log(JSON.stringify({ stagesPlayed: until, unlocked: r.p.unlocked, best: [1, 2, 3].map((s) => climb(r.p, s * 1000)) }));
  }
}, 900000);
