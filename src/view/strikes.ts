// Local weapon effects: all coordinates are presentation-only.
import type {Fx} from './effects';
const COLORS={slash:'#c6edff',spear:'#d9eeff',arrow:'#d6efa2',bullet:'#ffe59c',cannon:'#ffb966',shuriken:'#b2a5ff',magic:'#ae93ff',chain:'#ace4ec',potion:'#99f0bd',dragon:'#b8eaff'};
export function drawStrikes(g:CanvasRenderingContext2D,fx:Fx){
 for(const s of fx.strikes){
  const k=(fx.now-s.t0)/s.dur;if(k<0||k>1)continue;
  const [x,y]=s.impact?s.to:s.from,angle=Math.atan2(s.to[1]-s.from[1],s.to[0]-s.from[0]);
  const power=s.major?1.7:1,fade=Math.sin(Math.PI*Math.min(1,k))*(fx.reduced?.65:1);
  g.save();g.translate(x,y);g.rotate(angle);g.globalAlpha=fade;g.lineCap='round';g.lineJoin='round';
  g.strokeStyle=COLORS[s.style];g.fillStyle=COLORS[s.style];g.lineWidth=s.major?5:3;
  const line=(x1:number,y1:number,x2:number,y2:number)=>{g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();};
  const circle=(radius:number)=>{g.beginPath();g.arc(0,0,radius,0,Math.PI*2);g.stroke();};
  const star=(radius:number,n=6)=>{g.beginPath();for(let i=0;i<n*2;i++){const a=i*Math.PI/n,r=i%2?radius*.25:radius;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fill();};
  const r=(15+65*k)*power;
  switch(s.style){
   case 'slash':
    if(s.impact){g.rotate(-.8+k*1.4);g.lineWidth=8*power*(1-k)+1;g.beginPath();g.ellipse(0,0,r*1.25,r*.7,0,-1.4,1.4);g.stroke();g.strokeStyle='#fff';g.lineWidth=2;line(-r*.55,0,r*.9,0);}
    else{g.rotate(-1.1+k*2);g.lineWidth=5;g.beginPath();g.arc(0,0,65*power,-.8,.4);g.stroke();}break;
   case 'spear':
    if(s.impact){line(-r*.8,0,r,0);line(r-17,-9,r,0);line(r-17,9,r,0);for(let i=0;i<3;i++)line(-r-i*9,(i-1)*12,-r*.3,(i-1)*12);}
    else{line(-28,0,55*k,0);line(55*k,-3,55*k+14,0);}
    break;
   case 'arrow':
    if(s.impact){for(let i=-1;i<=1;i++){g.rotate(i*.15);line(-r*.4,0,8+15*k,0);}circle(9+16*k);}
    else{g.beginPath();g.arc(-8,0,22,-1.1,1.1);g.stroke();line(4,-19,-10-14*(1-k),0);line(-10-14*(1-k),0,4,19);}break;
   case 'bullet':
    if(s.impact){star(22*power*(1-k)+5,7);line(-r,0,r*.5,0);}
    else{g.globalCompositeOperation='lighter';star((32*(1-k)+5)*power,5);g.globalCompositeOperation='source-over';g.fillStyle='#cdd0cb';g.globalAlpha=fade*.35;for(let i=0;i<3;i++){g.beginPath();g.arc(20+i*13*k,-i*10*k,5+10*k,0,Math.PI*2);g.fill();}}break;
   case 'cannon':
    if(s.impact){circle(r);g.lineWidth=8*(1-k)+1;g.beginPath();g.ellipse(0,18,r*1.3,r*.27,0,0,Math.PI*2);g.stroke();g.globalAlpha=fade*.45;star((40+30*k)*power,9);}
    else{star((42*(1-k)+6)*power,6);g.fillStyle='#b2ada4';g.globalAlpha=fade*.35;for(let i=0;i<4;i++){g.beginPath();g.arc(18+i*12,-k*(10+i*12),8+18*k,0,Math.PI*2);g.fill();}}break;
   case 'shuriken':
    for(let i=0;i<(fx.reduced?1:3);i++){g.save();g.translate(s.impact?0:20+i*18*k,(i-1)*7);g.rotate(k*5+i);g.globalAlpha=fade*(1-i*.25);star((s.impact?18:10)*power,4);g.restore();}break;
   case 'magic':
    g.rotate(k*.8);circle(r*.7);g.setLineDash([8,9]);circle(r);g.setLineDash([]);for(let i=0;i<5;i++){const a=i*Math.PI*.4;line(Math.cos(a)*r,Math.sin(a)*r,Math.cos(a+Math.PI*.8)*r,Math.sin(a+Math.PI*.8)*r);}break;
   case 'chain':
    if(s.impact){g.rotate(-angle);g.beginPath();g.ellipse(0,12,38*power,(12+12*k)*power,0,0,Math.PI*2);g.stroke();for(let i=-1;i<=1;i++)line(i*22,-28,i*22,34);}
    else{for(let i=0;i<4;i++){g.beginPath();g.ellipse(i*13,0,10,5,0,0,Math.PI*2);g.stroke();}}break;
   case 'potion':
    if(s.impact){for(let i=0;i<6;i++){const a=i*Math.PI/3,xx=Math.cos(a)*r*.65,yy=Math.sin(a)*r*.45;g.beginPath();g.arc(xx,yy,3+5*(1-k),0,Math.PI*2);g.fill();}g.beginPath();g.ellipse(0,20,r*.8,r*.2,0,0,Math.PI*2);g.stroke();}
    else{line(0,0,16+25*k,-12*k);circle(8);}break;
   case 'dragon':
    g.rotate(-angle);for(let i=0;i<(fx.reduced?1:3);i++){g.beginPath();g.moveTo((i-1)*25,-90*power);g.lineTo((i-1)*20+14,-42);g.lineTo((i-1)*20-10,-38);g.lineTo(0,10);g.stroke();}g.beginPath();g.ellipse(0,19,r,r*.23,0,0,Math.PI*2);g.stroke();break;
  }
  g.restore();
 }
}
