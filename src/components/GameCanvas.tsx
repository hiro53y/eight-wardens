import { useEffect, useRef } from 'react';
import type { PointerEvent } from 'react';
import { enemies } from '../data/enemies';
import { unitClasses } from '../data/classes';
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

function drawBackground(ctx: CanvasRenderingContext2D) {
  const sky = ctx.createLinearGradient(0, 0, 0, BATTLE_HEIGHT);
  sky.addColorStop(0, '#5d8f63');
  sky.addColorStop(0.45, '#7aa35a');
  sky.addColorStop(1, '#4f7c3c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, BATTLE_WIDTH, BATTLE_HEIGHT);

  ctx.fillStyle = 'rgba(23, 54, 32, 0.45)';
  for (let i = 0; i < 42; i += 1) {
    const x = (i * 97) % BATTLE_WIDTH;
    const y = 20 + ((i * 43) % 130);
    ctx.beginPath();
    ctx.arc(x, y, 24 + (i % 4) * 8, 0, Math.PI * 2);
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

  ctx.fillStyle = '#273244';
  drawRoundedRect(ctx, VILLAGE_GATE_X, 45, 128, 230, 8);
  ctx.fill();
  ctx.fillStyle = '#31425e';
  drawRoundedRect(ctx, VILLAGE_GATE_X + 12, 64, 104, 190, 6);
  ctx.fill();
  ctx.fillStyle = '#b99a5e';
  ctx.fillRect(VILLAGE_GATE_X + 48, 142, 36, 112);
  ctx.fillStyle = '#1f2f46';
  ctx.fillRect(VILLAGE_GATE_X + 26, 84, 18, 32);
  ctx.fillRect(VILLAGE_GATE_X + 86, 84, 18, 32);
  ctx.fillStyle = '#244373';
  ctx.fillRect(VILLAGE_GATE_X + 6, 50, 116, 26);
  ctx.fillStyle = '#e7d096';
  ctx.font = 'bold 18px serif';
  ctx.fillText('村ゲート', VILLAGE_GATE_X + 28, 36);
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: BattleEnemy) {
  const def = enemies[enemy.enemyId];
  const radius = def.type === 'boss' ? 30 : def.type === 'metal' ? 18 : 22;
  const hpRate = Math.max(0, enemy.hp / enemy.maxHp);

  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  if (enemy.slowTimer > 0) {
    ctx.globalAlpha = 0.75;
  }

  if (def.type === 'fly') {
    ctx.fillStyle = 'rgba(24, 16, 34, 0.65)';
    ctx.beginPath();
    ctx.ellipse(-24, 2, 24, 10, -0.4, 0, Math.PI * 2);
    ctx.ellipse(24, 2, 24, 10, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = def.color;
  ctx.strokeStyle = '#231a18';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (def.type === 'metal') {
    ctx.fillStyle = '#eef7ff';
    ctx.beginPath();
    ctx.arc(-6, -7, 4, 0, Math.PI * 2);
    ctx.arc(7, -7, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  ctx.fillStyle = '#15110f';
  ctx.fillRect(enemy.x - 28, enemy.y - radius - 18, 56, 7);
  ctx.fillStyle = hpRate > 0.35 ? '#87dd4a' : '#ff6961';
  ctx.fillRect(enemy.x - 28, enemy.y - radius - 18, 56 * hpRate, 7);
  ctx.strokeStyle = '#2a2019';
  ctx.strokeRect(enemy.x - 28, enemy.y - radius - 18, 56, 7);

  ctx.fillStyle = '#f5e3af';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(def.name, enemy.x, enemy.y + radius + 18);
}

function drawUnit(ctx: CanvasRenderingContext2D, unit: UnitState, selected: boolean) {
  const unitClass = unitClasses[unit.classId];
  const pos = getUnitPosition(unit.slot);

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.fillStyle = selected ? 'rgba(255, 220, 90, 0.38)' : 'rgba(27, 24, 18, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 20, 56, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = selected ? '#ffd45c' : '#8a744a';
  ctx.lineWidth = selected ? 4 : 2;
  ctx.stroke();

  ctx.fillStyle = unit.isResting ? '#5b6b59' : unitClass.color;
  ctx.strokeStyle = '#121417';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, -25, -44, 50, 62, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f4e8c2';
  ctx.font = 'bold 20px serif';
  ctx.textAlign = 'center';
  ctx.fillText(unitClass.icon, 0, -7);

  if (unit.isResting) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    drawRoundedRect(ctx, -35, -55, 70, 20, 6);
    ctx.fill();
    ctx.fillStyle = '#d7f2c2';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('休憩中', 0, -40);
  }

  ctx.fillStyle = '#f5e3af';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(unitClass.name, 0, 42);
  ctx.restore();
}

function drawProjectile(ctx: CanvasRenderingContext2D, projectile: Projectile) {
  const progress = Math.min(1, projectile.age / projectile.duration);
  ctx.save();
  ctx.globalAlpha = 1 - progress * 0.35;
  ctx.strokeStyle = projectile.color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(projectile.fromX, projectile.fromY);
  ctx.lineTo(projectile.toX, projectile.toY);
  ctx.stroke();
  ctx.restore();
}

function drawEffect(ctx: CanvasRenderingContext2D, effect: Effect) {
  const progress = effect.age / effect.duration;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - progress);
  ctx.fillStyle = effect.color ?? '#fff';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = 3;
  ctx.font = effect.type === 'gold' ? 'bold 28px serif' : 'bold 18px sans-serif';
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
      ctx.fillStyle = 'rgba(79, 196, 115, 0.18)';
      ctx.strokeStyle = 'rgba(255, 224, 112, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, selectedClass.range, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    battleState.projectiles.forEach((projectile) => drawProjectile(ctx, projectile));
    battleState.enemies.forEach((enemy) => drawEnemy(ctx, enemy));
    playerState.units.forEach((unit) => drawUnit(ctx, unit, unit.id === battleState.selectedUnitId));
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
