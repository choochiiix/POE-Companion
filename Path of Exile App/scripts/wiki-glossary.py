"""Explicit wiki acquisition and deterministic offline glossary build. No Lua execution."""
import argparse
from datetime import datetime, timezone
import hashlib
import html
import importlib.util
import json
from pathlib import Path
import re
import sys
import time
import urllib.parse
import urllib.request
import zipfile
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / 'resources/wiki-glossary/pages'
SEEDS = '''Burning ground|Chilled ground|Shocked ground|Consecrated ground|Desecrated ground|Ground effect|Burning|Ignite|Chill|Freeze|Shock|Scorch|Brittle|Sap|Bleeding|Poison|Ailment|Elemental ailment|Non-damaging ailment|Resistance|Fire resistance|Cold resistance|Lightning resistance|Chaos resistance|Maximum resistance|Exposure|Penetration|Movement speed|Action speed|Attack speed|Cast speed|Cooldown|Cooldown recovery|Critical strike|Critical strike multiplier|Accuracy|Evasion|Armour|Energy shield|Ward|Life|Mana|Rage|Strength|Dexterity|Intelligence|Block|Spell suppression|Dodge|Stun|Stun threshold|Knockback|Blind|Maim|Hinder|Taunt|Intimidate|Unnerve|Withered|Impale|Fortify|Onslaught|Phasing|Elusive|Tailwind|Adrenaline|Rampage|Soul Eater|Unholy Might|Arcane Surge|Vaal Pact|Ghost Reaver|Mind Over Matter|Chaos Inoculation|Eldritch Battery|Resolute Technique|Iron Reflexes|Blood Magic|Pain Attunement|Elemental Equilibrium|Elemental Overload|Point Blank|Iron Will|Iron Grip|Avatar of Fire|Zealot's Oath|Wicked Ward|Glancing Blows|Divine Flesh|Petrified Blood|Petrification|Aegis|Guard|Aura|Curse|Hex|Mark|Warcry|Totem|Trap|Mine|Minion|Golem|Spectre|Sentinel|Brand|Banner|Herald|Offering|Trigger|Channelled skill|Projectile|Chain|Fork|Pierce|Split|Return|Area of effect|Duration|Damage over time|Hit|Attack|Spell|Physical damage|Fire damage|Cold damage|Lightning damage|Chaos damage|Elemental damage|Damage conversion|Damage taken as|Added damage|Damage effectiveness|Leech|Life leech|Mana leech|Life regeneration|Mana regeneration|Energy shield recharge|Recoup|Regeneration|Recovery|Reservation|Reservation efficiency|Low life|Full life|Recently|Nearby|Unaffected|Immunity|Avoidance|Lucky|Unlucky|Culling strike|Slayer|Berserk|Frenzy charge|Power charge|Endurance charge|Charge|Siphoning charge|Brutal charge|Absorption charge|Affliction charge|Corrupted blood|Corrupted|Unmodifiable|Mirrored|Split (item modifier)|Fractured item|Synthesised item|Influenced item|Quality|Gem quality|Transfigured gem|Vaal skill|Socket|Link|Support gem|Skill gem|Double damage|Triple damage|Increased and reduced|More and less|Unarmed|Dual wielding|Wielding|Main hand|Off hand|Weapon range|Melee strike range|Intelligence stacking|Anoint|Catalyst|Cluster jewel|Mastery|Keystone|Notable|Passive skill|The Agnostic|The Impaler|Secrets of Suffering|Hollow Palm Technique|Dance with Death|Corrupted Soul|Transcendence|Strength of Blood|Chainbreaker|Immortal Ambition|Supreme Ego|Supreme Ostentation|Supreme Decadence|Lethe Shade|Ghost Dance|Iron Fortress|Aspect of the Cat|Aspect of the Avian|Aspect of the Spider|Aspect of the Crab'''.split('|')

def load(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))

def corpus():
    catalog = load(ROOT/'crafting-ui/catalog-data.json')
    tree = load(ROOT/'data-sources/pob-tree-3_29/tree-view.json')
    skills = load(ROOT/'crafting-ui/skills-data.json')['gems']
    rows = []
    for item in catalog['uniques']:
        for kind in ('implicit','explicit'):
            for index, mod in enumerate(item[kind]):
                rows.append({'surface':'item-modifier','record':item['id'],'field':f'{kind}.{index}','text':mod['text']})
    for key, node in tree['nodes'].items():
        for index, text in enumerate(node.get('stats', [])):
            rows.append({'surface':'tree-stat','record':key,'field':f'stats.{index}','text':text})
        for effect in node.get('masteryEffects', []):
            for index, text in enumerate(effect.get('stats', [])):
                rows.append({'surface':'tree-stat','record':key,'field':f'mastery.{effect.get("effect", "")}.{index}','text':text})
    for gem in skills:
        for index, text in enumerate([gem['description'],*gem.get('tooltip',{}).get('statLines',[]),*gem.get('tooltip',{}).get('qualityLines',[])]):
            rows.append({'surface':'skill-tooltip','record':gem['id'],'field':str(index),'text':text})
    return rows, skills

def cached():
    pages = [load(p) for p in sorted(CACHE.glob('*.json'))] if CACHE.exists() else []
    for page in pages:
        # Invalid titles/API responses can lack a revision without `missing`.
        # Normalize in memory; retain original cached evidence unchanged.
        page['missing'] = bool(page.get('missing') or not page.get('revision'))
    return pages

def clean(text):
    text = re.sub(r'<!--.*?-->|<ref\b[^>]*>.*?</ref>|<ref\b[^>]*/>', '', text, flags=re.S|re.I)
    text = re.sub(r'\[\[(?:File|Image|Category):[^\]]*\]\]', '', text, flags=re.I)
    # Remove nested template blocks; do not execute wiki templates or Lua modules.
    while re.search(r'\{\{[^{}]*\}\}',text):
        text = re.sub(r'\{\{[^{}]*\}\}', '', text)
    text = re.sub(r'\[\[([^\]|]+)\|([^\]]+)\]\]', r'\2', text)
    text = re.sub(r'\[\[([^\]]+)\]\]', r'\1', text)
    text = re.sub(r'<[^>]+>|\{\|.*?\|\}', '', text, flags=re.S)
    return html.unescape(text.replace("'''",'').replace("''",''))

def lead(text):
    text = text.split('\n==',1)[0]
    for paragraph in clean(text).split('\n\n'):
        paragraph = ' '.join(paragraph.split())
        if len(paragraph)>60 and not paragraph.startswith(('#','*','|','__','{{')) and '{{' not in paragraph:
            # This is a draft excerpt, never automatically approved for matching.
            return paragraph[:1600]
    return ''

def acquire(limit, expand, titles=None):
    CACHE.mkdir(parents=True,exist_ok=True)
    pages = cached()
    requested = {t.casefold() for p in pages for t in p['requested']}
    terms = list(SEEDS if titles is None else titles)
    if expand:
        rows, _ = corpus()
        text = '\n'.join(row['text'] for row in rows).casefold()
        for page in pages:
            for link in re.findall(r'\[\[([^\]|#]+)', page.get('wikitext','')):
                if ':' not in link and len(link)>3 and link.casefold() in text:
                    terms.append(link)
    terms = list(dict.fromkeys(t for t in terms if t.casefold() not in requested))[:limit]
    for start in range(0,len(terms),20):
        batch = terms[start:start+20]
        params={'action':'query','prop':'revisions','rvprop':'ids|timestamp|content','rvslots':'main','titles':'|'.join(batch),'redirects':'1','format':'json','formatversion':'2','maxlag':'5'}
        req=urllib.request.Request('https://www.poewiki.net/w/api.php?'+urllib.parse.urlencode(params),headers={'User-Agent':'ExileCompanion/0.2 (personal offline glossary snapshot; sequential cached API requests)'})
        with urllib.request.urlopen(req,timeout=30) as response:
            data=json.load(response)
        if 'error' in data: raise RuntimeError(data['error'])
        aliases={}
        for redirect in data['query'].get('redirects',[]):
            aliases.setdefault(redirect['to'],[]).append(redirect['from'])
        for page in data['query']['pages']:
            revision=(page.get('revisions') or [{}])[0]
            raw=revision.get('slots',{}).get('main',{}).get('content','')
            record={'title':page['title'],'pageId':page.get('pageid'),'revision':revision.get('revid'),'timestamp':revision.get('timestamp'),'retrieved':datetime.now(timezone.utc).isoformat(),'requested':batch,'aliases':aliases.get(page['title'],[]),'missing':bool(page.get('missing') or not revision.get('revid')),'wikitext':raw,'sha256':hashlib.sha256(raw.encode()).hexdigest()}
            filename=hashlib.sha256(page['title'].encode()).hexdigest()[:24]+'.json'
            if (CACHE/filename).exists():
                previous=load(CACHE/filename)
                record['requested']=sorted(set(previous['requested']+batch))
                record['aliases']=sorted(set(previous['aliases']+record['aliases']))
            (CACHE/filename).write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
        print(f'Cached batch {start//20+1}: {len(data["query"]["pages"])} pages',flush=True)
        time.sleep(.5)

def build():
    rows, gems=corpus()
    entries=[]
    for page in cached():
        if page['missing']:continue
        summary=lead(page['wikitext'])
        entries.append({'id':f'wiki:{page["pageId"]}','name':page['title'],'aliases':sorted(set([page['title'],*page['aliases']])),'kind':'mechanic','definition':summary,'status':'source-extracted' if summary else 'needs-extraction','tooltipEligible':False,'contexts':['item-modifier','skill-tooltip','tree-stat'],'relatedTitles':sorted(set(re.findall(r'\[\[([^\]|#]+)',page['wikitext']))),'sources':[{'type':'wiki','url':'https://www.poewiki.net/wiki/'+urllib.parse.quote(page['title'].replace(' ','_')),'revision':page['revision'],'timestamp':page['timestamp'],'sha256':page['sha256'],'license':'CC BY-NC-SA 3.0 (wiki-licensed content)'}]})
    for gem in gems:
        entries.append({'id':'gem:'+gem['id'],'name':gem['name'],'aliases':[gem['name']],'kind':'skill','definition':gem['description'],'status':'source-extracted','tooltipEligible':False,'contexts':['item-modifier','skill-tooltip','tree-stat'],'relatedTitles':[],'sources':[{'type':'pob','path':'references/path-of-building/PathOfBuilding-dev.zip','record':gem['id']}],'gemId':gem['id']})
    # Item-granted skills are not limited to purchasable/socketable gems.
    spec=importlib.util.spec_from_file_location('skill_import',ROOT/'scripts/build-skills.py'); module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    with zipfile.ZipFile(ROOT/'references/path-of-building/PathOfBuilding-dev.zip') as archive:
        for filename in ('other','glove'):
            path=f'PathOfBuilding-dev/src/Data/Skills/{filename}.lua'
            for key, skill in module.parse_skills(archive.read(path).decode()).items():
                if not skill.get('description') or not skill.get('name'):continue
                entries.append({'id':'granted-skill:'+key,'name':skill['name'],'aliases':[skill['name']],'kind':'granted-skill','definition':skill['description'],'status':'source-extracted','tooltipEligible':False,'contexts':['item-modifier','skill-tooltip','tree-stat'],'relatedTitles':[],'sources':[{'type':'pob','path':path,'record':key}]})
    # Reviewed definitions must be explicit, with a cached source and matching rules.
    reviewed=ROOT/'glossary/reviewed.json'
    if reviewed.exists():
        for entry in load(reviewed):
            source_title=entry.pop('sourceTitle')
            source=next((e for e in entries if e['name'].casefold()==source_title.casefold() and e['id'].startswith('wiki:')),None)
            if source is None:raise ValueError('Reviewed entry missing cached wiki source')
            entries.append({**entry,'sources':source['sources'],'status':'reviewed','tooltipEligible':True,'contexts':['item-modifier','skill-tooltip','tree-stat']})
    entries.sort(key=lambda e:e['id'])
    coverage=[]
    reviewed_rows=set()
    for entry in entries:
        pattern=re.compile(r'(?<!\w)(?:'+ '|'.join(re.escape(a) for a in sorted(entry['aliases'],key=len,reverse=True))+r')(?!\w)',re.I)
        matched=[index for index,row in enumerate(rows) if pattern.search(row['text'])]
        references=[{k:v for k,v in rows[index].items() if k!='text'} for index in matched]
        if entry['tooltipEligible']:reviewed_rows.update(matched)
        entry['references']=references
        coverage.append({'id':entry['id'],'references':len(references),'status':entry['status']})
    tags=load(ROOT/'crafting-ui/tag-data.json')['tags']
    report={'entries':len(entries),'wikiPages':len(cached()),'wikiDefinitions':sum(e['id'].startswith('wiki:') and bool(e['definition']) for e in entries),'reviewed':sum(e['status']=='reviewed' for e in entries),'missingPages':[p['title'] for p in cached() if p['missing']],'surfaces':{s:sum(r['surface']==s for r in rows) for s in ['item-modifier','skill-tooltip','tree-stat']},'coverage':coverage,'tagBacklog':[{'key':t['key'],'status':'needs-definition-mapping'} for t in tags]}
    directory=ROOT/'glossary';directory.mkdir(exist_ok=True)
    aliases={}
    for entry in entries:
        for alias in entry['aliases']:aliases.setdefault(alias.casefold(),[]).append(entry['id'])
    indexes={'byId':{entry['id']:index for index,entry in enumerate(entries)},'byAlias':aliases}
    report['rowsWithAtLeastOneReviewedTerm']=len(reviewed_rows)
    report['rowsWithoutReviewedTerms']=len(rows)-len(reviewed_rows)
    (directory/'master.json').write_text(json.dumps({'version':1,'entries':entries,'indexes':indexes},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    grants=[]
    for row in rows:
        for match in re.finditer(r'Grants (?:Level \d+ )?(.+?) Skill\b',row['text'],re.I):grants.append({**row,'candidate':match[1]})
    (ROOT/'resources/glossary-unresolved.json').write_text(json.dumps({'note':'No reviewed match is a triage signal; a matched row does not imply every phrase is explained. Candidate skills require explicit identity resolution.','rowsWithoutReviewedTerms':[row for index,row in enumerate(rows) if index not in reviewed_rows],'grantedSkillCandidates':grants},indent=2),encoding='utf-8')
    (ROOT/'resources/glossary-coverage.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k not in ('coverage','tagBacklog','missingPages')}))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--download',action='store_true');parser.add_argument('--expand',action='store_true');parser.add_argument('--limit',type=int,default=200);args=parser.parse_args()
    if args.download:acquire(args.limit,args.expand)
    build()
