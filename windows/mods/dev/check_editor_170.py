"""Check the 1.7 editor's catalogs against an extracted runtime, without opening saves."""
import ast
import json
import re
import sys
from pathlib import Path
from types import SimpleNamespace

mods = Path(__file__).resolve().parents[1]
data = Path(sys.argv[1]) / 'src/js/game/data'
namespace = {'re': re, 'json': json, 'SCRIPT_DIR': mods,
             'ROUTE_DATA_FILE': data / 'routeData.js',
             'ITEM_DATA_FILE': data / 'itemData.js',
             'POKEMON_JS_DATA_FILE': data / 'pokemonData.js'}
tree = ast.parse((mods / 'save_editor.py').read_text(encoding='utf8'))
for name in ('_load_route_options', '_load_route_reward_pokemon_keys',
             '_load_item_catalog_from_data', '_load_egg_list_keys', 'get_star_route_options'):
    node = next(node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef) and node.name == name)
    exec(compile(ast.Module(body=[node], type_ignores=[]), 'save_editor.py', 'exec'), namespace)
routes = namespace['_load_route_options']()
route_names = {route['id']: route['name'] for route in routes}
assert len(routes) == 47
assert route_names[33] == 'Castle Room' and route_names[34] == 'Route 8-2'
assert len(namespace['get_star_route_options'](SimpleNamespace(route_options=routes))) == 40
assert len(namespace['_load_route_reward_pokemon_keys']()) == 40
eggs = namespace['_load_egg_list_keys']()
catalog = json.loads((mods / 'dev/egg_catalog.json').read_text(encoding='utf8'))
assert eggs == catalog['eggKeys'] and len(eggs) == 146
items = namespace['_load_item_catalog_from_data']()
assert len(items) == 197 and all(len(item['name']) == 10 for item in items.values())
assert items['ruby']['name'][0] == 'Ruby' and items['garchompite']['id'] == 'garchompite'
print('PASS editor: 47 routes, 40 normal routes, 146 ordinary eggs, 197 localized item definitions')
