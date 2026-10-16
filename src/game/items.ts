// 装備と宝箱：武器（系統ごと）とお守り。品質は並・良・極。店・持ち物・装備
import { chance, hashSeed, int, next, pick, type Rng } from './rng';
import { job } from './jobs';
import type { CharmStat, Item, Line, Progress, Warden } from './types';

export const MAX_ITEMS = 30;
export const Q_NAME = ['', '並', '良', '極'] as const;
const Q_MUL = [0, 1, 1.7, 2.7];

const WEAPON_NAMES: Record<Line, string[]> = {
  sword: ['銅の剣', '鋼の剣', '騎士の剣', '名工の刀', '聖銀の剣'],
  hunt: ['短弓', '長弓', '鋼の弩', '名工の弓', '聖銀の弓'],
  thief: ['小刀', '鋼の短剣', '忍び刀', '名工の短剣', '聖銀の短剣'],
};
const CHARM_NAMES: Record<CharmStat, string> = {
  rest: '安らぎのお守り', crit: '鷹の目のお守り', fly: '風切りのお守り', metal: '鉄砕きのお守り', speed: '疾風のお守り', sp: '闘志のお守り',
};
const PREFIX = ['', '', '上質な', '伝説の'];

function blank(id: number, kind: Item['kind'], q: Item['q'], name: string): Item {
  return { id, kind, q, name, atk: 0, crit: 0, speed: 0, range: 0, rest: 0, fly: 0, metal: 0, sp: 0, price: 0 };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** 品を作る。tier はステージ相当（1〜35+） */
export function makeItem(r: Rng, id: number, tier: number, minQ: 1 | 2 | 3 = 1): Item {
  const roll = next(r);
  let q: Item['q'] = roll < 0.06 ? 3 : roll < 0.32 ? 2 : 1;
  if (q < minQ) q = minQ;
  const m = Q_MUL[q];
  const t = Math.max(1, tier);
  let it: Item;
  if (chance(r, 0.55)) {
    const line = pick(r, ['sword', 'hunt', 'thief'] as const);
    const base = WEAPON_NAMES[line][Math.min(4, Math.floor((t - 1) / 7))];
    it = blank(id, 'weapon', q, `${PREFIX[q]}${base}`);
    it.line = line;
    it.atk = round2((0.08 + t * 0.006) * m);
    if (q >= 2) {
      const sub = int(r, 3);
      if (sub === 0) it.crit = round2(0.03 * (q - 1));
      else if (sub === 1) it.speed = round2(0.05 * (q - 1));
      else it.range = round2(0.06 * (q - 1));
    }
  } else {
    const stat = pick(r, ['rest', 'crit', 'fly', 'metal', 'speed', 'sp'] as const);
    it = blank(id, 'charm', q, `${PREFIX[q]}${CHARM_NAMES[stat]}`);
    switch (stat) {
      case 'rest': it.rest = round2(0.15 * m); break;
      case 'crit': it.crit = round2(0.04 * m); break;
      case 'fly': it.fly = round2(0.3 * m); break;
      case 'metal': it.metal = round2(0.08 * m); break;
      case 'speed': it.speed = round2(0.05 * m); break;
      case 'sp': it.sp = round2(0.15 * m); break;
    }
    if (q === 3) it.atk = round2(0.05 + t * 0.002);
  }
  it.price = Math.round(((60 + t * 40) * q * q) / 10) * 10;
  return it;
}

export function sellPrice(it: Item): number {
  return Math.max(10, Math.round((it.price * 0.3) / 10) * 10);
}

/** 品の説明（短く） */
export function itemText(it: Item): string {
  const t: string[] = [];
  if (it.atk) t.push(`攻撃+${Math.round(it.atk * 100)}%`);
  if (it.crit) t.push(`会心+${Math.round(it.crit * 100)}%`);
  if (it.speed) t.push(`速さ+${Math.round(it.speed * 100)}%`);
  if (it.range) t.push(`射程+${Math.round(it.range * 100)}%`);
  if (it.rest) t.push(`休憩EXP+${Math.round(it.rest * 100)}%`);
  if (it.fly) t.push(`飛行に+${it.fly}倍`);
  if (it.metal) t.push(`メタルに+${Math.round(it.metal * 100)}%`);
  if (it.sp) t.push(`技ゲージ+${Math.round(it.sp * 100)}%`);
  return t.join('・');
}

/** 品の強さの目安（比べる用） */
export function itemScore(it: Item): number {
  return it.atk * 3 + it.crit * 4 + it.speed * 3 + it.range * 1.5 + it.rest * 0.8 + it.fly * 0.3 + it.metal * 2 + it.sp * 1.2;
}

export function canEquip(w: Warden, it: Item): boolean {
  return it.kind === 'charm' || it.line === job(w.job).line;
}

/** 持っている人 */
export function holderOf(p: Progress, itemId: number): Warden | null {
  return p.wardens.find((w) => w.equip.weapon === itemId || w.equip.charm === itemId) ?? null;
}

export function equip(p: Progress, w: Warden, itemId: number): boolean {
  const it = p.items.find((x) => x.id === itemId);
  if (!it || !canEquip(w, it)) return false;
  const other = holderOf(p, itemId);
  if (other) other.equip[it.kind] = null;
  w.equip[it.kind] = itemId;
  return true;
}

export function unequip(w: Warden, kind: Item['kind']) {
  w.equip[kind] = null;
}

/** 装備している品 */
export function equipped(p: Progress, w: Warden): Item[] {
  const out: Item[] = [];
  for (const k of ['weapon', 'charm'] as const) {
    const id = w.equip[k];
    if (id === null) continue;
    const it = p.items.find((x) => x.id === id);
    // 系統の違う武器（転職などで）は効かない
    if (it && canEquip(w, it)) out.push(it);
  }
  return out;
}

/** 持ち物に入れる（いっぱいなら売って金貨にする）。入れたら true */
export function addItem(p: Progress, it: Item): boolean {
  if (p.items.length >= MAX_ITEMS) { p.coins += sellPrice(it); return false; }
  p.items.push(it);
  return true;
}

export function sell(p: Progress, itemId: number): boolean {
  const i = p.items.findIndex((x) => x.id === itemId);
  if (i < 0) return false;
  const it = p.items[i];
  const h = holderOf(p, itemId);
  if (h) h.equip[it.kind] = null;
  p.items.splice(i, 1);
  p.coins += sellPrice(it);
  return true;
}

/** 品の強さの段（解放したステージ相当） */
export function tierOf(p: Progress): number {
  return Math.max(1, p.unlocked);
}

/** 店を入れ替える（3品） */
export function refreshShop(p: Progress) {
  const r: Rng = { s: hashSeed(p.seed, 'shop', p.stats.battles, p.unlocked) };
  p.shop = [0, 1, 2].map(() => makeItem(r, p.nextItemId++, tierOf(p) + 1, 1));
}

export function buyError(p: Progress, itemId: number): string | null {
  const it = p.shop.find((x) => x.id === itemId);
  if (!it) return '売り切れ';
  if (p.items.length >= MAX_ITEMS) return '持ち物がいっぱい';
  if (p.coins < it.price) return '金貨が足りない';
  return null;
}

export function buy(p: Progress, itemId: number): boolean {
  if (buyError(p, itemId)) return false;
  const i = p.shop.findIndex((x) => x.id === itemId);
  const it = p.shop[i];
  p.coins -= it.price;
  p.shop.splice(i, 1);
  p.items.push(it);
  return true;
}

/** 宝箱を開ける */
export function openChests(p: Progress, n: number, tier: number, seed: number, minQ: 1 | 2 | 3 = 1): { item: Item; kept: boolean }[] {
  const r: Rng = { s: hashSeed(seed, 'chest', p.nextItemId) };
  const out: { item: Item; kept: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    const it = makeItem(r, p.nextItemId++, tier, minQ);
    out.push({ item: it, kept: addItem(p, it) });
  }
  return out;
}

/** いちばん良い品を全員に付ける（ボットと「おまかせ」用） */
export function autoEquip(p: Progress) {
  for (const w of p.wardens) { w.equip.weapon = null; w.equip.charm = null; }
  const used = new Set<number>();
  // 強い職から順に良い品を渡す
  const order = [...p.wardens].sort((a, b) => job(b.job).tier - job(a.job).tier || b.lv - a.lv);
  for (const kind of ['weapon', 'charm'] as const) {
    for (const w of order) {
      const best = p.items
        .filter((it) => it.kind === kind && !used.has(it.id) && canEquip(w, it))
        .sort((a, b) => itemScore(b) - itemScore(a))[0];
      if (best) { w.equip[kind] = best.id; used.add(best.id); }
    }
  }
}
