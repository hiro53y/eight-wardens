// 必殺技の名前と説明（効果は sim.ts の useSkill）
import type { SkillId } from './types';

export const SKILLS: Record<SkillId, { name: string; desc: string; color: string }> = {
  whirl: { name: '回転斬り', desc: '周りの敵すべてに攻撃×6。', color: '#8fd0ff' },
  issen: { name: '一閃', desc: '先頭の敵の道を1本まるごと斬る（×9・メタルも斬れる）。', color: '#e8f4ff' },
  seal: { name: '魔封陣', desc: '先頭の周りに攻撃×3と、治らない強い鈍化。', color: '#b47cff' },
  darkwave: { name: '闇の波動', desc: '周りに攻撃×4と守り下げ（6秒）。', color: '#9a5cff' },
  dragonfall: { name: '竜の降下', desc: '飛んでいる敵すべてに攻撃×8。', color: '#9fe7ff' },
  arrowRain: { name: '矢の雨', desc: '敵の多い所へ矢を降らせる（×2を4回）。', color: '#c8f08a' },
  snipe: { name: '必中', desc: '最も体力の多い敵を撃ち抜く（×15・メタルも貫く）。', color: '#ffe08a' },
  bigCannon: { name: '大砲撃', desc: '先頭の周りに攻撃×6と大きな押し戻し。', color: '#ffb04a' },
  armorCrush: { name: '鎧砕き', desc: '広く鎧をはがし、守りを下げ、攻撃×3。', color: '#9fe7ff' },
  smoke: { name: '煙玉', desc: '周りの敵を3秒止める（ボスは1秒）。', color: '#d8d8e0' },
  shadow: { name: '影縫い', desc: '体力3割以下の敵を倒す。ボスには攻撃×8。', color: '#c58cff' },
  plunder: { name: '略奪', desc: '周りの敵に攻撃×4、当てた数だけ金貨。', color: '#ffd23f' },
  net: { name: '罠網', desc: '戦場の敵すべてを鈍らせ、少し止める。', color: '#cfd6de' },
  goldRain: { name: '黄金の雨', desc: '金貨が降り、8秒のあいだ全員の会心+20%。', color: '#ffd23f' },
};
