import pymupdf
from pathlib import Path
out=Path('C:/Users/tariq/Documents/Codex/2026-10-10/we-x20/outputs');out.mkdir(exist_ok=True)
source=Path('C:/Users/tariq/Downloads/AboutFaiz-native-saved.pdf')
(out/'AboutFaiz-web.pdf').write_bytes(source.read_bytes())
p=pymupdf.open(out/'AboutFaiz-web.pdf');print('Pages',len(p), 'Sizes',[list(page.rect) for page in p])
for i,page in enumerate(p):page.get_pixmap(matrix=pymupdf.Matrix(1.5,1.5)).save(out/f'AboutFaiz-web-page-{i+1}.png')
