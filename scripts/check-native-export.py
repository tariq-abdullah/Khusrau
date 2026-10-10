from pathlib import Path
import hashlib
out=Path('C:/Users/tariq/Documents/Codex/2026-10-10/we-x20/outputs')
for old,new in [('AboutFaiz-native-saved.inp','AboutFaiz-roundtrip.inp'),('AboutFaiz-native-saved-page-2.eps','AboutFaiz-web-page-2.eps')]:
 p=Path('C:/Users/tariq/Downloads')/old;(out/new).write_bytes(p.read_bytes())
a=Path('research/fixtures/AboutFaiz-native-saved.inp').read_bytes();b=(out/'AboutFaiz-roundtrip.inp').read_bytes();print('Native byte-identical:',a==b,'SHA256',hashlib.sha256(b).hexdigest())
