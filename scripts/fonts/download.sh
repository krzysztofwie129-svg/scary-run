#!/bin/bash
# Pobiera tylko latin + latin-ext subsets z gfonts.css.
set -euo pipefail
cd "$(dirname "$0")"

python3 <<'PY'
import re, urllib.request, sys

with open('gfonts.css') as f:
    css = f.read()

# Split into blocks divided by /* comment */ markers
blocks = re.split(r'(/\*\s*[^*]+\s*\*/)', css)
# blocks[0] = '', blocks[1] = '/* devanagari */', blocks[2] = '@font-face {...}', etc.

# Collect (subset_name, font_face_block) pairs
pairs = []
for i in range(1, len(blocks) - 1, 2):
    comment = blocks[i]
    ff = blocks[i+1]
    m = re.match(r'/\*\s*([\w-]+)\s*\*/', comment)
    if not m:
        continue
    subset = m.group(1)
    if subset not in ('latin', 'latin-ext'):
        continue
    pairs.append((subset, ff))

print(f'Found {len(pairs)} latin/latin-ext blocks', file=sys.stderr)

out_css_parts = []
for subset, ff in pairs:
    family_m = re.search(r"font-family:\s*'([^']+)'", ff)
    weight_m = re.search(r'font-weight:\s*(\d+)', ff)
    url_m = re.search(r'url\((https://[^)]+)\)', ff)
    if not (family_m and weight_m and url_m):
        continue
    family = family_m.group(1)
    weight = weight_m.group(1)
    url = url_m.group(1)
    slug = family.lower().replace(' ', '-')
    fname = f'{slug}-{weight}-{subset}.woff2'
    print(f'Downloading {fname}', file=sys.stderr)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as r, open(fname, 'wb') as o:
        o.write(r.read())
    new_ff = re.sub(r'url\(https://[^)]+\)', f'url(/fonts/{fname})', ff)
    out_css_parts.append(f'/* {subset} */{new_ff}')

with open('fonts.css', 'w') as f:
    f.write('\n'.join(out_css_parts))

print(f'Wrote fonts.css ({sum(len(p) for p in out_css_parts)} bytes)', file=sys.stderr)
PY
