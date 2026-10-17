import type {JobDef} from '../game/types';
export type AttackStyle=JobDef['fx'];
export interface Motion {t0:number;dur:number;dx:number;dy:number;style:AttackStyle}
export const MOTION:Record<AttackStyle,{duration:number;reach:number;lift:number;recoil:number}>={
 slash:{duration:.4,reach:38,lift:4,recoil:8},spear:{duration:.32,reach:48,lift:1,recoil:6},arrow:{duration:.45,reach:0,lift:1,recoil:10},
 bullet:{duration:.28,reach:0,lift:0,recoil:18},cannon:{duration:.55,reach:0,lift:3,recoil:28},shuriken:{duration:.26,reach:28,lift:13,recoil:4},
 magic:{duration:.5,reach:0,lift:7,recoil:4},chain:{duration:.42,reach:12,lift:3,recoil:5},potion:{duration:.48,reach:16,lift:5,recoil:5},dragon:{duration:.5,reach:44,lift:30,recoil:8}};
export function sampleMotion(m:Motion|undefined,t:number){
 if(!m||t<m.t0||t>=m.t0+m.dur)return {pose:0,x:0,y:0,lean:0,active:false};
 const k=(t-m.t0)/m.dur,p=MOTION[m.style],anticipation=k<.22?(k/.22):0;
 const drive=k<.22?0:k<.62?Math.sin((k-.22)/.4*Math.PI/2):Math.cos((k-.62)/.38*Math.PI/2);
 return {pose:k<.22?1:k<.72?2:0,x:m.dx*(p.reach*drive-p.recoil*anticipation),y:m.dy*p.reach*drive*.25-p.lift*Math.sin(k*Math.PI),lean:m.style==='shuriken'?m.dx*drive*.11:m.style==='cannon'?-m.dx*drive*.05:0,active:true};
}
export function facingFor(dx:number,previous=-1){return Math.abs(dx)<28?previous:dx<0?-1:1;}
