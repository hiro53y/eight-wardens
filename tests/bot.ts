// 自動で遊ぶボット（難しさの集計・調整と総当たりに使う）
import { job, levelCost, maxLv, limitCost, MAX_LIMIT } from '../src/game/jobs';
import { applyResult, clone, levelUp, limitBreak, newProgress, promote, setRest, type StageResult } from '../src/game/progress';
import { advance, canTarget, createBattle, startFight, type Battle } from '../src/game/sim';
import { autoEquip, openChests } from '../src/game/items';
import { FACILITIES, build, facilityCost } from '../src/game/village';
import { STAGE_COUNT } from '../src/game/stages';
import type { Mode, Progress, Warden } from '../src/game/types';

/** 見た目ごとの転職の道（剣：0→侍、4→暗黒騎士、7→魔剣士／狩：1→遊撃士、3→投擲士、5→狙撃士／盗：2→暗殺者、6→捕縛士） */
const PLAN: Record<number, string[]> = {
  0: ['warrior', 'samurai'], 4: ['knight', 'darkKnight'], 7: ['warrior', 'magicSword'],
  1: ['bowman', 'ranger'], 3: ['bowman', 'thrower'], 5: ['gunner', 'sniper'],
  2: ['ninja', 'assassin'], 6: ['engineer', 'trapper'],
};

/** 育成：転職できれば転職、だめなら安い順にレベル上げ、最後に上限突破 */
export function botTrain(p: Progress) {
  for (let loop = 0; loop < 200; loop++) {
    let did = false;
    for (const w of p.wardens) {
      const j = job(w.job);
      if (w.lv >= 3 && j.next.length) {
        const plan = PLAN[w.sprite] ?? [];
        const to = j.next.find((n) => plan.includes(n)) ?? j.next[0];
        if (promote(p, w, to)) did = true;
      }
    }
    const cand = p.wardens
      .filter((w) => w.lv < maxLv(job(w.job), p.mode))
      .map((w) => ({ w, c: levelCost(job(w.job), w.lv) }))
      .sort((a, b) => a.c.exp + a.c.coins - (b.c.exp + b.c.coins));
    for (const { w } of cand) if (levelUp(p, w)) { did = true; break; }
    if (!did) {
      // 上限突破と村の施設の安い方
      const lb = p.wardens.filter((w) => w.limit < MAX_LIMIT && w.lv >= maxLv(job(w.job), p.mode) && job(w.job).tier === 3).sort((a, b) => limitCost(a.limit) - limitCost(b.limit))[0];
      const fac = FACILITIES.filter((f) => (p.village[f.id] ?? 0) < 5).sort((a, b) => facilityCost(a.id, p.village[a.id]) - facilityCost(b.id, p.village[b.id]))[0];
      const lbCost = lb ? limitCost(lb.limit) : Infinity;
      const facCost = fac ? facilityCost(fac.id, p.village[fac.id]) : Infinity;
      if (facCost <= lbCost && fac && build(p, fac.id)) did = true;
      else if (lb && limitBreak(p, lb)) did = true;
    }
    if (!did) break;
  }
}

/** 戦闘中の判断：狙える敵がいない部隊は休ませ、来たら起こす（ボスでは全員出る） */
export function botTactics(b: Battle, p: Progress) {
  for (const w of p.wardens) {
    if (b.boss) { if (w.resting) setRest(w, false); continue; }
    const any = b.enemies.some((e) => canTarget({ ...w, resting: false } as Warden, e));
    if (any && w.resting) setRest(w, false);
    else if (!any && !w.resting) setRest(w, true);
  }
}

export interface PlayOpts { tactics?: boolean; train?: boolean; skills?: boolean }

export function playStage(p: Progress, id: number, seed: number, o: PlayOpts = {}): StageResult {
  const b = createBattle(p, id, seed);
  b.autoSkill = o.skills !== false;
  for (const w of p.wardens) w.sp = 0;
  startFight(b);
  let guard = 0;
  while (b.phase === 'fight' && guard++ < 20000) {
    if (o.tactics !== false && guard % 6 === 0) botTactics(b, p);
    // 戦闘中も育てる（元のゲームと同じく、得た EXP ですぐ上げる）
    if (o.train !== false && guard % 30 === 0) botTrain(p);
    advance(b, p, 0.1);
  }
  for (const w of p.wardens) { setRest(w, false); w.rest = 0; }
  if (b.chests > 0 && o.train !== false) { openChests(p, b.chests, id, seed); autoEquip(p); }
  return applyResult(p, { win: b.phase === 'won', stage: id, kills: b.kills, lost: b.lost, exp: b.exp, coins: b.coins, restExp: b.restExp, time: b.t });
}

export interface RunResult { p: Progress; cleared: boolean; retries: number; grinds: number; firstTry: number; perStage: string[] }

/** 最初から最後まで。負けたら写しからやり直し、3回負けたら1つ前のステージで稼ぐ */
export function playRun(mode: Mode, seed: number, maxBattles = 400, o: PlayOpts = {}): RunResult {
  const p = newProgress(mode, seed);
  let retries = 0, grinds = 0, fails = 0, battles = 0, firstTry = 0;
  const perStage: string[] = [];
  while (!p.cleared && battles < maxBattles) {
    const id = Math.min(STAGE_COUNT, p.unlocked);
    if (o.train !== false) botTrain(p);
    const snap = clone(p);
    const r = playStage(p, id, seed * 1000 + battles++, o);
    if (r.win) {
      if (fails === 0) firstTry++;
      perStage.push(`${id}:${fails}${r.lost ? `-${r.lost}` : ''}`);
      fails = 0;
      continue;
    }
    // 負けても得た EXP・金貨は残る
    retries++;
    fails++;
    void snap;
    if (fails >= 3 && id > 1) {
      grinds++;
      playStage(p, id - 1, seed * 1000 + battles++, o);
    }
  }
  return { p, cleared: !!p.cleared, retries, grinds, firstTry, perStage };
}
