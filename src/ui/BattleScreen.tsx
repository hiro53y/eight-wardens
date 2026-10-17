import {EnemyPanel} from './EnemyPanel';
import {bossForecast,hitEnemy} from '../game/enemyInfo';
// 防衛戦：Canvas の戦場＋上の帯（敵・村人・EXP・金貨・速さ）＋下の8人の札＋守り手の小窓
// 本編・無限の塔・毎日の挑戦の3つをこの画面で遊ぶ
import { useEffect, useRef, useState } from 'react';
import { battleTrack, playBgm } from '../audio/bgm';
import { playSe } from '../audio/sound';
import { enemy } from '../game/enemies';
import { openChests } from '../game/items';
import { job, maxLv } from '../game/jobs';
import { applyResult, canPlay, levelUpError, moveTo, setRest } from '../game/progress';
import { saveProgress } from '../game/save';
import { SKILLS } from '../game/skills';
import { advance, callNext, createBattle, nextGroupAt, refreshStats, remaining, skillWarning, skillError, startFight, useSkill, type Battle } from '../game/sim';
import { STAGE_COUNT } from '../game/stages';
import { BUFFS, DAILY_RULES, chooseBuff, dailyDef, dailyResult, dateKey, floorScore, towerFloor, towerMods, towerResult, type DailyRule } from '../game/tower';
import type { BuffId, Item, Progress, Settings, Warden } from '../game/types';
import { enemyStyle, faceStyle, imgUrl } from '../view/assets';
import { banner, consume, glowWarden, newFx, tickFx, type Fx } from '../view/effects';
import { draw, hitPedestal, hitWarden, toField, viewportOf } from '../view/renderer';
import { Help, Modal, SettingsPanel, fmtNum } from './common';
import { ItemRow } from './Hub';
import { UnitPanel } from './UnitPanel';

export type BattleMode = { kind: 'stage'; stage: number } | { kind: 'tower' } | { kind: 'daily' };

interface Props {
  p: Progress;
  mode: BattleMode;
  settings: Settings;
  onSettings: (s: Settings) => void;
  onChange: () => void;
  onMap: () => void;
  onPlay: (m: BattleMode) => void;
}

type Menu = '' | 'pause' | 'help' | 'settings';

interface Outcome {
  win: boolean;
  kills: number;
  lost: number;
  exp: number;
  coins: number;
  restExp: number;
  bestCombo: number;
  score: number;
  stars?: number;
  firstClear?: boolean;
  chests: { item: Item; kept: boolean }[];
  tower?: { floor: number; ended: boolean; newBest: boolean };
  daily?: { reward: boolean };
}

/** 初めての人への案内 */
const TIPS: Record<string, string> = {
  lv: 'EXP がたまった！ 下の札か戦場の仲間に触れて「レベルアップ」。',
  skill: '技がたまった！ 札の「技」か、仲間を素早く2回タップで撃てる。',
  rest: '敵が来ない所の仲間は「Zz」で休ませると EXP がたまる。',
  job: 'Lv3 で転職できる。札に「転」が出た仲間に触れて、2つの職から選ぼう。',
  call: '「呼ぶ」で次の群れを早く呼ぶと、縮めた秒数ぶん金貨がもらえる。',
  synergy: '隣り合わせの連携：同じ系統が隣だと攻撃が上がる。光る線で結ばれた仲間を見よう。',
  chest: '宝箱を拾った！ 結果の画面で開き、仲間に触れて「装備」から付けられる。',
};

export function BattleScreen({ p, mode, settings, onSettings, onChange, onMap, onPlay }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const coinChip = useRef<HTMLDivElement>(null);
  const [setup] = useState(() => {
    for (const w of p.wardens) { w.resting = false; w.rest = 0; w.sp = 0; }
    const seed = (p.seed ^ Date.now()) | 0;
    if (mode.kind === 'tower') {
      const run = p.tower.run!;
      const def = towerFloor(run.floor, p.mode, p.unlocked);
      return { b: createBattle(p, def.id, run.seed + run.floor * 31, { def, kind: 'tower', mods: towerMods(run.buffs), villagers: run.villagers, maxVillagers: run.maxVillagers }), rule: null as DailyRule | null, date: '' };
    }
    if (mode.kind === 'daily') {
      const date = dateKey();
      const d = dailyDef(p, date);
      return { b: createBattle(p, d.def.id, seed, { def: d.def, kind: 'daily', mods: d.mods }), rule: d.rule as DailyRule | null, date };
    }
    return { b: createBattle(p, mode.stage, (seed ^ (mode.stage * 7919)) | 0), rule: null as DailyRule | null, date: '' };
  });
  const b: Battle = setup.b;
  const fxRef = useRef<Fx>(newFx());
  const [speed, setSpeed] = useState<1 | 2 | 3>(settings.speed);
  const [paused, setPaused] = useState(false);
  const [menu, setMenu] = useState<Menu>('');
  const [enemyId,setEnemyId]=useState<number|null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [result, setResult] = useState<Outcome | null>(null);
  const [chosen, setChosen] = useState<BuffId | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const lastTap = useRef({ id: '', at: 0 });
  const press = useRef<number | null>(null);

  // ループから読む値
  const live = useRef({ speed, stop: false, sel, moving, auto: settings.autoSkill });
  live.current = { speed, stop: paused || menu !== '' || enemyId !== null || !!result, sel, moving, auto: settings.autoSkill };
  const ended = useRef<{ at: number; r: Outcome } | null>(null);

  const s = b.def;
  const stageId = mode.kind === 'stage' ? mode.stage : 0;

  useEffect(() => { playBgm(battleTrack(s.chapter, s.boss)); }, [s.chapter, s.boss]);
  useEffect(() => { fxRef.current.numbers = settings.numbers; }, [settings.numbers]);
  useEffect(() => { saveProgress(p); }, [p]);

  /** 合戦が終わった時の始末（1回だけ） */
  const finish = (): Outcome => {
    for (const w of p.wardens) { w.resting = false; w.rest = 0; }
    const win = b.phase === 'won';
    const tier = s.tier ?? Math.max(1, p.unlocked);
    const base = { win, kills: b.kills, lost: b.lost, exp: b.exp, coins: b.coins, restExp: b.restExp, bestCombo: b.bestCombo };
    let out: Outcome;
    if (mode.kind === 'tower') {
      p.stats.battles += 1;
      const tr = towerResult(p, win, b.villagers, b.lost);
      out = { ...base, score: win ? floorScore(tr.floor, b.lost) : 0, chests: openChests(p, b.chests, tier, b.seed), tower: tr };
    } else if (mode.kind === 'daily') {
      p.stats.battles += 1;
      const score = b.kills * 10 + b.villagers * 30 + b.bestCombo * 5;
      const reward = dailyResult(p, setup.date, win, score);
      const chests = openChests(p, b.chests, tier, b.seed);
      if (reward) chests.push(...openChests(p, 2, tier + 2, b.seed ^ 0x5a5a, 2));
      out = { ...base, score, chests, daily: { reward } };
    } else {
      const r = applyResult(p, { win, stage: mode.stage, kills: b.kills, lost: b.lost, exp: b.exp, coins: b.coins, restExp: b.restExp, time: b.t });
      out = { ...base, score: r.score, stars: r.stars, firstClear: r.firstClear, chests: openChests(p, b.chests, tier, b.seed) };
    }
    saveProgress(p);
    return out;
  };

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
      fx.reduced=settings.effects==='reduced';
      b.autoSkill = L.auto;
      if (!L.stop) {
        fx.speed = L.speed;
        if (b.phase === 'fight') {
          // ヒットストップの間は進めない
          if (fx.freeze > 0) fx.freeze = Math.max(0, fx.freeze - dt);
          else advance(b, p, dt * L.speed);
          if (b.events.length) { consume(fx, b.events, b, p); b.events = []; }
        }
        tickFx(fx, dt);
        if (b.phase !== 'fight' && b.phase !== 'setup' && !ended.current) {
          if (b.events.length) { consume(fx, b.events, b, p); b.events = []; }
          ended.current = { at: fx.now, r: finish() };
        }
        if (ended.current && fx.now - ended.current.at > (b.phase === 'won' ? 2.2 : 1.6)) {
          const r = ended.current.r;
          ended.current = { at: Infinity, r };
          setResult(r);
          setSel(null);
          setMoving(false);
          onChange();
        }
      } else if (b.events.length && b.phase === 'fight') {
        // 一時停止中に撃った技も見せる
        consume(fx, b.events, b, p); b.events = [];
      }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cw = Math.round(el.clientWidth * dpr), chh = Math.round(el.clientHeight * dpr);
      if (cv.width !== cw || cv.height !== chh) { cv.width = cw; cv.height = chh; }
      let coinTarget: [number, number] | undefined;
      const cc = coinChip.current;
      if (cc) {
        const a = cc.getBoundingClientRect(), r = el.getBoundingClientRect();
        coinTarget = [(a.left + a.width / 2 - r.left) * dpr, (a.top + a.height / 2 - r.top) * dpr];
      }
      const g = cv.getContext('2d');
      if (g) draw(g, cw, chh, b, p, fx, { selected: L.sel, moving: L.moving, setup: b.phase === 'setup', coinTarget });
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [b, p, onChange, settings.effects]);

  // 確かめ用の口（開発中か ?dbg=1 の時だけ）：早送りと状態の読み出し
  useEffect(() => {
    if (!import.meta.env.DEV && !location.search.includes('dbg=1')) return;
    const w = window as unknown as { __ew?: unknown };
    w.__ew = {
      b, p, fx: fxRef.current,
      run: (sec: number) => { advance(b, p, sec); consume(fxRef.current, b.events, b, p); b.events = []; tickFx(fxRef.current, 0.016); return { phase: b.phase, t: b.t, villagers: b.villagers, kills: b.kills, left: remaining(b), combo: b.combo, chests: b.chests }; },
      start: () => startFight(b),
      skill: (i: number) => { const ww = p.wardens[i]; ww.sp = 1; return useSkill(b, p, ww); },
      call: () => callNext(b, p),
    };
    return () => { delete w.__ew; };
  }, [b, p]);

  // 上の帯・札の描き直し、時々の保存、案内
  useEffect(() => {
    let n = 0;
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
      if (++n % 40 === 0 && b.phase === 'fight') saveProgress(p);
      if (n % 8 === 0) {
        const seen = (k: string) => p.tips.includes(k);
        let want: string | null = null;
        if (b.phase === 'setup' && stageId >= 4 && !seen('synergy')) want = 'synergy';
        else if (b.phase === 'fight') {
          if (!seen('lv') && p.exp >= 20) want = 'lv';
          else if (!seen('skill') && p.wardens.some((w) => (w.sp ?? 0) >= 1)) want = 'skill';
          else if (!seen('job') && p.wardens.some((w) => w.lv >= 3 && job(w.job).next.length)) want = 'job';
          else if (!seen('rest') && stageId >= 2 && b.t > 8 && !b.boss) want = 'rest';
          else if (!seen('call') && stageId >= 3 && nextGroupAt(b) !== null && b.t > 4) want = 'call';
          else if (!seen('chest') && b.chests > 0) want = 'chest';
        }
        setTip((cur) => cur ?? want);
      }
    }, 125);
    return () => { window.clearInterval(id); saveProgress(p); };
  }, [b, p, stageId]);

  // 裏に回ったら止める
  useEffect(() => {
    const on = () => { if (document.hidden && b.phase === 'fight') { setMenu('pause'); saveProgress(p); } };
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, [b, p]);

  const selW = sel ? p.wardens.find((w) => w.id === sel) ?? null : null;

  const fire = (w: Warden) => {
    if (useSkill(b, p, w)) { refreshStats(b, p); onChange(); }
    else playSe('miss');
  };

  const fieldPoint = (e: React.PointerEvent): [number, number] | null => {
    const el = wrap.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const v = viewportOf(Math.round(el.clientWidth * dpr), Math.round(el.clientHeight * dpr));
    return toField(v, (e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr);
  };

  const endPress = () => { if (press.current !== null) { window.clearTimeout(press.current); press.current = null; } };

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (result) return;
    const pt = fieldPoint(e);
    if (!pt) return;
    const [x, y] = pt;
    if (moving && selW) {
      const ped = hitPedestal(x, y);
      if (ped >= 0) { moveTo(p, selW, ped); refreshStats(b, p); playSe('equip'); onChange(); }
      setMoving(false);
      return;
    }
    const w = hitWarden(p, x, y);
    if (w) {
      const now = performance.now();
      const dbl = lastTap.current.id === w.id && now - lastTap.current.at < 380;
      lastTap.current = { id: w.id, at: now };
      endPress();
      // 長押しで配置換え
      press.current = window.setTimeout(() => { press.current = null; setSel(w.id); setMoving(true); playSe('menu'); }, 480);
      if (dbl && (w.sp ?? 0) >= 1 && b.phase === 'fight') { fire(w); setSel(w.id); return; }
      playSe('menu');
      setSel(w.id === sel && !dbl ? null : w.id);
      return;
    }
    if (selW && b.phase === 'setup') {
      const ped = hitPedestal(x, y);
      if (ped >= 0) { moveTo(p, selW, ped); refreshStats(b, p); playSe('equip'); onChange(); return; }
    }
    const target=hitEnemy(b,x,y);
    if(target){setSel(null);setMoving(false);setEnemyId(target.uid);endPress();return;}
    setSel(null);
  };

  useEffect(()=>()=>endPress(),[]);

  const begin = () => {
    startFight(b);
    setSel(null);
    setMoving(false);
    banner(fxRef.current, 'banner_wave', 1.6, s.name);
    playSe('roar');
    saveProgress(p);
  };

  const allRest = (on: boolean) => {
    for (const w of p.wardens) setRest(w, on);
    playSe('menu');
    onChange();
  };

  const closeTip = () => { if (tip && !p.tips.includes(tip)) p.tips.push(tip); setTip(null); saveProgress(p); };

  const retry = () => {
    saveProgress(p);
    if (mode.kind === 'tower' && !p.tower.run) { onMap(); return; }
    onPlay(mode);
  };
  const toMap = () => { saveProgress(p); onMap(); };

  const fx = fxRef.current;
  const left = remaining(b);
  const boss = b.enemies.find((e) => e.boss);
  const forecast=boss?bossForecast(b,boss):null;
  const inspected=enemyId===null?null:b.enemies.find(e=>e.uid===enemyId);
  const anyRest = p.wardens.some((w) => w.resting);
  const allResting = p.wardens.every((w) => w.resting);
  const fighting = b.phase === 'fight';
  const nextAt = fighting ? nextGroupAt(b) : null;
  const nextSec = nextAt !== null ? Math.ceil(nextAt - b.t) : 0;
  const comboOn = fighting && b.combo >= 3 && b.t <= b.comboUntil;
  const feverLeft = Math.max(0, b.feverUntil - b.t);
  const noRest = b.boss || !!b.mods.noRest;
  const run = p.tower.run;
  const label = mode.kind === 'tower' ? `塔 ${run?.floor ?? ''}階` : mode.kind === 'daily' ? '毎日' : `${s.chapter}-${((stageId - 1) % 7) + 1}`;

  return (
    <div className="screen battle-screen">
      <div className="hud-top">
        <button className="btn icon" aria-label="一時停止" onClick={() => { playSe('menu'); setMenu('pause'); }}>Ⅱ</button>
        <div className="stage-name"><small>{label}</small>{s.name}</div>
        <div className="chip enemies"><span>敵</span><b>{left}</b><i className="mini-bar"><i style={{ width: `${Math.max(0, Math.min(1, 1 - left / b.total)) * 100}%` }} /></i></div>
        <div className={`chip lives ${b.villagers <= 3 ? 'danger' : ''}`}><span>村人</span><b>{b.villagers}</b>/{b.villagersStart}</div>
        <div className="chip exp"><span>EXP</span><b>{fmtNum(p.exp)}</b></div>
        <div className="chip coin" ref={coinChip}><span>金貨</span><b>{fmtNum(p.coins)}</b></div>
        {b.chests > 0 && <div className="chip chest"><span>宝</span><b>{b.chests}</b></div>}
        <span className="grow" />
        {!noRest && (
          <button className={`btn small ${allResting ? 'blue' : ''}`} onClick={() => allRest(!anyRest)}>{anyRest ? '全員起こす' : '全員休憩'}</button>
        )}
        <button className="btn small speed" onClick={() => { const n = (speed % 3 + 1) as 1 | 2 | 3; setSpeed(n); playSe('menu'); }}>×{speed}</button>
        <button className={`btn small ${paused ? 'gold' : ''}`} onClick={() => { setPaused(!paused); playSe('menu'); }}>{paused ? '▶' : '止'}</button>
      </div>

      {boss && (
        <div className="boss-bar">
          <span>{enemy(boss.def).name}{forecast&&<small className="boss-countdown">行動まで約{forecast.seconds}秒 · 候補 {forecast.candidates.join('／')}</small>}{b.bossState[boss.uid]?.phase ? ` ${'!'.repeat(b.bossState[boss.uid].phase)}` : ''}</span>
          <i><i style={{ width: `${Math.max(0, boss.hp / boss.maxHp) * 100}%` }} /></i>
        </div>
      )}

      <div className="field" ref={wrap}>
        <canvas ref={canvas} onPointerDown={onPointer} onPointerUp={endPress} onPointerLeave={endPress} onPointerCancel={endPress} />
        {nextAt !== null && nextSec >= 1 && !result && (
          <button className="call-btn" onClick={() => { const c = callNext(b, p); if (c) onChange(); else playSe('miss'); }}>
            <span>次の群れ {nextSec}秒</span><b>呼ぶ +{fmtNum(Math.round(nextSec * 2 * b.reward))}G</b>
          </button>
        )}
        {comboOn && <div className="combo" key={b.combo}><b>{b.combo}</b><span>連撃</span></div>}
        {feverLeft > 0 && fighting && <div className="fever">FEVER<i><i style={{ width: `${(feverLeft / 8) * 100}%` }} /></i></div>}
        {paused && !menu && !result && <div className="paused-flag">一時停止中 — 育成・配置換え・技はできます</div>}
        {moving && <div className="move-hint">移す台座に触れてください<button className="btn small" onClick={() => setMoving(false)}>やめる</button></div>}
        {b.phase === 'setup' && !selW && (
          <div className="setup">
            <div className="setup-card">
              <div className="setup-title">{mode.kind === 'stage' ? `第${s.chapter}章 ${stageId}「${s.name}」` : s.name}{s.boss && <span className="tag boss">ボス</span>}</div>
              <div className="setup-enemies">
                {[...new Set(s.groups.map((g) => g.enemy))].map((id) => { const e = enemy(id); return <div key={id} className="eicon" title={e.name} style={enemyStyle(e, 34)} />; })}
              </div>
              <p className={mode.kind==='stage'?'setup-guide':'setup-note'}>
                {mode.kind === 'tower' && run ? `恩恵：${run.buffs.map((x) => BUFFS[x].name).join('・') || 'なし'}` : mode.kind === 'daily' && setup.rule ? DAILY_RULES[setup.rule].desc : '仲間に触れて選び、光る台座に触れると配置を変えられる。'}
              </p>
              <button className="btn gold big" onClick={begin}>出撃！</button>
            </div>
          </div>
        )}
        {selW && (
          <UnitPanel
            p={p}
            w={selW}
            inBattle
            bossStage={b.boss}
            noRest={!!b.mods.noRest}
            mods={b.mods}
            skillErr={skillError(b, selW)}
            skillWarning={skillWarning(b,selW)??undefined}
            onSkill={() => fire(selW)}
            onChange={() => { refreshStats(b, p); onChange(); }}
            onFx={(kind, wid, lbl) => glowWarden(fx, p, wid, kind, lbl)}
            onMove={() => setMoving(true)}
            onClose={() => { setSel(null); setMoving(false); }}
          />
        )}
        {b.phase === 'setup' && selW && (
          <button className="btn gold big start-float" onClick={begin}>出撃！</button>
        )}
        {tip && !result && !menu && (
          <div className="tip" onPointerDown={(e) => e.stopPropagation()}>
            <span>{TIPS[tip]}</span>
            <button className="btn small" onClick={closeTip}>わかった</button>
          </div>
        )}
      </div>

      <div className="roster">
        {p.wardens.map((w) => {
          const j = job(w.job);
          const up = !levelUpError(p, w) || (w.lv >= maxLv(j, p.mode) && j.next.length > 0);
          const ready = fighting && (w.sp ?? 0) >= 1;
          return (
            <div key={w.id} className={`rcard ${sel === w.id ? 'sel' : ''} ${w.resting ? 'resting' : ''} ${ready ? 'ready' : ''}`} onPointerDown={() => { playSe('menu'); setSel(sel === w.id ? null : w.id); setMoving(false); }}>
              <div className="face" style={faceStyle(w.sprite, 34)} />
              <div className="rtxt">
                <b>{j.name}</b>
                <span>Lv{w.lv}{w.limit ? `+${w.limit}` : ''}</span>
              </div>
              {ready
                ? <button className="skill-btn" style={{ borderColor: SKILLS[j.skill].color }} aria-label={`技 ${SKILLS[j.skill].name}`} onPointerDown={(e) => { e.stopPropagation(); fire(w); }}>技</button>
                : up && <i className="up">{w.lv >= maxLv(j, p.mode) ? '転' : '▲'}</i>}
              {fighting && (
                <button
                  className={`zzz ${w.resting ? 'on' : ''}`}
                  aria-label={w.resting ? '起こす' : '休ませる'}
                  onPointerDown={(e) => { e.stopPropagation(); setRest(w, !w.resting); playSe('menu'); onChange(); }}
                >Zz</button>
              )}
              <i className="spgauge"><i style={{ width: `${Math.min(1, w.sp ?? 0) * 100}%` }} /></i>
              {w.resting && <i className="gauge"><i style={{ width: `${noRest ? 0 : w.rest * 100}%` }} /></i>}
            </div>
          );
        })}
      </div>

      {inspected&&<EnemyPanel b={b} e={inspected} onClose={()=>setEnemyId(null)}/>}
      {menu === 'pause' && (
        <Modal title="一時停止" onClose={() => setMenu('')}>
          <div className="pause-menu">
            <button className="btn gold big" onClick={() => { playSe('menu'); setMenu(''); }}>再開する</button>
            <button className={`btn ${settings.autoSkill ? 'blue' : ''}`} onClick={() => { onSettings({ ...settings, autoSkill: !settings.autoSkill }); playSe('menu'); }}>技を自動で撃つ：{settings.autoSkill ? 'する' : 'しない'}</button>
            {mode.kind !== 'tower' && <button className="btn" onClick={retry}>はじめからやり直す</button>}
            <button className="btn" onClick={toMap}>{mode.kind === 'tower' ? '塔を出る（続きはまた今度）' : '地図へ戻る'}</button>
            <div className="row2">
              <button className="btn small" onClick={() => setMenu('help')}>遊び方</button>
              <button className="btn small" onClick={() => setMenu('settings')}>設定</button>
            </div>
            <p className="muted">やめても、ここまでに得た EXP・金貨・育成は残ります。</p>
          </div>
        </Modal>
      )}
      {menu === 'help' && <Help onClose={() => setMenu('pause')} />}
      {menu === 'settings' && <SettingsPanel settings={settings} onSettings={onSettings} onClose={() => setMenu('pause')} />}

      {result && (
        <Modal className={`result ${result.win ? 'win' : 'lose'}`}>
          <div className="result-box" style={{ backgroundImage: result.win ? `url(${imgUrl('result')})` : undefined }}>
            {mode.kind === 'tower' ? (
              <div className={`res-title ${result.win ? '' : 'lose'}`}>{result.win ? `${result.tower?.floor}階 突破！` : `${result.tower?.floor}階で力尽きた…`}{result.tower?.newBest && <span className="tag elite">最高記録</span>}</div>
            ) : result.win ? (
              <>
                <div className="res-title">防衛成功！</div>
                {result.stars !== undefined && <div className="res-stars">{[1, 2, 3].map((i) => <span key={i} className={i <= result.stars! ? 'on' : ''} style={{ animationDelay: `${i * 0.18}s` }}>★</span>)}</div>}
                {mode.kind === 'stage' && mode.stage === STAGE_COUNT && result.firstClear && <div className="ending">魔境の主を討ち、村に平和が戻った。八人の防衛隊の名は語り継がれる──</div>}
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
              <div><span>最大連撃</span><b>{result.bestCombo}</b></div>
              {(result.win || mode.kind === 'daily') && <div><span>点数</span><b>{fmtNum(result.score)}</b></div>}
            </div>
            {result.daily?.reward && <div className="gold">今日の挑戦ごほうび：宝箱×2！</div>}
            {mode.kind === 'tower' && result.win && run?.choosing && !chosen && (
              <div className="buffs">
                <div className="sec">恩恵を1つ選ぶ</div>
                <div className="buff-list">
                  {run.choosing.map((id) => (
                    <button key={id} className="buff" onClick={() => { if (chooseBuff(p, id)) { setChosen(id); playSe('lvup'); saveProgress(p); onChange(); } }}>
                      <b>{BUFFS[id].name}</b><span>{BUFFS[id].desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="res-btns">
              {mode.kind === 'stage' && result.win && mode.stage < STAGE_COUNT && canPlay(p, mode.stage + 1) && <button className="btn gold big" onClick={() => { playSe('equip'); onPlay({ kind: 'stage', stage: mode.stage + 1 }); }}>次のステージへ</button>}
              {mode.kind === 'tower' && result.win && run && !run.choosing && <button className="btn gold big" onClick={() => { playSe('equip'); onPlay({ kind: 'tower' }); }}>{run.floor}階へ</button>}
              {mode.kind !== 'tower' && <button className={`btn ${result.win ? '' : 'gold big'}`} onClick={() => { playSe('menu'); retry(); }}>{result.win ? 'もう一度' : 'やり直す'}</button>}
              {mode.kind === 'tower' && !result.win && <button className="btn gold big" onClick={() => { playSe('menu'); onPlay({ kind: 'tower' }); }}>また挑む</button>}
              <button className="btn" onClick={() => { playSe('menu'); toMap(); }}>地図へ</button>
            </div>
            {result.chests.length > 0 && (
              <div className="chest-list">
                <div className="sec">宝箱を開けた（{result.chests.length}）</div>
                {result.chests.map((c, i) => (
                  <div key={c.item.id} className="chest-open" style={{ animationDelay: `${0.3 + i * 0.25}s` }}>
                    <ItemRow it={c.item} p={p}>{!c.kept && <small className="muted">持ち物がいっぱい→売った</small>}</ItemRow>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

