import atlas from '../src/view/artV32.json';
import {existsSync,readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {PEDESTALS,NEIGHBORS} from '../src/game/field';
import {newProgress,clone,moveTo} from '../src/game/progress';
import {parseProgress,loadSettings} from '../src/game/save';
import {createBattle,startFight,advance} from '../src/game/sim';
import {newFx,consume,tickFx} from '../src/view/effects';
import {MOTION,sampleMotion,facingFor} from '../src/view/motion';
import {hitWarden,hitPedestal,viewportOf,toField} from '../src/view/renderer';
import {JOBS} from '../src/game/jobs';

describe('v3.2 新しい防衛地点',()=>{
 it('全12地点への配置と選択が一致し、表示領域に収まる',()=>{
  for(let i=0;i<12;i++){const p=newProgress('normal',1),w=p.wardens[0];moveTo(p,w,i);const [x,y]=PEDESTALS[i];expect(hitPedestal(x,y)).toBe(i);expect(hitWarden(p,x,y-45)?.id).toBe(w.id);expect(parseProgress(JSON.stringify(p))).not.toBeNull();
   for(const [cw,ch] of [[780,260],[844,290],[1280,700]]){const v=viewportOf(cw,ch),sx=x*v.s+v.ox,sy=y*v.s+v.oy;expect(sx).toBeGreaterThan(0);expect(sx).toBeLessThan(cw);expect(sy).toBeGreaterThan(0);expect(sy).toBeLessThan(ch);const q=toField(v,sx,sy);expect(q[0]).toBeCloseTo(x);expect(q[1]).toBeCloseTo(y);}}
 });
 it('旧配置番号は変更せず、育成・装備・進行を保持して読む',()=>{const p=newProgress('normal',7);[4,1,3,7,6,5,8,10].forEach((ped,i)=>p.wardens[i].pedestal=ped);p.unlocked=15;p.exp=1234;p.wardens[0].lv=3;const q=parseProgress(JSON.stringify(p));expect(q).toEqual(p);expect(new Set(p.wardens.map(w=>w.pedestal)).size).toBe(8);});
 it('連携の全辺が相互に一致し、孤立や交差する遠距離リンクを作らない',()=>{for(let i=0;i<12;i++)for(const j of NEIGHBORS[i]){expect(NEIGHBORS[j]).toContain(i);expect(i).not.toBe(j);expect(Math.hypot(PEDESTALS[i][0]-PEDESTALS[j][0],PEDESTALS[i][1]-PEDESTALS[j][1])).toBeLessThanOrEqual(350);}});
});
describe('v3.2 動作と描画の分離',()=>{
 for(const style of Object.keys(MOTION) as (keyof typeof MOTION)[])it(`${style}は構え・実行・復帰を持ち、有限時間で元の位置へ戻る`,()=>{const m={t0:1,dur:MOTION[style].duration,dx:-1,dy:0,style};expect(sampleMotion(m,1.01).pose).toBe(1);expect(sampleMotion(m,1+m.dur*.4).pose).toBe(2);expect(sampleMotion(m,1+m.dur+.01)).toMatchObject({pose:0,x:0,y:0,active:false});for(let i=0;i<30;i++){const s=sampleMotion(m,1+m.dur*i/30);expect([s.x,s.y,s.lean].every(Number.isFinite)).toBe(true);expect(Math.abs(s.x)).toBeLessThanOrEqual(50);}});
 it('対象へ向き直り、境目の微小差では左右に振れない',()=>{expect(facingFor(-80)).toBe(-1);expect(facingFor(80)).toBe(1);expect(facingFor(10,-1)).toBe(-1);expect(facingFor(-10,1)).toBe(1);});
 it('通常/控えめと消費イベントの有無で戦況・資源・乱数が変わらない',()=>{
 const run=(effects:number)=>{const p=newProgress('normal',9),b=createBattle(p,8,77),fx=newFx();fx.reduced=effects===2;startFight(b);b.autoSkill=true;
 for(let i=0;i<600;i++){advance(b,p,.1);if(effects)consume(fx,b.events,b,p);b.events=[];tickFx(fx,.1);}
 return {p,b};};expect(run(1)).toEqual(run(0));expect(run(2)).toEqual(run(0));
 });
 it('2000件の連続イベントでも上限を守り、演出終了後に残骸を残さない',()=>{
 const p=newProgress('normal',2),b=createBattle(p,1,8),fx=newFx();startFight(b);advance(b,p,1);expect(b.enemies.length).toBeGreaterThan(0);const e=b.enemies[0],w=p.wardens[0];
 for(let i=0;i<2000;i++){consume(fx,[{k:'shot',wid:w.id,target:e.uid,fx:'cannon',dur:.4},{k:'hit',uid:e.uid,wid:w.id,n:8,metal:false,weak:false}],b,p);if(i%20===0)tickFx(fx,.016);expect(fx.particles.length).toBeLessThanOrEqual(240);expect(fx.strikes.length).toBeLessThanOrEqual(90);}
 tickFx(fx,10);for(const a of [fx.projectiles,fx.strikes,fx.flashes,fx.particles,fx.texts])expect(a).toHaveLength(0);expect(fx.lunge.size).toBe(0);expect(fx.hitUntil.size).toBe(0);expect(fx.flashUntil).toBe(0);expect(fx.shakeUntil).toBe(0);
 });
 it('設定がない旧データと不正な演出設定は標準になる',()=>{for(const value of [{},{effects:'broken'}]){const s=loadSettings({getItem:()=>JSON.stringify(value),setItem(){},removeItem(){}});expect(s.effects).toBe('standard');}});
 it('演出定義は21職の全攻撃系統を網羅する',()=>{for(const j of Object.values(JOBS))expect(MOTION[j.fx]).toBeDefined();});
});

describe('v3.2 配信素材',()=>{
 it('8人24ポーズと5章20拠点の切り出しは画像内に収まり、足元が有効',()=>{
  expect(Object.keys(atlas.characters)).toHaveLength(8);expect(Object.keys(atlas.maps)).toHaveLength(5);
  for(const a of Object.values(atlas.characters)){expect(a.frames).toHaveLength(3);for(const f of a.frames){expect(f.anchor).toBeGreaterThan(0);expect(f.anchor).toBeLessThan(1);expect(f.r.x).toBeGreaterThanOrEqual(0);expect(f.r.y).toBeGreaterThanOrEqual(0);expect(f.r.x+f.r.w).toBeLessThanOrEqual(a.width);expect(f.r.y+f.r.h).toBeLessThanOrEqual(a.height);}}
  for(const a of Object.values(atlas.maps)){expect(a.frames).toHaveLength(4);for(const f of a.frames){expect(f.w).toBeGreaterThan(0);expect(f.h).toBeGreaterThan(0);expect(f.x+f.w).toBeLessThanOrEqual(a.width);expect(f.y+f.h).toBeLessThanOrEqual(a.height);}}
 });
 it('公開用18WebPとSWキャッシュの参照先が揃う',()=>{const names=[...Object.keys(atlas.characters),...Object.keys(atlas.maps).map(n=>'map'+n),...[1,2,3,4,5].map(n=>'battle'+n)];expect(names).toHaveLength(18);const sw=readFileSync('public/service-worker.js','utf8');for(const n of names){const file='public/assets/v32/'+n+'.webp';expect(existsSync(file)).toBe(true);expect(readFileSync(file).subarray(8,12).toString()).toBe('WEBP');expect(sw).toContain('/assets/v32/'+n+'.webp');}});
});
