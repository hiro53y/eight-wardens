// 戦場を Canvas に描く：背景（章の色）・台座・守り手・敵・飛ぶ物・当たり・数字・帯
import { FIELD_H, FIELD_W, GATE, PEDESTALS } from '../game/field';
import { enemy } from '../game/enemies';
import { job, maxLv } from '../game/jobs';
import { levelUpError } from '../game/progress';
import { canTarget, type Battle, type SimEnemy } from '../game/sim';
import { chapterOf, type ChapterDef } from '../game/stages';
import type { Progress, Warden } from '../game/types';
import { WARDEN_ART, enemyArt, img, type Art, type ImgKey } from './assets';
import type { Fx } from './effects';

export interface Viewport { s: number; ox: number; oy: number }

/** 見せたい範囲（台座・道・城門が入る帯） */
const FOCUS = { x0: 0, x1: FIELD_W, y0: 255, y1: 830 };

export function viewportOf(cw: number, ch: number): Viewport {
  const s = Math.min(cw / (FOCUS.x1 - FOCUS.x0), ch / (FOCUS.y1 - FOCUS.y0));
  const ox = (cw - FIELD_W * s) / 2;
  let oy = ch / 2 - ((FOCUS.y0 + FOCUS.y1) / 2) * s;
  const bh = FIELD_H * s;
  if (bh >= ch) oy = Math.min(0, Math.max(ch - bh, oy));
  else oy = (ch - bh) / 2;
  return { s, ox, oy };
}

export function toField(v: Viewport, sx: number, sy: number): [number, number] {
  return [(sx - v.ox) / v.s, (sy - v.oy) / v.s];
}

/** 触れた位置の守り手 */
export function hitWarden(p: Progress, x: number, y: number): Warden | null {
  let best: Warden | null = null;
  let bd = 80;
  for (const w of p.wardens) {
    const [px, py] = PEDESTALS[w.pedestal];
    const d = Math.hypot(x - px, (y - (py - 45)) * 0.8);
    if (d < bd) { bd = d; best = w; }
  }
  return best;
}

/** 触れた位置の台座 */
export function hitPedestal(x: number, y: number): number {
  let best = -1;
  let bd = 85;
  PEDESTALS.forEach(([px, py], i) => {
    const d = Math.hypot(x - px, (y - (py - 30)) * 0.75);
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}

// ── 章ごとの色と、色違いの絵（先に作っておく） ──
const tinted = new Map<string, HTMLCanvasElement>();

const TINT: Record<ChapterDef['tint'], { mul: string; add?: string } | null> = {
  day: null,
  evening: { mul: '#ffc39a', add: 'rgba(255,120,40,0.10)' },
  night: { mul: '#6f80c8', add: 'rgba(40,70,160,0.10)' },
  desert: { mul: '#f3d29a', add: 'rgba(255,190,90,0.08)' },
  abyss: { mul: '#b48ae0', add: 'rgba(120,40,200,0.12)' },
};

function bgFor(ch: ChapterDef): CanvasImageSource | null {
  const base = img('battle');
  if (!base) return null;
  const t = TINT[ch.tint];
  if (!t) return base;
  const key = `bg:${ch.tint}`;
  let c = tinted.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = base.naturalWidth; c.height = base.naturalHeight;
    const g = c.getContext('2d');
    if (!g) return base;
    g.drawImage(base, 0, 0);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = t.mul;
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-over';
    if (t.add) { g.fillStyle = t.add; g.fillRect(0, 0, c.width, c.height); }
    tinted.set(key, c);
  }
  return c;
}

/** 敵の色違い（canvas の filter が使えない環境では元の色のまま） */
function sheetFor(k: ImgKey, hue: number): CanvasImageSource | null {
  const base = img(k);
  if (!base || !hue) return base;
  const key = `${k}:${hue}`;
  let c = tinted.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = base.naturalWidth; c.height = base.naturalHeight;
    const g = c.getContext('2d');
    if (!g) return base;
    g.filter = `hue-rotate(${hue}deg) saturate(1.15)`;
    g.drawImage(base, 0, 0);
    g.filter = 'none';
    tinted.set(key, c);
  }
  return c;
}

function drawArt(g: CanvasRenderingContext2D, src: CanvasImageSource, a: Pick<Art, 'r'>, cx: number, footY: number, h: number, flip: boolean) {
  const w = (a.r.w / a.r.h) * h;
  g.save();
  g.translate(cx, footY);
  if (flip) g.scale(-1, 1);
  g.drawImage(src, a.r.x, a.r.y, a.r.w, a.r.h, -w / 2, -h, w, h);
  g.restore();
}

function ellipse(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
}

export interface DrawOpts {
  selected: string | null;
  moving: boolean;
  setup: boolean;
}

export function draw(g: CanvasRenderingContext2D, cw: number, ch: number, b: Battle, p: Progress, fx: Fx, o: DrawOpts) {
  const v = viewportOf(cw, ch);
  const chap = chapterOf(b.stage);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#0b1420';
  g.fillRect(0, 0, cw, ch);

  // 画面の揺れ
  let sx = 0, sy = 0;
  if (fx.now < fx.shakeUntil) {
    const k = (fx.shakeUntil - fx.now) * 3;
    sx = (Math.random() - 0.5) * fx.shakeMag * Math.min(1, k);
    sy = (Math.random() - 0.5) * fx.shakeMag * Math.min(1, k);
  }
  g.setTransform(v.s, 0, 0, v.s, v.ox + sx * v.s, v.oy + sy * v.s);

  const bg = bgFor(chap);
  if (bg) g.drawImage(bg, 0, 0, FIELD_W, FIELD_H);

  const t = fx.now;
  const sel = o.selected ? p.wardens.find((w) => w.id === o.selected) ?? null : null;

  // 城門の光（敵の行き先）
  g.save();
  g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(GATE[0], GATE[1], 10, GATE[0], GATE[1], 110);
  gr.addColorStop(0, `rgba(255,200,120,${0.25 + 0.1 * Math.sin(t * 3)})`);
  gr.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = gr;
  g.fillRect(GATE[0] - 120, GATE[1] - 120, 240, 240);
  g.restore();

  // 選んだ守り手の射程
  if (sel) {
    const j = job(sel.job);
    const [x, y] = PEDESTALS[sel.pedestal];
    g.save();
    if (j.rangeAll) {
      g.fillStyle = 'rgba(255,230,120,0.08)';
      g.fillRect(0, 0, FIELD_W, FIELD_H);
    } else {
      g.beginPath();
      g.arc(x, y - 20, j.range, 0, Math.PI * 2);
      g.fillStyle = 'rgba(255,230,120,0.12)';
      g.fill();
      g.lineWidth = 3;
      g.setLineDash([14, 10]);
      g.strokeStyle = 'rgba(255,230,140,0.85)';
      g.stroke();
      if (j.front) {
        g.setLineDash([]);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(x + 30, y - 20 - j.range, j.range, j.range * 2);
      }
    }
    g.restore();
  }

  // 台座（配置換えの時は光らせる）
  if (o.moving || o.setup) {
    PEDESTALS.forEach(([x, y], i) => {
      const occ = p.wardens.some((w) => w.pedestal === i);
      const pulse = 0.5 + 0.5 * Math.sin(t * 5 + i);
      g.save();
      g.beginPath();
      g.ellipse(x, y + 4, 62, 26, 0, 0, Math.PI * 2);
      g.lineWidth = 4;
      g.strokeStyle = o.moving ? `rgba(120,230,255,${0.5 + 0.4 * pulse})` : occ ? 'rgba(255,255,255,0.25)' : `rgba(255,255,255,${0.25 + 0.2 * pulse})`;
      g.stroke();
      g.restore();
    });
  }

  // 奥から順に描く（足元の y）
  type Item = { y: number; f: () => void };
  const items: Item[] = [];
  for (const w of p.wardens) items.push({ y: PEDESTALS[w.pedestal][1], f: () => drawWarden(g, w, p, b, fx, sel === w, o.setup) });
  const flyers: SimEnemy[] = [];
  for (const e of b.enemies) {
    if (e.kind === 'fly') flyers.push(e);
    else items.push({ y: e.y + 14, f: () => drawEnemy(g, e, b, fx, chap.hue, sel) });
  }
  items.sort((a, c) => a.y - c.y);
  // 飛行の影は地上の下に
  for (const e of flyers) ellipse(g, e.x, e.y + (enemy(e.def).hover ?? 70), enemy(e.def).size * 0.28, 9, 'rgba(0,0,0,0.22)');
  for (const it of items) it.f();
  for (const e of flyers) drawEnemy(g, e, b, fx, chap.hue, sel);

  drawProjectiles(g, b, fx);
  drawFlashes(g, fx);
  drawParticles(g, fx);
  drawTexts(g, fx);

  // 帯は画面の大きさで描く
  g.setTransform(1, 0, 0, 1, 0, 0);
  drawBanners(g, cw, ch, fx);
}

function drawWarden(g: CanvasRenderingContext2D, w: Warden, p: Progress, b: Battle, fx: Fx, selected: boolean, setup: boolean) {
  const [px, py] = PEDESTALS[w.pedestal];
  const a = WARDEN_ART[w.sprite] ?? WARDEN_ART[0];
  const src = img('wardens');
  const t = fx.now;
  const j = job(w.job);
  // 足元
  ellipse(g, px, py + 6, 46, 15, 'rgba(0,0,0,0.30)');
  if (selected) {
    g.save();
    g.beginPath();
    g.ellipse(px, py + 6, 58, 22, 0, 0, Math.PI * 2);
    g.lineWidth = 5;
    g.strokeStyle = `rgba(255,220,90,${0.75 + 0.25 * Math.sin(t * 6)})`;
    g.stroke();
    g.restore();
  }
  // 上下の揺れ・踏み込み
  let ox = 0, oy = Math.sin(t * 2.4 + w.sprite) * 2.5;
  const lg = fx.lunge.get(w.id);
  if (lg) {
    const k = (t - lg.t0) / 0.18;
    if (k < 1) { const s = Math.sin(k * Math.PI) * (j.fx === 'slash' || j.fx === 'spear' ? 26 : 10); ox += lg.dx * s; oy += lg.dy * s * 0.4; }
  }
  // 奥の列ほど小さく（遠近）
  const h = (100 + (py - 432) * 0.09) * (1 + (j.tier - 1) * 0.04);
  if (src) {
    g.save();
    if (w.resting) g.globalAlpha = 0.82;
    const sq = w.resting ? 0.92 : 1;
    g.translate(px + ox, py + 8 + oy);
    g.scale(1, sq);
    drawArt(g, src, a, 0, 0, h, a.flip);
    // 光（LvUp・転職・休憩）
    const gl = fx.glow.get(w.id);
    if (gl && t - gl.t0 < 0.8) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = (1 - (t - gl.t0) / 0.8) * 0.7;
      drawArt(g, src, a, 0, 0, h, a.flip);
    }
    g.restore();
  }
  // 転職の光の柱
  const gl = fx.glow.get(w.id);
  if (gl && gl.kind === 'job' && t - gl.t0 < 1.3) {
    const k = (t - gl.t0) / 1.3;
    g.save();
    g.globalCompositeOperation = 'lighter';
    const grad = g.createLinearGradient(px - 40, 0, px + 40, 0);
    grad.addColorStop(0, 'rgba(255,240,180,0)');
    grad.addColorStop(0.5, `rgba(255,240,180,${0.6 * (1 - k)})`);
    grad.addColorStop(1, 'rgba(255,240,180,0)');
    g.fillStyle = grad;
    g.fillRect(px - 40, py - 420, 80, 430);
    g.restore();
  }
  // 名札（職・Lv）
  const label = `${j.name} Lv${w.lv}${w.limit ? `+${w.limit}` : ''}`;
  g.save();
  g.font = 'bold 21px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const tw = g.measureText(label).width + 16;
  g.fillStyle = 'rgba(10,16,28,0.72)';
  roundRect(g, px - tw / 2, py + 18, tw, 26, 8);
  g.fill();
  g.fillStyle = j.tier === 3 ? '#ffd970' : j.tier === 2 ? '#bfe3ff' : '#ffffff';
  g.fillText(label, px, py + 31.5);
  g.restore();
  // 休憩：Zzz とゲージの輪
  if (w.resting) {
    const cx = px + 44, cy = py - h + 10;
    g.save();
    g.beginPath();
    g.arc(cx, cy, 20, 0, Math.PI * 2);
    g.fillStyle = 'rgba(10,20,30,0.7)';
    g.fill();
    g.beginPath();
    g.arc(cx, cy, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (b.boss ? 0 : w.rest));
    g.lineWidth = 6;
    g.strokeStyle = b.boss ? '#777' : '#7dea8c';
    g.stroke();
    g.font = 'bold 18px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#e8fff0';
    g.fillText('Z', cx, cy + 1);
    const zk = (t * 0.8) % 1;
    g.globalAlpha = 1 - zk;
    g.font = `bold ${16 + zk * 10}px system-ui, sans-serif`;
    g.fillText('z', cx + 14 + zk * 18, cy - 24 - zk * 30);
    g.restore();
  } else if (!setup && b.phase === 'fight' && !b.enemies.some((e) => canTarget(w, e))) {
    // 狙える敵がいない（休ませどき）
    g.save();
    g.globalAlpha = 0.55 + 0.25 * Math.sin(t * 3);
    g.font = 'bold 20px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillStyle = '#d9e6ff';
    g.fillText('…', px + 40, py - h + 6);
    g.restore();
  }
  // 育てられる印
  const canLv = !levelUpError(p, w);
  const canJob = w.lv >= maxLv(j, p.mode) && j.next.length > 0;
  if (canLv || canJob) {
    const bob = Math.sin(t * 5) * 4;
    g.save();
    g.font = 'bold 26px system-ui, sans-serif';
    g.textAlign = 'center';
    g.lineWidth = 5;
    g.strokeStyle = 'rgba(0,0,0,0.7)';
    const s = canJob ? '転' : '▲';
    g.strokeText(s, px - 44, py - h + 18 + bob);
    g.fillStyle = canJob ? '#ffd970' : '#7dea8c';
    g.fillText(s, px - 44, py - h + 18 + bob);
    g.restore();
  }
}

function drawEnemy(g: CanvasRenderingContext2D, e: SimEnemy, b: Battle, fx: Fx, hue: number, sel: Warden | null) {
  const def = enemy(e.def);
  const a = enemyArt(def);
  const src = sheetFor(a.k, def.boss ? 0 : hue);
  const t = fx.now;
  const fly = e.kind === 'fly';
  const stopped = b.t < e.stopUntil;
  const slowed = e.slow < 1 || e.slowPerm < 1;
  const h = def.size;
  const bob = fly ? Math.sin(t * 6 + e.uid) * 6 : stopped ? 0 : Math.abs(Math.sin(t * (slowed ? 5 : 9) + e.uid)) * -5;
  const foot = fly ? e.y + h * 0.4 : e.y + 14;
  if (!fly) ellipse(g, e.x, foot, h * 0.32, Math.max(8, h * 0.08), 'rgba(0,0,0,0.28)');
  if (sel && canTarget(sel, e)) {
    g.save();
    g.beginPath();
    g.ellipse(e.x, foot, h * 0.38, Math.max(10, h * 0.1), 0, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(255,120,90,0.8)';
    g.lineWidth = 3;
    g.stroke();
    g.restore();
  }
  if (src) {
    g.save();
    if (stopped) g.globalAlpha = 0.85;
    drawArt(g, src, a, e.x, foot + bob, h, a.flip);
    const hit = fx.hitUntil.get(e.uid) ?? 0;
    if (t < hit || (e.kind === 'metal' && b.t < e.armorUntil)) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = t < hit ? 0.75 : 0.25 + 0.2 * Math.sin(t * 12);
      drawArt(g, src, a, e.x, foot + bob, h, a.flip);
    }
    g.restore();
  }
  const top = foot + bob - h;
  // 状態の印
  if (slowed) {
    g.save();
    g.strokeStyle = 'rgba(120,200,255,0.8)';
    g.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const yy = foot - h * (0.25 + i * 0.2);
      g.beginPath();
      g.moveTo(e.x - h * 0.45 - 18, yy);
      g.lineTo(e.x - h * 0.45, yy);
      g.stroke();
    }
    g.restore();
  }
  if (stopped) {
    g.save();
    g.strokeStyle = '#cfd6de';
    g.lineWidth = 5;
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.ellipse(e.x + i * 16, foot - h * 0.45, 12, 8, 0.6, 0, Math.PI * 2);
      g.stroke();
    }
    g.restore();
  }
  if (e.defDown > 0) {
    g.save();
    g.fillStyle = '#c58cff';
    g.font = 'bold 24px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText('▼', e.x + h * 0.4, top + 20);
    g.restore();
  }
  // 体力（減っている時だけ。ボスは上の帯で出す）
  if (!def.boss && e.hp < e.maxHp) {
    const bw = Math.max(50, h * 0.6);
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillRect(e.x - bw / 2, top - 12, bw, 8);
    g.fillStyle = e.kind === 'metal' ? '#d6dee8' : '#ff5c4d';
    g.fillRect(e.x - bw / 2 + 1, top - 11, (bw - 2) * Math.max(0, e.hp / e.maxHp), 6);
  }
  if (def.boss) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.18 + 0.08 * Math.sin(t * 4);
    ellipse(g, e.x, foot, h * 0.5, h * 0.14, '#ff4030');
    g.restore();
  }
}

function drawProjectiles(g: CanvasRenderingContext2D, b: Battle, fx: Fx) {
  const t = fx.now;
  for (const pr of fx.projectiles) {
    const tgt = b.enemies.find((e) => e.uid === pr.uid);
    if (tgt) pr.to = [tgt.x, tgt.y - Math.min(60, enemy(tgt.def).size * 0.4)];
    const k = Math.min(1, (t - pr.t0) / pr.dur);
    const [x0, y0] = pr.from, [x1, y1] = pr.to;
    const ang = Math.atan2(y1 - y0, x1 - x0);
    let x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k;
    g.save();
    switch (pr.fx) {
      case 'arrow': {
        y -= Math.sin(k * Math.PI) * 40;
        g.translate(x, y); g.rotate(ang - Math.cos(k * Math.PI) * 0.3);
        g.strokeStyle = '#e9dcc0'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(-34, 0); g.lineTo(10, 0); g.stroke();
        g.fillStyle = '#d0d6de'; g.beginPath(); g.moveTo(16, 0); g.lineTo(4, -6); g.lineTo(4, 6); g.fill();
        g.fillStyle = '#6fbf5a'; g.fillRect(-36, -5, 8, 10);
        break;
      }
      case 'spear': {
        g.translate(x, y); g.rotate(ang);
        g.strokeStyle = '#a77b45'; g.lineWidth = 6;
        g.beginPath(); g.moveTo(-50, 0); g.lineTo(14, 0); g.stroke();
        g.fillStyle = '#e6edf5'; g.beginPath(); g.moveTo(30, 0); g.lineTo(12, -8); g.lineTo(12, 8); g.fill();
        break;
      }
      case 'bullet': {
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = 'rgba(255,230,150,0.9)'; g.lineWidth = 5;
        const tx = x - Math.cos(ang) * 70, ty = y - Math.sin(ang) * 70;
        g.beginPath(); g.moveTo(tx, ty); g.lineTo(x, y); g.stroke();
        break;
      }
      case 'cannon': {
        y -= Math.sin(k * Math.PI) * 90;
        ellipse(g, x, y, 15, 15, '#2a2a30');
        ellipse(g, x - 4, y - 4, 5, 5, 'rgba(255,255,255,0.4)');
        break;
      }
      case 'shuriken': {
        g.translate(x, y); g.rotate(t * 30);
        g.fillStyle = '#d7dde6';
        for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(0, -16); g.lineTo(5, 0); g.lineTo(-5, 0); g.fill(); }
        break;
      }
      case 'magic': {
        const m = img('fx_magic');
        g.globalCompositeOperation = 'lighter';
        g.translate(x, y); g.rotate(ang);
        if (m) g.drawImage(m, -90, -22, 120, 44);
        else ellipse(g, 0, 0, 14, 14, '#b47cff');
        break;
      }
      case 'chain': {
        g.strokeStyle = '#cfd6de'; g.lineWidth = 4; g.setLineDash([10, 6]);
        g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 60, x0 + (x1 - x0) * Math.min(1, k * 2), y0 + (y1 - y0) * Math.min(1, k * 2)); g.stroke();
        break;
      }
      case 'potion': {
        y -= Math.sin(k * Math.PI) * 110;
        g.translate(x, y); g.rotate(t * 12);
        ellipse(g, 0, 4, 11, 11, '#7be06a');
        g.fillStyle = '#e8e2d4'; g.fillRect(-4, -14, 8, 10);
        break;
      }
      case 'dragon': {
        // 竜騎士：空から舞い降りる
        const sx = x1 - 120 + 120 * k, sy = y1 - 360 + 360 * k;
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = 'rgba(160,220,255,0.85)'; g.lineWidth = 10;
        g.beginPath(); g.moveTo(sx - 60, sy - 180); g.lineTo(sx, sy); g.stroke();
        ellipse(g, sx, sy, 12, 12, '#e8f6ff');
        break;
      }
      default: break;
    }
    g.restore();
  }
}

function drawFlashes(g: CanvasRenderingContext2D, fx: Fx) {
  for (const f of fx.flashes) {
    const m = img(f.k);
    if (!m) continue;
    const k = (fx.now - f.t0) / f.dur;
    const sc = 0.7 + 0.5 * k;
    const w = f.size * sc, h = (m.naturalHeight / m.naturalWidth) * w;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = Math.max(0, 1 - k * k);
    g.translate(f.x, f.y);
    g.rotate(f.rot);
    g.drawImage(m, -w / 2, -h / 2, w, h);
    g.restore();
  }
}

function drawParticles(g: CanvasRenderingContext2D, fx: Fx) {
  g.save();
  for (const pt of fx.particles) {
    const k = (fx.now - pt.t0) / pt.dur;
    g.globalAlpha = Math.max(0, 1 - k);
    g.fillStyle = pt.color;
    g.beginPath();
    g.arc(pt.x, pt.y, pt.r * (1 - k * 0.5), 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

function drawTexts(g: CanvasRenderingContext2D, fx: Fx) {
  g.save();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  for (const tx of fx.texts) {
    const k = (fx.now - tx.t0) / tx.dur;
    const pop = k < 0.12 ? 0.6 + k / 0.12 * 0.6 : 1.2 - Math.min(0.2, (k - 0.12) * 0.6);
    g.globalAlpha = k > 0.7 ? Math.max(0, 1 - (k - 0.7) / 0.3) : 1;
    g.font = `900 ${Math.round(tx.size * pop)}px system-ui, sans-serif`;
    const y = tx.y - tx.rise * Math.sqrt(k);
    g.lineWidth = 6;
    g.strokeStyle = 'rgba(10,12,20,0.85)';
    g.strokeText(tx.text, tx.x, y);
    g.fillStyle = tx.color;
    g.fillText(tx.text, tx.x, y);
  }
  g.restore();
}

function drawBanners(g: CanvasRenderingContext2D, cw: number, ch: number, fx: Fx) {
  for (const bn of fx.banners) {
    const m = img(bn.k);
    const k = (fx.now - bn.t0) / bn.dur;
    const inK = Math.min(1, k / 0.15), outK = k > 0.8 ? (k - 0.8) / 0.2 : 0;
    const w = Math.min(cw * 0.62, 620) * (0.85 + 0.15 * inK);
    const h = m ? (m.naturalHeight / m.naturalWidth) * w : 60;
    const x = cw / 2 - w / 2 + (outK > 0 ? outK * cw * 0.6 : (1 - inK) * -cw * 0.3);
    const y = ch * 0.3 - h / 2;
    g.save();
    g.globalAlpha = inK * (1 - outK);
    if (m) g.drawImage(m, x, y, w, h);
    if (bn.sub) {
      g.font = `900 ${Math.max(14, Math.round(w * 0.04))}px system-ui, sans-serif`;
      g.textAlign = 'center';
      g.lineWidth = 5;
      g.strokeStyle = 'rgba(0,0,0,0.8)';
      g.strokeText(bn.sub, x + w / 2, y + h + 14);
      g.fillStyle = '#ffe9c0';
      g.fillText(bn.sub, x + w / 2, y + h + 14);
    }
    g.restore();
  }
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
