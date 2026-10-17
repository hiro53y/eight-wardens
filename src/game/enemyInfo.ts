import {enemy} from './enemies';
import type {Battle,SimEnemy} from './sim';
import type {BossSkill,EnemyDef} from './types';
export const BOSS_TECH:Record<BossSkill,string>={summon:'手下召喚',charge:'突進',roar:'咆哮',regen:'再生',burrow:'潜行',dive:'降下'};
export function counterAdvice(e:EnemyDef):string[]{const a:string[]=[];if(e.kind==='fly')a.push('狩の系統が有効。剣は飛行への倍率を確認');if(e.kind==='metal')a.push('メタルに通る武士・侍、鎧はがしが有効');if(e.shield)a.push('鎧はがし・守り下げで盾を外す');if(e.healer)a.push('周囲の敵を回復するため早めに倒す');if(e.split)a.push('撃破後の分裂にも対処できる範囲攻撃を用意');if(e.stealth)a.push('接近するか攻撃が当たると姿が見える');if(e.rage)a.push('傷つくと加速するため停止・鈍化を用意');if(e.dive)a.push('降下後は地上への攻撃も有効');if(!a.length)a.push(e.speed>=100?'速い敵。停止・鈍化と集中攻撃が有効':'進行路と射程を合わせて集中攻撃');return a;}
export function visibleEnemy(e:SimEnemy):boolean{return !e.dead&&!e.out&&!e.hidden&&e.x>-20&&(!enemy(e.def).stealth||!!e.revealed);}
export function hitEnemy(b:Battle,x:number,y:number):SimEnemy|null{let best:SimEnemy|null=null,d=Infinity;for(const e of b.enemies){if(!visibleEnemy(e))continue;const h=enemy(e.def).size,foot=e.kind==='fly'?e.y+h*.4:e.y+14;const dx=(x-e.x)/(h*.55),dy=(y-(foot-h*.5))/(h*.6),r=dx*dx+dy*dy;if(r<=1&&r<d){best=e;d=r;}}return best;}
export function bossForecast(b:Battle,e:SimEnemy){const state=b.bossState[e.uid],def=enemy(e.def);return {seconds:Math.max(0,Math.ceil((state?.nextAt??b.t+7)-b.t)),candidates:(def.bossSkills??[]).filter(s=>s!=='dive'||(!e.landed&&e.kind==='fly')).map(s=>BOSS_TECH[s]),phase:state?.phase??0};}
