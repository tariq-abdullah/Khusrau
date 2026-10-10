from pathlib import Path
import json,hashlib
p=Path('C:/Users/tariq/Documents/Codex/2026-10-10/we-x20/outputs/AboutFaiz-editable.ipdoc');d=json.loads(p.read_text(encoding='utf-8'));root=next(o for o in d['objects'] if o.get('text'));print('Story beginning:',root['text'][:30].encode('unicode_escape').decode());print('Source range',d['nativeSource'].get('textRange'));print('Native downloads hash',hashlib.sha256(Path('C:/Users/tariq/Downloads/AboutFaiz.inp').read_bytes()).hexdigest())
