"""Explicit development-only wiki download; never called by the app runtime."""
import hashlib
import json
from pathlib import Path
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
TITLES = ['Burning ground', 'Unaffected', 'Movement speed', 'Resistance', 'Fireball']
params = {'action':'query', 'prop':'revisions', 'rvprop':'ids|timestamp|content', 'rvslots':'main', 'titles':'|'.join(TITLES), 'redirects':'1', 'format':'json', 'formatversion':'2'}
url = 'https://www.poewiki.net/w/api.php?' + urllib.parse.urlencode(params)
request = urllib.request.Request(url, headers={'User-Agent':'ExileCompanion/0.2 (personal offline glossary importer; explicit snapshot download)'})
with urllib.request.urlopen(request, timeout=30) as response:
    raw = response.read()
data = json.loads(raw)
if 'error' in data:
    raise RuntimeError(data['error'])
pages = data.get('query', {}).get('pages', [])
if not pages:
    raise RuntimeError('Wiki returned no pages')
snapshot = {'version':1, 'source':'Path of Exile Wiki', 'request':url, 'sha256':hashlib.sha256(raw).hexdigest(), 'license':'CC BY-NC-SA 3.0 for content the wiki may lawfully license; game material retains its respective ownership', 'licenseUrl':'https://www.poewiki.net/wiki/Path_of_Exile_Wiki:Copyrights', 'requestedTitles':TITLES, 'response':data}
directory = ROOT / 'resources/wiki-glossary'
directory.mkdir(parents=True, exist_ok=True)
(directory / 'pilot-source.json').write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding='utf-8')
for page in pages:
    revision = (page.get('revisions') or [{}])[0]
    text = revision.get('slots', {}).get('main', {}).get('content', '')
    print(json.dumps({'title':page['title'], 'missing':page.get('missing',False), 'revision':revision.get('revid'), 'characters':len(text)}))
