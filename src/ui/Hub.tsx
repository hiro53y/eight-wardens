// 地図から開く小窓：村の施設・店・持ち物・無限の塔・毎日の挑戦
import { useState } from 'react';
import { playSe } from '../audio/sound';
import { MAX_ITEMS, Q_NAME, buy, buyError, holderOf, itemText, sell, sellPrice } from '../game/items';
import { job } from '../game/jobs';
import { BUFFS, DAILY_RULES, TOWER_UNLOCK, chooseBuff, dailyDef, dateKey, towerOpen } from '../game/tower';
import type { Item, Progress } from '../game/types';
import { FACILITIES, MAX_FACILITY, build, buildError, facilityCost } from '../game/village';
import { enemy } from '../game/enemies';
import { enemyStyle, imgUrl } from '../view/assets';
import { Modal, fmtNum } from './common';

export function ItemRow({ it, p, children }: { it: Item; p: Progress; children?: React.ReactNode }) {
  const h = holderOf(p, it.id);
  return (
    <div className={`item-row q${it.q}`}>
      <div className="item-main">
        <b>{it.name}<i className={`qtag q${it.q}`}>{Q_NAME[it.q]}</i></b>
        <small>{it.kind === 'weapon' ? `武器（${it.line === 'sword' ? '剣' : it.line === 'hunt' ? '狩' : '盗'}）` : 'お守り'}・{itemText(it)}{h ? `・${h.name}が装備中` : ''}</small>
      </div>
      {children}
    </div>
  );
}

export function VillageModal({ p, onChange, onClose }: { p: Progress; onChange: () => void; onClose: () => void }) {
  return (
    <Modal title={<>村の施設 <small className="muted">金貨 {fmtNum(p.coins)}</small></>} onClose={onClose} wide className="village-modal">
      <div className="village" style={{ backgroundImage: `url(${imgUrl('result')})` }}>
        <div className="fac-grid">
          {FACILITIES.map((f) => {
            const lv = p.village[f.id] ?? 0;
            const err = buildError(p, f.id);
            return (
              <div className="fac" key={f.id}>
                <div className="fac-head"><b>{f.name}</b><span className="fac-lv">{'■'.repeat(lv)}{'□'.repeat(MAX_FACILITY - lv)}</span></div>
                <p>{lv ? f.desc(lv) : 'まだ無い'}{lv < MAX_FACILITY && <em>{` → ${f.desc(lv + 1)}`}</em>}</p>
                {lv < MAX_FACILITY
                  ? <button className="btn gold small" disabled={!!err} onClick={() => { if (build(p, f.id)) { playSe('equip'); onChange(); } else playSe('miss'); }}>{lv ? '育てる' : '建てる'} 金貨 {fmtNum(facilityCost(f.id, lv))}</button>
                  : <span className="muted">最大</span>}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

export function ShopModal({ p, onChange, onClose }: { p: Progress; onChange: () => void; onClose: () => void }) {
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  return (
    <Modal title={<>店 <small className="muted">金貨 {fmtNum(p.coins)}・持ち物 {p.items.length}/{MAX_ITEMS}</small></>} onClose={onClose} wide>
      <div className="seg tabs">
        <button className={tab === 'buy' ? 'on' : ''} onClick={() => setTab('buy')}>買う</button>
        <button className={tab === 'sell' ? 'on' : ''} onClick={() => setTab('sell')}>売る</button>
      </div>
      {tab === 'buy' ? (
        <div className="item-list">
          {p.shop.length === 0 && <p className="muted">売り切れ。ステージをクリアすると品が入れ替わる。</p>}
          {p.shop.map((it) => {
            const err = buyError(p, it.id);
            return (
              <ItemRow key={it.id} it={it} p={p}>
                <button className="btn gold small" disabled={!!err} onClick={() => { if (buy(p, it.id)) { playSe('coin'); onChange(); } }}>{err && err !== '金貨が足りない' ? err : `買う ${fmtNum(it.price)}`}</button>
              </ItemRow>
            );
          })}
          <p className="muted">品はステージをクリアするたびに入れ替わる。</p>
        </div>
      ) : (
        <div className="item-list">
          {p.items.length === 0 && <p className="muted">持ち物が無い。</p>}
          {p.items.map((it) => (
            <ItemRow key={it.id} it={it} p={p}>
              <button className="btn small" onClick={() => { sell(p, it.id); playSe('coin'); onChange(); }}>売る {fmtNum(sellPrice(it))}</button>
            </ItemRow>
          ))}
        </div>
      )}
    </Modal>
  );
}

export function ItemsModal({ p, onClose }: { p: Progress; onClose: () => void }) {
  const list = [...p.items].sort((a, b) => b.q - a.q || a.kind.localeCompare(b.kind));
  return (
    <Modal title={<>持ち物 <small className="muted">{p.items.length}/{MAX_ITEMS}</small></>} onClose={onClose} wide>
      <div className="item-list">
        {list.length === 0 && <p className="muted">まだ何も無い。強い敵（エリート・メタル・ボス）が宝箱を落とす。店でも買える。</p>}
        {list.map((it) => <ItemRow key={it.id} it={it} p={p} />)}
        <p className="muted">付けるのは「部隊」か戦場で仲間に触れて「装備」から。武器は同じ系統（剣・狩・盗）の仲間だけ。</p>
      </div>
      <div className="equip-summary">
        {p.wardens.map((w) => {
          const wi = p.items.find((x) => x.id === w.equip.weapon);
          const ci = p.items.find((x) => x.id === w.equip.charm);
          return <div key={w.id}><b>{w.name}</b><span>{job(w.job).name}</span><small>{wi?.name ?? '—'}／{ci?.name ?? '—'}</small></div>;
        })}
      </div>
    </Modal>
  );
}

export function TowerModal({ p, onStart, onChange, onClose }: { p: Progress; onStart: () => void; onChange: () => void; onClose: () => void }) {
  const run = p.tower.run;
  const open = towerOpen(p);
  return (
    <Modal title="無限の塔" onClose={onClose}>
      <div className="tower-info">
        <p>短い防衛を階ごとに重ね、どこまで登れるかを競う。階を越えるたびに恩恵を1つ選ぶ。村人が0になったら終わり。5階ごとにボス。得た EXP・金貨・宝箱は本編に持ち帰れる。</p>
        <div className="stage-meta">
          <span>最高 <b className="gold">{p.tower.best}階</b></span>
          <span>点 <b>{fmtNum(p.tower.score)}</b></span>
          <span>挑戦 <b>{p.tower.runs}回</b></span>
        </div>
        {run && (
          <div className="run-box">
            <b>挑戦中：{run.floor}階</b>・村人 {run.villagers}/{run.maxVillagers}
            {run.buffs.length > 0 && <div className="traits">{run.buffs.map((b, i) => <span key={i}>{BUFFS[b].name}</span>)}</div>}
          </div>
        )}
        {run?.choosing && (
          <div className="buffs">
            <div className="sec">恩恵を1つ選ぶ</div>
            <div className="buff-list">
              {run.choosing.map((id) => (
                <button key={id} className="buff" onClick={() => { if (chooseBuff(p, id)) { playSe('lvup'); onChange(); } }}>
                  <b>{BUFFS[id].name}</b><span>{BUFFS[id].desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {open && !run?.choosing
          ? <button className="btn gold big" onClick={() => { playSe('equip'); onStart(); }}>{run ? `${run.floor}階へ進む` : '塔に挑む'}</button>
          : !open && <p className="warn">ステージ{TOWER_UNLOCK}（最初のボス）を越えると挑める。</p>}
      </div>
    </Modal>
  );
}

export function DailyModal({ p, onStart, onClose }: { p: Progress; onStart: () => void; onClose: () => void }) {
  const date = dateKey();
  const { def, rule } = dailyDef(p, date);
  const done = p.daily.date === date && p.daily.cleared;
  const kinds = [...new Set(def.groups.map((g) => g.enemy))].map((id) => enemy(id));
  return (
    <Modal title={<>毎日の挑戦 <small className="muted">{date}</small></>} onClose={onClose}>
      <div className="tower-info">
        <div className="daily-rule"><b>{DAILY_RULES[rule].name}</b><span>{DAILY_RULES[rule].desc}</span></div>
        <div className="setup-enemies">{kinds.map((e) => <div key={e.id} className="eicon" title={e.name} style={enemyStyle(e, 36)} />)}</div>
        <div className="stage-meta">
          <span>今日の最高 <b>{p.daily.date === date ? fmtNum(p.daily.best) : 0}</b>点</span>
          <span>ごほうび <b className="gold">{done ? '受け取り済み' : '初めて勝つと宝箱×2（良以上）'}</b></span>
        </div>
        <button className="btn gold big" onClick={() => { playSe('equip'); onStart(); }}>挑む</button>
        <p className="muted">日付が変わると新しい挑戦になる。何度でも挑める。</p>
      </div>
    </Modal>
  );
}
