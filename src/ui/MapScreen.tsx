// 章の地図：35のステージを村から魔境へ。選ぶと敵の顔ぶれと報酬
import { useLayoutEffect, useRef, useState } from 'react';
import { playSe } from '../audio/sound';
import { enemy } from '../game/enemies';
import { job, maxLv } from '../game/jobs';
import { canPlay, levelUpError, restExpOf } from '../game/progress';
import { CHAPTERS, PER_CHAPTER, STAGE_COUNT, chapterOf, stage, stageEnemies, stageEnemyCount } from '../game/stages';
import type { Progress, Settings } from '../game/types';
import { enemyStyle, faceStyle, imgUrl } from '../view/assets';
import { Help, Modal, SettingsPanel, fmtNum } from './common';
import { DailyModal, ItemsModal, ShopModal, TowerModal, VillageModal } from './Hub';
import { UnitPanel } from './UnitPanel';
import { dateKey, towerOpen } from '../game/tower';

const MAP_W = 1672, MAP_H = 941;
const ROWS = [800, 655, 510, 365, 225];

/** ステージの位置：章ごとに1段、蛇行して右上の魔境へ */
function nodePos(id: number): [number, number] {
  const c = Math.ceil(id / PER_CHAPTER) - 1;
  const k = (id - 1) % PER_CHAPTER;
  const t = c % 2 === 0 ? k : PER_CHAPTER - 1 - k;
  const x = 250 + t * 195;
  const y = ROWS[c] + Math.sin(id * 1.7) * 16;
  return [x, y];
}

interface Props {
  p: Progress;
  settings: Settings;
  onSettings: (s: Settings) => void;
  onChange: () => void;
  onPlay: (id: number) => void;
  onTower: () => void;
  onDaily: () => void;
  onTitle: () => void;
  onWipe: () => void;
}

export function MapScreen({ p, settings, onSettings, onChange, onPlay, onTower, onDaily, onTitle, onWipe }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ s: 0.5, ox: 0, oy: 0 });
  const [pick, setPick] = useState<number | null>(null);
  const [modal, setModal] = useState<'' | 'units' | 'help' | 'settings' | 'village' | 'shop' | 'items' | 'tower' | 'daily'>('');
  const [unit, setUnit] = useState<string | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      const cw = el.clientWidth, ch = el.clientHeight;
      // 道すじ（y 150〜880）が上の帯の下にすべて入る大きさ
      const hud = 40;
      const s = Math.min(Math.max(cw / MAP_W, ch / MAP_H), (ch - hud - 4) / 730);
      const oy = Math.min(hud - 150 * s, Math.max(ch - MAP_H * s, (ch - MAP_H * s) / 2));
      setView({ s, ox: (cw - MAP_W * s) / 2, oy });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);


  const totalStars = Object.values(p.stars).reduce((a, b) => a + b, 0);
  const pts = Array.from({ length: STAGE_COUNT }, (_, i) => nodePos(i + 1));
  const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  const opened = pts.slice(0, Math.min(STAGE_COUNT, p.unlocked)).map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  const ready = p.wardens.some((w) => !levelUpError(p, w) || (w.lv >= maxLv(job(w.job), p.mode) && job(w.job).next.length > 0));

  return (
    <div className="screen map-screen">
      <div className="map-box" ref={box}>
        <div className="map-world" style={{ width: MAP_W, height: MAP_H, transform: `translate(${view.ox}px, ${view.oy}px) scale(${view.s})`, backgroundImage: `url(${imgUrl('map')})` }}>
          <svg className="map-path" width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
            <path d={path} className="road" />
            <path d={opened} className="road open" />
          </svg>
          {CHAPTERS.map((c, i) => {
            const first = nodePos(i * PER_CHAPTER + 1);
            const left = i % 2 === 0;
            return <div key={c.id} className="chap-label" style={{ left: left ? first[0] - 205 : first[0] + 55, top: ROWS[i] - 22 }}>第{c.id}章<br /><b>{c.name}</b></div>;
          })}
          {pts.map(([x, y], i) => {
            const id = i + 1;
            const s = stage(id);
            const open = canPlay(p, id);
            const cur = id === Math.min(STAGE_COUNT, p.unlocked) && !p.stars[id];
            const st = p.stars[id] ?? 0;
            return (
              <button
                key={id}
                className={`node ${s.boss ? 'boss' : ''} ${open ? 'open' : 'locked'} ${cur ? 'cur' : ''} ${st ? 'done' : ''}`}
                style={{ left: x, top: y }}
                disabled={!open}
                onClick={() => { playSe('menu'); setPick(id); }}
                aria-label={`ステージ${id}`}
              >
                <span className="num">{s.boss ? '★' : id}</span>
                {st > 0 && <span className="stars">{'★'.repeat(st)}{'☆'.repeat(3 - st)}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="hud-top map-hud">
        <button className="btn small" onClick={() => { playSe('menu'); onTitle(); }}>タイトル</button>
        <span className={`chip mode ${p.mode}`}>{p.mode === 'pro' ? '玄人' : 'ふつう'}</span>
        <span className="chip exp">EXP <b>{fmtNum(p.exp)}</b></span>
        <span className="chip coin">金貨 <b>{fmtNum(p.coins)}</b></span>
        <span className="chip">★ <b>{totalStars}</b>/{STAGE_COUNT * 3}</span>
        <span className="chip score">点 <b>{fmtNum(p.score)}</b></span>
        <span className="grow" />
      
        <button className="btn small hubbtn" onClick={() => { playSe('menu'); setModal('village'); }}><i>村</i><span>施設</span></button>
        <button className="btn small hubbtn" onClick={() => { playSe('menu'); setModal('shop'); }}><i>店</i><span>{p.shop.length}品</span></button>
        <button className="btn small hubbtn" onClick={() => { playSe('menu'); setModal('items'); }}><i>袋</i><span>{p.items.length}</span></button>
        <button className={`btn small hubbtn ${towerOpen(p) ? 'hot' : 'off'}`} onClick={() => { playSe('menu'); setModal('tower'); }}><i>塔</i><span>{p.tower.best ? `${p.tower.best}階` : towerOpen(p) ? '挑む' : '未'}</span></button>
        <button className={`btn small hubbtn ${towerOpen(p) && !(p.daily.date === dateKey() && p.daily.cleared) ? 'hot' : ''} ${towerOpen(p) ? '' : 'off'}`} onClick={() => { playSe('menu'); setModal('daily'); }}><i>日</i><span>毎日</span></button>
        <button className={`btn small gold ${ready ? 'pulse' : ''}`} onClick={() => { playSe('menu'); setModal('units'); }}>部隊{ready ? ' ▲' : ''}</button>
        <button className="btn small" onClick={() => { playSe('menu'); setModal('help'); }}>?</button>
        <button className="btn small" onClick={() => { playSe('menu'); setModal('settings'); }}>設定</button>
      </div>


      {p.cleared && <div className="cleared-flag">全35ステージ制覇！ 点 {fmtNum(p.score)}</div>}

      {pick !== null && <StageModal p={p} id={pick} onClose={() => setPick(null)} onPlay={() => { playSe('equip'); onPlay(pick); }} />}

      {modal === 'units' && (
        <Modal title={<>部隊 <small className="muted">EXP {fmtNum(p.exp)}・金貨 {fmtNum(p.coins)}</small></>} onClose={() => { setModal(''); setUnit(null); }} wide className="units-modal">
          <div className="units">
            <div className="unit-grid">
              {p.wardens.map((w) => {
                const j = job(w.job);
                const up = !levelUpError(p, w) || (w.lv >= maxLv(j, p.mode) && j.next.length > 0);
                return (
                  <button key={w.id} className={`ucard ${unit === w.id ? 'sel' : ''}`} onClick={() => { playSe('menu'); setUnit(w.id); }}>
                    <div className="face" style={faceStyle(w.sprite, 40)} />
                    <div className="ucard-txt"><b>{j.name}</b><span>Lv{w.lv}{w.limit ? `+${w.limit}` : ''}</span></div>
                    {up && <i className="up">{w.lv >= maxLv(j, p.mode) ? '転' : '▲'}</i>}
                  </button>
                );
              })}
            </div>
            <div className="unit-side">
              {unit ? (
                <UnitPanel p={p} w={p.wardens.find((w) => w.id === unit)!} inBattle={false} onChange={onChange} onClose={() => setUnit(null)} />
              ) : <p className="muted pad">仲間を選ぶと、レベルアップと転職ができます。配置は出撃前の戦場で決めます。</p>}
            </div>
          </div>
        </Modal>
      )}
      {modal === 'help' && <Help onClose={() => setModal('')} />}
      {modal === 'settings' && <SettingsPanel settings={settings} onSettings={onSettings} onClose={() => setModal('')} onWipe={onWipe} />}
      {modal === 'village' && <VillageModal p={p} onChange={onChange} onClose={() => setModal('')} />}
      {modal === 'shop' && <ShopModal p={p} onChange={onChange} onClose={() => setModal('')} />}
      {modal === 'items' && <ItemsModal p={p} onClose={() => setModal('')} />}
      {modal === 'tower' && <TowerModal p={p} onStart={onTower} onChange={onChange} onClose={() => setModal('')} />}
      {modal === 'daily' && (towerOpen(p)
        ? <DailyModal p={p} onStart={onDaily} onClose={() => setModal('')} />
        : <Modal title="毎日の挑戦" onClose={() => setModal('')}><p className="warn">ステージ7（最初のボス）を越えると挑める。</p></Modal>)}
    </div>
  );
}

function StageModal({ p, id, onClose, onPlay }: { p: Progress; id: number; onClose: () => void; onPlay: () => void }) {
  const s = stage(id);
  const ch = chapterOf(id);
  const list = stageEnemies(id).map((e) => enemy(e));
  const best = p.stars[id] ?? 0;
  return (
    <Modal title={<>第{ch.id}章 {id}「{s.name}」{s.boss && <span className="tag boss">ボス</span>}</>} onClose={onClose}>
      <div className="stage-info">
        <div className="enemy-list">
          {list.map((e) => (
            <div key={e.id} className={`enemy-chip ${e.boss ? 'boss' : ''}`}>
              <div className="eicon" style={enemyStyle(e, 44)} />
              <div>
                <b>{e.name}</b>
                <span className="tags">
                  {e.boss && <i className="tag boss">ボス</i>}
                  {e.kind === 'fly' && <i className="tag fly">飛行</i>}
                  {e.kind === 'metal' && <i className="tag metal">メタル</i>}
                  {e.elite && <i className="tag elite">強</i>}
                  {e.lives > 1 && <i className="tag">村人-{e.lives}</i>}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="stage-meta">
          <span>敵 <b>{stageEnemyCount(id)}</b>体</span>
          <span>休憩1回 <b>{s.boss ? '効かない' : `EXP ${fmtNum(restExpOf(p, id))}`}</b></span>
          <span>最高 <b className="gold">{best ? '★'.repeat(best) + '☆'.repeat(3 - best) : 'まだ'}</b></span>
        </div>
        {s.boss && <p className="warn">ボスのステージでは休憩が効きません。先に育てておきましょう。</p>}
        <button className="btn gold big" onClick={onPlay}>出撃する</button>
      </div>
    </Modal>
  );
}
