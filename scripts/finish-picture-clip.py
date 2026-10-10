from pathlib import Path
p=Path('src/App.vue');s=p.read_text(encoding='utf-8').replace(":'inset(1%)'", ":'inset(0)'");p.write_text(s,encoding='utf-8')
p=Path('README.md');s=p.read_text(encoding='utf-8').replace('Twenty-four automated tests','Twenty-five automated tests');p.write_text(s,encoding='utf-8')
