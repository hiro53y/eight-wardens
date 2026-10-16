// 難しさの集計（BALANCE=回数 の時だけ動く）
import { describe, it } from 'vitest';
import { playRun } from './bot';
import { job } from '../src/game/jobs';

const N = Number(process.env.BALANCE ?? 0);

describe.runIf(N > 0)('難しさの集計', () => {
  for (const mode of ['normal', 'pro'] as const) {
    for (let i = 0; i < N; i++) {
      it(`${mode} ${i + 1}`, () => {
        const r = playRun(mode, 100 + i * 17, Number(process.env.MAX_BATTLES ?? 300));
        const p = r.p;
        console.log(JSON.stringify({
          mode, seed: 100 + i * 17, cleared: r.cleared, reached: p.unlocked, battles: p.stats.battles, retries: r.retries, grinds: r.grinds, firstTry: r.firstTry, village: p.village, items: p.items.length,
          villagers: p.villagers, exp: p.exp, coins: p.coins, restExp: p.stats.restExp, kills: p.stats.kills,
          party: p.wardens.map((w) => `${job(w.job).name}${w.lv}${w.limit ? `+${w.limit}` : ''}`).join(','),
        }));
      }, 120000);
    }
  }
});
