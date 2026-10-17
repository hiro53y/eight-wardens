"""Convert generated atlases; no painting or alpha reconstruction. Keep original PNGs in out/v32."""
from pathlib import Path
from PIL import Image
import json
R=Path(__file__).resolve().parents[1];S=R/'out/v32';O=R/'public/assets/v32';O.mkdir(exist_ok=True)
meta={'characters':{},'maps':{}}
for name in ['alto','lyca','kai','sena','minato','greta','shino','iris']:
    path=S/(name+'.png')
    if not path.exists():continue
    im=Image.open(path).convert('RGBA');im.thumbnail((1800,900),Image.Resampling.LANCZOS)
    im.save(O/(name+'.webp'),quality=90,method=4)
    cw=im.width/3;boxes=[]
    for i in range(3):
        cell=im.crop((round(i*cw),0,round((i+1)*cw),im.height));b=cell.getchannel('A').point(lambda a:255 if a>=24 else 0).getbbox();assert b
        boxes.append(b)
    top=max(0,min(b[1] for b in boxes)-4);bottom=min(im.height,max(b[3] for b in boxes)+4)
    frames=[]
    for i,b in enumerate(boxes):
        left=max(round(i*cw),round(i*cw)+b[0]-4);right=min(round((i+1)*cw),round(i*cw)+b[2]+4)
        # Foot centroid anchors poses at their feet instead of the weapon centre.
        a=im.getchannel('A');xs=[x for y in range(max(top,b[3]-12),b[3]) for x in range(left,right) if a.getpixel((x,y))>=96]
        foot=sum(xs)/len(xs) if xs else (left+right)/2
        frames.append({'r':{'x':left,'y':top,'w':right-left,'h':bottom-top},'anchor':(foot-left)/(right-left)})
    meta['characters'][name]={'width':im.width,'height':im.height,'frames':frames}
for chapter in range(1,6):
    path=S/('map'+str(chapter)+'.png')
    if path.exists():
        im=Image.open(path).convert('RGBA');im.thumbnail((1400,1400),Image.Resampling.LANCZOS);im.save(O/('map'+str(chapter)+'.webp'),quality=90,method=4);frames=[]
        for y in range(2):
            for x in range(2):
                l=round(x*im.width/2);t=round(y*im.height/2);rr=round((x+1)*im.width/2);bb=round((y+1)*im.height/2)
                b=im.crop((l,t,rr,bb)).getchannel('A').point(lambda a:255 if a>=24 else 0).getbbox();assert b
                frames.append({'x':l+b[0],'y':t+b[1],'w':b[2]-b[0],'h':b[3]-b[1]})
        meta['maps'][str(chapter)]={'width':im.width,'height':im.height,'frames':frames}
    path=S/('battle'+str(chapter)+'.png')
    if path.exists():
        im=Image.open(path).convert('RGB');im=im.resize((1672,941),Image.Resampling.LANCZOS);im.save(O/('battle'+str(chapter)+'.webp'),quality=88,method=4)
(R/'src/view/artV32.json').write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
print('v32 atlases converted',len(meta['characters']),len(meta['maps']))
