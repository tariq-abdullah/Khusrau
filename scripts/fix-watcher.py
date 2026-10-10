from pathlib import Path
p=Path('vite.config.js');s=p.read_text(encoding='utf-8').replace('defineConfig({plugins:',"defineConfig({server:{watch:{ignored:['**/research/**','**/scripts/**','**/examples/**']}},plugins:");p.write_text(s,encoding='utf-8')
