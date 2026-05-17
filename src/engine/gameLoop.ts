import { enemies } from '../data/enemies';
import { unitClasses } from '../data/classes';
import { waves } from '../data/waves';
import type { BattleEnemy, BattleState, Effect, PlayerState, Projectile, UnitState } from '../types/game';
import { calculateDamage, getKillGold } from './combat';
import { calculateCooldown } from './progression';
import { findTargetForUnit, getUnitPosition, PATH_Y, VILLAGE_GATE_X } from './targeting';

const ENEMY_START_X = -64;
const ENEMY_SPEED_SCALE = 24;
const REST_RATE = 18;

let instanceSeq = 0;

function nextId(prefix: string): string {
  instanceSeq += 1;
  return `${prefix}-${Date.now()}-${instanceSeq}`;
}

export function createBattleState(stageId: number, selectedUnitId: string): BattleState {
  return {
    stageId,
    waveIndex: 0,
    enemies: [],
    projectiles: [],
    effects: [],
    isPaused: false,
    speedMultiplier: 1,
    selectedUnitId,
    result: null,
    spawnTimer: 0,
    spawnedEntries: {},
    message: '防衛開始',
  };
}

export function getCurrentWave(battle: BattleState) {
  return waves[battle.waveIndex];
}

export function beginNextWave(battle: BattleState): BattleState {
  const nextWaveIndex = Math.min(battle.waveIndex + 1, waves.length - 1);
  return {
    ...battle,
    waveIndex: nextWaveIndex,
    enemies: [],
    projectiles: [],
    effects: [],
    result: null,
    spawnTimer: 0,
    spawnedEntries: {},
    message: `Wave ${nextWaveIndex + 1} 開始`,
  };
}

function spawnedCountForWave(battle: BattleState): number {
  const wave = getCurrentWave(battle);
  return wave.entries.reduce((sum, entry, index) => sum + Math.min(battle.spawnedEntries[index] ?? 0, entry.count), 0);
}

function totalCountForWave(battle: BattleState): number {
  const wave = getCurrentWave(battle);
  return wave.entries.reduce((sum, entry) => sum + entry.count, 0);
}

function hasSpawnedAll(battle: BattleState): boolean {
  return spawnedCountForWave(battle) >= totalCountForWave(battle);
}

function spawnEnemy(battle: BattleState): BattleState {
  const wave = getCurrentWave(battle);
  const entryIndex = wave.entries.findIndex((entry, index) => (battle.spawnedEntries[index] ?? 0) < entry.count);

  if (entryIndex < 0) {
    return battle;
  }

  const entry = wave.entries[entryIndex];
  const enemy = enemies[entry.enemyId];
  const spawnedForEntry = battle.spawnedEntries[entryIndex] ?? 0;
  const laneOffset = ((spawnedCountForWave(battle) % 3) - 1) * 18;
  const y = enemy.type === 'fly' ? PATH_Y - 55 + laneOffset : PATH_Y + laneOffset;
  const nextEnemy: BattleEnemy = {
    instanceId: nextId('enemy'),
    enemyId: entry.enemyId,
    x: ENEMY_START_X,
    y,
    hp: enemy.hp,
    maxHp: enemy.hp,
    speed: enemy.speed,
    laneOffset,
    slowTimer: 0,
  };

  return {
    ...battle,
    enemies: [...battle.enemies, nextEnemy],
    spawnedEntries: {
      ...battle.spawnedEntries,
      [entryIndex]: spawnedForEntry + 1,
    },
    spawnTimer: wave.spawnInterval,
  };
}

function ageEffects(effects: Effect[], dt: number): Effect[] {
  return effects
    .map((effect) => ({ ...effect, age: effect.age + dt }))
    .filter((effect) => effect.age < effect.duration);
}

function ageProjectiles(projectiles: Projectile[], dt: number): Projectile[] {
  return projectiles
    .map((projectile) => ({ ...projectile, age: projectile.age + dt }))
    .filter((projectile) => projectile.age < projectile.duration);
}

function addEffect(effects: Effect[], effect: Omit<Effect, 'id' | 'age'>): Effect[] {
  return [
    ...effects,
    {
      ...effect,
      id: nextId('effect'),
      age: 0,
    },
  ];
}

function addProjectile(projectiles: Projectile[], projectile: Omit<Projectile, 'id' | 'age'>): Projectile[] {
  return [
    ...projectiles,
    {
      ...projectile,
      id: nextId('projectile'),
      age: 0,
    },
  ];
}

function updateRestingUnits(units: UnitState[], waveRestExp: number, isBoss: boolean, dt: number): UnitState[] {
  if (isBoss || waveRestExp <= 0) {
    return units;
  }

  return units.map((unit) => {
    if (!unit.isResting) {
      return unit;
    }

    let restGauge = unit.restGauge + REST_RATE * dt;
    let exp = unit.exp;
    while (restGauge >= 100) {
      restGauge -= 100;
      exp += waveRestExp;
    }

    return {
      ...unit,
      restGauge,
      exp,
    };
  });
}

export interface GameLoopResult {
  battle: BattleState;
  player: PlayerState;
}

export function updateBattleState(battle: BattleState, player: PlayerState, rawDt: number): GameLoopResult {
  if (battle.isPaused || battle.result) {
    return { battle, player };
  }

  const dt = Math.min(rawDt, 0.08) * battle.speedMultiplier;
  const wave = getCurrentWave(battle);
  let nextBattle: BattleState = {
    ...battle,
    projectiles: ageProjectiles(battle.projectiles, dt),
    effects: ageEffects(battle.effects, dt),
    message: battle.message,
  };
  let nextPlayer: PlayerState = {
    ...player,
    units: updateRestingUnits(player.units, wave.restExp, Boolean(wave.isBoss), dt),
  };

  if (!hasSpawnedAll(nextBattle)) {
    const spawnTimer = nextBattle.spawnTimer - dt;
    nextBattle = { ...nextBattle, spawnTimer };
    if (spawnTimer <= 0) {
      nextBattle = spawnEnemy(nextBattle);
    }
  }

  const enemiesAfterMove: BattleEnemy[] = [];
  for (const enemy of nextBattle.enemies) {
    const enemyDef = enemies[enemy.enemyId];
    const slowTimer = Math.max(0, enemy.slowTimer - dt);
    const speedFactor = slowTimer > 0 ? 0.55 : 1;
    const movedEnemy = {
      ...enemy,
      x: enemy.x + enemy.speed * ENEMY_SPEED_SCALE * speedFactor * dt,
      slowTimer,
    };

    if (movedEnemy.x >= VILLAGE_GATE_X) {
      nextPlayer = {
        ...nextPlayer,
        villageHp: Math.max(0, nextPlayer.villageHp - enemyDef.villageDamage),
      };
      nextBattle = {
        ...nextBattle,
        effects: addEffect(nextBattle.effects, {
          type: 'message',
          x: VILLAGE_GATE_X - 40,
          y: PATH_Y - 60,
          duration: 1.2,
          text: `村 -${enemyDef.villageDamage}`,
          color: '#ff746f',
        }),
      };
    } else {
      enemiesAfterMove.push(movedEnemy);
    }
  }
  nextBattle = { ...nextBattle, enemies: enemiesAfterMove };

  if (nextPlayer.villageHp <= 0) {
    return {
      battle: {
        ...nextBattle,
        result: {
          type: 'gameOver',
          title: '防衛失敗',
          message: '村の耐久が尽きました。育成と休憩の配分を見直してください。',
        },
      },
      player: nextPlayer,
    };
  }

  const updatedUnits: UnitState[] = [];
  let workingEnemies = nextBattle.enemies.map((enemy) => ({ ...enemy }));
  let effects = nextBattle.effects;
  let projectiles = nextBattle.projectiles;

  for (const unit of nextPlayer.units) {
    let nextUnit: UnitState = {
      ...unit,
      attackCooldown: Math.max(0, unit.attackCooldown - dt),
    };

    if (!nextUnit.isResting && nextUnit.attackCooldown <= 0) {
      const target = findTargetForUnit(nextUnit, workingEnemies);
      if (target) {
        const unitClass = unitClasses[nextUnit.classId];
        const enemyDef = enemies[target.enemyId];
        const origin = getUnitPosition(nextUnit.slot);
        const damage = calculateDamage(nextUnit, enemyDef);

        target.hp -= damage;
        if (unitClass.slowSeconds) {
          target.slowTimer = Math.max(target.slowTimer, unitClass.slowSeconds);
        }

        projectiles = addProjectile(projectiles, {
          fromX: origin.x,
          fromY: origin.y - 18,
          toX: target.x,
          toY: target.y - 12,
          duration: 0.18,
          color: unitClass.color,
        });
        effects = addEffect(effects, {
          type: 'hit',
          x: target.x,
          y: target.y - 20,
          duration: 0.28,
          text: String(damage),
          color: '#ffe9a6',
        });
        nextUnit.attackCooldown = calculateCooldown(nextUnit, unitClass);

        if (target.hp <= 0) {
          const reward = getKillGold(nextUnit, target.enemyId);
          nextPlayer = {
            ...nextPlayer,
            gold: nextPlayer.gold + reward.gold,
          };
          nextUnit = {
            ...nextUnit,
            exp: nextUnit.exp + enemyDef.exp,
          };
          effects = addEffect(effects, {
            type: 'defeat',
            x: target.x,
            y: target.y,
            duration: 0.55,
            text: enemyDef.name,
            color: '#fff2b9',
          });

          if (reward.multiplier > 1) {
            effects = addEffect(effects, {
              type: 'gold',
              x: target.x,
              y: target.y - 58,
              duration: 0.9,
              text: `GOLD x${reward.multiplier}`,
              color: '#ffd45c',
            });
          }
        }
      }
    }

    workingEnemies = workingEnemies.filter((enemy) => enemy.hp > 0);
    updatedUnits.push(nextUnit);
  }

  nextPlayer = {
    ...nextPlayer,
    units: updatedUnits,
  };
  nextBattle = {
    ...nextBattle,
    enemies: workingEnemies,
    effects,
    projectiles,
  };

  if (hasSpawnedAll(nextBattle) && nextBattle.enemies.length === 0) {
    const isFinalWave = nextBattle.waveIndex >= waves.length - 1;
    return {
      battle: {
        ...nextBattle,
        result: isFinalWave
          ? {
              type: 'victory',
              title: 'MVPクリア',
              message: 'Wave10のボスを撃破しました。八人の防衛隊は村を守り抜きました。',
            }
          : {
              type: 'waveClear',
              title: `Wave ${wave.id} クリア`,
              message: '次のWaveへ進めます。休憩とLvUpを確認してください。',
            },
      },
      player: nextPlayer,
    };
  }

  return {
    battle: nextBattle,
    player: nextPlayer,
  };
}
