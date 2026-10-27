"""Headless regressions for editor load/reset and installer feature selection."""
import ast
import copy
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import Mock

MODS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(MODS))
from lib.egg_shop import remaining_eggs


def method(file, name, namespace):
    tree = ast.parse((MODS / file).read_text(encoding='utf-8-sig'))
    node = next(n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef) and n.name == name)
    exec(compile(ast.Module(body=[node], type_ignores=[]), file, 'exec'), namespace)
    return namespace[name]


class EggHotfixTests(unittest.TestCase):
    def setUp(self):
        self.catalog = json.loads((MODS / 'dev/egg_catalog.json').read_text())
        self.data = {'save': {'team': [{'specieKey':'raichu','lvl':100,'isShiny':True}],
            'box': [{'specieKey':'pikachu','lvl':55}], 'shop': {'eggList':['pikachu','missingNo'], 'eggPrice':50000}}}

    def test_all_species_formats_and_no_mutation(self):
        for key, pid in self.catalog['speciesIds'].items():
            for pokemon in ({'specieKey':key}, {'specie':{'id':pid}}, {'specie':key}):
                data = {'team':[pokemon], 'box':[], 'shop':{'eggPrice':999}}
                before = copy.deepcopy(data)
                eggs = remaining_eggs(data, self.catalog)
                self.assertFalse(any(self.catalog['speciesIds'][k] == pid for k in eggs), key)
                self.assertEqual(data, before)
                self.assertEqual(len(eggs), len(set(eggs)))

    def test_load_and_save_no_implicit_restock(self):
        before = copy.deepcopy(self.data)
        save = types.SimpleNamespace(data=self.data, team=self.data['save']['team'], box=self.data['save']['box'],
            load_from_game=Mock(return_value=True), load_from_file=Mock(return_value=True), save_to_game=Mock(return_value=True))
        ui = types.SimpleNamespace(save=save, save_mode_var=Mock(get=lambda:'modded'), status=Mock(), update=Mock(),
            source_label=Mock(), refresh_grid=Mock())
        ns={'messagebox':Mock(),'Path':Path,'filedialog':Mock(askopenfilename=lambda **kw:'fixture.json')}
        for name in ('load_game','load_file','save_game'):
            method('save_editor.py',name,ns)(ui)
            self.assertEqual(self.data,before,name)

    def test_reset_is_confirmed_and_preserves_roster(self):
        before=copy.deepcopy(self.data)
        messages=Mock();messages.askyesno.return_value=False
        ns={'messagebox':messages,'json':json,'SCRIPT_DIR':MODS,'_load_egg_list_keys':lambda:[]}
        reset=method('save_editor.py','reset_eggs',ns)
        ui=types.SimpleNamespace(save=types.SimpleNamespace(data=self.data),refresh_grid=Mock())
        reset(ui);self.assertEqual(self.data,before)
        messages.askyesno.return_value=True
        reset(ui)
        self.assertEqual(self.data['save']['team'],before['save']['team'])
        self.assertEqual(self.data['save']['box'],before['save']['box'])
        shop=self.data['save']['shop']
        self.assertNotIn('pikachu',shop['eggList']);self.assertNotIn('missingNo',shop['eggList'])
        self.assertEqual(shop['eggPrice'],10)
        self.assertEqual(shop['eggList'],remaining_eggs(self.data,self.catalog))

    def test_existing_feature_choices_and_fresh_default(self):
        ns={'json':json}
        initial=method('PokePath_Mod_Installer.pyw','initial_feature_selection',ns)
        tree=ast.parse((MODS/'lib/apply_mods.py').read_text(encoding='utf-8-sig'))
        features=ast.literal_eval(next(n.value for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='MOD_FEATURES' for t in n.targets)))
        self.assertFalse(features['allow_dupes']['default'])
        with tempfile.TemporaryDirectory() as directory:
            manifest=Path(directory)/'installed_features.json'
            self.assertFalse(initial(features,manifest)['allow_dupes'])
            # Temporary test fixtures only; never installed settings.
            for installed in ([], ['speed'], ['allow_dupes','qol']):
                manifest.write_text(json.dumps(installed))
                self.assertEqual(initial(features,manifest),{k:k in installed for k in features})
            manifest.write_text('{bad')
            self.assertFalse(initial(features,manifest)['allow_dupes'])

    def test_failed_safety_patch_never_repacks(self):
        ns={'MOD_FEATURES':{}, 'copy_modded_file':Mock(), 'MODS_DIR':MODS, 'JS_ROOT':MODS, 'GAME_VERSION':'1.7.0',
            'ensure_vanilla_backup':lambda:(True,''), 'extract_from_vanilla':lambda callback:(True,''),
            'check_game_version_compatibility':lambda:(True,[]),
            'apply_modded_userdata_redirect':Mock(), 'apply_allow_dupes':lambda:False,
            'apply_force_no_dupes':lambda:True, 'apply_egg_shop_safety':lambda:True,
            '_repack_game':Mock()}
        apply=method('lib/apply_mods.py','apply_selected_mods',ns)
        success,_,_=apply(['speed'])
        self.assertFalse(success)
        ns['_repack_game'].assert_not_called()


if __name__ == '__main__':
    unittest.main(verbosity=2)
