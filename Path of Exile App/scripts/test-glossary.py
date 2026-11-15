import importlib.util
from pathlib import Path
import sys
import unittest
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('glossary_build',Path(__file__).with_name('wiki-glossary.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class GlossaryTests(unittest.TestCase):
    def test_invalid_api_titles_are_unavailable_even_without_missing_flag(self):
        import tempfile
        import json
        original=module.CACHE
        try:
            with tempfile.TemporaryDirectory() as directory:
                module.CACHE=Path(directory)
                file=module.CACHE/'invalid.json'
                raw=json.dumps({'title':'[DNT]','revision':None,'missing':False})
                file.write_text(raw,encoding='utf8')
                self.assertTrue(module.cached()[0]['missing'])
                self.assertEqual(file.read_text(encoding='utf8'),raw)
        finally:module.CACHE=original

    def test_lead_extraction_never_executes_templates_and_discards_references(self):
        raw='{{status|description={{nested|ignored}}}}\n\n[[File:x.png|thumb|art]]\n\n\'\'\'Burning ground\'\'\' is a [[ground effect]] that deals [[fire|fire damage]] over time and is not ignite.<ref>untrusted</ref>\n\n==Sources==\nOther text'
        result=module.lead(raw)
        self.assertIn('Burning ground is a ground effect',result)
        self.assertNotIn('untrusted',result)
        self.assertNotIn('Other text',result)
        self.assertNotIn('{{',result)
    def test_cached_sources_have_revision_and_hash(self):
        import hashlib
        for page in module.cached():
            if page['missing']:continue
            self.assertTrue(page['revision'])
            self.assertEqual(page['sha256'],hashlib.sha256(page['wikitext'].encode()).hexdigest())

if __name__=='__main__':unittest.main()
