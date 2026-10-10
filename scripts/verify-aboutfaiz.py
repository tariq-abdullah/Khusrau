from pathlib import Path
import json,re,hashlib
import pymupdf
from PIL import Image
out=Path('C:/Users/tariq/Documents/Codex/2026-10-10/we-x20/outputs')
d=json.loads((out/'AboutFaiz-editable.ipdoc').read_text(encoding='utf-8'));n=json.loads(Path('research/fixtures/aboutfaiz-full-text.json').read_text(encoding='utf-8'))
root=next(o for o in d['objects'] if o.get('text'));assert root['text']== '\n'.join(n).strip();print('Editable story complete:',len(root['text']), 'pages:',len(d['pages']), 'colored runs:',len(root['runs']))
Path('examples/AboutFaiz-reconstruction.ipdoc').write_text(json.dumps({k:v for k,v in d.items() if k!='nativeSource'},ensure_ascii=False,indent=2),encoding='utf-8')
p=pymupdf.open(out/'AboutFaiz-web.pdf');assert len(p)==2
for i,page in enumerate(p):page.get_pixmap(matrix=pymupdf.Matrix(1.5,1.5)).save(out/f'AboutFaiz-web-page-{i+1}.png')
for i in (1,2):
 s=(out/f'AboutFaiz-web-page-{i}.eps').read_text();m=re.search(r'\n(\d+) (\d+) 8 \[',s);w,h=map(int,m.groups());rgb=bytes.fromhex(s.split('false 3 colorimage\n')[1].split('\ngrestore')[0]);assert len(rgb)==w*h*3;Image.frombytes('RGB',(w,h),rgb).resize((794,1123)).save(out/f'AboutFaiz-eps-page-{i}-check.png')
print('PDF and EPS page payloads valid')
