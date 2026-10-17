// DEV-only visual acceptance scene. Never reads or writes browser save data.
import {useEffect,useRef,useState} from 'react';
import {newProgress} from '../game/progress';
import {JOBS} from '../game/jobs';
import {ENEMIES} from '../game/enemies';
import {pathOf} from '../game/field';
import {createBattle,startFight,advance,useSkill,type SimEnemy} from '../game/sim';
import {newFx,consume,tickFx} from '../view/effects';
import {draw} from '../view/renderer';
import {loadImages} from '../view/assets';
import {SKILLS} from '../game/skills';
function scene(jobId:string,sprite:number){
 const p=newProgress('normal',320);p.wardens.forEach(w=>{w.resting=true;});const w=p.wardens[sprite];w.resting=false;w.job=jobId;w.pedestal=4;
 const other=p.wardens.find(x=>x!==w&&x.pedestal===4);if(other)other.pedestal=1;
 const b=createBattle(p,1,320);b.def={...b.def,groups:[]};b.spawned=[];b.groupStart=[];b.events=[];b.enemies=[];
 for(const [i,pos] of [[540,548],[970,460],[550,460]].entries()){
 const id=i===2?'bat':'goblin',def=ENEMIES[id],fly=def.kind==='fly';const e:SimEnemy={uid:b.nextUid++,def:id,kind:def.kind,boss:false,hp:1000000,maxHp:1000000,lane:1,d:pos[0]+70,length:pathOf(1,fly).length,x:pos[0],y:pos[1],speed:0,slowPerm:1,slow:1,slowUntil:0,stopUntil:0,stopImmune:0,armorUntil:0,defDown:0,defUntil:0,dead:false,out:false};b.enemies.push(e);}
 startFight(b);return {p,b,fx:newFx(),run:false};
}
export function EffectReview(){
 const [jobId,setJobId]=useState('swordsman'),[sprite,setSprite]=useState(0),[speed,setSpeed]=useState(1),[reduced,setReduced]=useState(false),[paused,setPaused]=useState(false);
 const state=useRef(scene(jobId,sprite)),canvas=useRef<HTMLCanvasElement>(null),wrap=useRef<HTMLDivElement>(null);
 const live=useRef({speed,reduced,paused});live.current={speed,reduced,paused};
 useEffect(()=>{state.current=scene(jobId,sprite);},[jobId,sprite]);
 useEffect(()=>{let raf=0,last=performance.now(),alive=true;void loadImages();const frame=(now:number)=>{if(!alive)return;const dt=Math.min(.08,(now-last)/1000);last=now;const s=state.current,l=live.current;s.fx.speed=l.speed as 1|2|3;s.fx.reduced=l.reduced;
 if(!l.paused){if(s.run){advance(s.b,s.p,dt*l.speed);consume(s.fx,s.b.events,s.b,s.p);s.b.events=[];}tickFx(s.fx,dt);}
 const c=canvas.current,e=wrap.current;if(c&&e){const d=Math.min(2,devicePixelRatio||1),w=Math.round(e.clientWidth*d),h=Math.round(e.clientHeight*d);if(c.width!==w||c.height!==h){c.width=w;c.height=h;}const g=c.getContext('2d');if(g)draw(g,w,h,s.b,s.p,s.fx,{selected:null,moving:false,setup:false});}
 raf=requestAnimationFrame(frame);};raf=requestAnimationFrame(frame);return()=>{alive=false;cancelAnimationFrame(raf);};},[]);
 const play=(skill:boolean)=>{const s=scene(jobId,sprite);s.fx.reduced=reduced;s.fx.speed=speed;s.run=!skill;if(skill){s.p.wardens[sprite].sp=1;useSkill(s.b,s.p,s.p.wardens[sprite]);consume(s.fx,s.b.events,s.b,s.p);s.b.events=[];}state.current=s;setPaused(false);};
 return <div style={{height:'100dvh',display:'flex',flexDirection:'column',background:'#101a29',color:'white'}}><div style={{display:'flex',gap:6,flexWrap:'wrap',padding:5,fontSize:12}}><b>開発用・演出確認</b><select aria-label="職業" value={jobId} onChange={e=>setJobId(e.target.value)}>{Object.values(JOBS).map(j=><option key={j.id} value={j.id}>{j.name} / {j.fx}</option>)}</select><select aria-label="人物" value={sprite} onChange={e=>setSprite(Number(e.target.value))}>{newProgress('normal',1).wardens.map(w=><option key={w.sprite} value={w.sprite}>{w.name}</option>)}</select><button onClick={()=>play(false)}>通常攻撃</button><button onClick={()=>play(true)}>必殺技 {SKILLS[JOBS[jobId].skill].name}</button><button onClick={()=>setPaused(!paused)}>{paused?'再開':'停止'}</button><button onClick={()=>setSpeed(speed===3?1:speed+1)}>速度{speed}</button><button onClick={()=>setReduced(!reduced)}>{reduced?'控えめ':'標準'}</button></div><div ref={wrap} style={{flex:1,minHeight:0}}><canvas ref={canvas} style={{width:'100%',height:'100%',display:'block'}}/></div></div>;
}
