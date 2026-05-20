import { useEffect, useRef } from 'react';
import type { PointerEvent } from 'react';
import { enemies } from '../data/enemies';
import { unitClasses } from '../data/classes';
import { classSpriteIndex, enemySheet, enemySpriteIndex, wardenSheet } from '../data/artAssets';
import type { BattleEnemy, BattleState, Effect, PlayerState, Projectile, UnitState } from '../types/game';
import { BATTLE_HEIGHT, BATTLE_WIDTH, distance, getUnitPosition, PATH_Y, VILLAGE_GATE_X } from '../engine/targeting';

interface GameCanvasProps {
  battleState: BattleState;
  playerState: PlayerState;
  onSelectUnit: (unitId: string) => void;
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

let battleBackgroundImage: HTMLImageElement | null = null;
let wardenSpriteImage: HTMLImageElement | null = null;
let enemySpriteImage: HTMLImageElement | null = null;

function getBattleBackgroundImage() {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!battleBackgroundImage) {
    battleBackgroundImage = new Image();
    battleBackgroundImage.src = '/assets/generated/battle-background.png';
  }
  return battleBackgroundImage;
}

function getSpriteImage(kind: 'warden' | 'enemy') {
  if (typeof window === 'undefined') {
    return null;
  }
  if (kind === 'warden') {
    if (!wardenSpriteImage) {
      wardenSpriteImage = new Image();
      wardenSpriteImage.src = wardenSheet.url;
    }
    return wardenSpriteImage;
  }
  if (!enemySpriteImage) {
    enemySpriteImage = new Image();
    enemySpriteImage.src = enemySheet.url;
  }
  return enemySpriteImage;
}

function drawSpriteFromSheet(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  index: number,
  columns: number,
  rows: number,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  if (!image?.complete || image.naturalWidth <= 0) {
    return false;
  }
  const sourceWidth = image.naturalWidth / columns;
  const sourceHeight = image.naturalHeight / rows;
  const column = index % columns;
  const row = Math.floor(index / columns);
  ctx.drawImage(image, column * sourceWidth, row * sourceHeight, sourceWidth, sourceHeight, x, y, width, height);
  return true;
}

function drawHpBar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, hpRate: number, height = 10) {
  drawRoundedRect(ctx, x, y, width, height, height / 2);
  ctx.fillStyle = 'rgba(12, 9, 8, 0.86)';
  ctx.fill();
  drawRoundedRect(ctx, x + 2, y + 2, Math.max(0, (width - 4) * hpRate), height - 4, (height - 4) / 2);
  ctx.fillStyle = hpRate > 0.35 ? '#87e24d' : '#ff6961';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 234, 166, 0.75)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, width, height);
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  const image = getBattleBackgroundImage();
  if (image?.complete && image.naturalWidth > 0) {
    ctx.drawImage(image, 0, 0, BATTLE_WIDTH, BATTLE_HEIGHT);
    ctx.fillStyle = 'rgba(8, 18, 20, 0.08)';
    ctx.fillRect(0, 0, BATTLE_WIDTH, BATTLE_HEIGHT);
    return;
  }

  const sky = ctx.createLinearGradient(0, 0, 0, BATTLE_HEIGHT);
  sky.addColorStop(0, '#6f9657');
  sky.addColorStop(0.48, '#87a95d');
  sky.addColorStop(1, '#456f39');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, BATTLE_WIDTH, BATTLE_HEIGHT);

  ctx.fillStyle = 'rgba(27, 68, 40, 0.45)';
  for (let i = 0; i < 52; i += 1) {
    const x = (i * 97) % BATTLE_WIDTH;
    const y = 20 + ((i * 43) % 130);
    ctx.beginPath();
    ctx.arc(x, y, 24 + (i % 4) * 8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(255, 245, 200, 0.18)';
  for (let i = 0; i < 80; i += 1) {
    const x = (i * 61) % BATTLE_WIDTH;
    const y = 155 + ((i * 31) % 175);
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#bba16f';
  ctx.beginPath();
  ctx.moveTo(0, PATH_Y - 38);
  ctx.bezierCurveTo(260, PATH_Y - 80, 430, PATH_Y + 30, 620, PATH_Y - 22);
  ctx.bezierCurveTo(830, PATH_Y - 78, 980, PATH_Y + 38, BATTLE_WIDTH, PATH_Y - 6);
  ctx.lineTo(BATTLE_WIDTH, PATH_Y + 65);
  ctx.bezierCurveTo(980, PATH_Y + 92, 830, PATH_Y - 6, 620, PATH_Y + 54);
  ctx.bezierCurveTo(410, PATH_Y + 98, 260, PATH_Y + 4, 0, PATH_Y + 54);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(84, 61, 32, 0.45)';
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 18]);
  ctx.beginPath();
  ctx.moveTo(0, PATH_Y + 22);
  ctx.bezierCurveTo(320, PATH_Y - 12, 520, PATH_Y + 44, 760, PATH_Y + 4);
  ctx.bezierCurveTo(920, PATH_Y - 18, 1060, PATH_Y + 28, BATTLE_WIDTH, PATH_Y + 20);
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i < 8; i += 1) {
    const x = 150 + i * 120;
    ctx.fillStyle = 'rgba(84, 72, 54, 0.42)';
    ctx.beginPath();
    ctx.ellipse(x, 310 + (i % 2) * 10, 54, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a744a';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = '#273244';
  drawRoundedRect(ctx, VILLAGE_GATE_X, 45, 146, 245, 8);
  ctx.fill();
  ctx.fillStyle = '#31425e';
  drawRoundedRect(ctx, VILLAGE_GATE_X + 12, 64, 122, 206, 6);
  ctx.fill();
  ctx.fillStyle = '#b99a5e';
  ctx.fillRect(VILLAGE_GATE_X + 55, 150, 42, 120);
  ctx.fillStyle = '#1f2f46';
  ctx.fillRect(VILLAGE_GATE_X + 26, 84, 18, 32);
  ctx.fillRect(VILLAGE_GATE_X + 104, 84, 18, 32);
  ctx.fillStyle = '#244373';
  ctx.fillRect(VILLAGE_GATE_X + 6, 50, 134, 26);
  ctx.fillStyle = '#d7bd78';
  ctx.fillRect(VILLAGE_GATE_X + 137, 0, 6, 85);
  ctx.fillStyle = '#1f5a9b';
  ctx.beginPath();
  ctx.moveTo(VILLAGE_GATE_X + 143, 4);
  ctx.lineTo(VILLAGE_GATE_X + 210, 12);
  ctx.lineTo(VILLAGE_GATE_X + 190, 34);
  ctx.lineTo(VILLAGE_GATE_X + 210, 56);
  ctx.lineTo(VILLAGE_GATE_X + 143, 62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e7d096';
  ctx.font = 'bold 18px serif';
  ctx.fillText('村ゲート', VILLAGE_GATE_X + 28, 36);
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: BattleEnemy) {
  const def = enemies[enemy.enemyId];
  const radius = def.type === 'boss' ? 39 : def.type === 'metal' ? 24 : 29;
  const hpRate = Math.max(0, enemy.hp / enemy.maxHp);
  const hitShake = enemy.slowTimer > 0 ? Math.sin(performance.now() / 18) * 2.5 : 0;

  ctx.save();
  ctx.translate(enemy.x + hitShake, enemy.y);
  if (enemy.slowTimer > 0) {
    ctx.globalAlpha = 0.88;
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.9, radius * 1.28, radius * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  const spriteIndex = enemySpriteIndex[enemy.enemyId] ?? 0;
  const drawn = drawSpriteFromSheet(
    ctx,
    getSpriteImage('enemy'),
    spriteIndex,
    enemySheet.columns,
    enemySheet.rows,
    -radius * 1.42,
    -radius * 1.65,
    radius * 2.84,
    radius * 2.84,
  );
  if (!drawn) {
    ctx.fillStyle = def.color;
    ctx.strokeStyle = '#231a18';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  drawHpBar(ctx, enemy.x - 38, enemy.y - radius - 28, 76, hpRate, 10);

  ctx.fillStyle = '#f5e3af';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.82)';
  ctx.lineWidth = 3;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeText(def.name, enemy.x, enemy.y + radius + 22);
  ctx.fillText(def.name, enemy.x, enemy.y + radius + 22);
}

function drawUnit(ctx: CanvasRenderingContext2D, unit: UnitState, selected: boolean) {
  const unitClass = unitClasses[unit.classId];
  const pos = getUnitPosition(unit.slot);
  const hpRate = Math.max(0, Math.min(1, unit.hp / unit.maxHp));

  ctx.save();
  ctx.translate(pos.x, pos.y);
  if (selected) {
    ctx.strokeStyle = 'rgba(255, 224, 112, 0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -10, 54 + Math.sin(performance.now() / 160) * 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = selected ? 'rgba(255, 220, 90, 0.42)' : 'rgba(27, 24, 18, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 32, 58, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = selected ? '#ffd45c' : '#8a744a';
  ctx.lineWidth = selected ? 4 : 2;
  ctx.stroke();

  const spriteIndex = classSpriteIndex[unit.classId] ?? 0;
  const drawn = drawSpriteFromSheet(
    ctx,
    getSpriteImage('warden'),
    spriteIndex,
    wardenSheet.columns,
    wardenSheet.rows,
    -48,
    -88,
    96,
    96,
  );
  if (!drawn) {
    ctx.fillStyle = unit.isResting ? '#5b6b59' : unitClass.color;
    ctx.strokeStyle = '#121417';
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, -24, -44, 48, 60, 12);
    ctx.fill();
    ctx.stroke();
  }

  if (unit.isResting) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    drawRoundedRect(ctx, -35, -55, 70, 20, 6);
    ctx.fill();
    ctx.fillStyle = '#d7f2c2';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('休憩中', 0, -40);
  }

  drawRoundedRect(ctx, -42, 44, 84, 22, 8);
  ctx.fillStyle = 'rgba(7, 12, 18, 0.76)';
  ctx.fill();
  ctx.fillStyle = '#f5e3af';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(unit.isResting ? '休憩中' : unitClass.name, 0, 60);
  ctx.restore();

  drawHpBar(ctx, pos.x - 36, pos.y - 104, 72, hpRate, 9);
}

function drawProjectile(ctx: CanvasRenderingContext2D, projectile: Projectile) {
  const progress = Math.min(1, projectile.age / projectile.duration);
  ctx.save();
  ctx.globalAlpha = 1 - progress * 0.35;
  ctx.strokeStyle = projectile.color;
  ctx.lineWidth = projectile.kind === 'slash' ? 8 : projectile.kind === 'cannon' ? 7 : 5;
  ctx.shadowColor = projectile.color;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  if (projectile.kind === 'slash') {
    const x = projectile.toX;
    const y = projectile.toY;
    ctx.moveTo(x - 34, y + 24);
    ctx.quadraticCurveTo(x, y - 30, x + 36, y - 18);
  } else {
    ctx.moveTo(projectile.fromX, projectile.fromY);
    ctx.lineTo(projectile.toX, projectile.toY);
  }
  ctx.stroke();
  ctx.fillStyle = projectile.kind === 'arrow' ? '#f5e6bd' : projectile.color;
  ctx.beginPath();
  const burst = projectile.kind === 'cannon' ? 18 : projectile.kind === 'magic' ? 15 : 10;
  ctx.arc(projectile.toX, projectile.toY, burst * (1 - progress) + 4, 0, Math.PI * 2);
  ctx.fill();
  if (projectile.kind === 'magic') {
    ctx.strokeStyle = '#fff4cf';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawEffect(ctx: CanvasRenderingContext2D, effect: Effect) {
  const progress = effect.age / effect.duration;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - progress);
  ctx.fillStyle = effect.color ?? '#fff';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = 3;
  ctx.font = effect.type === 'hit' ? 'bold 34px serif' : effect.type === 'gold' ? 'bold 30px serif' : 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  const y = effect.y - progress * 36;
  if (effect.text) {
    ctx.strokeText(effect.text, effect.x, y);
    ctx.fillText(effect.text, effect.x, y);
  } else {
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, 18 * (1 - progress), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function GameCanvas({ battleState, playerState, onSelectUnit }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, BATTLE_WIDTH, BATTLE_HEIGHT);
    drawBackground(ctx);

    const selectedUnit = playerState.units.find((unit) => unit.id === battleState.selectedUnitId);
    if (selectedUnit) {
      const selectedClass = unitClasses[selectedUnit.classId];
      const pos = getUnitPosition(selectedUnit.slot);
      ctx.fillStyle = 'rgba(79, 196, 115, 0.12)';
      ctx.strokeStyle = 'rgba(255, 224, 112, 0.48)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, selectedClass.range, 0, Math.PI * 2);
      ctx.fill();
      ctx.setLineDash([12, 10]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    playerState.units
      .filter((unit) => getUnitPosition(unit.slot).y < PATH_Y)
      .forEach((unit) => drawUnit(ctx, unit, unit.id === battleState.selectedUnitId));
    battleState.projectiles.forEach((projectile) => drawProjectile(ctx, projectile));
    battleState.enemies.forEach((enemy) => drawEnemy(ctx, enemy));
    playerState.units
      .filter((unit) => getUnitPosition(unit.slot).y >= PATH_Y)
      .forEach((unit) => drawUnit(ctx, unit, unit.id === battleState.selectedUnitId));
    battleState.effects.forEach((effect) => drawEffect(ctx, effect));

    ctx.fillStyle = 'rgba(14, 19, 27, 0.75)';
    drawRoundedRect(ctx, 18, 20, 104, 150, 10);
    ctx.fill();
    ctx.strokeStyle = '#b7945b';
    ctx.stroke();
    ctx.fillStyle = '#dbeeff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('スキル', 70, 48);
    ['加速', '守護', '応援'].forEach((label, index) => {
      ctx.fillStyle = ['#4f8ee9', '#75b84b', '#c49644'][index];
      ctx.beginPath();
      ctx.arc(70, 78 + index * 36, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff7d6';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(label, 70, 83 + index * 36);
    });

    const hpRate = playerState.villageHp / playerState.maxVillageHp;
    ctx.fillStyle = 'rgba(12, 16, 22, 0.72)';
    drawRoundedRect(ctx, BATTLE_WIDTH - 44, 76, 24, 224, 10);
    ctx.fill();
    ctx.fillStyle = '#89db4c';
    ctx.fillRect(BATTLE_WIDTH - 39, 290 - 204 * hpRate, 14, 204 * hpRate);
    ctx.strokeStyle = '#e1c081';
    ctx.strokeRect(BATTLE_WIDTH - 44, 76, 24, 224);
  }, [battleState, playerState]);

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const point = {
      x: ((event.clientX - rect.left) / rect.width) * BATTLE_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * BATTLE_HEIGHT,
    };

    const hitUnit = playerState.units.find((unit) => distance(point, getUnitPosition(unit.slot)) <= 58);
    if (hitUnit) {
      onSelectUnit(hitUnit.id);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="battle-canvas"
      width={BATTLE_WIDTH}
      height={BATTLE_HEIGHT}
      onPointerDown={handlePointerDown}
    />
  );
}
