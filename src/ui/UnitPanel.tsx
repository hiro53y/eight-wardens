// 守り手の小窓：能力・LvUp（EXP）・転職（Lv3で2択・金貨）・上限突破・必殺技・装備・連携・休憩・配置換え
import { useState } from 'react';
import { playSe } from '../audio/sound';
import { canEquip, equip, holderOf, itemScore, itemText, unequip, Q_NAME } from '../game/items';
import { LINE_COLOR, LINE_NAME, MAX_LIMIT, attackOf, job, levelCost, limitCost, maxLv, promoteCost } from '../game/jobs';
import { levelUp, levelUpError, limitBreak, limitError, promote, promoteError, setRest } from '../game/progress';
import { SKILLS } from '../game/skills';
import { wardenStats } from '../game/stats';
import { SYNERGY_TEXT, synergyOf } from '../game/synergy';
import type { BattleMods, Item, JobDef, Progress, Warden } from '../game/types';
import { faceStyle } from '../view/assets';
import { fmtNum } from './common';

interface Props {
  p: Progress;
  w: Warden;
  inBattle: boolean;
  bossStage?: boolean;
  noRest?: boolean;
  mods?: BattleMods;
  /** 技を撃てない理由（null なら撃てる。undefined なら技のボタンを出さない） */
  skillErr?: string | null;
  skillWarning?: string;
  onSkill?: () => void;
  onChange: () => void;
  onFx?: (kind: 'lv' | 'job', wid: string, label?: string) => void;
  onMove?: () => void;
  onClose: () => void;
}

function rangeText(j: JobDef, range?: number): string {
  if (j.rangeAll) return '全域';
  return `${Math.round((range ?? j.range) / 1.4)}`;
}

function traits(j: JobDef): string[] {
  const t: string[] = [];
  if (j.flyOnly) t.push('飛行だけ');
  else if (j.fly >= 2) t.push(`飛行に強い×${j.fly}`);
  else if (j.fly < 1) t.push('飛行に弱い');
  if (j.metal > 0) t.push(`メタルに通る${Math.round(j.metal * 100)}%`);
  if (j.armorBreak) t.push('鎧はがし');
  if (j.front) t.push('前方だけ');
  if (j.slow) t.push(j.slow.dur === Infinity ? '治らない鈍化' : '鈍化');
  if (j.stop) t.push('停止');
  if (j.knock) t.push('押し戻し');
  if (j.defDown) t.push('守り下げ');
  if (j.coin3) t.push('止めで金貨×3');
  if (j.coinOnHit) t.push('当てると金貨');
  if (j.restCoin) t.push('休憩で金貨');
  if (j.killGrow) t.push('倒すと成長');
  return t;
}

export function UnitPanel({ p, w, inBattle, bossStage, noRest, mods, skillErr, skillWarning, onSkill, onChange, onFx, onMove, onClose }: Props) {
  const [pick, setPick] = useState<Item['kind'] | null>(null);
  const j = job(w.job);
  const max = maxLv(j, p.mode);
  const st = wardenStats(p, w, mods);
  const nextAtk = w.lv < max && st.atk > 0 ? Math.round(st.atk * attackOf(j, w.lv + 1, w.limit, w.kills) / Math.max(1, attackOf(j, w.lv, w.limit, w.kills))) : null;
  const cost = w.lv < max ? levelCost(j, w.lv) : null;
  const lvErr = levelUpError(p, w);
  const canPromote = w.lv >= 3 && j.next.length > 0;
  const limErr = limitError(p, w);
  const syn = synergyOf(p, w);
  const sk = SKILLS[j.skill];

  const doLevel = () => {
    if (!levelUp(p, w)) { playSe('miss'); return; }
    onFx?.('lv', w.id);
    if (!onFx) playSe('lvup');
    onChange();
  };
  const doPromote = (to: string) => {
    if (!promote(p, w, to)) { playSe('miss'); return; }
    onFx?.('job', w.id, `${job(to).name}に転職！`);
    if (!onFx) playSe('revive');
    onChange();
  };
  const doLimit = () => {
    if (!limitBreak(p, w)) { playSe('miss'); return; }
    onFx?.('lv', w.id);
    if (!onFx) playSe('lvup');
    onChange();
  };

  const slot = (kind: Item['kind']) => {
    const id = w.equip[kind];
    const it = id === null ? null : p.items.find((x) => x.id === id) ?? null;
    const ok = it ? canEquip(w, it) : true;
    return (
      <div className="slot" key={kind}>
        <span className="slot-k">{kind === 'weapon' ? '武器' : 'お守り'}</span>
        {it ? (
          <span className={`slot-item q${it.q}`}><b>{it.name}</b><small>{ok ? itemText(it) : '系統が違うので効かない'}</small></span>
        ) : <span className="slot-item muted">なし</span>}
        <button className="btn small" onClick={() => { playSe('menu'); setPick(pick === kind ? null : kind); }}>{pick === kind ? '閉じる' : '変える'}</button>
      </div>
    );
  };

  const choices = pick ? p.items.filter((it) => it.kind === pick && canEquip(w, it)).sort((a, b) => itemScore(b) - itemScore(a)) : [];

  return (
    <div className="unit-panel" onPointerDown={(e) => e.stopPropagation()}>
      <div className="up-head">
        <div className="face big" style={faceStyle(w.sprite, 54)} />
        <div className="up-name">
          <div><b>{w.name}</b> <span className="line-chip" style={{ background: LINE_COLOR[j.line] }}>{LINE_NAME[j.line]}・{j.tier}段</span></div>
          <div className="up-job">{j.name} <span className="lv">Lv{w.lv}/{max}{w.limit ? ` 突破+${w.limit}` : ''}</span></div>
        </div>
        <button className="x" aria-label="閉じる" onClick={() => { playSe('menu'); onClose(); }}>×</button>
      </div>
      <div className="up-scroll" key={w.id + w.job}>
        <div className="up-stats">
          <div><span>攻撃</span><b>{st.atk > 0 ? fmtNum(st.atk) : '—'}</b>{nextAtk !== null && <em>→{fmtNum(nextAtk)}</em>}</div>
          <div><span>速さ</span><b>{j.grade}</b><em>{st.interval.toFixed(2)}秒</em></div>
          <div><span>射程</span><b>{rangeText(j, st.range)}</b></div>
          <div><span>会心</span><b>{Math.round(st.crit * 100)}%</b></div>
        </div>
        <div className="traits">{traits(j).map((t) => <span key={t}>{t}</span>)}</div>
        <p className="desc">{j.desc}{j.killGrow ? `（いま+${Math.round(Math.min(1, w.kills * j.killGrow) * 100)}%）` : ''}</p>

        <div className="skill-box" style={{ borderColor: sk.color }}>
          <div className="skill-head"><b style={{ color: sk.color }}>技：{sk.name}</b>{inBattle && <i className="sp-bar"><i style={{ width: `${Math.min(1, w.sp ?? 0) * 100}%` }} /></i>}</div>
          <p className="desc">{sk.desc}</p>
          {inBattle&&skillWarning&&<p className="warn" role="status">{skillWarning}</p>}
          {inBattle && onSkill && skillErr !== undefined && (
            <button className="btn gold" disabled={!!skillErr} onClick={onSkill}>{skillErr ? `技（${skillErr}）` : '技を撃つ！'}</button>
          )}
        </div>

        {canPromote && (
          <div className="promote">
            <div className="sec">転職（金貨）— 2つから1つ</div>
            <div className="promote-list">
              {j.next.map((id) => {
                const to = job(id);
                const c = promoteCost(to, p.mode);
                const err = promoteError(p, w, id);
                return (
                  <div className="promo" key={id}>
                    <div className="promo-name"><b>{to.name}</b><span>攻{fmtNum(to.atk[0])}・{to.grade}・射程{rangeText(to)}・技「{SKILLS[to.skill].name}」</span></div>
                    <div className="traits small">{traits(to).map((t) => <span key={t}>{t}</span>)}</div>
                    <p className="desc">{to.desc}</p>
                    <button className="btn gold" disabled={!!err} onClick={() => doPromote(id)}>転職　金貨 {fmtNum(c)}</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="up-actions">
          {cost && (
            <button className="btn green" disabled={!!lvErr} onClick={doLevel}>
              <b>レベルアップ</b>
              <small>{cost.exp > 0 ? `EXP ${fmtNum(cost.exp)}` : `金貨 ${fmtNum(cost.coins)}`}{lvErr && lvErr !== 'Lv3：転職できる' ? `（${lvErr}）` : ''}</small>
            </button>
          )}
          {inBattle && (
            <button className={`btn ${w.resting ? 'blue' : ''}`} onClick={() => { setRest(w, !w.resting); playSe('menu'); onChange(); }}>
              <b>{w.resting ? '起こす' : '休ませる'}</b>
              <small>{bossStage || noRest ? 'このステージは休憩が効かない' : w.resting ? `ゲージ ${Math.round(w.rest * 100)}%` : '攻撃をやめて EXP をためる'}</small>
            </button>
          )}
          {inBattle && onMove && (
            <button className="btn" onClick={() => { playSe('menu'); onMove(); }}>
              <b>配置換え</b>
              <small>光る台座に触れる（長押しでも）</small>
            </button>
          )}
        </div>

        {j.tier === 3 && w.lv >= max && (
          <div className="promote">
            <div className="sec">上限突破（攻撃+10%・{w.limit}/{MAX_LIMIT}）</div>
            {w.limit < MAX_LIMIT
              ? <button className="btn gold" disabled={!!limErr} onClick={doLimit}>突破　金貨 {fmtNum(limitCost(w.limit))}</button>
              : <p className="desc">これ以上は突破できない。</p>}
          </div>
        )}

        <div className="promote">
          <div className="sec">装備</div>
          {slot('weapon')}
          {slot('charm')}
          {pick && (
            <div className="pick-list">
              {w.equip[pick] !== null && <button className="pick" onClick={() => { unequip(w, pick); playSe('menu'); setPick(null); onChange(); }}><b>外す</b></button>}
              {choices.length === 0 && <p className="muted">付けられる品がない（宝箱・店で手に入る）。</p>}
              {choices.map((it) => {
                const h = holderOf(p, it.id);
                return (
                  <button key={it.id} className={`pick q${it.q}`} onClick={() => { equip(p, w, it.id); playSe('equip'); setPick(null); onChange(); }}>
                    <b>{it.name}<i className={`qtag q${it.q}`}>{Q_NAME[it.q]}</i></b>
                    <small>{itemText(it)}{h && h !== w ? `（${h.name}が装備中）` : h === w ? '（装備中）' : ''}</small>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="promote">
          <div className="sec">連携（隣り合わせ）</div>
          {syn.links.length === 0 ? <p className="desc">隣に仲間がいない、または組み合わせが無い。</p> : (
            <div className="traits">
              {syn.same > 0 && <span>{`同じ系統 ${syn.same}人：攻撃+${Math.round(syn.atk * 100)}%`}</span>}
              {syn.range > 0 && <span>{SYNERGY_TEXT.range}</span>}
              {syn.speed > 0 && <span>{SYNERGY_TEXT.speed}</span>}
              {syn.crit > 0 && <span>{SYNERGY_TEXT.crit}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
