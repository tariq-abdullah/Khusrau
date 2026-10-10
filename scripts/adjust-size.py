from pathlib import Path
p=Path('src/nativeDocument.js');s=p.read_text(encoding='utf-8').replace('fontSize:8.5,','fontSize:8,').replace('Noto 8.5 pt substitutes','Noto 8 pt substitutes');p.write_text(s,encoding='utf-8')
