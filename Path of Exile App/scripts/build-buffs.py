"""Explicit RePoE status-effect snapshot/icon import. Offline rebuild by default."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timezone
import hashlib
import json
from pathlib import Path
import urllib.request
import urllib.parse
ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'resources/repoe-buffs';ART=ROOT/'crafting-ui/assets/buffs'
BASE='https://repoe-fork.github.io/'

def build(download=False):
    SOURCE.mkdir(exist_ok=True);ART.mkdir(parents=True,exist_ok=True)
    if download:
        for name in ['buffs.json','buff_visuals.json','buff_visuals.html']:
            raw=urllib.request.urlopen(BASE+name,timeout=30).read();(SOURCE/name).write_bytes(raw)
    buffs=json.loads((SOURCE/'buffs.json').read_text(encoding='utf8'));visuals=json.loads((SOURCE/'buff_visuals.json').read_text(encoding='utf8'))
    icons=sorted({v['icon'] for v in visuals.values() if v.get('icon')})
    def icon(path):
        url=BASE+urllib.parse.quote(path.removesuffix('.dds')+'.png',safe='/');filename=hashlib.sha256(path.encode()).hexdigest()[:24]+'.png';target=ART/filename
        try:
            if not target.exists() and download:
                raw=urllib.request.urlopen(url,timeout=20).read()
                if raw[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError('Not a PNG')
                target.write_bytes(raw)
            raw=target.read_bytes()
            if raw[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError('Invalid cached PNG')
            return path,{'file':'/assets/buffs/'+filename,'source':url,'sha256':hashlib.sha256(raw).hexdigest()},None
        except Exception as e:return path,None,str(e)
    images={};failures=[]
    with ThreadPoolExecutor(max_workers=6) as pool:
        for path,result,error in pool.map(icon,icons):
            if result:images[path]=result
            else:failures.append({'path':path,'reason':error})
    records=[]
    for id,buff in buffs.items():
        visual=visuals.get(buff.get('visuals')) or {};path=visual.get('icon');art=images.get(path)
        name=buff.get('name') or visual.get('name')
        description=buff.get('description') or visual.get('description') or ''
        records.append({'id':'buff:'+id,'buffId':id,'visualId':buff.get('visuals'),'name':name or f'Unnamed effect · {id}','aliases':[name] if name else [],'kind':'buff','category':buff.get('category') or 'Unclassified','definition':description,'status':'source-extracted' if description else 'needs-extraction','tooltipEligible':False,'contexts':['item-modifier','skill-tooltip','tree-stat'],'references':[],'icon':art['file'] if art else None,'invisible':buff.get('invisible',False),'stats':buff.get('stats') or [],'sources':[{'type':'repoe-buff','url':BASE+'buffs.json','record':id,'visual':buff.get('visuals'),'license':'Game data and artwork © Grinding Gear Games; RePoE source attribution retained'}]})
    records.sort(key=lambda e:(e['name'].casefold(),e['id']))
    report={'sourceLabel':'RePoE index 3.29.3.6','sources':{n:hashlib.sha256((SOURCE/n).read_bytes()).hexdigest() for n in ['buffs.json','buff_visuals.json','buff_visuals.html']},'records':len(records),'withName':sum(bool(e['aliases']) for e in records),'withDefinition':sum(bool(e['definition']) for e in records),'withIcon':sum(bool(e['icon']) for e in records),'cachedIcons':len(images),'failures':failures,'icons':images,'unmatchedVisualIds':sorted({e['visualId'] for e in records if e['visualId'] and e['visualId'] not in visuals})}
    (ROOT/'crafting-ui/buff-data.json').write_text(json.dumps({'version':1,'entries':records},ensure_ascii=False,separators=(',',':')),encoding='utf8')
    (ROOT/'resources/buff-import-report.json').write_text(json.dumps(report,indent=2),encoding='utf8')
    # Preserve effect enrichment whenever the base buff snapshot is rebuilt.
    import importlib.util
    spec=importlib.util.spec_from_file_location('buff_effects',ROOT/'scripts/buff-effects.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);module.build()
    print(json.dumps({k:report[k] for k in ['records','withName','withDefinition','withIcon','cachedIcons']}),flush=True)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--download',action='store_true');build(p.parse_args().download)
