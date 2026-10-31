"""Declared synthetic integration fixture, never thesis accuracy evidence."""
import io
import json
from pathlib import Path
import requests
from PIL import Image, ImageDraw
out = Path(__file__).parent
image = Image.new('RGB', (200, 400), 'white')
draw = ImageDraw.Draw(image)
draw.ellipse((75, 12, 125, 65), fill='#C0C0C0')
draw.rectangle((55, 70, 145, 210), fill='#EF4444')
draw.rectangle((65, 210, 135, 340), fill='#000000')
draw.rectangle((60, 340, 140, 385), fill='#3B82F6')
image.save(out / 'synthetic-reference.png')
health = requests.get('http://127.0.0.1:5055/api/health', timeout=10).json()
assert health['pose_loaded'] and health['style_loaded'], health
(out / 'health.json').write_text(json.dumps(health, indent=2))
response = requests.post('http://127.0.0.1:5055/api/extract-reference', files={'image': ('ignored.txt', (out / 'synthetic-reference.png').read_bytes())}, timeout=60)
(out / 'service-smoke.json').write_text(json.dumps(response.json(), indent=2))
assert response.status_code == 200, response.text
assert response.json()['method'] == 'fallback'
assert all(c['band'] == 'low' for c in response.json()['components'])
assert all(c['candidates'] for c in response.json()['components'] if c['type'] != 'accessory')
print('RAN PASS: HTTP full pipeline, both models loaded; synthetic figure fallback, six low-band components and real CLIP scores.')
