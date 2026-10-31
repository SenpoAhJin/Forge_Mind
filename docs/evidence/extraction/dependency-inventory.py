import importlib.metadata as metadata
import json
from pathlib import Path
root = Path(__file__).resolve().parents[3]
rows = []
for name in ('Flask', 'flask-cors', 'Pillow', 'numpy', 'mediapipe', 'transformers', 'torch', 'huggingface-hub', 'pytest', 'requests'):
    dist = metadata.distribution(name)
    rows.append({'name': name, 'version': dist.version, 'installed_bytes': sum(dist.locate_file(f).stat().st_size for f in dist.files if dist.locate_file(f).is_file()), 'license': dist.metadata.get('License-Expression') or dist.metadata.get('License') or 'See distribution license file'})
for name in ('expo', 'react', 'react-native', '@react-navigation/native-stack', '@react-native-async-storage/async-storage', 'puppeteer-core', 'typescript'):
    folder = root / 'node_modules' / name
    package = json.loads((folder / 'package.json').read_text())
    rows.append({'name': name, 'version': package['version'], 'installed_bytes': sum(p.stat().st_size for p in folder.rglob('*') if p.is_file()), 'license': package.get('license')})
Path(__file__).with_suffix('.json').write_text(json.dumps(rows, indent=2), encoding='utf-8')
print(json.dumps(rows, indent=2))
