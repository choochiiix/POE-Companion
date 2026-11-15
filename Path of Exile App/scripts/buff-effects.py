"""Extract exact RePoE effect variants; optionally cache wiki context by title."""
import argparse
import importlib.util
import json
from pathlib import Path
import re
import sys
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('wiki',ROOT/'scripts/wiki-glossary.py');wiki=importlib.util.module_from_spec(spec);spec.loader.exec_module(wiki)

def extract_effects(raw):
    variants=[]
    for key,value in (raw.get('templates') or {}).items():
        variants.append({'id':key,'source':'template','lines':value.get('stat_text') or [],'stats':value.get('stats') or {},'radiusMetres':value.get('aura_radius_metres'),'visualId':value.get('visuals')})
    for table,records in (raw.get('sources') or {}).items():
        for value in records:
            variants.append({'id':value['id'],'source':table,'name':value.get('name'),'item':value.get('item'),'template':value.get('template'),'lines':value.get('stat_text') or [],'stats':value.get('stats') or {}})
    return variants

def prepare(text):
    # Preserve literal display text from known formatting/link templates only.
    # No template expansion, evaluation, network lookup or Lua is performed.
    text=re.sub(r'\{\{c\|[^|{}]+\|([^{}]*)\}\}',r'\1',text)
    text=re.sub(r'\{\{(?:il|sl|psl)\|([^{}=|]+)\}\}',r'\1',text)
    return text

def context(page):
    if not page.get('revision') or not page.get('wikitext','').strip():return None
    prepared=prepare(page['wikitext'])
    lead=wiki.lead(prepared)
    if not lead:
        for paragraph in wiki.clean(prepared.split('\n==',1)[0]).split('\n\n'):
            paragraph=' '.join(paragraph.split())
            if len(paragraph)>20 and not paragraph.startswith(('#','*','|','__','{{')) and '{{' not in paragraph:
                lead=paragraph[:1600]
                break
    match=re.search(r'^==\s*(?:Mechanics|Skill functions and interactions|Buff effects|Effects)\s*==\s*\n(.*?)(?=^==[^=]|\Z)',prepared,re.M|re.S)
    mechanics=[]
    if match:
        for paragraph in wiki.clean(match[1]).split('\n\n'):
            paragraph=' '.join(paragraph.split())
            if 50<len(paragraph)<1500 and not paragraph.startswith(('{','|','*','=')) and '{{' not in paragraph:mechanics.append(paragraph)
            if len(mechanics)==2:break
    return {'title':page['title'],'revision':page['revision'],'timestamp':page['timestamp'],'sha256':page['sha256'],'url':'https://www.poewiki.net/wiki/'+wiki.urllib.parse.quote(page['title'].replace(' ','_')),'summary':lead,'mechanics':mechanics,'status':'related-article-unreviewed','license':'CC BY-NC-SA 3.0 (wiki-licensed content)'}

def build(download=False,limit=2000):
    raw=wiki.load(ROOT/'resources/repoe-buffs/buffs.json');data=wiki.load(ROOT/'crafting-ui/buff-data.json')
    aliases={'Ignited':'Ignite','Chilled':'Chill','Frozen':'Freeze','Shocked':'Shock','Bleeding':'Bleeding','Poisoned':'Poison','Maimed':'Maim','Hindered':'Hinder','Blinded':'Blind','Intimidated':'Intimidate','Unnerved':'Unnerve'}
    if download:
        names=sorted({aliases.get(r['name'],r['name']) for r in data['entries'] if r['aliases']})
        wiki.acquire(limit,False,names)
    lookup={}
    for page in wiki.cached():
        if page['missing'] or not page.get('revision') or not page.get('wikitext','').strip():continue
        for name in [page['title'],*page['aliases']]:lookup.setdefault(name.casefold(),{})[page['pageId']]=page
    unresolved=[];counts={'records':len(data['entries']),'withNumericVariants':0,'withEffectLines':0,'withWikiContext':0,'withoutEffectValues':0}
    for entry in data['entries']:
        original=raw[entry['buffId']];variants=extract_effects(original)
        entry['effectVariants']=variants;entry['statIds']=original.get('stats') or [];entry['stackLimit']=original.get('stack_limit');entry['removable']=original.get('removable')
        entry['effectStatus']='source-variants' if any(v['stats'] or v['lines'] for v in variants) else 'values-not-supplied'
        name=aliases.get(entry['name'],entry['name']);pages=list(lookup.get(name.casefold(),{}).values()) if entry['aliases'] else []
        entry['wikiContext']=context(pages[0]) if len(pages)==1 else None
        counts['withNumericVariants']+=any(v['stats'] for v in variants);counts['withEffectLines']+=any(v['lines'] for v in variants);counts['withWikiContext']+=bool(entry['wikiContext']);counts['withoutEffectValues']+=entry['effectStatus']=='values-not-supplied'
        if entry['effectStatus']=='values-not-supplied':unresolved.append({'id':entry['id'],'name':entry['name'],'statIds':entry['statIds'],'hasWikiContext':bool(entry['wikiContext']),'reason':'No fixed effect values supplied; may vary by source, stacks or skill level. Related wiki text is not a record-level numeric mapping.'})
    data['version']=2
    (ROOT/'crafting-ui/buff-data.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    (ROOT/'resources/buff-effects-report.json').write_text(json.dumps({'counts':counts,'unresolved':unresolved,'policy':'Exact RePoE templates/source rows remain separate. Wiki name/redirect matches are labeled related context, not proven numeric effects for every variant.'},indent=2),encoding='utf8')
    print(json.dumps(counts),flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--download',action='store_true');p.add_argument('--limit',type=int,default=2000);args=p.parse_args();build(args.download,args.limit)
