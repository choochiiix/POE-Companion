import importlib.util
from pathlib import Path
import sys
import unittest
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('effects',Path(__file__).with_name('buff-effects.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class EffectsTests(unittest.TestCase):
    def test_missing_revision_is_not_a_wiki_mechanic(self):
        self.assertIsNone(module.context({'revision':None,'wikitext':'A matching title is not a source revision.'}))
        self.assertIsNone(module.context({'revision':123,'wikitext':''}))
    def test_sources_and_templates_remain_distinct(self):
        source={'templates':{'one':{'stats':{'speed':8},'stat_text':['8% speed'],'aura_radius_metres':6},'two':{'stats':{'speed':10}}},'sources':{'PassiveSkills':[{'id':'node','template':'one','stats':None,'stat_text':None}]}}
        variants=module.extract_effects(source)
        self.assertEqual(len(variants),3)
        self.assertEqual(variants[0]['stats'],{'speed':8})
        self.assertEqual(variants[1]['stats'],{'speed':10})
        self.assertEqual(variants[2]['template'],'one')
        self.assertEqual(variants[2]['stats'],{})
        self.assertEqual(module.extract_effects({'stats':['unknown']}),[])
    def test_known_formatting_keeps_effect_numbers_without_template_execution(self):
        text="'''Onslaught''' grants {{c|mod|20% increased [[Attack speed|Attack Speed]]}}.\n\n==Mechanics==\nThis effect can be scaled by a source-specific modifier and other effects.\n\n==Other==\nExcluded."
        result=module.context({'title':'Onslaught','revision':1,'timestamp':'date','sha256':'hash','wikitext':text})
        self.assertIn('20% increased Attack Speed',result['summary'])
        self.assertEqual(len(result['mechanics']),1)
        self.assertEqual(result['status'],'related-article-unreviewed')
        self.assertNotIn('Excluded',str(result))

if __name__=='__main__':unittest.main()
