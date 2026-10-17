// 保存：進み（ステージの始めごと）・やり直し用の写し・設定。壊れたデータは読まない（旧 v1 も読まない・消さない）
import { MAX_FACILITY, emptyVillage } from './village';
import { maxLv, MAX_LIMIT, JOBS } from './jobs';
import { PEDESTALS } from './field';
import { MAX_ITEMS } from './items';
import { PROGRESS_VERSION, migrate } from './progress';
import { STAGE_COUNT } from './stages';
import { DEFAULT_SETTINGS, type Progress, type Settings } from './types';

export const KEY_PROGRESS = 'eight-wardens-v2:progress';
export const KEY_SNAPSHOT = 'eight-wardens-v2:snapshot';
export const KEY_SETTINGS = 'eight-wardens-v2:settings';

export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function store(): KV | null {
  try {
    return (globalThis as { localStorage?: KV }).localStorage ?? null;
  } catch {
    return null;
  }
}

const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const nonneg = (v: unknown): v is number => num(v) && v >= 0;
const integer = (v: unknown, lo = 0, hi = Number.MAX_SAFE_INTEGER): v is number => num(v) && Number.isSafeInteger(v) && v >= lo && v <= hi;
const buffIds = new Set(['atk','crit','lives','sp','coin','range','heal']);
function validItem(v: unknown): boolean {
  if (!obj(v) || !integer(v.id,1) || !['weapon','charm'].includes(String(v.kind)) || ![1,2,3].includes(Number(v.q)) || typeof v.q !== 'number' || typeof v.name !== 'string') return false;
  if (v.kind === 'weapon' && !['sword','hunt','thief'].includes(String(v.line))) return false;
  return ['atk','crit','speed','range','rest','fly','metal','sp','price'].every(k => nonneg(v[k]));
}
export function validProgress(v: unknown): v is Progress {
  if (!obj(v)) return false;
  const p = v as unknown as Progress;
  if (![2,PROGRESS_VERSION].includes(p.v) || !['normal','pro'].includes(p.mode)) return false;
  if (!integer(p.seed,-2147483648,2147483647) || !integer(p.unlocked,1,STAGE_COUNT) || !integer(p.bosses,0,STAGE_COUNT)) return false;
  if (![p.exp,p.coins,p.score].every(nonneg) || !integer(p.maxVillagers,1) || !integer(p.villagers,0,p.maxVillagers)) return false;
  if (!obj(p.stars) || !Object.entries(p.stars).every(([k,n])=>integer(Number(k),1,STAGE_COUNT)&&integer(n,1,3))) return false;
  if (!obj(p.stats) || !['kills','lost','battles','restExp'].every(k=>integer(p.stats[k as keyof Progress['stats']]))) return false;
  if (p.cleared !== undefined && typeof p.cleared !== 'boolean') return false;
  if (!Array.isArray(p.wardens) || p.wardens.length !== 8) return false;
  const peds = new Set<number>(), ids = new Set<string>(), sprites = new Set<number>();
  for (const w of p.wardens) {
    if (!obj(w) || typeof w.id !== 'string' || !w.id || typeof w.name !== 'string' || !Object.prototype.hasOwnProperty.call(JOBS,w.job)) return false;
    if (!integer(w.sprite,0,7) || !integer(w.pedestal,0,PEDESTALS.length-1) || !integer(w.lv,0,maxLv(JOBS[w.job],p.mode)) || !integer(w.limit,0,MAX_LIMIT) || !integer(w.kills)) return false;
    if (typeof w.resting !== 'boolean' || !num(w.rest) || w.rest < 0 || w.rest > 1) return false;
    peds.add(w.pedestal);ids.add(w.id);sprites.add(w.sprite);
  }
  if (peds.size !== 8 || ids.size !== 8 || sprites.size !== 8) return false;
  if (p.v === 2) return true;
  if (!Array.isArray(p.items) || p.items.length > MAX_ITEMS || !p.items.every(validItem) || !Array.isArray(p.shop) || p.shop.length > 3 || !p.shop.every(validItem)) return false;
  const allItems = [...p.items,...p.shop], itemIds = new Set(allItems.map(it=>it.id));
  if (itemIds.size !== allItems.length || !integer(p.nextItemId,1) || allItems.some(it=>it.id >= p.nextItemId)) return false;
  const equipped = new Set<number>();
  for (const w of p.wardens) {
    if (!num(w.sp) || w.sp < 0 || w.sp > 1 || !obj(w.equip)) return false;
    for (const kind of ['weapon','charm'] as const) {
      const id = w.equip[kind];if (id === null) continue;
      if (!integer(id,1) || equipped.has(id) || !p.items.some(it=>it.id===id&&it.kind===kind)) return false;
      equipped.add(id);
    }
  }
  if (!obj(p.village) || !Object.keys(emptyVillage()).every(k=>integer(p.village[k as keyof Progress['village']],0,MAX_FACILITY))) return false;
  if (!obj(p.tower) || ![p.tower.best,p.tower.score,p.tower.runs].every(n=>integer(n))) return false;
  const run = p.tower.run;
  if (run !== null) {
    if (!obj(run) || !integer(run.floor,1) || !integer(run.seed,-2147483648,2147483647) || !integer(run.maxVillagers,1) || !integer(run.villagers,0,run.maxVillagers)) return false;
    if (!Array.isArray(run.buffs) || !run.buffs.every(id=>buffIds.has(id))) return false;
    if (run.choosing !== null && (!Array.isArray(run.choosing) || run.choosing.length !== 3 || new Set(run.choosing).size !== 3 || !run.choosing.every(id=>buffIds.has(id)))) return false;
  }
  if (!obj(p.daily) || typeof p.daily.date !== 'string' || (p.daily.date !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(p.daily.date)) || typeof p.daily.cleared !== 'boolean' || !integer(p.daily.best)) return false;
  return Array.isArray(p.tips) && p.tips.every(k=>typeof k==='string');
}
/** 省略可能な表示/一時状態だけを補完。進行・持ち物は推測で再作成しない。 */
function defaults(v: unknown): unknown {
  if (!obj(v) || ![2,3].includes(Number(v.v)) || !Array.isArray(v.wardens)) return v;
  for (const w of v.wardens) if (obj(w)) {
    for (const [k,x] of Object.entries({limit:0,kills:0,rest:0,resting:false,sp:0,equip:{weapon:null,charm:null}})) if (w[k] === undefined) w[k]=x;
  }
  if (v.v===3 && v.tips===undefined) v.tips=[];
  return v;
}
export function parseProgress(text: string | null): Progress | null {
  if (!text) return null;
  try { const p=defaults(JSON.parse(text));if(!validProgress(p))return null;const migrated=migrate(p);return validProgress(migrated)?migrated:null; } catch { return null; }
}

function put(kv: KV | null, key: string, value: string | null) {
  if (!kv) return;
  try {
    if (value === null) kv.removeItem(key); else kv.setItem(key, value);
  } catch {
    // 容量不足などでも遊びは続ける
  }
}

function get(kv: KV | null, key: string): string | null {
  if (!kv) return null;
  try { return kv.getItem(key); } catch { return null; }
}

export function saveProgress(p: Progress | null, kv: KV | null = store()) { put(kv, KEY_PROGRESS, p ? JSON.stringify(p) : null); }
export function hasStoredProgress(kv: KV | null = store()): boolean { if(!kv)return false;try{return kv.getItem(KEY_PROGRESS)!==null;}catch{return true;} }
export function loadProgress(kv: KV | null = store()): Progress | null { return parseProgress(get(kv, KEY_PROGRESS)); }
export function saveSnapshot(p: Progress | null, kv: KV | null = store()) { put(kv, KEY_SNAPSHOT, p ? JSON.stringify(p) : null); }
export function loadSnapshot(kv: KV | null = store()): Progress | null { return parseProgress(get(kv, KEY_SNAPSHOT)); }

export function saveSettings(s: Settings, kv: KV | null = store()) { put(kv, KEY_SETTINGS, JSON.stringify(s)); }
export function loadSettings(kv: KV | null = store()): Settings {
  try {
    const raw = get(kv, KEY_SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const s = { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
    if (![1, 2, 3].includes(s.speed)) s.speed = 1;
    for (const k of ['bgm','se'] as const) s[k]=num(s[k])?Math.max(0,Math.min(1,s[k])):DEFAULT_SETTINGS[k];
    for (const k of ['numbers','autoSkill'] as const) if(typeof s[k]!=='boolean')s[k]=DEFAULT_SETTINGS[k];
    return s;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** すべて消す（設定は残す） */
export function wipe(kv: KV | null = store()) {
  put(kv, KEY_PROGRESS, null);
  put(kv, KEY_SNAPSHOT, null);
}
