import {enemy} from '../game/enemies';
import {BOSS_TECH,bossForecast,counterAdvice} from '../game/enemyInfo';
import type {Battle,SimEnemy} from '../game/sim';
import type {EnemyDef} from '../game/types';
import {enemyStyle} from '../view/assets';
import {Modal,fmtNum} from './common';
export function EnemyDetails({def,b,e}:{def:EnemyDef;b?:Battle;e?:SimEnemy}){const f=b&&e&&def.boss?bossForecast(b,e):null;return <div className="enemy-details"><div className="enemy-profile"><div className="eicon" style={{...enemyStyle(def,84),width:84,height:84}}/><div><b>{def.name}</b><p>{def.boss?'ボス · ':''}{def.kind==='fly'?'飛行':def.kind==='metal'?'メタル':'地上'}</p><p>{e?`HP ${fmtNum(Math.ceil(e.hp))} / ${fmtNum(e.maxHp)}`:`基本HP ${fmtNum(def.hp)}`} · 通過で村人−{def.lives}</p></div></div><p>{def.desc}</p><h3>対処のヒント</h3><ul>{counterAdvice(def).map(a=><li key={a}>{a}</li>)}</ul>{e&&<p>状態：{[e.hidden?'潜行':null,(e.stopUntil>(b?.t??0))?'停止':null,e.slowPerm<1||e.slow<1?'鈍化':null,e.raged?'狂化':null,e.landed?'降下済み':null].filter(Boolean).join('・')||'通常'}</p>}{def.boss&&<div className="boss-advice"><b>{f?`次の行動まで約${f.seconds}秒`:'使用する技'}</b><p>{(f?.candidates??def.bossSkills?.map(s=>BOSS_TECH[s])??[]).join('・')}</p><small>HP66%・33%を下回ると怒り、即座に行動することがあります。次の技は発動時に抽選されます。</small></div>}</div>;}
export function EnemyPanel({b,e,onClose}:{b:Battle;e:SimEnemy;onClose:()=>void}){return <Modal title={enemy(e.def).name} onClose={onClose}><EnemyDetails def={enemy(e.def)} b={b} e={e}/><p className="muted">敵の情報を見ている間は一時停止しています。</p></Modal>;}
