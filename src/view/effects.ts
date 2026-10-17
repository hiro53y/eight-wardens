import {MOTION,facingFor,type Motion,type AttackStyle} from './motion';
// 演出の状態：合戦の出来事（SimEvent）を、飛ぶ物・当たりの絵・数字・粒・帯・揺れ・効果音に直す
import { playSe } from '../audio/sound';
import { GATE } from '../game/field';
import { job } from '../game/jobs';
import { enemy } from '../game/enemies';
import { SKILLS } from '../game/skills';
import type { Battle, SimEvent } from '../game/sim';
import { wardenPos } from '../game/sim';
import type { BossSkill, JobDef, Progress, SkillId } from '../game/types';
import type { ImgKey } from './assets';

export interface Projectile { fx: JobDef['fx'] | 'rain'; from: [number, number]; to: [number, number]; uid: number; t0: number; dur: number }
export interface Flash { k: ImgKey; x: number; y: number; t0: number; dur: number; size: number; rot: number }
export interface Strike {style:AttackStyle;from:[number,number];to:[number,number];t0:number;dur:number;impact:boolean;major:boolean}
export interface FloatText { uid?:number; amount?:number; text: string; x: number; y: number; t0: number; dur: number; color: string; size: number; rise: number }
export interface Particle { x: number; y: number; vx: number; vy: number; t0: number; dur: number; color: string; r: number; g: number }
export interface Banner { k: ImgKey | null; t0: number; dur: number; sub?: string; title?: string; color?: string }
export interface Ring { x: number; y: number; r: number; t0: number; dur: number; color: string }
export interface Death { def: string; x: number; y: number; t0: number }
export interface CoinFly { x: number; y: number; t0: number }
export interface CutIn { sprite: number; name: string; color: string; t0: number }

export interface Fx {
  /** 演出の時計（秒）。一時停止で止まる */
  now: number;
  reduced:boolean;
  strikes:Strike[];
  facing:Map<string,number>;
  projectiles: Projectile[];
  flashes: Flash[];
  texts: FloatText[];
  particles: Particle[];
  banners: Banner[];
  rings: Ring[];
  deaths: Death[];
  coins: CoinFly[];
  cutin: CutIn | null;
  /** 画面の白い光の終わり */
  flashUntil: number;
  flashColor: string;
  /** 一瞬止める（ヒットストップ）残り秒 */
  freeze: number;
  /** 敵の白い点滅の終わり */
  hitUntil: Map<number, number>;
  /** 守り手の踏み込み（始めと向き） */
  lunge: Map<string, Motion>;
  /** 守り手の光（LvUp・転職） */
  glow: Map<string, { t0: number; kind: 'lv' | 'job' | 'rest' | 'skill' }>;
  /** 最後に見えた敵の位置（消えた後の演出用） */
  last: Map<number, { x: number; y: number; def: string }>;
  shakeUntil: number;
  shakeMag: number;
  eliteShown: boolean;
  numbers: boolean;
  /** 速さ（飛ぶ物の時間を合わせる） */
  speed: number;
  /** 連撃の表示（最後に増えた時と数） */
  combo: { n: number; t0: number };
}

export function newFx(): Fx {
  return {
    now: 0, reduced:false,strikes:[],facing:new Map(), projectiles: [], flashes: [], texts: [], particles: [], banners: [], rings: [], deaths: [], coins: [], cutin: null,
    flashUntil: 0, flashColor: '#fff', freeze: 0,
    hitUntil: new Map(), lunge: new Map(), glow: new Map(), last: new Map(),
    shakeUntil: 0, shakeMag: 0, eliteShown: false, numbers: true, speed: 1, combo: { n: 0, t0: -9 },
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

const SKILL_SE: Record<SkillId, string> = {
  whirl: 'slash', issen: 'slash', seal: 'magic', darkwave: 'magic', dragonfall: 'thunder', arrowRain: 'arrow', snipe: 'gun', bigCannon: 'boom',
  armorCrush: 'break', smoke: 'trap', shadow: 'magic', plunder: 'coin', net: 'trap', goldRain: 'coin',
};

const BOSS_TEXT: Record<BossSkill, string> = { summon: '手下を呼んだ！', charge: '突進！', roar: '咆哮！ 守り手がすくむ', regen: '傷が治っていく…', burrow: '地中に潜った！', dive: '地上に降りた！' };

export function shake(fx: Fx, mag: number, dur: number) {
  // Keep the battlefield fixed; force is expressed around the target.
  void fx; void mag; void dur;
}

export function text(fx: Fx, s: string, x: number, y: number, color = '#fff', size = 30, dur = 0.9, rise = 60) {
  if (fx.texts.length > 90) fx.texts.shift();
  fx.texts.push({ text: s, x, y, t0: fx.now, dur, color, size, rise });
}

function burst(fx: Fx, x: number, y: number, n: number, color: string, spd = 220, r = 6, g = 300) {
  n=Math.ceil(n*(fx.reduced?.35:1));
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = spd * (0.4 + Math.random() * 0.8);
    fx.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.4, t0: fx.now, dur: 0.45 + Math.random() * 0.4, color, r: r * (0.6 + Math.random() * 0.8), g });
  }
  if (fx.particles.length > 500) fx.particles.splice(0, fx.particles.length - 500);
}

function ring(fx: Fx, x: number, y: number, r: number, color: string, dur = 0.6) {
  fx.rings.push({ x, y, r, t0: fx.now, dur, color });
}

export function banner(fx: Fx, k: ImgKey | null, dur = 1.8, sub?: string, title?: string, color?: string) {
  fx.banners = fx.banners.filter((b) => fx.now - b.t0 < b.dur * 0.5);
  fx.banners.push({ k, t0: fx.now, dur, sub, title, color });
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

function skillFx(fx: Fx, p: Progress, b: Battle, ev: Extract<SimEvent, { k: 'skill' }>) {
  const w = p.wardens.find((x) => x.id === ev.wid);
  const meta = SKILLS[ev.skill];
  if (w) {
    if(!fx.reduced&&(!fx.cutin||fx.now-fx.cutin.t0>.8))fx.cutin = { sprite: w.sprite, name: meta.name, color: meta.color, t0: fx.now };
    const [ax,ay]=wardenPos(w),dx=ev.x-ax,dy=ev.y-ay,len=Math.hypot(dx,dy)||1;
    fx.facing.set(w.id,facingFor(dx,fx.facing.get(w.id)));
    fx.lunge.set(w.id,{t0:fx.now,dur:.7/Math.sqrt(fx.speed),dx:dx/len,dy:dy/len,style:job(w.job).fx});
    fx.strikes.push({style:job(w.job).fx,from:[ax,ay-50],to:[ev.x,ev.y-30],t0:fx.now+.12,dur:.8,impact:true,major:true});
    fx.glow.set(w.id, { t0: fx.now, kind: 'skill' });
  }
  fx.freeze = 0;
  fx.flashUntil = 0;
  fx.flashColor = meta.color;
  const [wx, wy] = w ? wardenPos(w) : [ev.x, ev.y];
  const { x, y } = ev;
  switch (ev.skill) {
    case 'whirl':
      ring(fx, wx, wy - 20, ev.r, meta.color, 0.5);
      for (let i = 0; i < 6; i++) fx.flashes.push({ k: 'fx_slash', x: wx + Math.cos(i) * ev.r * 0.5, y: wy - 30 + Math.sin(i) * ev.r * 0.35, t0: fx.now + i * 0.03, dur: 0.4, size: 200, rot: i });
      shake(fx, 10, 0.3);
      break;
    case 'issen':
      fx.flashes.push({ k: 'fx_slash', x: 700, y: y - 30, t0: fx.now, dur: 0.5, size: 1500, rot: 0 });
      shake(fx, 14, 0.35);
      break;
    case 'seal': case 'darkwave':
      ring(fx, ev.skill === 'seal' ? x : wx, ev.skill === 'seal' ? y : wy - 20, ev.r, meta.color, 0.8);
      fx.flashes.push({ k: 'fx_magic', x: ev.skill === 'seal' ? x : wx, y: (ev.skill === 'seal' ? y : wy) - 30, t0: fx.now, dur: 0.7, size: 420, rot: 0 });
      break;
    case 'dragonfall':
      for (let i = 0; i < 10; i++) fx.projectiles.push({ fx: 'dragon', from: [200 + i * 130, -200], to: [200 + i * 130 + 120, 380], uid: -1, t0: fx.now + i * 0.04, dur: 0.35 });
      shake(fx, 12, 0.4);
      break;
    case 'arrowRain':
      for (let i = 0; i < 26; i++) {
        const tx = x + (Math.random() - 0.5) * ev.r * 1.6, ty = y + (Math.random() - 0.5) * ev.r;
        fx.projectiles.push({ fx: 'rain', from: [tx - 120, ty - 520], to: [tx, ty], uid: -1, t0: fx.now + Math.random() * 0.35, dur: 0.3 });
      }
      ring(fx, x, y, ev.r, meta.color, 0.7);
      break;
    case 'snipe':
      fx.projectiles.push({ fx: 'bullet', from: [wx, wy - 60], to: [x, y - 30], uid: -1, t0: fx.now, dur: 0.08 });
      fx.flashes.push({ k: 'fx_target', x, y: y - 30, t0: fx.now, dur: 0.8, size: 260, rot: 0 });
      break;
    case 'bigCannon':
      fx.flashes.push({ k: 'fx_hit', x, y: y - 20, t0: fx.now, dur: 0.6, size: 460, rot: 0 });
      burst(fx, x, y, 30, '#ffb04a', 420, 9);
      shake(fx, 20, 0.5);
      break;
    case 'armorCrush':
      ring(fx, wx, wy - 20, ev.r, meta.color, 0.7);
      burst(fx, wx, wy - 40, 20, '#cfe8ff', 360, 6);
      break;
    case 'smoke':
      for (let i = 0; i < 40; i++) fx.particles.push({ x: wx + (Math.random() - 0.5) * ev.r * 1.6, y: wy - 20 + (Math.random() - 0.5) * ev.r, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 30, t0: fx.now, dur: 1.4 + Math.random(), color: 'rgba(220,220,230,0.85)', r: 18 + Math.random() * 24, g: 0 });
      break;
    case 'shadow':
      ring(fx, wx, wy - 20, 700, meta.color, 0.6);
      fx.flashUntil = 0; fx.flashColor = '#2a0040';
      break;
    case 'plunder':
      ring(fx, wx, wy - 20, ev.r, meta.color, 0.5);
      burst(fx, wx, wy - 40, 24, '#ffd23f', 300, 6, 500);
      break;
    case 'net':
      for (let i = 0; i < 12; i++) fx.projectiles.push({ fx: 'chain', from: [wx, wy - 50], to: [150 + i * 100, 420 + (i % 3) * 110], uid: -1, t0: fx.now + i * 0.02, dur: 0.35 });
      break;
    case 'goldRain':
      for (let i = 0; i < 60; i++) fx.particles.push({ x: 100 + Math.random() * 1450, y: 200 + Math.random() * 100, vx: 0, vy: 50 + Math.random() * 80, t0: fx.now + Math.random() * 0.4, dur: 1.4, color: '#ffd23f', r: 6, g: 420 });
      break;
  }
  void b;
  se(SKILL_SE[ev.skill], 0);
  se('lvup', 0);
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
        const face=facingFor(t.x-wx,fx.facing.get(w.id));fx.facing.set(w.id,face);
        const from: [number, number] = [wx+face*40, wy - 55];
        const dx = t.x - wx, dy = t.y - wy;
        const len = Math.hypot(dx, dy) || 1;
        const old=fx.lunge.get(w.id);
        // Fast jobs retain a readable stroke rather than resetting anticipation every frame.
        if(!old||fx.now-old.t0>old.dur*.8)fx.lunge.set(w.id, { t0: fx.now, dx: dx / len, dy: dy / len,style:ev.fx,dur:Math.max(.09,MOTION[ev.fx].duration/Math.sqrt(fx.speed)) });
        fx.strikes.push({style:ev.fx,from,to:[t.x,t.y-30],t0:fx.now,dur:.3/Math.sqrt(fx.speed),impact:false,major:false});
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
        const origin=w?wardenPos(w):[pos.x-40,pos.y];
        fx.strikes.push({style:fxk,from:[origin[0],origin[1]-55],to:[pos.x,pos.y-34],t0:fx.now+.04,dur:(ev.skill?.65:.28)/Math.sqrt(fx.speed),impact:true,major:!!ev.skill});
        const y = pos.y - 34;
        if (!fx.reduced&&ev.skill&&Math.random() < 0.35) fx.flashes.push({ k: imp.k, x: pos.x + (Math.random() - 0.5) * 16, y, t0: fx.now, dur: fxk === 'cannon' ? 0.45 : 0.28, size: imp.size * (ev.crit ? 1.5 : 1), rot: fxk === 'slash' || fxk === 'dragon' ? (Math.random() - 0.5) * 1.6 : Math.random() * 6.28 });
        fx.hitUntil.set(ev.uid, fx.now + 0.09);
        if (fxk === 'cannon') { burst(fx, pos.x, y, 10, '#ffb04a', 260, 7); shake(fx, 5, 0.18); }
        if (ev.crit) {
          fx.freeze = 0;
          text(fx, `${fmt(ev.n)}`, pos.x + (Math.random() - 0.5) * 20, y - 26, '#ffd23f', 42, 0.85, 70);
          text(fx, '会心!', pos.x, y - 70, '#fff3a0', 24, 0.6, 30);
          burst(fx, pos.x, y, 6, '#fff3a0', 220, 4);
          se('crit', 60);
        } else if (fx.numbers) {
          const big = ev.n >= 1000;
          damageText(fx,ev.uid,ev.n,pos.x,y-20, ev.metal ? '#c9d2dc' : ev.weak ? '#b8c4d8' : ev.skill ? '#9fe7ff' : big ? '#ffd45a' : '#ffffff', ev.metal ? 24 : ev.skill ? 34 : big ? 34 : 28, 0.7, 55);
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
        const last = fx.last.get(ev.uid);
        const def = enemy(last?.def ?? 'slime');
        const y = ev.y - def.size * 0.35;
        fx.deaths.push({ def: def.id, x: ev.x, y: ev.y, t0: fx.now });
        if (fx.deaths.length > 40) fx.deaths.shift();
        burst(fx, ev.x, y, def.boss ? 40 : 10, '#e8e2d4', def.boss ? 360 : 200, def.boss ? 12 : 7, 120);
        const coinN = Math.min(8, 1 + Math.floor(Math.log10(ev.coins + 1) * 2) + (ev.triple ? 3 : 0));
        for (let i = 0; i < coinN; i++) fx.coins.push({ x: ev.x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 30, t0: fx.now + i * 0.04 });
        if (fx.coins.length > 120) fx.coins.splice(0, fx.coins.length - 120);
        if (ev.triple) text(fx, `金貨×3 +${fmt(ev.coins)}`, ev.x, y - 50, '#ffd23f', 28, 1.1);
        if (def.boss) {
          shake(fx, 22, 1.2); se('clear', 0);
          fx.flashes.push({ k: 'fx_sparkle', x: ev.x, y, t0: fx.now, dur: 1.2, size: 420, rot: 0 });
          fx.freeze = 0;
          fx.flashUntil = 0; fx.flashColor = '#fff';
        } else if (def.kind === 'metal') { text(fx, 'メタル撃破！', ev.x, y - 80, '#e6eef8', 30, 1.2); se('coin', 0); }
        se(ev.triple ? 'coin' : 'death', 80);
        break;
      }
      case 'escape': {
        text(fx, `村人 -${ev.lives}`, GATE[0] - 20, GATE[1] - 60, '#ff6b5e', 38, 1.3, 70);
        fx.flashes.push({ k: 'fx_target', x: GATE[0], y: GATE[1], t0: fx.now, dur: 0.6, size: 200, rot: 0 });
        shake(fx, ev.lives >= 3 ? 18 : 9, 0.4);
        fx.flashUntil = fx.now + 0.15; fx.flashColor = '#ff3020';
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
      case 'skill': skillFx(fx, p, b, ev); break;
      case 'boss': {
        banner(fx, null, 1.6, undefined, BOSS_TEXT[ev.s], '#ff8a6a');
        if (ev.s === 'roar') { shake(fx, 16, 0.6); se('roar', 0); ring(fx, ev.x, ev.y, 420, '#ff6050', 0.6); }
        else if (ev.s === 'summon') { ring(fx, ev.x, ev.y, 200, '#c58cff', 0.6); se('magic', 0); }
        else if (ev.s === 'charge') { se('step', 0); shake(fx, 8, 0.5); }
        else if (ev.s === 'regen') { fx.flashes.push({ k: 'fx_heal', x: ev.x, y: ev.y - 60, t0: fx.now, dur: 0.9, size: 300, rot: 0 }); se('pickup', 0); }
        else if (ev.s === 'burrow') { burst(fx, ev.x, ev.y, 24, '#8a6a40', 260, 9); se('dig', 0); }
        else { burst(fx, ev.x, ev.y, 18, '#d9c3a0', 220, 8); se('bump', 0); }
        break;
      }
      case 'phase': {
        fx.flashUntil = fx.now + 0.4; fx.flashColor = '#ffffff';
        fx.freeze = Math.max(fx.freeze, 0.35);
        shake(fx, 18, 0.7);
        banner(fx, null, 1.6, undefined, ev.phase === 2 ? 'ボスが本気になった！' : 'ボスが怒った！', '#ff6050');
        se('roar', 0);
        break;
      }
      case 'combo': fx.combo = { n: ev.n, t0: fx.now }; break;
      case 'fever': {
        banner(fx, null, 1.8, '金貨×1.5・EXP×1.2（8秒）', 'FEVER!', '#ffd23f');
        fx.flashUntil = fx.now + 0.25; fx.flashColor = '#ffd23f';
        se('clear', 0);
        break;
      }
      case 'chest': {
        text(fx, '宝箱！', ev.x, ev.y - 90, '#ffd970', 30, 1.2, 80);
        fx.flashes.push({ k: 'fx_sparkle', x: ev.x, y: ev.y - 40, t0: fx.now, dur: 0.9, size: 200, rot: 0 });
        se('equip', 0);
        break;
      }
      case 'call': {
        text(fx, `早呼び +${fmt(ev.coins)}G`, 280, 470, '#ffd23f', 34, 1.3, 60);
        se('coin', 0);
        break;
      }
      case 'heal': {
        const pos = b.enemies.find((x) => x.uid === ev.uid);
        if (pos && fx.numbers) text(fx, `+${fmt(ev.n)}`, pos.x, pos.y - 70, '#7dea8c', 22, 0.7, 40);
        break;
      }
      case 'stun': {
        const w = p.wardens.find((x) => x.id === ev.wid);
        if (w) { const [x, y] = wardenPos(w); text(fx, 'すくみ！', x, y - 130, '#ff8a6a', 24, 1.0, 30); }
        break;
      }
      case 'land': {
        const pos = b.enemies.find((x) => x.uid === ev.uid);
        if (pos) { burst(fx, pos.x, pos.y, 14, '#d9c3a0', 220, 7); text(fx, '着地！', pos.x, pos.y - 80, '#ffd0a0', 22, 0.8); }
        break;
      }
      case 'end': {
        if (ev.win) { banner(fx, 'banner_clear', 2.4); se('clear', 0); }
        else { shake(fx, 20, 0.8); se('death', 0); }
        break;
      }
    }
  }
  trimFx(fx);
  // 消えた敵の位置は少しのあいだだけ残す
  if (fx.last.size > 300) {
    const live = new Set(b.enemies.map((e) => e.uid));
    for (const k of fx.last.keys()) if (!live.has(k)) fx.last.delete(k);
  }
}

/** 時計を進め、終わった演出を片付ける */
export function tickFx(fx: Fx, dt: number) {
  fx.now += dt;
  fx.strikes=fx.strikes.filter(x=>fx.now-x.t0<x.dur);
  for(const [id,m] of fx.lunge)if(fx.now-m.t0>m.dur)fx.lunge.delete(id);
  for(const [id,t] of fx.hitUntil)if(fx.now>t)fx.hitUntil.delete(id);
  for(const [id,m] of fx.glow)if(fx.now-m.t0>1.5)fx.glow.delete(id);
  const n = fx.now;
  fx.projectiles = fx.projectiles.filter((x) => n - x.t0 < x.dur);
  fx.flashes = fx.flashes.filter((x) => n - x.t0 < x.dur);
  fx.texts = fx.texts.filter((x) => n - x.t0 < x.dur);
  fx.banners = fx.banners.filter((x) => n - x.t0 < x.dur);
  fx.rings = fx.rings.filter((x) => n - x.t0 < x.dur);
  fx.deaths = fx.deaths.filter((x) => n - x.t0 < 0.4);
  fx.coins = fx.coins.filter((x) => n - x.t0 < 0.75);
  if (fx.cutin && n - fx.cutin.t0 > 1.1) fx.cutin = null;
  for (const pt of fx.particles) { if (n < pt.t0) continue; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += pt.g * dt; pt.vx *= 0.98; }
  fx.particles = fx.particles.filter((x) => n - x.t0 < x.dur);
  trimFx(fx);
}

export function fmt(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e4) return `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}k`;
  return `${Math.round(n)}`;
}

function damageText(fx:Fx,uid:number,n:number,x:number,y:number,color:string,size:number,dur:number,rise=55){
 const old=fx.texts.find(t=>t.uid===uid&&t.color===color&&fx.now-t.t0<.12);
 if(old){old.amount=(old.amount??0)+n;old.text=fmt(old.amount);return;}
 const stack=fx.texts.filter(t=>Math.abs(t.x-x)<45&&Math.abs(t.y-y)<90&&fx.now-t.t0<.3).length;
 text(fx,fmt(n),x,y-Math.min(3,stack)*23,color,size,dur,rise);const last=fx.texts[fx.texts.length-1];last.uid=uid;last.amount=n;
}
export function trimFx(fx:Fx){
 const cap=fx.reduced?70:240;
 if(fx.particles.length>cap)fx.particles.splice(0,fx.particles.length-cap);
 for(const list of [fx.strikes,fx.projectiles,fx.flashes,fx.rings])if(list.length>(fx.reduced?30:90))list.splice(0,list.length-(fx.reduced?30:90));
 if(fx.texts.length>60)fx.texts.splice(0,fx.texts.length-60);
}
