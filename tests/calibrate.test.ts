// 硬さの調整（CALIBRATE=1 の時だけ）：上手なボットが初回に村人を目標の数だけ失う硬さを、ステージごとに二分探索で探す
import { it } from 'vitest';
import { clone, newProgress } from '../src/game/progress';
import { HP_CALIB, STAGE_COUNT, stage } from '../src/game/stages';
import { botTrain, playStage } from './bot';

it.runIf(Number(process.env.CALIBRATE ?? 0) > 0)('硬さの調整', () => {
  const seeds = [11, 23, 37];
  const out: number[] = [];
  let p = newProgress('normal', 7);
  for (let id = 1; id <= STAGE_COUNT; id++) {
    const target = stage(id).boss ? 3 : 2;
    botTrain(p);
    const start = clone(p);
    let lo = 0.15, hi = 40;
    for (let k = 0; k < 16; k++) {
      const m = Math.sqrt(lo * hi);
      HP_CALIB[id - 1] = m;
      // 3つの seed のうち2つ以上で目標以内なら合格
      const ok = seeds.filter((s) => { const q = clone(start); const r = playStage(q, id, s * 100 + id); return r.win && r.lost <= target; }).length >= 2;
      if (ok) lo = m; else hi = m;
    }
    HP_CALIB[id - 1] = Math.floor(lo * 100) / 100;
    out.push(HP_CALIB[id - 1]);
    const q = clone(start);
    const r = playStage(q, id, seeds[0] * 100 + id);
    p = q;
    console.log(`stage ${id} calib ${HP_CALIB[id - 1]} win ${r.win} lost ${r.lost} exp ${p.exp} coins ${p.coins} party ${p.wardens.map((w) => `${w.job}${w.lv}${w.limit ? '+' + w.limit : ''}`).join(',')}`);
  }
  console.log(`HP_CALIB = [${out.join(', ')}]`);
}, 3_600_000);
