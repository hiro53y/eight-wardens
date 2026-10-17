import artV31 from './artV31.json';
// 絵の読み込みと、1枚絵からの切り出し位置（WebP の軽量版 /assets/v2/ を使う）
import type { EnemyDef } from '../game/types';

export const V2 = '/assets/v2/';

export type NewArt = 'iris'|'sena'|'shield_goblin'|'shaman'|'orc_lord'|'worm_king'|'battle_forest'|'battle_canyon'|'battle_desert'|'battle_abyss'|'portraits';
export type ImgKey = `v31_${NewArt}`
  | 'battle' | 'map' | 'title' | 'result' | 'wardens' | 'enemies' | 'portraits'
  | 'enemy_goblin' | 'enemy_orc' | 'enemy_wolf_elite' | 'enemy_wingbat'
  | 'banner_wave' | 'banner_boss' | 'banner_elite' | 'banner_clear' | 'deco_stars'
  | 'fx_slash' | 'fx_hit' | 'fx_magic' | 'fx_buff' | 'fx_heal' | 'fx_sparkle' | 'fx_target';

export const IMG_KEYS: ImgKey[] = [
  'battle', 'map', 'title', 'result', 'wardens', 'enemies',
  ...(['iris','sena','shield_goblin','shaman','orc_lord','worm_king','battle_forest','battle_canyon','battle_desert','battle_abyss','portraits'] as const).map(k=>`v31_${k}` as ImgKey),
  'enemy_goblin', 'enemy_orc', 'enemy_wolf_elite', 'enemy_wingbat',
  'banner_wave', 'banner_boss', 'banner_elite', 'banner_clear', 'deco_stars',
  'fx_slash', 'fx_hit', 'fx_magic', 'fx_buff', 'fx_heal', 'fx_sparkle', 'fx_target',
];

export const imgUrl = (k: ImgKey) => k.startsWith('v31_')?`/assets/v31/${k.slice(4)}.webp`:`${V2}${k}.webp`;

const images = new Map<ImgKey, HTMLImageElement>();
let loading: Promise<void> | null = null;

/** すべての絵を読む（失敗した絵は描かないだけで、ゲームは続ける） */
export function loadImages(onProgress?: (done: number, total: number) => void): Promise<void> {
  if (loading) return loading;
  let done = 0;
  loading = Promise.all(IMG_KEYS.map((k) => new Promise<void>((resolve) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { images.set(k, im); done++; onProgress?.(done, IMG_KEYS.length); resolve(); };
    im.onerror = () => { done++; onProgress?.(done, IMG_KEYS.length); resolve(); };
    im.src = imgUrl(k);
  }))).then(() => undefined);
  return loading;
}

export function img(k: ImgKey): HTMLImageElement | null {
  return images.get(k) ?? null;
}

export interface Rect { x: number; y: number; w: number; h: number }
const R = (x0: number, y0: number, x1: number, y1: number): Rect => ({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });

/** 守り手のちびキャラ（1536×1024、4×2）。flip は左を向かせるために裏返す */
export const WARDEN_ART: { r: Rect; flip: boolean }[] = [
  { r: R(30, 95, 351, 448), flip: false },
  { r: R(442, 119, 733, 447), flip: true },
  { r: R(794, 129, 1152, 445), flip: false },
  { r: R(1152, 127, 1472, 512), flip: true },
  { r: R(9, 528, 384, 873), flip: false },
  { r: R(384, 532, 768, 870), flip: true },
  { r: R(768, 540, 1087, 874), flip: false },
  { r: R(1152, 512, 1478, 872), flip: false },
];

/** 敵のちびキャラ（1774×887、5×2）。flip は右を向かせるために裏返す */
const ENEMY_SHEET: { r: Rect; flip: boolean }[] = [
  { r: R(101, 230, 329, 389), flip: false },
  { r: R(408, 160, 653, 383), flip: false },
  { r: R(727, 169, 1023, 360), flip: false },
  { r: R(1083, 182, 1419, 393), flip: false },
  { r: R(1419, 107, 1680, 396), flip: true },
  { r: R(59, 461, 354, 750), flip: false },
  { r: R(354, 504, 679, 747), flip: false },
  { r: R(718, 483, 1013, 747), flip: false },
  { r: R(1084, 594, 1419, 752), flip: false },
  { r: R(1419, 471, 1691, 762), flip: true },
];

/** 1枚ずつの敵の絵（切り出しは余白と端の欠片を除く） */
const ENEMY_FILE: Record<string, { k: ImgKey; r: Rect; flip: boolean }> = {
  enemy_goblin: { k: 'enemy_goblin', r: R(20, 20, 460, 380), flip: true },
  enemy_orc: { k: 'enemy_orc', r: R(70, 20, 670, 480), flip: true },
  enemy_wolf_elite: { k: 'enemy_wolf_elite', r: R(10, 20, 630, 440), flip: true },
  enemy_wingbat: { k: 'enemy_wingbat', r: R(10, 10, 584, 330), flip: false },
};

export interface Art { k: ImgKey; r: Rect; flip: boolean }

export function enemyArt(def: EnemyDef): Art {
  const replacement=({shieldGoblin:'shield_goblin',shaman:'shaman',orcLord:'orc_lord',wormKing:'worm_king'} as Record<string,keyof typeof artV31>)[def.id];
  if(replacement)return {k:`v31_${replacement}` as ImgKey,r:artV31[replacement].r,flip:false};

  if ('sheet' in def.art) {
    const a = ENEMY_SHEET[def.art.index] ?? ENEMY_SHEET[0];
    return { k: 'enemies', r: a.r, flip: a.flip };
  }
  const name = def.art.file.replace(/^.*\//, '').replace(/\.\w+$/, '');
  const f = ENEMY_FILE[name];
  return f ? { k: f.k, r: f.r, flip: f.flip } : { k: 'enemies', r: ENEMY_SHEET[0].r, flip: false };
}

/** 顔の切り出し（1774×887 の 4×2、顔のまわり） */
export function faceRect(sprite: number): Rect {
  const cw = 1774 / 4, ch = 887 / 2;
  const col = sprite % 4, row = Math.floor(sprite / 4);
  return { x: col * cw + 105, y: row * ch + 18, w: 230, h: 230 };
}

/** CSS の背景で顔を出す（大きさ size の四角） */
export function faceStyle(sprite: number, size: number): Record<string, string> {
  const f = faceRect(sprite);
  const k = size / f.w;
  return {
    backgroundImage: `url(${imgUrl('v31_portraits')})`,
    backgroundSize: `${1774 * k}px ${887 * k}px`,
    backgroundPosition: `${-f.x * k}px ${-f.y * k}px`,
  };
}

/** CSS の背景で敵の絵を出す（一覧用） */
export function enemyStyle(def: EnemyDef, size: number): Record<string, string> {
  const a = enemyArt(def);
  const newKey=a.k.startsWith('v31_')?a.k.slice(4) as keyof typeof artV31:null;
  const sheetW = newKey?artV31[newKey].width:a.k === 'enemies' ? 1774 : img(a.k)?.naturalWidth ?? 600;
  const sheetH = newKey?artV31[newKey].height:a.k === 'enemies' ? 887 : img(a.k)?.naturalHeight ?? 400;
  const k = size / Math.max(a.r.w, a.r.h);
  const ox = (size - a.r.w * k) / 2, oy = (size - a.r.h * k) / 2;
  return {
    backgroundImage: `url(${imgUrl(a.k)})`,
    backgroundSize: `${sheetW * k}px ${sheetH * k}px`,
    backgroundPosition: `${ox - a.r.x * k}px ${oy - a.r.y * k}px`,
    transform: a.flip ? 'scaleX(-1)' : 'none',
  };
}

export function wardenArt(sprite:number):Art{const key=sprite===7?'iris':sprite===3?'sena':null;return key?{k:`v31_${key}` as ImgKey,r:artV31[key].r,flip:false}:{k:'wardens',...(WARDEN_ART[sprite]??WARDEN_ART[0])};}
