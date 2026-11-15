"""Explicit offline PoB import. Reads data as text; never imports or executes Lua."""
import hashlib
import io
import json
from pathlib import Path
import re
import sys
import zipfile
sys.dont_write_bytecode = True
from gem_tooltips import TOOLTIP_FIELDS, build_tooltip

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / 'references/path-of-building/PathOfBuilding-dev.zip'
PREFIX = 'PathOfBuilding-dev/'
TOKEN = re.compile(r'\s+|--\[\[.*?\]\]|--[^\n]*|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[A-Za-z_][\w.]*|.', re.S)


def tokens(text):
    return [m.group() for m in TOKEN.finditer(text) if not m.group().isspace() and not m.group().startswith('--')]


def literal(ts, pos=0):
    """Small data-only grammar. Symbolic SkillType names remain strings."""
    t = ts[pos]
    if t == '{':
        result, index = {}, 1
        pos += 1
        while ts[pos] != '}':
            if ts[pos] == '[':
                key, pos = literal(ts, pos + 1)
                if ts[pos:pos + 2] != [']', '=']:
                    raise ValueError('Invalid table key')
                value, pos = literal(ts, pos + 2)
            elif re.fullmatch(r'[A-Za-z_]\w*', ts[pos]) and ts[pos + 1] == '=':
                key = ts[pos]
                value, pos = literal(ts, pos + 2)
            else:
                key = index
                index += 1
                value, pos = literal(ts, pos)
            result[key] = value
            if ts[pos] in (',', ';'):
                pos += 1
            elif ts[pos] != '}':
                raise ValueError('Unsupported expression: ' + ts[pos])
        return result, pos + 1
    if t.startswith('"'):
        return json.loads(t.replace('\\/', '/')), pos + 1
    if t.startswith("'"):
        return t[1:-1], pos + 1
    if t in ('true', 'false', 'nil'):
        return {'true': True, 'false': False, 'nil': None}[t], pos + 1
    if re.fullmatch(r'-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?', t):
        return float(t) if any(c in t for c in '.eE') else int(t), pos + 1
    if re.fullmatch(r'SkillType\.\w+', t):
        return t.split('.')[1], pos + 1
    raise ValueError('Nonliteral Lua: ' + t)


def parse_gems(text):
    ts = tokens(text)
    if ts[0] != 'return':
        raise ValueError('Expected literal return')
    value, end = literal(ts, 1)
    if end != len(ts):
        raise ValueError('Trailing Lua code')
    return value


RULE_FIELDS = {'skillTypes', 'minionSkillTypes', 'requireSkillTypes', 'excludeSkillTypes', 'addSkillTypes', 'ignoreMinionTypes', 'cannotBeSupported', 'unsupported', 'weaponTypes', 'isTrigger'}
FIELDS = RULE_FIELDS | TOOLTIP_FIELDS | {'description', 'support', 'levels', 'name'}


def skip_function(ts, start):
    stack, i = ['function'], start + 1
    while stack and i < len(ts):
        t = ts[i]
        if t in ('function', 'if', 'repeat'):
            stack.append(t)
        elif t in ('for', 'while'):
            stack.append(t + '-pending')
        elif t == 'do':
            if stack[-1].endswith('-pending'):
                stack[-1] = stack[-1].replace('-pending', '')
            else:
                stack.append('do')
        elif t in ('end', 'until'):
            stack.pop()
        i += 1
    if stack:
        raise ValueError('Unterminated function in source')
    return i


def parse_skills(text):
    # Only top-level fields in skills["id"] tables are inspected. Function bodies,
    # modifier calls and other calculation code are skipped, never evaluated.
    ts, result, i = tokens(text), {}, 0
    while i < len(ts) - 5:
        if ts[i:i + 2] != ['skills', '['] or ts[i + 3:i + 6] != [']', '=', '{']:
            i += 1
            continue
        identity = json.loads(ts[i + 2])
        i += 6
        depth, fields = 1, {}
        while depth:
            t = ts[i]
            if t == 'function':
                i = skip_function(ts, i)
                continue
            if depth == 1 and t in FIELDS and ts[i + 1] == '=':
                try:
                    value, end = literal(ts, i + 2)
                    if ts[end] not in (',', ';', '}'):
                        raise ValueError('Nonliteral field expression')
                    fields[t], i = value, end
                    continue
                except ValueError:
                    fields[t] = None
            depth += (t == '{') - (t == '}')
            i += 1
        result[identity] = fields
    return result


def requirement(level, support, weight):
    if not weight or level is None:
        return 0 if not weight else None
    value = int((20 + (level - 3) * 3) * (weight / 100) ** .9 * (.5 if support else .7) + .5)
    return value if value >= 14 else 0


def crop_png(image, entry):
    x, y, w, h = [entry[k] for k in ('x', 'y', 'w', 'h')]
    if not all(type(v) is int for v in (x, y, w, h)) or min(x, y) < 0 or min(w, h) <= 0 or x + w > image.width or y + h > image.height:
        raise ValueError('Invalid sprite crop rectangle')
    output = io.BytesIO()
    image.crop((x, y, x + w, y + h)).save(output, format='PNG')
    return output.getvalue()


def build():
    report = {'archiveSha256': hashlib.sha256(ARCHIVE.read_bytes()).hexdigest(), 'sources': {}, 'artwork': {}, 'missingArt': [], 'diagnostics': []}
    with zipfile.ZipFile(ARCHIVE) as archive:
        def read(path):
            raw = archive.read(PREFIX + path)
            report['sources'][path] = hashlib.sha256(raw).hexdigest()
            return raw.decode('utf-8-sig')
        gems = parse_gems(read('src/Data/Gems.lua'))
        skills = {}
        for path in archive.namelist():
            if re.fullmatch(PREFIX + r'src/Data/Skills/\w+\.lua', path):
                skills.update(parse_skills(read(path[len(PREFIX):])))
        scopes = {}
        for path in archive.namelist():
            if re.fullmatch(PREFIX + r'src/Data/StatDescriptions/\w+\.lua', path):
                scopes[Path(path).stem] = parse_gems(read(path[len(PREFIX):]))
        misc = read('src/Data/Misc.lua')
        constants = {key: float(re.search(r'\["' + key + r'"\]\s*=\s*([\d.]+)', misc)[1]) for key in ['SkillDamageBaseEffectiveness', 'SkillDamageIncrementalEffectiveness']}
        costs = parse_gems(read('src/Data/Costs.lua'))
        constants['costs'] = {row['Resource']: row for row in costs.values()}
        # Provenance for the explicitly ported formulas/translation semantics.
        read('src/Modules/CalcTools.lua')
        read('src/Modules/StatDescriber.lua')
        read('src/Modules/CalcOffence.lua')
        records = []
        for identity, gem in gems.items():
            effect = skills.get(gem.get('grantedEffectId'), {})
            support = bool(gem.get('tags', {}).get('support'))
            max_level = gem.get('naturalMaxLevel')
            levels = effect.get('levels') or {}
            reqs = {}
            for label, level in [('first', 1), ('maximum', max_level)]:
                required = levels.get(level, {}).get('levelRequirement')
                reqs[label] = {'level': required, **{attr: requirement(required, support, gem.get(field, 0)) for attr, field in [('strength', 'reqStr'), ('dexterity', 'reqDex'), ('intelligence', 'reqInt')]}}
            rules = {k: effect.get(k) for k in sorted(RULE_FIELDS)}
            for k in ['requireSkillTypes', 'excludeSkillTypes', 'addSkillTypes']:
                if isinstance(rules[k], dict):
                    rules[k] = list(rules[k].values())
            for k in ['skillTypes', 'minionSkillTypes']:
                if isinstance(rules[k], dict):
                    rules[k] = [key for key, value in rules[k].items() if value is True]
            records.append({'id': identity, 'name': gem['name'], 'type': 'support' if support else 'active', 'tags': [k for k, v in gem.get('tags', {}).items() if v], 'tagString': gem.get('tagString', ''), 'maxLevel': max_level, 'description': effect.get('description', ''), 'requirements': reqs, 'rules': rules, 'secondaryEffect': gem.get('secondaryGrantedEffectId'), 'art': None})
            records[-1]['tooltip'] = build_tooltip(effect, max_level, scopes, constants)
            if gem.get('secondaryGrantedEffectId') in skills:
                secondary = skills[gem['secondaryGrantedEffectId']]
                records[-1]['secondaryTooltip'] = {'name': secondary.get('name', gem['secondaryGrantedEffectId']), 'description': secondary.get('description', ''), **build_tooltip(secondary, max_level, scopes, constants)}
            if effect.get('support', False) != support:
                report['diagnostics'].append({'id': identity, 'issue': 'Classification differs or skill definition missing'})
        # Optional, explicit authoritative atlas map. No matching by guessed names.
        # Entries keyed by exact Gems.lua identity: {sprite: archive path, x,y,w,h}.
        manifest = ROOT / 'references/path-of-building/gem-art.json'
        art_map = json.loads(manifest.read_text()) if manifest.exists() else {}
        if manifest.exists():
            report['atlasMapSha256'] = hashlib.sha256(manifest.read_bytes()).hexdigest()
        output = ROOT / 'crafting-ui/assets/gems'
        output.mkdir(parents=True, exist_ok=True)
        images = {}
        for gem in records:
            entry = art_map.get(gem['id'])
            if not entry:
                report['missingArt'].append(gem['id'])
                continue
            from PIL import Image
            path = entry['sprite']
            raw = archive.read(path)
            report['sources'][path] = hashlib.sha256(raw).hexdigest()
            if path not in images:
                images[path] = Image.open(io.BytesIO(raw)).convert('RGBA')
            filename = hashlib.sha256(gem['id'].encode()).hexdigest()[:24] + '.png'
            png = crop_png(images[path], entry)
            (output / filename).write_bytes(png)
            gem['art'] = '/assets/gems/' + filename
            report['artwork'][gem['id']] = {**entry, 'file': gem['art'], 'sha256': hashlib.sha256(png).hexdigest()}
        license_text = read('LICENSE.md')
    records.sort(key=lambda g: (g['name'].casefold(), g['id']))
    report['counts'] = {kind: sum(g['type'] == kind for g in records) for kind in ('active', 'support')}
    report['counts']['artwork'] = sum(bool(g['art']) for g in records)
    report['counts']['missingDescriptions'] = sum(not g['description'] for g in records)
    report['counts']['missingActiveTypes'] = sum(g['type'] == 'active' and g['rules']['skillTypes'] is None for g in records)
    report['counts']['gemsWithTranslatedStats'] = sum(bool(g['tooltip']['statLines']) for g in records)
    report['counts']['gemsWithTranslatedQuality'] = sum(bool(g['tooltip']['qualityLines']) for g in records)
    report['counts']['gemsWithTooltipDiagnostics'] = sum(bool(g['tooltip']['diagnostics']) for g in records)
    report['tooltipDiagnostics'] = [{'id': g['id'], **d} for g in records for d in g['tooltip']['diagnostics']]
    report['artworkStatus'] = 'The supplied archive has passive-tree sprites, but no gem inventory atlas or gem sprite coordinates. No substitute artwork was generated.'
    (ROOT / 'resources/pob-gems-LICENSE.md').write_text(license_text, encoding='utf-8')
    (ROOT / 'resources/gem-import-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    (ROOT / 'crafting-ui/skills-data.json').write_text(json.dumps({'version': 2, 'source': 'User-provided PathOfBuilding-dev.zip', 'gems': records, 'artworkStatus': report['artworkStatus']}, separators=(',', ':')), encoding='utf-8')
    print(json.dumps(report['counts']))


if __name__ == '__main__':
    build()
