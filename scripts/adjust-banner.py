from pathlib import Path
p=Path('src/nativeDocument.js');s=p.read_text(encoding='utf-8').replace('fontSize:9,','fontSize:8.5,').replace('Noto 9 pt substitutes native Faiz 12 pt','Noto 8.5 pt substitutes native Faiz 12 pt').replace('imageY:-.25*mm','imageY:-5.53*mm');p.write_text(s,encoding='utf-8')
