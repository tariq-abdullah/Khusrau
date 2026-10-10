from pathlib import Path
p=Path('src/nativeDocument.js');s=p.read_text(encoding='utf-8').replace('fontSize:12,leading:', 'fontSize:9,leading:').replace('Noto substitutes Faiz; line breaks and pagination differ.', 'Noto 9 pt substitutes native Faiz 12 pt; line breaks and pagination differ.');p.write_text(s,encoding='utf-8')
