from pathlib import Path
import re
from PIL import Image
out=Path('C:/Users/tariq/Documents/Codex/2026-10-10/we-x20/outputs')
p=out/'AboutFaiz-web-page-2.eps';s=p.read_text();m=re.search(r'\n(\d+) (\d+) 8 \[',s);w,h=map(int,m.groups());body=s.split('false 3 colorimage\n')[1].split('\ngrestore')[0];rgb=bytes.fromhex(body);assert len(rgb)==w*h*3;img=Image.frombytes('RGB',(w,h),rgb);img.resize((794,1123)).save(out/'AboutFaiz-eps-page-2-check.png');print('EPS raster decoded:',w,h,'bytes:',len(rgb),'header:',s[:100])
