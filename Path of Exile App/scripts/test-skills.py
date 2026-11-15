"""Focused parser tests; run with python scripts/test-skills.py."""
import importlib.util
import sys
import unittest
import io
import zipfile
from pathlib import Path

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('build_skills', Path(__file__).with_name('build-skills.py'))
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)
from gem_tooltips import apply_special, build_stats, build_tooltip, format_template, translate


class ParserTests(unittest.TestCase):
    def test_literal_data_and_escapes(self):
        data = build.parse_gems('-- comment\nreturn { ["id"] = {name = "A \\"quote\\"", tags = {support=true}, naturalMaxLevel=20} }')
        self.assertEqual(data['id']['name'], 'A "quote"')
        self.assertTrue(data['id']['tags']['support'])

    def test_executable_input_is_rejected(self):
        for text in ['return os.execute("bad")', 'return {} os.execute("bad")', 'return { name = getName() }']:
            with self.assertRaises(ValueError):
                build.parse_gems(text)

    def test_extract_metadata_without_executing_modifier_calls(self):
        data = build.parse_skills('''return function(skills, mod)
        skills["Test"] = {
          description = "Text with } and skills[ in it", support = true,
          requireSkillTypes = {SkillType.Attack, SkillType.Spell, SkillType.OR},
          statMap = { ["nested"] = {mod("Damage", sideEffect())} },
          preDamageFunc = function()
            local stats = {"must not be imported"}
            if true then for i=1,2 do local description = "not metadata" end end
          end,
          levels = { [1] = {0.2, levelRequirement=8, cost={Mana=10}}, [20] = {1,levelRequirement=70} },
          excludeSkillTypes = {},
        }
        end''')['Test']
        self.assertEqual(data['requireSkillTypes'], {1: 'Attack', 2: 'Spell', 3: 'OR'})
        self.assertEqual(data['levels'][1]['levelRequirement'], 8)
        self.assertEqual(data['levels'][1]['cost'], {'Mana': 10})
        self.assertEqual(data['levels'][20]['levelRequirement'], 70)
        self.assertEqual(data['excludeSkillTypes'], {})
        self.assertNotIn('stats', data)

    def test_nonliteral_metadata_expression_is_not_partially_accepted(self):
        data = build.parse_skills('skills["X"] = { castTime = 0.5 * modifier, stats = {}, levels = {} }')['X']
        self.assertIsNone(data['castTime'])

    def test_requirement_formula_matches_pob_examples(self):
        self.assertEqual(build.requirement(70, False, 100), 155)
        self.assertEqual(build.requirement(70, True, 100), 111)
        self.assertEqual(build.requirement(1, False, 100), 0)
        self.assertIsNone(build.requirement(None, False, 100))

    def test_crop_png_preserves_actual_source_pixels_and_rejects_bounds(self):
        # Real archive decoration, in memory only; never assigned to a gem.
        from PIL import Image
        with zipfile.ZipFile(build.ARCHIVE) as archive:
            image = Image.open(io.BytesIO(archive.read(build.PREFIX + 'src/Assets/game_ui_small.png'))).convert('RGBA')
        result = Image.open(io.BytesIO(build.crop_png(image, {'x':4,'y':8,'w':16,'h':24})))
        self.assertEqual(result.format,'PNG')
        self.assertEqual(result.size,(16,24))
        self.assertEqual(result.tobytes(),image.crop((4,8,20,32)).tobytes())
        for entry in [{'x':-1,'y':0,'w':1,'h':1}, {'x':0,'y':0,'w':0,'h':1}, {'x':0,'y':0,'w':image.width+1,'h':1}, {'x':0.5,'y':0,'w':1,'h':1}]:
            with self.assertRaises(ValueError):
                build.crop_png(image,entry)


class TooltipTests(unittest.TestCase):
    def setUp(self):
        self.scopes = {'root': {1: {'stats': {1:'damage'}, 1:{1:{'limit':{1:{1:1,2:'#'}},'text':'Deals {0} Damage'}}}, 'damage':1}}

    def test_scope_inheritance_hidden_override_and_unknown_fields(self):
        self.scopes['child'] = {'parent':'root', 1:{'stats':{1:'hidden'}},'hidden':1}
        lines, issues, hidden = translate({'damage':[10,20],'hidden':[1,1],'missing':[2,2]},'child',self.scopes)
        self.assertEqual(lines,['Deals (10–20) Damage'])
        self.assertEqual(issues[0]['stat'],'missing')
        self.assertEqual(hidden,1)
        self.scopes['child']['damage'] = 1
        self.assertEqual(translate({'damage':[10,20]},'child',self.scopes)[0],[])

    def test_fractional_quality_and_sign_specific_wording(self):
        desc = self.scopes['root'][1]
        self.assertEqual(translate({'damage':[.5,10]},'root',self.scopes,True)[0],['Deals (0.5–10) Damage'])
        desc[1][2] = {'limit':{1:{1:'#',2:-1}},1:{'k':'negate','v':1},'text':'Loses {0} Damage'}
        lines, issues, _ = translate({'damage':[-5,0,5,10]},'root',self.scopes)
        self.assertEqual(lines,['Loses 5 Damage','Deals (5–10) Damage'])
        self.assertEqual(issues,[])

    def test_conversion_signed_placeholders_and_unknown_directives(self):
        values = [[.05,1]]
        apply_special(values,{'k':'locations_to_metres','v':1})
        self.assertEqual(format_template('Radius {0}; {0:+d}',values),'Radius (0.005–0.1); +(0.005–0.1)')
        with self.assertRaises(ValueError):
            apply_special(values,{'k':'execute_unknown','v':1})

    def test_quality_uses_source_context_without_emitting_base_stats(self):
        self.scopes['root'][1]['stats'][2] = 'source_flag'
        self.scopes['root'][1][1][1]['limit'][2] = {1:1,2:1}
        lines, issues, _ = translate({'damage':[.5,10]},'root',self.scopes,True,{'source_flag':[1,1]})
        self.assertEqual(lines,['Deals (0.5–10) Damage'])
        self.assertEqual(issues,[])

    def test_damage_effectiveness_scaling_and_unsupported_interpolation(self):
        effect = {'stats':{1:'minimum',2:'maximum'},'baseEffectiveness':.82349997758865,'incrementalEffectiveness':.041299998760223}
        levels = [{1:.80000001192093,2:1.2000000476837,'levelRequirement':16,'statInterpolation':{1:3,2:3}}, {1:.80000001192093,2:1.2000000476837,'levelRequirement':70,'statInterpolation':{1:3,2:3}}]
        constants = {'SkillDamageBaseEffectiveness':3.885209,'SkillDamageIncrementalEffectiveness':.360246}
        stats, issues = build_stats(effect,levels,constants)
        self.assertEqual(stats,{'minimum':[11.0,309.0],'maximum':[17.0,464.0]})
        self.assertEqual(issues,[])
        levels[0]['statInterpolation'][1] = 2
        stats, issues = build_stats(effect,levels,constants)
        self.assertNotIn('minimum',stats)
        self.assertEqual(issues[0]['stat'],'minimum')

    def test_support_multiplier_and_cost_units(self):
        effect = {'support':True,'levels':{1:{'manaMultiplier':20,'cost':{'ManaPerMinute':60}},20:{'manaMultiplier':30,'cost':{'ManaPerMinute':120}}},'qualityStats':{}}
        constants = {'costs':{'ManaPerMinute':{'ResourceString':'{0} Mana per second','Divisor':60}}}
        tooltip = build_tooltip(effect,20,{},constants)
        self.assertIn({'label':'Cost','value':'(1–2) Mana per second'},tooltip['properties'])
        self.assertIn({'label':'Cost & reservation multiplier','value':'(120–130)%'},tooltip['properties'])
        self.assertFalse(any(p['label']=='Cast time' for p in tooltip['properties']))

    def test_neutral_property_defaults_and_attack_cast_time(self):
        effect = {'castTime':1,'skillTypes':{'Attack':True},'levels':{1:{},20:{'damageEffectiveness':1.5,'baseMultiplier':1.5,'manaMultiplier':-8}}}
        tooltip = build_tooltip(effect,20,{}, {})
        self.assertIn({'label':'Attack damage','value':'(100–150)% of base'},tooltip['properties'])
        self.assertIn({'label':'Cost & reservation multiplier','value':'(92–100)%'},tooltip['properties'])
        self.assertFalse(any(p['label']=='Cast time' for p in tooltip['properties']))


if __name__ == '__main__':
    unittest.main()
