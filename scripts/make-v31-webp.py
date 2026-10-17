"""Format conversion only. Generated PNG sources are retained locally in out/v31.
Requires Pillow; never changes original assets. Prompts: docs/art-v31.json.
"""
from pathlib import Path
import json
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'out/v31'
OUT=ROOT/'public/assets/v31'
OUT.mkdir(parents=True,exist_ok=True)
META={}
for name in ['iris','sena','shield_goblin','shaman','orc_lord','worm_king']:
    im=Image.open(SRC/(name+'.png')).convert('RGBA')
    im.thumbnail((768,768),Image.Resampling.LANCZOS)
    im.save(OUT/(name+'.webp'),quality=90,method=6)
    bbox=im.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
    assert bbox is not None
    x,y,right,bottom=bbox
    META[name]={'r':{'x':x,'y':y,'w':right-x,'h':bottom-y},'width':im.width,'height':im.height,'flip':False}
for name in ['battle_forest','battle_canyon','battle_desert','battle_abyss']:
    im=Image.open(SRC/(name+'.png')).convert('RGB')
    im.thumbnail((1672,941),Image.Resampling.LANCZOS)
    im.save(OUT/(name+'.webp'),quality=88,method=6)
# Keep opaque dark clothing intact; the old alpha conversion removed it.
im=Image.open(ROOT/'public/assets/generated/unit-portraits-sheet.png').convert('RGB')
im.thumbnail((1774,1774),Image.Resampling.LANCZOS)
im.save(OUT/'portraits.webp',quality=90,method=6)
(ROOT/'src/view/artV31.json').write_text(json.dumps(META,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Converted 11 WebP files; original files untouched')
