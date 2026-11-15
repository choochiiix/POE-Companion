"""Build the explicit card-term index and audit every stored item/skill row."""
import importlib.util
import json
from pathlib import Path
import re
import sys
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('glossary',ROOT/'scripts/wiki-glossary.py');source=importlib.util.module_from_spec(spec);spec.loader.exec_module(source)
master=source.load(ROOT/'glossary/master.json')
support_names={g['name'] for g in source.load(ROOT/'crafting-ui/skills-data.json')['gems'] if g['type']=='support'}
chosen={}
for entry in sorted(master['entries'],key=lambda e:0 if e['status']=='reviewed' else 1 if e['kind'] in ('skill','granted-skill') else 2):
    is_skill=entry['kind'] in ('skill','granted-skill')
    is_keyword=any(a.casefold() in {s.casefold() for s in source.SEEDS} for a in [entry['name'],*entry['aliases']])
    if not entry['definition'] or not (entry['status']=='reviewed' or is_skill or is_keyword):continue
    if entry['name'].casefold() in ['nearby','distance']:continue
    key=entry['name'].casefold()
    if key in chosen:continue
    chosen[key]={k:entry[k] for k in ['id','name','aliases','definition','sources','contexts','status']}
    chosen[key]['tooltipEligible']=True
    chosen[key]['matchingApproval']='source-description' if is_skill else 'source-excerpt'
    if not is_skill and entry['status']!='reviewed':chosen[key]['aliases']=[a for a in entry['aliases'] if a==entry['name'] or a.casefold() in {s.casefold() for s in source.SEEDS}]
    if is_skill and entry['name'] in support_names:chosen[key]['namedSkillOnly']=True
    if is_skill:chosen[key]['definition']+=' This is the base skill description; an item’s granted level and special modifiers can change its values.'
for key,aliases in {'dexterity':['Dex'],'strength':['Str'],'intelligence':['Int'],'area of effect':['AoE'],'evasion':['Evasion Rating']}.items():
    if key in chosen:chosen[key]['aliases']+=aliases
for key,name,aliases,definition in [
 ('buff','Buff Effect',['Buff Effect'],'Changes the strength of the applicable buff’s effects. The modifier must specify which buff or buffs it affects.'),
 ('reservation','No Reservation',['has no Reservation','have no Reservation'],'The specified skill reserves none of its usual resource. This does not by itself change other costs of the skill.')]:
    base=chosen.get(key) or next((e for e in master['entries'] if e['name'].casefold()==key and e['definition']),None)
    if base:chosen[name.casefold()]={**base,'id':'phrase:'+name.lower().replace(' ','-'),'name':name,'aliases':aliases,'definition':definition,'status':'reviewed','tooltipEligible':True}
entries=list(chosen.values())
for name in ['Fire','Cold','Lightning','Physical','Chaos']:
    base=chosen.get((name+' damage').casefold())
    if base:entries.append({**base,'id':'tag-term:'+name.lower(),'aliases':[name],'fields':['tags']})
plural_terms={'Frenzy Charge','Power Charge','Endurance Charge','Charge','Totem','Trap','Mine','Minion','Projectile','Attack','Spell','Curse','Hex','Mark','Warcry','Ailment','Non-damaging Ailment','Elemental Ailment'}
for entry in entries:
    if entry['name'].casefold() in {name.casefold() for name in plural_terms}:
        entry['aliases'].append(entry['name'][:-1]+'ies' if entry['name'].lower().endswith('warcry') else entry['name']+'s')
owned=set()
for entry in entries:
    aliases=[]
    for alias in entry['aliases']:
        key=(alias.casefold(),tuple(entry.get('fields',[])))
        if key not in owned:aliases.append(alias);owned.add(key)
    entry['aliases']=aliases
entries=[e for e in entries if e['aliases']]
(ROOT/'crafting-ui/tooltip-data.json').write_text(json.dumps({'version':1,'entries':entries},ensure_ascii=False,separators=(',',':')),encoding='utf8')
rows,_=source.corpus();audit=[]
patterns=[(e,re.compile(r'(?<!\w)(?:'+'|'.join(re.escape(a) for a in e['aliases'])+r')(?!\w)',re.I)) for e in entries if not e.get('fields')]
for row in rows:
    if row['surface']=='tree-stat':continue
    matches=[]
    for entry,pattern in patterns:
        for match in pattern.finditer(row['text']):
            if entry.get('namedSkillOnly') and not re.search(r'grants?(?: level \d+)?\s*$',row['text'][:match.start()],re.I) and not re.match(r'\s+(?:support|skill)\b',row['text'][match.end():],re.I):continue
            matches.append(entry['id']);break
    audit.append({**row,'terms':matches})
report={'indexedTerms':len(entries),'rows':len(audit),'rowsWithTerms':sum(bool(r['terms']) for r in audit),'unmatchedRows':[r for r in audit if not r['terms']],'records':audit,'note':'A row with matches may still contain unresolved phrases. Wiki excerpts are labeled as such; they are not silently promoted to editorially reviewed definitions.'}
(ROOT/'resources/card-glossary-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({k:report[k] for k in ['indexedTerms','rows','rowsWithTerms']}))
