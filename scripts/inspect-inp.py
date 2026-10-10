import olefile,json,hashlib
from pathlib import Path
result=[]
for p in Path('C:/Program Files (x86)/InPage/InPage 3 Professional/Sample').glob('*.inp'):
 with olefile.OleFileIO(p) as f:
  streams=[]
  for path in f.listdir():
   b=f.openstream(path).read();streams.append({'path':'/'.join(path),'bytes':len(b),'prefixHex':b[:32].hex(),'sha256':hashlib.sha256(b).hexdigest()})
  result.append({'file':p.name,'streams':streams})
Path('E:/inpage.net/research/inp-streams.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
