"""Offline, data-only gem reference formatting. No Lua execution or build simulation."""
import math
import re

TOOLTIP_FIELDS = {'stats', 'constantStats', 'qualityStats', 'statDescriptionScope', 'castTime', 'baseEffectiveness', 'incrementalEffectiveness'}


def seq(table):
    return [table[k] for k in sorted(k for k in (table or {}) if type(k) is int)]


def number(value):
    return format(round(value, 6), '.6f').rstrip('0').rstrip('.') or '0'


def range_text(values, decimals=None, signed=False):
    low, high = min(values), max(values)
    def fmt(v):
        result = f'{v:.{decimals}f}' if decimals is not None else number(v)
        return '+' + result if signed and v >= 0 else result
    if abs(high - low) < 1e-8:
        return fmt(low)
    if signed and low >= 0:
        return f'+({number(low)}–{number(high)})'
    return f'({fmt(low)}–{fmt(high)})'


def pob_round(value, places=0):
    factor = 10 ** places
    return math.floor(value * factor + .5) / factor


def build_stats(effect, levels, constants):
    output, unresolved = {}, []
    for index, stat in enumerate(seq(effect.get('stats')), 1):
        values = []
        for level in levels:
            value = level.get(index, 1)
            mode = (level.get('statInterpolation') or {}).get(index, 1)
            if not isinstance(value, (int, float)):
                values = None
                break
            if mode == 3:
                actor_level = level.get('levelRequirement', 1)
                effectiveness = (constants['SkillDamageBaseEffectiveness'] + constants['SkillDamageIncrementalEffectiveness'] * (actor_level - 1)) * effect.get('baseEffectiveness', 1) * (1 + effect.get('incrementalEffectiveness', 0)) ** (actor_level - 1)
                value = pob_round(effectiveness * value)
            elif mode != 1:
                # PoB itself calls mode 2's interpolation a guess. Keep explicit.
                values = None
                break
            values.append(value)
        if values is None:
            unresolved.append({'stat': stat, 'reason': 'Unsupported or contextual stat interpolation', 'values': [row.get(index) for row in levels]})
        else:
            output[stat] = values
    for entry in seq(effect.get('constantStats')):
        stat, value = entry.get(1), entry.get(2, 0)
        if isinstance(stat, str) and isinstance(value, (int, float)):
            output[stat] = [v + value for v in output.get(stat, [0] * len(levels))]
        else:
            unresolved.append({'stat': str(stat), 'reason': 'Nonliteral constant stat'})
    return output, unresolved


def apply_special(values, spec):
    key, index = spec.get('k'), spec.get('v')
    if key in {'reminderstring', 'canonical_line', 'canonical_stat', '_stat'}:
        return
    if type(index) is not int or index < 1 or index > len(values):
        raise ValueError('Unsupported translation directive: ' + str(key))
    operations = {
        'negate': lambda v: -v,
        'invert_chance': lambda v: 100 - v,
        'negate_and_double': lambda v: -2 * v,
        'divide_by_two_0dp': lambda v: math.trunc(v / 2),
        'divide_by_ten_0dp': lambda v: math.trunc(v / 10),
        'divide_by_fifteen_0dp': lambda v: math.trunc(v / 15),
        'divide_by_four': lambda v: v / 4,
        'divide_by_five': lambda v: v / 5,
        'divide_by_six': lambda v: v / 6,
        'divide_by_ten_1dp_if_required': lambda v: pob_round(v / 10, 1),
        'divide_by_ten_1dp': lambda v: pob_round(v / 10, 1),
        'divide_by_twelve': lambda v: v / 12,
        'divide_by_twenty': lambda v: v / 20,
        'divide_by_one_hundred': lambda v: v / 100,
        'divide_by_one_hundred_1dp': lambda v: pob_round(v / 100, 1),
        'divide_by_one_hundred_2dp_if_required': lambda v: pob_round(v / 100, 2),
        'divide_by_one_hundred_2dp': lambda v: pob_round(v / 100, 2),
        'divide_by_one_hundred_and_negate': lambda v: -pob_round(v / 100, 1),
        'divide_by_twenty_then_double_0dp': lambda v: pob_round(v / 20) * 2,
        'divide_by_one_thousand': lambda v: v / 1000,
        'per_minute_to_per_second': lambda v: pob_round(v / 60, 1),
        'permyriad_per_minute_to_%_per_second': lambda v: pob_round(v / 6000, 1),
        'per_minute_to_per_second_0dp': lambda v: math.trunc(v / 60),
        'per_minute_to_per_second_1dp': lambda v: pob_round(v / 60, 1),
        'per_minute_to_per_second_2dp': lambda v: pob_round(v / 60, 2),
        'per_minute_to_per_second_2dp_if_required': lambda v: pob_round(v / 60, 2),
        'milliseconds_to_seconds': lambda v: v / 1000,
        'milliseconds_to_seconds_0dp': lambda v: math.trunc(v / 1000),
        'milliseconds_to_seconds_1dp': lambda v: pob_round(v / 1000, 1),
        'milliseconds_to_seconds_2dp': lambda v: pob_round(v / 1000, 2),
        'milliseconds_to_seconds_2dp_if_required': lambda v: pob_round(v / 1000, 2),
        'deciseconds_to_seconds': lambda v: v / 10,
        'locations_to_metres': lambda v: v / 10,
        '30%_of_value': lambda v: math.trunc(v * .3),
        '60%_of_value': lambda v: math.trunc(v * .6),
        'multiplicative_damage_modifier': lambda v: 100 + v,
        'multiplicative_permyriad_damage_modifier': lambda v: 100 + pob_round(v / 100, 1),
        'multiply_by_four': lambda v: v * 4,
        'times_one_point_five': lambda v: v * 1.5,
        'times_twenty': lambda v: v * 20,
        'double': lambda v: v * 2,
        'plus_two_hundred': lambda v: v + 200,
    }
    if key not in operations:
        raise ValueError('Unsupported translation directive: ' + str(key))
    values[index - 1] = [operations[key](v) for v in values[index - 1]]


def matches_limits(desc, values, quality=False):
    for bounds, data in zip(seq(desc.get('limit')), values):
        low, high = bounds.get(1, '#'), bounds.get(2, '#')
        for value in data:
            # Quality reference values can be fractional. Integer +/-1 limits
            # encode positive/negative wording; retain the actual fraction.
            compare = math.copysign(1, value) if quality and 0 < abs(value) < 1 else value
            if low == '!':
                if value == high:
                    return False
            elif (low != '#' and compare < low) or (high != '#' and compare > high):
                return False
    return True


def format_template(text, values):
    def replace(match):
        index = int(match[1] or 0)
        if index >= len(values):
            raise ValueError('Missing template value')
        return range_text(values[index], signed=bool(match[2]))
    result = re.sub(r'\{(\d*)(?::(\+?)d)?\}', replace, text).replace('%%', '%')
    # Strip source inline display links to their visible text, never insert HTML.
    result = re.sub(r'\[([^\]|]+)\|([^\]]+)\]', r'\2', result)
    result = re.sub(r'\[([^\]]+)\]', r'\1', result)
    if '{' in result or '}' in result:
        raise ValueError('Unsupported template syntax')
    return result


def translate(stats, scope_name, scopes, quality=False, context=None):
    chain, seen = [], set()
    while scope_name:
        if scope_name in seen or scope_name not in scopes:
            break
        seen.add(scope_name)
        chain.append(scopes[scope_name])
        scope_name = scopes[scope_name].get('parent')
    descriptors, issues, hidden = {}, [], 0
    for stat, values in stats.items():
        if not any(values):
            continue
        for depth, scope in enumerate(chain):
            if stat in scope:
                order = scope[stat]
                descriptor = scope.get(order)
                if not isinstance(descriptor, dict):
                    issues.append({'stat': stat, 'reason': 'Invalid source descriptor', 'values': values})
                elif 1 not in descriptor:
                    hidden += 1  # Explicit hidden source stat; never invent text.
                else:
                    key = descriptor.get('stats', {}).get(1, stat)
                    descriptors.setdefault(key, (depth, order, descriptor))
                break
        else:
            issues.append({'stat': stat, 'reason': 'No source translation', 'values': values})
    lines = []
    count = max((len(v) for v in stats.values()), default=1)
    for depth, order, descriptor in sorted(descriptors.values(), key=lambda d: (-d[0], d[1])):
        keys = seq(descriptor['stats'])
        values = [stats.get(key, (context or {}).get(key, [0] * count))[:] for key in keys]
        candidates = [d for d in seq(descriptor[1]) if quality or not d.get('gem_quality')]
        # Select wording per actual source level, then combine only levels with
        # the same wording. Zero bonuses and sign changes cannot create false text.
        groups = {}
        for index in range(count):
            sample = [[v[index]] for v in values]
            choice = next((i for i, d in enumerate(candidates) if matches_limits(d, sample, quality)), None)
            if choice is not None:
                groups.setdefault(choice, []).append(index)
        if not groups:
            hidden += 1  # Source limits intentionally have no display line.
        for choice, indices in groups.items():
            desc = candidates[choice]
            selected = [[v[i] for i in indices] for v in values]
            try:
                for special in seq(desc):
                    apply_special(selected, special)
                line = format_template(desc['text'], selected)
                lines.extend(line.replace('\\n', '\n').split('\n'))
            except (ValueError, KeyError, TypeError) as error:
                issues.append({'stat': ', '.join(keys), 'reason': str(error), 'values': selected})
    return list(dict.fromkeys(lines)), issues, hidden


def build_tooltip(effect, max_level, scopes, constants):
    table = effect.get('levels') or {}
    rows = [table[n] for n in sorted(k for k in table if type(k) is int and 1 <= k <= (max_level or 1))]
    diagnostics, properties = [], []
    if not rows:
        diagnostics.append({'section': 'base', 'stat': 'levels', 'reason': 'Level data unavailable'})
        return {'properties': [], 'statLines': [], 'qualityLines': [], 'diagnostics': diagnostics, 'hiddenStats': 0}
    def prop(label, key, unit='', multiplier=1, offset=0, decimals=None, divisor=1, default=None):
        values = [row.get(key) for row in rows]
        if all(value is None for value in values):
            return
        if default is not None:
            values = [default if value is None else value for value in values]
        if not all(type(value) in (int, float) for value in values):
            diagnostics.append({'section': 'properties', 'stat': key, 'reason': 'Property is not present at every reference level'})
            return
        properties.append({'label': label, 'value': range_text([(v * multiplier + offset) / divisor for v in values], decimals) + unit})
    resources = constants.get('costs', {})
    for resource in sorted({k for row in rows for k in (row.get('cost') or {})}):
        definition = resources.get(resource)
        if not definition:
            diagnostics.append({'section': 'properties', 'stat': resource, 'reason': 'Unknown cost resource'})
            continue
        values = [(row.get('cost') or {}).get(resource, 0) / definition['Divisor'] for row in rows]
        properties.append({'label': 'Cost' if resource != 'Soul' else 'Soul cost', 'value': definition['ResourceString'].replace('{0}', range_text(values)).replace('[DNT] ', '').strip()})
    for key, label, unit in [('manaReservationFlat','Mana reservation',' Mana'),('manaReservationPercent','Mana reservation','% Mana'),('lifeReservationFlat','Life reservation',' Life'),('lifeReservationPercent','Life reservation','% Life')]:
        prop(label,key,unit)
    prop('Cost & reservation multiplier','manaMultiplier','%',offset=100,default=0)
    cast_time = effect.get('castTime')
    is_attack = bool((effect.get('skillTypes') or {}).get('Attack'))
    if type(cast_time) in (int, float) and not effect.get('support') and not is_attack:
        properties.append({'label': 'Cast time', 'value': f'{cast_time:.2f} sec' if cast_time else 'Instant'})
    prop('Cooldown time','cooldown',' sec',decimals=2)
    prop('Stored uses','storedUses')
    prop('Vaal stored uses','vaalStoredUses')
    prop('Soul gain prevention','soulPreventionDuration',' sec',decimals=2)
    prop('Attack time','attackTime',' sec',divisor=1000,decimals=2)
    prop('Attack speed','attackSpeedMultiplier','% of base',offset=100)
    prop('Attack damage','baseMultiplier','% of base',multiplier=100,default=1)
    prop('Critical strike chance','critChance','%',decimals=2)
    prop('Effectiveness of added damage','damageEffectiveness','%',multiplier=100,default=1)
    stats, unresolved = build_stats(effect, rows, constants)
    lines, issues, hidden = translate(stats, effect.get('statDescriptionScope'), scopes)
    diagnostics.extend({'section': 'base', **d} for d in unresolved + issues)
    quality_stats = {}
    quality_data = effect.get('qualityStats')
    for entry in seq(quality_data):
        key, value = entry.get(1), entry.get(2)
        if isinstance(key, str) and type(value) in (int, float):
            quality_stats[key] = [v + value * q for v, q in zip(quality_stats.get(key, [0, 0]), [1, 20])]
        else:
            diagnostics.append({'section': 'quality', 'stat': str(key), 'reason': 'Nonliteral quality stat'})
    quality_context = {entry[1]: [entry[2], entry[2]] for entry in seq(effect.get('constantStats')) if isinstance(entry.get(1), str) and type(entry.get(2)) in (int, float)}
    quality_lines, issues, quality_hidden = translate(quality_stats, effect.get('statDescriptionScope'), scopes, quality=True, context=quality_context)
    diagnostics.extend({'section': 'quality', **d} for d in issues)
    return {'properties': properties, 'statLines': lines, 'qualityLines': quality_lines, 'qualityStatus': 'available' if quality_data is not None else 'not-supplied', 'diagnostics': diagnostics, 'hiddenStats': hidden + quality_hidden}
