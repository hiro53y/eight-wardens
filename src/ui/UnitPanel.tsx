// 守り手の小窓：能力・LvUp（EXP）・転職（Lv3で2択・金貨）・上限突破・休憩・配置換え
import { playSe } from '../audio/sound';
import { LINE_COLOR, LINE_NAME, MAX_LIMIT, attackOf, interval, job, levelCost, limitCost, maxLv, promoteCost } from '../game/jobs';
import { levelUp, levelUpError, limitBreak, limitError, promote, promoteError, setRest } from '../game/progress';
import type { JobDef, Progress, Warden } from '../game/types';
import { faceStyle } from '../view/assets';
import { fmtNum } from './common';

interface Props {
  p: Progress;
  w: Warden;
  inBattle: boolean;
  bossStage?: boolean;
  onChange: () => void;
  onFx?: (kind: 'lv' | 'job', wid: string, label?: string) => void;
  onMove?: () => void;
  onClose: () => void;
}

function rangeText(j: JobDef): string {
  if (j.rangeAll) return '全域';
  return `${Math.round(j.range / 1.4)}`;
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

export function UnitPanel({ p, w, inBattle, bossStage, onChange, onFx, onMove, onClose }: Props) {
  const j = job(w.job);
  const max = maxLv(j, p.mode);
  const atk = attackOf(j, w.lv, w.limit, w.kills);
  const nextAtk = w.lv < max ? attackOf(j, w.lv + 1, w.limit, w.kills) : null;
  const cost = w.lv < max ? levelCost(j, w.lv) : null;
  const lvErr = levelUpError(p, w);
  const canPromote = w.lv >= 3 && j.next.length > 0;
  const limErr = limitError(p, w);

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
          <div><span>攻撃</span><b>{atk > 0 ? fmtNum(atk) : '—'}</b>{nextAtk !== null && atk > 0 && <em>→{fmtNum(nextAtk)}</em>}</div>
          <div><span>速さ</span><b>{j.grade}</b><em>{interval(j).toFixed(2)}秒</em></div>
          <div><span>射程</span><b>{rangeText(j)}</b></div>
        </div>
        <div className="traits">{traits(j).map((t) => <span key={t}>{t}</span>)}</div>
        <p className="desc">{j.desc}{j.killGrow ? `（いま+${Math.round(Math.min(1, w.kills * j.killGrow) * 100)}%）` : ''}</p>

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
                    <div className="promo-name"><b>{to.name}</b><span>攻{fmtNum(to.atk[0])}・{to.grade}・射程{rangeText(to)}</span></div>
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
              <small>{bossStage ? 'ボス戦は休憩が効かない' : w.resting ? `ゲージ ${Math.round(w.rest * 100)}%` : '攻撃をやめて EXP をためる'}</small>
            </button>
          )}
          {inBattle && onMove && (
            <button className="btn" onClick={() => { playSe('menu'); onMove(); }}>
              <b>配置換え</b>
              <small>光る台座に触れる</small>
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
      </div>
    </div>
  );
}
