// 保存：進み（ステージの始めごと）・やり直し用の写し・設定。壊れたデータは読まない（旧 v1 も読まない・消さない）
import { JOBS } from './jobs';
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

const num = (n: unknown) => typeof n === 'number' && Number.isFinite(n);

export function validProgress(v: unknown): v is Progress {
  const p = v as Progress;
  if (!p || (p.v !== PROGRESS_VERSION && p.v !== 2)) return false;
  if (p.mode !== 'normal' && p.mode !== 'pro') return false;
  if (![p.exp, p.coins, p.villagers, p.maxVillagers, p.unlocked, p.bosses, p.score].every(num)) return false;
  if (p.exp < 0 || p.coins < 0 || p.unlocked < 1 || p.unlocked > STAGE_COUNT) return false;
  if (!Array.isArray(p.wardens) || p.wardens.length !== 8) return false;
  const peds = new Set<number>();
  for (const w of p.wardens) {
    if (!JOBS[w.job] || !num(w.lv) || w.lv < 0 || !num(w.pedestal) || w.pedestal < 0 || w.pedestal >= PEDESTALS.length) return false;
    peds.add(w.pedestal);
  }
  if (peds.size !== 8) return false;
  if (p.v === PROGRESS_VERSION) {
    if (!Array.isArray(p.items) || p.items.length > MAX_ITEMS || !Array.isArray(p.shop) || !p.village || !p.tower || !p.daily || !Array.isArray(p.tips)) return false;
    if (!num(p.nextItemId)) return false;
    for (const w of p.wardens) if (!w.equip || !num(w.sp)) return false;
  }
  return !!p.stars && !!p.stats;
}

export function parseProgress(text: string | null): Progress | null {
  if (!text) return null;
  try {
    const p = JSON.parse(text) as Progress;
    return validProgress(p) ? migrate(p) : null;
  } catch {
    return null;
  }
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
