// 演出の状態：合戦の出来事（SimEvent）を、飛ぶ物・当たりの絵・数字・粒・帯・揺れ・効果音に直す
import { playSe } from '../audio/sound';
import { GATE } from '../game/field';
import { job } from '../game/jobs';
import { enemy } from '../game/enemies';
import type { Battle, SimEvent } from '../game/sim';
import { wardenPos } from '../game/sim';
import type { JobDef, Progress } from '../game/types';
import type { ImgKey } from './assets';

export interface Projectile { fx: JobDef['fx']; from: [number, number]; to: [number, number]; uid: number; t0: number; dur: number }
export interface Flash { k: ImgKey; x: number; y: number; t0: number; dur: number; size: number; rot: number; tint?: string }
export interface FloatText { text: string; x: number; y: number; t0: number; dur: number; color: string; size: number; rise: number }
export interface Particle { x: number; y: number; vx: number; vy: number; t0: number; dur: number; color: string; r: number; g: number }
export interface Banner { k: ImgKey; t0: number; dur: number; sub?: string }

export interface Fx {
  /** 演出の時計（秒）。一時停止で止まる */
  now: number;
  projectiles: Projectile[];
  flashes: Flash[];
  texts: FloatText[];
  particles: Particle[];
  banners: Banner[];
  /** 敵の白い点滅の終わり */
  hitUntil: Map<number, number>;
  /** 守り手の踏み込み（始めと向き） */
  lunge: Map<string, { t0: number; dx: number; dy: number }>;
  /** 守り手の光（LvUp・転職） */
  glow: Map<string, { t0: number; kind: 'lv' | 'job' | 'rest' }>;
  /** 最後に見えた敵の位置（消えた後の演出用） */
  last: Map<number, { x: number; y: number; def: string }>;
  shakeUntil: number;
  shakeMag: number;
  eliteShown: boolean;
  numbers: boolean;
  /** 速さ（飛ぶ物の時間を合わせる） */
  speed: number;
}

export function newFx(): Fx {
  return {
    now: 0, projectiles: [], flashes: [], texts: [], particles: [], banners: [],
    hitUntil: new Map(), lunge: new Map(), glow: new Map(), last: new Map(),
    shakeUntil: 0, shakeMag: 0, eliteShown: false, numbers: true, speed: 1,
  };
}

// 同じ音が続けて鳴りすぎないように
const lastSe = new Map<string, number>();
function se(name: string, gapMs = 70) {
  const t = performance.now();
  if ((lastSe.get(name) ?? -1e9) + gapMs > t) return;
  lastSe.set(name, t);
  playSe(name);
}

const SHOT_SE: Record<JobDef['fx'], string> = {
  slash: 'slash', spear: 'swing', arrow: 'arrow', bullet: 'gun', cannon: 'boom', shuriken: 'throw', magic: 'magic', chain: 'trap', potion: 'throw', dragon: 'thunder',
};

const IMPACT: Record<JobDef['fx'], { k: ImgKey; size: number }> = {
  slash: { k: 'fx_slash', size: 120 },
  spear: { k: 'fx_hit', size: 80 },
  arrow: { k: 'fx_hit', size: 62 },
  bullet: { k: 'fx_hit', size: 70 },
  cannon: { k: 'fx_hit', size: 170 },
  shuriken: { k: 'fx_hit', size: 56 },
  magic: { k: 'fx_sparkle', size: 120 },
  chain: { k: 'fx_target', size: 96 },
  potion: { k: 'fx_heal', size: 110 },
  dragon: { k: 'fx_slash', size: 170 },
};

export function shake(fx: Fx, mag: number, dur: number) {
  fx.shakeUntil = Math.max(fx.shakeUntil, fx.now + dur);
  fx.shakeMag = Math.max(fx.shakeMag * (fx.now < fx.shakeUntil ? 1 : 0), mag);
}

export function text(fx: Fx, s: string, x: number, y: number, color = '#fff', size = 30, dur = 0.9, rise = 60) {
  if (fx.texts.length > 90) fx.texts.shift();
  fx.texts.push({ text: s, x, y, t0: fx.now, dur, color, size, rise });
}

function burst(fx: Fx, x: number, y: number, n: number, color: string, spd = 220, r = 6, g = 300) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = spd * (0.4 + Math.random() * 0.8);
    fx.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.4, t0: fx.now, dur: 0.45 + Math.random() * 0.4, color, r: r * (0.6 + Math.random() * 0.8), g });
  }
  if (fx.particles.length > 400) fx.particles.splice(0, fx.particles.length - 400);
}

export function banner(fx: Fx, k: ImgKey, dur = 1.8, sub?: string) {
  fx.banners = fx.banners.filter((b) => fx.now - b.t0 < b.dur * 0.5);
  fx.banners.push({ k, t0: fx.now, dur, sub });
}

/** 育成の光（画面から呼ぶ） */
export function glowWarden(fx: Fx, p: Progress, wid: string, kind: 'lv' | 'job', label?: string) {
  const w = p.wardens.find((x) => x.id === wid);
  if (!w) return;
  fx.glow.set(wid, { t0: fx.now, kind });
  const [x, y] = wardenPos(w);
  if (kind === 'lv') {
    fx.flashes.push({ k: 'fx_buff', x, y: y - 10, t0: fx.now, dur: 0.8, size: 170, rot: 0 });
    text(fx, 'LEVEL UP', x, y - 120, '#ffe27a', 30, 1.1, 50);
    burst(fx, x, y - 50, 14, '#ffe27a', 160, 5, -60);
    se('lvup', 0);
  } else {
    fx.flashes.push({ k: 'fx_sparkle', x, y: y - 60, t0: fx.now, dur: 1.2, size: 260, rot: 0 });
    fx.flashes.push({ k: 'fx_buff', x, y: y - 10, t0: fx.now, dur: 1.0, size: 220, rot: 0 });
    text(fx, label ?? '転職', x, y - 140, '#fff6c8', 38, 1.6, 40);
    burst(fx, x, y - 60, 26, '#fff6c8', 220, 6, -120);
    se('revive', 0);
  }
}

/** 合戦の出来事を演出にする */
export function consume(fx: Fx, events: SimEvent[], b: Battle, p: Progress) {
  for (const e of b.enemies) fx.last.set(e.uid, { x: e.x, y: e.y, def: e.def });
  for (const ev of events) {
    switch (ev.k) {
      case 'spawn': {
        if (ev.boss) {
          const def = b.enemies.find((x) => x.uid === ev.uid)?.def;
          banner(fx, 'banner_boss', 2.4, def ? enemy(def).name : undefined);
          shake(fx, 14, 0.9);
          se('roar', 0);
        } else if (!fx.eliteShown) {
          const e = b.enemies.find((x) => x.uid === ev.uid);
          if (e && enemy(e.def).elite) {
            fx.eliteShown = true;
            banner(fx, 'banner_elite', 1.8, enemy(e.def).name);
            se('roar', 0);
          }
        }
        break;
      }
      case 'shot': {
        const w = p.wardens.find((x) => x.id === ev.wid);
        const t = b.enemies.find((x) => x.uid === ev.target) ?? null;
        if (!w || !t) break;
        const [wx, wy] = wardenPos(w);
        const from: [number, number] = [wx, wy - 55];
        const dx = t.x - wx, dy = t.y - wy;
        const len = Math.hypot(dx, dy) || 1;
        fx.lunge.set(w.id, { t0: fx.now, dx: dx / len, dy: dy / len });
        if (ev.fx !== 'slash' && ev.fx !== 'chain') {
          fx.projectiles.push({ fx: ev.fx, from, to: [t.x, t.y - 30], uid: t.uid, t0: fx.now, dur: Math.max(0.06, ev.dur / fx.speed) });
        } else if (ev.fx === 'chain') {
          fx.projectiles.push({ fx: ev.fx, from, to: [t.x, t.y - 30], uid: t.uid, t0: fx.now, dur: Math.max(0.12, 0.3 / fx.speed) });
        }
        if (ev.fx === 'cannon' || ev.fx === 'bullet') burst(fx, from[0] - 20, from[1], 4, '#ffd27a', 120, 4, 0);
        se(SHOT_SE[ev.fx], ev.fx === 'shuriken' || ev.fx === 'arrow' ? 90 : 60);
        break;
      }
      case 'hit': {
        const pos = b.enemies.find((x) => x.uid === ev.uid) ?? fx.last.get(ev.uid);
        if (!pos) break;
        const w = p.wardens.find((x) => x.id === ev.wid);
        const fxk = w ? job(w.job).fx : 'arrow';
        const imp = IMPACT[fxk];
        const y = pos.y - 34;
        fx.flashes.push({ k: imp.k, x: pos.x + (Math.random() - 0.5) * 16, y, t0: fx.now, dur: fxk === 'cannon' ? 0.45 : 0.28, size: imp.size, rot: fxk === 'slash' || fxk === 'dragon' ? (Math.random() - 0.5) * 1.6 : Math.random() * 6.28 });
        fx.hitUntil.set(ev.uid, fx.now + 0.09);
        if (fxk === 'cannon') { burst(fx, pos.x, y, 10, '#ffb04a', 260, 7); shake(fx, 5, 0.18); }
        if (fx.numbers) {
          const big = ev.n >= 1000;
          text(fx, ev.metal ? `${ev.n}` : fmt(ev.n), pos.x + (Math.random() - 0.5) * 30, y - 20, ev.metal ? '#c9d2dc' : ev.weak ? '#b8c4d8' : big ? '#ffd45a' : '#ffffff', ev.metal ? 24 : big ? 34 : 28, 0.7, 55);
        }
        se(ev.metal ? 'bump' : 'hit', 55);
        break;
      }
      case 'status': {
        const pos = b.enemies.find((x) => x.uid === ev.uid) ?? fx.last.get(ev.uid);
        if (!pos) break;
        if (ev.s === 'armor') { text(fx, '鎧はがし！', pos.x, pos.y - 90, '#9fe7ff', 26, 0.9); se('break', 120); }
        if (ev.s === 'def') fx.flashes.push({ k: 'fx_heal', x: pos.x, y: pos.y - 20, t0: fx.now, dur: 0.4, size: 90, rot: 0 });
        if (ev.s === 'knock') burst(fx, pos.x, pos.y, 6, '#d9c3a0', 180, 6);
        break;
      }
      case 'kill': {
        const def = enemy(fx.last.get(ev.uid)?.def ?? 'slime');
        const y = ev.y - def.size * 0.35;
        burst(fx, ev.x, y, def.boss ? 40 : 12, '#e8e2d4', def.boss ? 360 : 200, def.boss ? 12 : 7, 120);
        burst(fx, ev.x, y, ev.triple ? 9 : 4, '#ffd23f', 240, 5, 500);
        if (ev.triple) text(fx, `金貨×3 +${fmt(ev.coins)}`, ev.x, y - 50, '#ffd23f', 28, 1.1);
        if (def.boss) { shake(fx, 22, 1.2); se('clear', 0); fx.flashes.push({ k: 'fx_sparkle', x: ev.x, y, t0: fx.now, dur: 1.2, size: 420, rot: 0 }); }
        else if (def.kind === 'metal') { text(fx, 'メタル撃破！', ev.x, y - 80, '#e6eef8', 30, 1.2); se('coin', 0); }
        se(ev.triple ? 'coin' : 'death', 80);
        break;
      }
      case 'escape': {
        text(fx, `村人 -${ev.lives}`, GATE[0] - 20, GATE[1] - 60, '#ff6b5e', 38, 1.3, 70);
        fx.flashes.push({ k: 'fx_target', x: GATE[0], y: GATE[1], t0: fx.now, dur: 0.6, size: 200, rot: 0 });
        shake(fx, ev.lives >= 3 ? 18 : 9, 0.4);
        se('hurt', 0);
        break;
      }
      case 'rest': {
        const w = p.wardens.find((x) => x.id === ev.wid);
        if (!w) break;
        const [x, y] = wardenPos(w);
        fx.glow.set(w.id, { t0: fx.now, kind: 'rest' });
        fx.flashes.push({ k: 'fx_heal', x, y: y - 10, t0: fx.now, dur: 0.7, size: 150, rot: 0 });
        text(fx, `+${fmt(ev.exp)} EXP`, x, y - 120, '#8ff0a0', 28, 1.2);
        se('pickup', 100);
        break;
      }
      case 'coin': {
        const w = p.wardens.find((x) => x.id === ev.wid);
        if (!w) break;
        const [x, y] = wardenPos(w);
        text(fx, `+${fmt(ev.n)}G`, x, y - 110, '#ffd96a', 22, 0.9);
        se('coin', 160);
        break;
      }
      case 'end': {
        if (ev.win) { banner(fx, 'banner_clear', 2.4); se('clear', 0); }
        else { shake(fx, 20, 0.8); se('death', 0); }
        break;
      }
    }
  }
  // 消えた敵の位置は少しのあいだだけ残す
  if (fx.last.size > 300) {
    const live = new Set(b.enemies.map((e) => e.uid));
    for (const k of fx.last.keys()) if (!live.has(k)) fx.last.delete(k);
  }
}

/** 時計を進め、終わった演出を片付ける */
export function tickFx(fx: Fx, dt: number) {
  fx.now += dt;
  const n = fx.now;
  fx.projectiles = fx.projectiles.filter((x) => n - x.t0 < x.dur);
  fx.flashes = fx.flashes.filter((x) => n - x.t0 < x.dur);
  fx.texts = fx.texts.filter((x) => n - x.t0 < x.dur);
  fx.banners = fx.banners.filter((x) => n - x.t0 < x.dur);
  for (const pt of fx.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += pt.g * dt; pt.vx *= 0.98; }
  fx.particles = fx.particles.filter((x) => n - x.t0 < x.dur);
}

export function fmt(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e4) return `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}k`;
  return `${Math.round(n)}`;
}
