// 防衛戦：Canvas の戦場＋上の帯（敵・村人・EXP・金貨・速さ）＋下の8人の札＋守り手の小窓
import { useEffect, useRef, useState } from 'react';
import { battleTrack, playBgm } from '../audio/bgm';
import { playSe } from '../audio/sound';
import { enemy } from '../game/enemies';
import { job, maxLv } from '../game/jobs';
import { applyResult, canPlay, levelUpError, moveTo, setRest, type StageResult } from '../game/progress';
import { saveProgress } from '../game/save';
import { advance, createBattle, remaining, startFight, type Battle } from '../game/sim';
import { STAGE_COUNT, chapterOf, stage, stageEnemies } from '../game/stages';
import type { Progress, Settings } from '../game/types';
import { enemyStyle, faceStyle, imgUrl } from '../view/assets';
import { banner, consume, glowWarden, newFx, tickFx, type Fx } from '../view/effects';
import { draw, hitPedestal, hitWarden, toField, viewportOf } from '../view/renderer';
import { Help, Modal, SettingsPanel, fmtNum } from './common';
import { UnitPanel } from './UnitPanel';

interface Props {
  p: Progress;
  stageId: number;
  settings: Settings;
  onSettings: (s: Settings) => void;
  onChange: () => void;
  onMap: () => void;
  onPlay: (id: number) => void;
}

type Menu = '' | 'pause' | 'help' | 'settings';

export function BattleScreen({ p, stageId, settings, onSettings, onChange, onMap, onPlay }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [b] = useState<Battle>(() => {
    for (const w of p.wardens) { w.resting = false; w.rest = 0; }
    return createBattle(p, stageId, (p.seed ^ (stageId * 7919) ^ Date.now()) | 0);
  });
  const fxRef = useRef<Fx>(newFx());
  const [speed, setSpeed] = useState<1 | 2 | 3>(settings.speed);
  const [paused, setPaused] = useState(false);
  const [menu, setMenu] = useState<Menu>('');
  const [sel, setSel] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [result, setResult] = useState<StageResult | null>(null);
  const [, setTick] = useState(0);

  // ループから読む値
  const live = useRef({ speed, stop: false, sel, moving });
  live.current = { speed, stop: paused || menu !== '' || !!result, sel, moving };
  const ended = useRef<{ at: number; r: StageResult } | null>(null);

  const s = stage(stageId);
  const ch = chapterOf(stageId);

  useEffect(() => { playBgm(battleTrack(ch.id, s.boss)); }, [ch.id, s.boss]);
  useEffect(() => { fxRef.current.numbers = settings.numbers; }, [settings.numbers]);
  useEffect(() => { saveProgress(p); }, [p]);

  // 描画と進行
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const fx = fxRef.current;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      const el = wrap.current, cv = canvas.current;
      if (!el || !cv) return;
      const L = live.current;
      if (!L.stop) {
        fx.speed = L.speed;
        if (b.phase === 'fight') {
          advance(b, p, dt * L.speed);
          if (b.events.length) { consume(fx, b.events, b, p); b.events = []; }
        }
        tickFx(fx, dt);
        if (b.phase !== 'fight' && b.phase !== 'setup' && !ended.current) {
          for (const w of p.wardens) { w.resting = false; w.rest = 0; }
          const r = applyResult(p, { win: b.phase === 'won', stage: stageId, kills: b.kills, lost: b.lost, exp: b.exp, coins: b.coins, restExp: b.restExp, time: b.t });
          saveProgress(p);
          ended.current = { at: fx.now, r };
        }
        if (ended.current && fx.now - ended.current.at > (b.phase === 'won' ? 2.2 : 1.6)) {
          const r = ended.current.r;
          ended.current = { at: Infinity, r };
          setResult(r);
          setSel(null);
          setMoving(false);
          onChange();
        }
      }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cw = Math.round(el.clientWidth * dpr), chh = Math.round(el.clientHeight * dpr);
      if (cv.width !== cw || cv.height !== chh) { cv.width = cw; cv.height = chh; }
      const g = cv.getContext('2d');
      if (g) draw(g, cw, chh, b, p, fx, { selected: L.sel, moving: L.moving, setup: b.phase === 'setup' });
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [b, p, stageId, onChange]);

  // 確かめ用の口（開発中か ?dbg=1 の時だけ）：早送りと状態の読み出し
  useEffect(() => {
    if (!import.meta.env.DEV && !location.search.includes('dbg=1')) return;
    const w = window as unknown as { __ew?: unknown };
    w.__ew = {
      b, p, fx: fxRef.current,
      run: (sec: number) => { advance(b, p, sec); consume(fxRef.current, b.events, b, p); b.events = []; tickFx(fxRef.current, 0.016); return { phase: b.phase, t: b.t, villagers: b.villagers, kills: b.kills, left: remaining(b) }; },
      start: () => startFight(b),
    };
    return () => { delete w.__ew; };
  }, [b, p]);

  // 上の帯・札の描き直しと、時々の保存
  useEffect(() => {
    let n = 0;
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
      if (++n % 40 === 0 && b.phase === 'fight') saveProgress(p);
    }, 125);
    return () => { window.clearInterval(id); saveProgress(p); };
  }, [b, p]);

  // 裏に回ったら止める
  useEffect(() => {
    const on = () => { if (document.hidden && b.phase === 'fight') { setMenu('pause'); saveProgress(p); } };
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, [b, p]);

  const selW = sel ? p.wardens.find((w) => w.id === sel) ?? null : null;

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const el = wrap.current;
    if (!el || result) return;
    const r = el.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const v = viewportOf(Math.round(el.clientWidth * dpr), Math.round(el.clientHeight * dpr));
    const [x, y] = toField(v, (e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr);
    if (moving && selW) {
      const ped = hitPedestal(x, y);
      if (ped >= 0) { moveTo(p, selW, ped); playSe('equip'); onChange(); }
      setMoving(false);
      return;
    }
    const w = hitWarden(p, x, y);
    if (w) { playSe('menu'); setSel(w.id === sel ? null : w.id); return; }
    if (selW && b.phase === 'setup') {
      const ped = hitPedestal(x, y);
      if (ped >= 0) { moveTo(p, selW, ped); playSe('equip'); onChange(); return; }
    }
    setSel(null);
  };

  const begin = () => {
    startFight(b);
    setSel(null);
    setMoving(false);
    banner(fxRef.current, 'banner_wave', 1.6, `${s.name}`);
    playSe('roar');
    saveProgress(p);
  };

  const allRest = (on: boolean) => {
    for (const w of p.wardens) setRest(w, on);
    playSe('menu');
    onChange();
  };

  const retry = () => { saveProgress(p); onPlay(stageId); };
  const toMap = () => { saveProgress(p); onMap(); };

  const fx = fxRef.current;
  const left = remaining(b);
  const boss = b.enemies.find((e) => e.boss);
  const anyRest = p.wardens.some((w) => w.resting);
  const allResting = p.wardens.every((w) => w.resting);
  const fighting = b.phase === 'fight';

  return (
    <div className={`screen battle-screen tint-${ch.tint}`}>
      <div className="hud-top">
        <button className="btn icon" aria-label="一時停止" onClick={() => { playSe('menu'); setMenu('pause'); }}>Ⅱ</button>
        <div className="stage-name"><small>{ch.id}-{((stageId - 1) % 7) + 1}</small>{s.name}</div>
        <div className="chip enemies"><span>敵</span><b>{left}</b><i className="mini-bar"><i style={{ width: `${(1 - left / b.total) * 100}%` }} /></i></div>
        <div className={`chip lives ${b.villagers <= 3 ? 'danger' : ''}`}><span>村人</span><b>{b.villagers}</b>/{b.villagersStart}</div>
        <div className="chip exp"><span>EXP</span><b>{fmtNum(p.exp)}</b></div>
        <div className="chip coin"><span>金貨</span><b>{fmtNum(p.coins)}</b></div>
        <span className="grow" />
        {!s.boss && (
          <button className={`btn small ${allResting ? 'blue' : ''}`} onClick={() => allRest(!anyRest)}>{anyRest ? '全員起こす' : '全員休憩'}</button>
        )}
        <button className="btn small speed" onClick={() => { const n = (speed % 3 + 1) as 1 | 2 | 3; setSpeed(n); playSe('menu'); }}>×{speed}</button>
        <button className={`btn small ${paused ? 'gold' : ''}`} onClick={() => { setPaused(!paused); playSe('menu'); }}>{paused ? '▶' : '止'}</button>
      </div>

      {boss && (
        <div className="boss-bar">
          <span>{enemy(boss.def).name}</span>
          <i><i style={{ width: `${Math.max(0, boss.hp / boss.maxHp) * 100}%` }} /></i>
        </div>
      )}

      <div className="field" ref={wrap}>
        <canvas ref={canvas} onPointerDown={onPointer} />
        {paused && !menu && !result && <div className="paused-flag">一時停止中 — 育成や配置換えはできます</div>}
        {moving && <div className="move-hint">移す台座に触れてください<button className="btn small" onClick={() => setMoving(false)}>やめる</button></div>}
        {b.phase === 'setup' && !selW && (
          <div className="setup">
            <div className="setup-card">
              <div className="setup-title">第{ch.id}章 {stageId}「{s.name}」{s.boss && <span className="tag boss">ボス</span>}</div>
              <div className="setup-enemies">
                {stageEnemies(stageId).map((id) => { const e = enemy(id); return <div key={id} className="eicon" title={e.name} style={enemyStyle(e, 34)} />; })}
              </div>
              <p>仲間に触れて選び、光る台座に触れると配置を変えられます。</p>
              <button className="btn gold big" onClick={begin}>出撃！</button>
            </div>
          </div>
        )}
        {selW && (
          <UnitPanel
            p={p}
            w={selW}
            inBattle
            bossStage={s.boss}
            onChange={onChange}
            onFx={(kind, wid, label) => glowWarden(fx, p, wid, kind, label)}
            onMove={() => setMoving(true)}
            onClose={() => { setSel(null); setMoving(false); }}
          />
        )}
        {b.phase === 'setup' && selW && (
          <button className="btn gold big start-float" onClick={begin}>出撃！</button>
        )}
      </div>

      <div className="roster">
        {p.wardens.map((w) => {
          const j = job(w.job);
          const up = !levelUpError(p, w) || (w.lv >= maxLv(j, p.mode) && j.next.length > 0);
          return (
            <div key={w.id} className={`rcard ${sel === w.id ? 'sel' : ''} ${w.resting ? 'resting' : ''}`} onPointerDown={() => { playSe('menu'); setSel(sel === w.id ? null : w.id); setMoving(false); }}>
              <div className="face" style={faceStyle(w.sprite, 34)} />
              <div className="rtxt">
                <b>{j.name}</b>
                <span>Lv{w.lv}{w.limit ? `+${w.limit}` : ''}</span>
              </div>
              {up && <i className="up">{w.lv >= maxLv(j, p.mode) ? '転' : '▲'}</i>}
              {fighting && (
                <button
                  className={`zzz ${w.resting ? 'on' : ''}`}
                  aria-label={w.resting ? '起こす' : '休ませる'}
                  onPointerDown={(e) => { e.stopPropagation(); setRest(w, !w.resting); playSe('menu'); onChange(); }}
                >Zz</button>
              )}
              {w.resting && <i className="gauge"><i style={{ width: `${s.boss ? 0 : w.rest * 100}%` }} /></i>}
            </div>
          );
        })}
      </div>

      {menu === 'pause' && (
        <Modal title="一時停止" onClose={() => setMenu('')}>
          <div className="pause-menu">
            <button className="btn gold big" onClick={() => { playSe('menu'); setMenu(''); }}>再開する</button>
            <button className="btn" onClick={retry}>はじめからやり直す</button>
            <button className="btn" onClick={toMap}>地図へ戻る</button>
            <div className="row2">
              <button className="btn small" onClick={() => setMenu('help')}>遊び方</button>
              <button className="btn small" onClick={() => setMenu('settings')}>設定</button>
            </div>
            <p className="muted">やり直しても、ここまでに得た EXP・金貨・育成は残ります。</p>
          </div>
        </Modal>
      )}
      {menu === 'help' && <Help onClose={() => setMenu('pause')} />}
      {menu === 'settings' && <SettingsPanel settings={settings} onSettings={onSettings} onClose={() => setMenu('pause')} />}

      {result && (
        <Modal className={`result ${result.win ? 'win' : 'lose'}`}>
          <div className="result-box" style={{ backgroundImage: result.win ? `url(${imgUrl('result')})` : undefined }}>
            {result.win ? (
              <>
                <div className="res-title">防衛成功！</div>
                <div className="res-stars">{[1, 2, 3].map((i) => <span key={i} className={i <= result.stars ? 'on' : ''} style={{ animationDelay: `${i * 0.18}s` }}>★</span>)}</div>
                {result.stage === STAGE_COUNT && result.firstClear && <div className="ending">魔境の主を討ち、村に平和が戻った。八人の防衛隊の名は語り継がれる──</div>}
              </>
            ) : (
              <>
                <div className="res-title lose">村が落ちた…</div>
                <p className="muted">得た EXP・金貨は残っています。育ててからもう一度。</p>
              </>
            )}
            <div className="res-rows">
              <div><span>倒した敵</span><b>{result.kills}</b></div>
              <div><span>失った村人</span><b>{result.lost}</b></div>
              <div><span>得た EXP</span><b>{fmtNum(result.exp)}</b>{result.restExp > 0 && <small>（休憩 {fmtNum(result.restExp)}）</small>}</div>
              <div><span>得た金貨</span><b>{fmtNum(result.coins)}</b></div>
              {result.win && <div><span>点数</span><b>{fmtNum(result.score)}</b></div>}
            </div>
            <div className="res-btns">
              {result.win && stageId < STAGE_COUNT && canPlay(p, stageId + 1) && <button className="btn gold big" onClick={() => { playSe('equip'); onPlay(stageId + 1); }}>次のステージへ</button>}
              <button className={`btn ${result.win ? '' : 'gold big'}`} onClick={() => { playSe('menu'); retry(); }}>{result.win ? 'もう一度' : 'やり直す'}</button>
              <button className="btn" onClick={() => { playSe('menu'); toMap(); }}>地図へ</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
