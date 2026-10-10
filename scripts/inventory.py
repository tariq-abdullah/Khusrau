from fontTools.ttLib import TTFont
from pathlib import Path
import json, hashlib
root=Path('E:/inpage.net')
fonts=[]
for p in sorted((root/'research/local-fonts').glob('*')):
 try:
  f=TTFont(p)
  names={str(i): sorted(set(n.toUnicode() for n in f['name'].names if n.nameID==i)) for i in [0,1,2,6,13,14]}
  cmap=f.getBestCmap() or {}
  fonts.append({'file':p.name,'names':names,'embeddingFlags':f['OS/2'].fsType if 'OS/2' in f else None,'unicodeArabicCharacters':sum(0x600<=k<=0x6ff for k in cmap),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 except Exception as e: fonts.append({'file':p.name,'error':str(e)})
(root/'research/font-inventory.json').write_text(json.dumps(fonts,indent=2,ensure_ascii=False),encoding='utf-8')
samples=[]
for p in Path('C:/Program Files (x86)/InPage/InPage 3 Professional/Sample').glob('*.inp'):
 b=p.read_bytes();samples.append({'file':p.name,'bytes':len(b),'headerHex':b[:64].hex(),'sha256':hashlib.sha256(b).hexdigest()})
(root/'research/inp-samples.json').write_text(json.dumps(samples,indent=2),encoding='utf-8')
print(json.dumps({'fonts':len(fonts),'families':sorted(set(n for f in fonts for n in f.get('names',{}).get('1',[]))),'samples':samples},ensure_ascii=False))
